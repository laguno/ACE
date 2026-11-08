// Icone della PWA: un oggetto o un avatar centrato su fondo fucsia #C2185B.
// Uso: node scripts/icone.mjs  (rigenera public/icone/*.png)
// Il 62% lascia il soggetto dentro la zona sicura delle icone "maskable" (80%).
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
