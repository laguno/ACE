// Copie piccole degli avatar per gli sticker fino a 72 px (Lighthouse, Da decidere 14, ok del
// signore del 10/11). Gli originali in public/assets/avatar restano intatti: le copie vanno in
// public/assets/avatar-piccoli con lo stesso percorso, a 144 px (72 px su uno schermo a 2x).
// Uso: npm run avatar:piccoli  (dopo ogni avatar nuovo)
import { mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const DA = 'public/assets/avatar';
const A = 'public/assets/avatar-piccoli';
const LATO = 144;

let n = 0;
for (const file of readdirSync(DA, { recursive: true })) {
  if (!String(file).endsWith('.webp')) continue;
  const fuori = join(A, file);
  mkdirSync(dirname(fuori), { recursive: true });
  await sharp(join(DA, file)).resize(LATO, LATO, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 85 }).toFile(fuori);
  n++;
}
console.log(`${n} copie a ${LATO} px in ${A}`);
