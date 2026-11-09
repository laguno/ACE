// Lighthouse a 390 px sulla build di produzione (dist-lh, con il Supabase finto) per Oggi, Sera,
// Astra e Studio. Playwright prepara la pagina (ora, dati finti), Lighthouse la misura dalla stessa
// Chrome. Oggi e Sera: caricamento completo. Astra e Studio sono schede, non indirizzi: caricamento
// di Oggi, clic sulla scheda (timespan) e fotografia (snapshot), senza punteggio di prestazioni.
// Le pagine arrivano con le intestazioni di sicurezza di vercel.json (CSP compresa, con il Supabase
// finto al posto di quello vero) e una prova apre ogni schermata: nessuna violazione della CSP.
// Gira solo con npm run lighthouse; i rapporti HTML in e2e/risultati/lighthouse/.
import { chromium, expect, test, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { startFlow } from 'lighthouse';
import puppeteer from 'puppeteer-core';
import { apri, CASI, prepara } from './casi';

test.skip(!process.env.LH, 'solo con npm run lighthouse');
test.setTimeout(300_000);

const PORTA = 5180;
const DEBUG = 9333;
const URL = `http://localhost:${PORTA}/`;
const CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'mobile' as const,
    screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 3, disabled: false },
    disableStorageReset: true, // la sessione finta sta in localStorage
    locale: 'it' as const,
  },
};

// intestazioni di Vercel, come in produzione; l'indirizzo di Supabase diventa quello finto
const VERCEL = JSON.parse(readFileSync('vercel.json', 'utf8')) as { headers: { headers: { key: string; value: string }[] }[] };
const INTESTAZIONI = Object.fromEntries(VERCEL.headers[0].headers.map((h) => [h.key, h.value.replaceAll('qonullxzhqvbfpiibqye.supabase.co', 'finto.supabase.test')]));
const conIntestazioni = (p: Page) =>
  p.route(`${URL}**`, async (route) => {
    const r = await route.fetch();
    await route.fulfill({ response: r, headers: { ...r.headers(), ...INTESTAZIONI } });
  });

let server: ChildProcess;
test.beforeAll(async () => {
  server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-lh', '--port', String(PORTA), '--strictPort'], { shell: true, stdio: 'ignore' });
  for (let i = 0; i < 60 && !(await fetch(URL).then((r) => r.ok).catch(() => false)); i++) await new Promise((r) => setTimeout(r, 500));
});
test.afterAll(() => {
  server?.kill();
});

const CATEGORIE = ['performance', 'accessibility', 'best-practices', 'seo'] as const;

for (const nome of ['Oggi', 'Sera', 'Astra', 'Studio']) {
  // Playwright vuole il primo argomento destrutturato anche quando non serve nessuna fixture
  // eslint-disable-next-line no-empty-pattern
  test(`lighthouse ${nome}`, async ({}, info) => {
    const caso = CASI[nome];
    const browser = await chromium.launch({ args: [`--remote-debugging-port=${DEBUG}`] });
    const ctx = await browser.newContext({ locale: 'it-IT', timezoneId: 'Europe/Rome' });
    const p = await ctx.newPage();
    await prepara(p, caso, true);
    await conIntestazioni(p);
    const pp = await puppeteer.connect({ browserURL: `http://127.0.0.1:${DEBUG}`, defaultViewport: null });
    const pagina = (await pp.pages()).find((x) => x.url() === 'about:blank')!;
    const flow = await startFlow(pagina, { config: CONFIG, name: `ACE ${nome}` });
    await flow.navigate(URL);
    if (caso.vai) {
      await flow.startTimespan();
      await caso.vai(p);
      await p.waitForTimeout(1500);
      await flow.endTimespan();
      await flow.snapshot();
    }
    const esito = await flow.createFlowResult();
    mkdirSync('e2e/risultati/lighthouse', { recursive: true });
    writeFileSync(`e2e/risultati/lighthouse/${nome}.html`, await flow.generateReport());
    const punti: Record<string, number | null> = {};
    for (const passo of esito.steps)
      for (const c of CATEGORIE) {
        const s = passo.lhr.categories[c]?.score;
        if (s != null && !(passo.lhr.gatherMode === "snapshot" && c === "performance")) punti[`${passo.lhr.gatherMode}:${c}`] = Math.round(s * 100);
      }
    await info.attach('punti', { body: JSON.stringify(punti), contentType: 'application/json' });
    await pp.disconnect();
    await browser.close();
    expect(Object.keys(punti).length).toBeGreaterThan(0);
  });
}

test('CSP: nessuna violazione su tutte le schermate', async ({ browser }) => {
  const violazioni: string[] = [];
  for (const [nome, caso] of Object.entries(CASI)) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'it-IT', timezoneId: 'Europe/Rome', reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    await p.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) => console.error(`CSP ${e.violatedDirective} ${e.blockedURI}`)));
    p.on('console', (m) => m.type() === 'error' && /CSP|Content Security Policy/.test(m.text()) && violazioni.push(`${nome}: ${m.text()}`));
    await conIntestazioni(p);
    await apri(p, caso, URL);
    await ctx.close();
  }
  expect(violazioni).toEqual([]);
});
