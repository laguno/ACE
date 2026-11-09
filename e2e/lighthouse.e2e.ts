// Lighthouse a 390 px sulla build di produzione (dist-lh, con il Supabase finto) per Oggi, Sera,
// Astra e Studio. Playwright prepara la pagina (ora, dati finti), Lighthouse la misura dalla stessa
// Chrome. Oggi e Sera: caricamento completo. Astra e Studio sono schede, non indirizzi: caricamento
// di Oggi, clic sulla scheda (timespan) e fotografia (snapshot), senza punteggio di prestazioni.
// Le pagine arrivano con le intestazioni di sicurezza di vercel.json (CSP compresa, con il Supabase
// finto al posto di quello vero) e una prova apre ogni schermata: nessuna violazione della CSP.
// Il server è come Vercel anche nella compressione (gzip; Vercel usa brotli, un po' più piccolo):
// vite preview mandava i file interi e le prestazioni risultavano peggiori del vero.
// Gira solo con npm run lighthouse; i rapporti HTML in e2e/risultati/lighthouse/.
import { chromium, expect, test, type Page } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { startFlow } from 'lighthouse';
import puppeteer from 'puppeteer-core';
import { apri, CASI, prepara } from './casi';

test.skip(!process.env.LH, 'solo con npm run lighthouse');
test.setTimeout(300_000);

const PORTA = Number(process.env.LH_PORTA ?? 5180);
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
// solo sulle pagine: per i file dell'app si lascia passare la risposta compressa così com'è
const conIntestazioni = (p: Page) =>
  p.route(`${URL}**`, async (route) => {
    if (route.request().resourceType() !== 'document') return route.fallback();
    const r = await route.fetch();
    const { 'content-encoding': _, 'content-length': __, ...resto } = r.headers();
    await route.fulfill({ response: r, headers: { ...resto, ...INTESTAZIONI } });
  });

const RADICE = resolve('dist-lh');
const TIPI: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const servi = () =>
  createServer((req, res) => {
    let file = join(RADICE, decodeURIComponent(new globalThis.URL(req.url ?? '/', URL).pathname));
    // come la riscrittura delle SPA: tutto quello che non è un file dà index.html
    if (!file.startsWith(RADICE) || !existsSync(file) || statSync(file).isDirectory()) file = join(RADICE, 'index.html');
    const tipo = TIPI[extname(file)] ?? 'application/octet-stream';
    const testo = /text|javascript|json|svg|manifest/.test(tipo) && /gzip/.test(String(req.headers['accept-encoding']));
    res.writeHead(200, { 'content-type': tipo, ...(testo && { 'content-encoding': 'gzip' }) });
    res.end(testo ? gzipSync(readFileSync(file)) : readFileSync(file));
  });

let server: Server;
test.beforeAll(async () => {
  // un server rimasto acceso (anche da un'altra copia del progetto) farebbe misurare la build sbagliata
  if (await fetch(URL).then(() => true, () => false)) throw new Error(`porta ${PORTA} già occupata: chiudi il server o usa LH_PORTA`);
  server = servi();
  server.keepAliveTimeout = 120_000; // route.fetch riusa le connessioni: chiuse dopo 5 s davano ECONNRESET
  await new Promise<void>((ok) => server.listen(PORTA, 'localhost', ok));
});
test.afterAll(() => {
  server?.close();
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
