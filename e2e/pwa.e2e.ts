// La PWA vera (build con il service worker, secondo server di playwright.config.ts): senza rete si
// vede l'ultima situazione salvata con la striscia "senza rete"; una versione nuova arriva al
// rientro in primo piano. Il Supabase finto sta sul contesto, così vede anche le richieste che
// passano dal service worker.
import { expect, test, type Browser, type BrowserContext } from '@playwright/test';
import { CASI, dati } from './casi';
import { finto } from './finto';
import { readFileSync, writeFileSync } from 'node:fs';

const PWA = `http://localhost:${Number(process.env.PORTA_PROVE ?? 5179) + 2}/`;
const SUPABASE = 'https://finto.supabase.test/**';
const SW = 'dist-prove/sw.js';

/** Rete spenta; Supabase risponde subito "niente rete" anche al service worker (setOffline non lo copre). */
async function senzaRete(ctx: BrowserContext) {
  await ctx.unroute(SUPABASE);
  await ctx.route(SUPABASE, (r) => r.abort('internetdisconnected'));
  await ctx.setOffline(true);
}

/** Apre Oggi due volte: la prima installa il service worker, la seconda passa da lui e salva i dati. */
async function installata(browser: Browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'it-IT', timezoneId: 'Europe/Rome', serviceWorkers: 'allow' });
  // orologio finto che scorre: le attese di Supabase si possono saltare con runFor
  await ctx.clock.install({ time: CASI.Oggi.quando });
  await finto(ctx, dati());
  // con "scaduta" nella sessione della scheda, il gettone salvato risulta scaduto da un pezzo
  await ctx.addInitScript(() => {
    if (!sessionStorage.getItem('scaduta')) return;
    const s = JSON.parse(localStorage.getItem('ace-sessione') ?? '{}');
    localStorage.setItem('ace-sessione', JSON.stringify({ ...s, expires_at: 1_700_000_000, expires_in: -1 }));
  });
  const p = await ctx.newPage();
  await p.goto(PWA);
  await p.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await p.reload();
  await expect(p.getByText('Scuola, poi allenamento.')).toBeVisible();
  return { ctx, p };
}

test('senza rete: ultima situazione salvata e striscia', async ({ browser }) => {
  const { ctx, p } = await installata(browser);
  await expect(p.getByRole('status')).toHaveCount(0);
  await senzaRete(ctx);
  await p.reload();
  await expect(p.getByRole('heading', { name: 'Buongiorno, Lani' })).toBeVisible();
  await expect(p.getByText('Scuola, poi allenamento.')).toBeVisible();
  await expect(p.getByText("Sei senza rete: vedi le cose dell'ultima volta.")).toBeVisible();
  // torna la rete: via la striscia
  await ctx.setOffline(false);
  await expect(p.getByText('Sei senza rete')).toHaveCount(0);
  await ctx.close();
});

test('senza rete con il gettone scaduto: si resta dentro, niente schermata di accesso', async ({ browser }) => {
  const { ctx, p } = await installata(browser);
  await senzaRete(ctx);
  await p.evaluate(() => sessionStorage.setItem('scaduta', '1'));
  await p.reload();
  // Supabase prova a rinnovare il gettone per circa 25 secondi prima di arrendersi: intanto c'è la striscia
  await expect(p.getByText('Sei senza rete')).toBeVisible();
  await p.clock.runFor(30_000);
  await expect(p.getByText('Scuola, poi allenamento.')).toBeVisible();
  await expect(p.getByRole('button', { name: 'Entra' })).toHaveCount(0);
  await ctx.close();
});

test('versione nuova: al rientro in primo piano la prende e ricarica', async ({ browser }) => {
  const { ctx, p } = await installata(browser);
  // il server ora ha un service worker diverso, come dopo un deploy (vite preview legge dal disco a
  // ogni richiesta; l'aggiornamento del service worker non passa da context.route)
  const vecchio = readFileSync(SW, 'utf8');
  writeFileSync(SW, `${vecchio}\n// versione nuova\n`);
  try {
    const ricaricata = p.waitForEvent('load', { timeout: 15_000 });
    await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await ricaricata;
    await expect(p.getByRole('heading', { name: 'Buongiorno, Lani' })).toBeVisible();
  } finally {
    writeFileSync(SW, vecchio);
  }
  await ctx.close();
});
