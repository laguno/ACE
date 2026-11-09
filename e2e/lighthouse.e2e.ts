// Lighthouse a 390 px sulla build di produzione (dist-lh, con il Supabase finto) per Oggi, Sera,
// Astra e Studio. Playwright prepara la pagina (ora, dati finti), Lighthouse la misura dalla stessa
// Chrome. Oggi e Sera: caricamento completo. Astra e Studio sono schede, non indirizzi: caricamento
// di Oggi, clic sulla scheda (timespan) e fotografia (snapshot), senza punteggio di prestazioni.
// Gira solo con npm run lighthouse; i rapporti HTML in e2e/risultati/lighthouse/.
import { chromium, expect, test } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { startFlow } from 'lighthouse';
import puppeteer from 'puppeteer-core';
import { CASI, prepara } from './casi';

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
  test(`lighthouse ${nome}`, async ({}, info) => {
    const caso = CASI[nome];
    const browser = await chromium.launch({ args: [`--remote-debugging-port=${DEBUG}`] });
    const ctx = await browser.newContext({ locale: 'it-IT', timezoneId: 'Europe/Rome' });
    const p = await ctx.newPage();
    await prepara(p, caso, true);
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
