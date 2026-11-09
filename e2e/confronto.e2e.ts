// Confronto bozza contro app (indicazioni di Jarvis): per ogni schermata uno screenshot della bozza
// design/X.html e uno dell'app con dati finti, affiancati in docs/confronto/X-390.png e X-360.png.
// Gira solo con CONFRONTO=1 (npm run confronto), non nelle prove normali.
import { test, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { apri, CASI } from './casi';

test.skip(!process.env.CONFRONTO, 'solo con npm run confronto');

async function fotoBozza(page: Page, bozza: string) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(pathToFileURL(`${process.cwd()}/design/${bozza}.html`).href);
  await page.waitForTimeout(1500);
  return page.screenshot();
}

async function affianca(sinistra: Buffer, destra: Buffer, uscita: string) {
  const [a, b] = await Promise.all([sharp(sinistra).metadata(), sharp(destra).metadata()]);
  const spazio = 24;
  const h = Math.max(a.height!, b.height!);
  await sharp({ create: { width: a.width! + b.width! + spazio, height: h, channels: 3, background: '#d9d2e6' } })
    .composite([
      { input: sinistra, left: 0, top: 0 },
      { input: destra, left: a.width! + spazio, top: 0 },
    ])
    .png({ palette: true, quality: 85 })
    .toFile(uscita);
}

for (const [nome, caso] of Object.entries(CASI)) {
  test(`confronto ${nome}`, async ({ browser }) => {
    // movimento ridotto: niente entrate né coriandoli, così le foto sono uguali a ogni giro (servono per i confronti prima e dopo)
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'it-IT', timezoneId: 'Europe/Rome', reducedMotion: 'reduce' });
    // le bozze non hanno il meta viewport: in un contesto "telefono" verrebbero disegnate a 980 px e rimpicciolite
    const ctxBozza = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: false });
    const bozza = await fotoBozza(await ctxBozza.newPage(), caso.bozza);
    await ctxBozza.close();
    for (const larghezza of [390, 360]) {
      const p = await ctx.newPage();
      await p.setViewportSize({ width: larghezza, height: 844 });
      await apri(p, caso);
      await p.waitForTimeout(300);
      const app = await p.screenshot({ animations: 'disabled', caret: 'hide' });
      await affianca(bozza, app, `docs/confronto/${nome}-${larghezza}.png`);
      await p.close();
    }
    await ctx.close();
  });
}
