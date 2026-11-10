// I dispositivi di Lani: Motorola (Chrome per Android, 360-412 px), iPad con Safari (WebKit, in
// verticale e in orizzontale), tema scuro di sistema e testo ingrandito al 130%. Sulle schermate
// principali: niente scorrimento orizzontale e nessun testo o bottone tagliato fuori dallo schermo.
// Testo al 130%: Chrome per Android e Safari ingrandiscono la pagina intera, che è come avere uno
// schermo largo 390 / 1,3 = 300 px con i pixel più densi.
import { chromium, devices, expect, test, webkit, type BrowserType, type Page } from '@playwright/test';
import { apri, CASI } from './casi';

const SCHERMATE = ['Oggi', 'Sera', 'Astra', 'Studio'];
type Dispositivo = { nome: string; motore: BrowserType; uso: (typeof devices)[string] & { colorScheme?: 'dark' } };
const DISPOSITIVI: Dispositivo[] = [
  { nome: 'Motorola 360', motore: chromium, uso: devices['Moto G4'] },
  { nome: 'Android 412', motore: chromium, uso: devices['Pixel 7'] },
  { nome: 'Motorola tema scuro', motore: chromium, uso: { ...devices['Moto G4'], colorScheme: 'dark' } },
  { nome: 'testo al 130% (390 px)', motore: chromium, uso: { ...devices['iPhone 13'], viewport: { width: 300, height: 649 }, deviceScaleFactor: 3.9 } },
  { nome: 'Motorola, testo al 130% (360 px)', motore: chromium, uso: { ...devices['Moto G4'], viewport: { width: 277, height: 492 }, deviceScaleFactor: 3.9 } },
  { nome: 'iPad verticale', motore: webkit, uso: devices['iPad (gen 7)'] },
  { nome: 'iPad orizzontale', motore: webkit, uso: devices['iPad (gen 7) landscape'] },
];

/** Testi e bottoni visibili che escono dallo schermo a destra o a sinistra, e lo scorrimento orizzontale. */
const fuori = (p: Page) =>
  p.evaluate(() => {
    const largo = document.documentElement.clientWidth;
    const tagliati = [...document.querySelectorAll<HTMLElement>('h1, h2, h3, p, li, button, label, a, small, b')]
      .filter((e) => e.offsetParent !== null && e.getClientRects().length > 0)
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && (r.right > largo + 1 || r.left < -1);
      })
      .map((e) => `${e.tagName.toLowerCase()}.${e.className}: ${e.textContent?.trim().slice(0, 30)}`);
    const scorre = document.documentElement.scrollWidth > largo + 1 ? [`scorre in orizzontale: ${document.documentElement.scrollWidth} su ${largo}`] : [];
    return [...scorre, ...tagliati];
  });

for (const d of DISPOSITIVI)
  test(`dispositivo: ${d.nome}`, async () => {
    test.setTimeout(120_000);
    const browser = await d.motore.launch();
    const problemi: string[] = [];
    for (const nome of SCHERMATE) {
      const ctx = await browser.newContext({ ...d.uso, locale: 'it-IT', timezoneId: 'Europe/Rome', reducedMotion: 'reduce' });
      const p = await ctx.newPage();
      await apri(p, CASI[nome]);
      problemi.push(...(await fuori(p)).map((x) => `${nome}: ${x}`));
      await ctx.close();
    }
    await browser.close();
    expect(problemi).toEqual([]);
  });
