// Icone della PWA: un oggetto o un avatar centrato su fondo fucsia #C2185B.
// Uso: node scripts/icone.mjs  (rigenera public/icone/*.png)
// Il 62% lascia il soggetto dentro la zona sicura delle icone "maskable" (80%).
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const FONDO = '#C2185B';
const SORGENTI = {
  pallone: 'public/assets/oggetti/pallone.webp',
  saluta: 'public/assets/avatar/lani/lani-saluta.webp',
  passo: 'public/assets/oggetti/passo.webp',
};
const MISURE = { '192': 192, '512': 512, 'apple': 180 };

for (const [nome, file] of Object.entries(SORGENTI)) {
  for (const [suffisso, lato] of Object.entries(MISURE)) {
    const soggetto = await sharp(file)
      .resize(Math.round(lato * 0.62), Math.round(lato * 0.62), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();
    await sharp({ create: { width: lato, height: lato, channels: 4, background: FONDO } })
      .composite([{ input: soggetto, gravity: 'center' }])
      .flatten({ background: FONDO })
      .png()
      .toFile(`public/icone/${nome}-${suffisso}.png`);
  }
}
console.log('Icone scritte in public/icone/');

// Guscio Android (android/, docs/07): icona classica e tonda, primo piano dell'icona adattiva
// (108 dp, visibile il cerchio di 72 dp: il soggetto sta al 62% di quello), splash rosa con il
// pallone, e l'icona piccola delle notifiche (due impronte).
const RES = 'android/app/src/main/res';
const DENSITA = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const ANDROID = SORGENTI.pallone;
const suFondo = async (lato, quota, file) => {
  const soggetto = await sharp(ANDROID).resize(Math.round(lato * quota), Math.round(lato * quota), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: lato, height: lato, channels: 4, background: FONDO } }).composite([{ input: soggetto, gravity: 'center' }]).flatten({ background: FONDO }).png().toFile(file);
};
for (const [d, k] of Object.entries(DENSITA)) {
  await suFondo(48 * k, 0.62, `${RES}/mipmap-${d}/ic_launcher.png`);
  await suFondo(48 * k, 0.62, `${RES}/mipmap-${d}/ic_launcher_round.png`);
  const fg = Math.round(108 * k);
  const soggetto = await sharp(ANDROID).resize(Math.round(fg * 0.42), Math.round(fg * 0.42), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: fg, height: fg, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: soggetto, gravity: 'center' }]).png().toFile(`${RES}/mipmap-${d}/ic_launcher_foreground.png`);
  // icona delle notifiche: due impronte sfalsate (un passino), sagoma bianca di passo.webp, scelta del signore il 16/11
  const st = 24 * k;
  const p = Math.round(st * 0.62);
  const impronta = async (specchio) => {
    let img = sharp(SORGENTI.passo).resize(p, p, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
    if (specchio) img = img.flop();
    const alfa = await sharp(await img.png().toBuffer()).extractChannel('alpha').toBuffer();
    return sharp({ create: { width: p, height: p, channels: 3, background: '#FFFFFF' } }).joinChannel(alfa).png().toBuffer();
  };
  mkdirSync(`${RES}/drawable-${d}`, { recursive: true });
  await sharp({ create: { width: st, height: st, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await impronta(true), left: 0, top: 0 }, { input: await impronta(false), left: st - p, top: st - p }])
    .png()
    .toFile(`${RES}/drawable-${d}/ic_stat_ace.png`);
}
const { readdirSync } = await import('node:fs');
for (const cartella of readdirSync(RES).filter((c) => c.startsWith('drawable'))) {
  const file = `${RES}/${cartella}/splash.png`;
  let meta;
  try { meta = await sharp(file).metadata(); } catch { continue; }
  const lato = Math.min(meta.width, meta.height);
  const soggetto = await sharp(ANDROID).resize(Math.round(lato * 0.4), Math.round(lato * 0.4), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  const buf = await sharp({ create: { width: meta.width, height: meta.height, channels: 4, background: FONDO } }).composite([{ input: soggetto, gravity: 'center' }]).flatten({ background: FONDO }).png().toBuffer();
  await sharp(buf).toFile(file);
}
console.log('Icone del guscio Android scritte in android/');
