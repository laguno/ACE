// Carta 4 dei dieci minuti (prototipo, 24/11): converte le GIF dei trick disegnate con Gemini dal signore
// in WebP animati leggeri per public/assets/trick/. Gli originali NON stanno nel repository: per
// default si leggono da C:\progetti\ace\asset\avatar\lani\esercizi (cartella del signore, fuori dalla
// build). Uso: node scripts/trick-webp.mjs [cartella-originali]
//
// Per ogni GIF: toglie il verde (trasparenza), taglia i fotogrammi fermi in coda, un solo ritaglio
// uguale per tutti i fotogrammi con margine, avanti-indietro dove il giro scatterebbe. Scrive anche
// <id>-fermo.webp, il primo fotogramma, per chi ha il movimento ridotto.
import { mkdirSync, statSync } from "node:fs";
import sharp from "sharp";

const SORGENTE =
  process.argv[2] ?? "C:/progetti/ace/asset/avatar/lani/esercizi";
const DESTINAZIONE = "public/assets/trick";

// id usato dall'app -> file originale (i primi due sono pose base, non escono nelle sessioni)
const TRICK = {
  "palleggio-base": "4-trick_palleggio-base_v3.gif",
  "bagher-base": "4-trick_bagher-base_v3.gif",
  "bagher-un-braccio": "4-trick_bagher-un-braccio_v1.gif",
  "palleggio-seduta": "4-trick_palleggio-seduta_v1.gif",
  "battito-mani": "4-trick_battito-mani_v2.gif",
  "giro-su-se-stessa": "4-trick_giro-su-se-stessa_v1.gif",
  "uno-alto-uno-basso": "4-trick_uno-alto-uno-basso_v2.gif",
  "bagher-palleggio-alternati": "4-trick_bagher-palleggio-alternati_v2.gif",
  "palleggio-di-lato": "4-trick_palleggio-di-lato_v2.gif",
  pancake: "4-trick_pancake_v3.gif",
  "muro-rimbalzo": "4-trick_muro-rimbalzo_v2.gif",
};

// verde dello sfondo: quanto il verde supera il rosso e il blu (sfondo ~55-70, Lani e contorno bianco ~0)
const VERDE_PIENO = 32; // da qui in su: trasparente
const VERDE_NIENTE = 14; // da qui in giù: opaco
const FERMO = 3; // differenza media per pixel sotto cui un fotogramma è uguale al precedente
const SCATTO = 12; // differenza ultimo -> primo sopra cui il giro si vede scattare: avanti-indietro
const MARGINE = 10; // px attorno all'ingombro di tutti i fotogrammi
// Peso (prove del 24/11): un fotogramma costa 4-7 kB comunque (il WebP non ha compensazione del moto;
// senza perdita, sfocatura e qualità più bassa guadagnano poco). Si scende solo con meno fotogrammi e
// lato più piccolo. Variante "leggera" (questa): 3/4 del lato, 5 fotogrammi al secondo, ~820 kB in tutto.
// Variante "fluida": SCALA=1 PASSO=1 Q=60, ~2,5 MB. Si sceglie da riga di comando, senza toccare il file.
const QUALITA = {
  quality: +(process.env.Q ?? 50),
  effort: 6,
  smartSubsample: true,
  minSize: true,
};
const SCALA = +(process.env.SCALA ?? 0.75); // lato del WebP rispetto al ritaglio
const PASSO = +(process.env.PASSO ?? 2); // 2 = un fotogramma su due (5 al secondo)

const verde = (d, i) => d[i + 1] - Math.max(d[i], d[i + 2]);

function differenza(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i += 4)
    s +=
      Math.abs(a[i] - b[i]) +
      Math.abs(a[i + 1] - b[i + 1]) +
      Math.abs(a[i + 2] - b[i + 2]);
  return s / (a.length / 4);
}

// lo sfondo è verde chiaro (rosso ~100-130); le strisce verdi della palla sono scure (rosso < 80) e restano
const ROSSO_SFONDO = 80;
const VERDE_SEME = 45; // verde pieno dello sfondo (~55-70): i bordi sfumati delle strisce della palla non ci arrivano
const diSfondo = (d, i) => verde(d, i) >= VERDE_NIENTE && d[i] >= ROSSO_SFONDO;

/**
 * Alfa dal verde, solo sullo sfondo: riempimento che parte dal verde pieno e si allarga sul verde chiaro
 * sfumato. Le strisce verdi scure della palla non sono verde chiaro e restano. Via il riflesso verde sui bordi semitrasparenti.
 */
function togliVerde(f, W, H) {
  const o = Buffer.from(f);
  const sfondo = new Uint8Array(W * H);
  const coda = [];
  const semina = (p) => {
    if (!sfondo[p] && diSfondo(o, p * 4)) {
      sfondo[p] = 1;
      coda.push(p);
    }
  };
  // semi: ogni pixel di verde pieno (anche le sacche chiuse, tra braccia e corpo); si allarga sui bordi sfumati
  for (let p = 0; p < W * H; p++)
    if (verde(o, p * 4) >= VERDE_SEME && o[p * 4] >= ROSSO_SFONDO) semina(p);
  while (coda.length) {
    const p = coda.pop();
    const x = p % W;
    if (x > 0) semina(p - 1);
    if (x < W - 1) semina(p + 1);
    if (p >= W) semina(p - W);
    if (p < W * (H - 1)) semina(p + W);
  }
  for (let p = 0; p < W * H; p++) {
    if (!sfondo[p]) continue;
    const i = p * 4;
    const v = verde(o, i);
    const a =
      v >= VERDE_PIENO
        ? 0
        : v <= VERDE_NIENTE
          ? 255
          : Math.round(
              (255 * (VERDE_PIENO - v)) / (VERDE_PIENO - VERDE_NIENTE),
            );
    o[i + 3] = a;
    if (a === 0) o[i] = o[i + 1] = o[i + 2] = 0;
    else if (v > 0) o[i + 1] = Math.max(o[i], o[i + 2]);
  }
  return o;
}

mkdirSync(DESTINAZIONE, { recursive: true });
const righe = [];
for (const [id, file] of Object.entries(TRICK)) {
  const percorso = `${SORGENTE}/${file}`;
  const meta = await sharp(percorso, { animated: true }).metadata();
  const { width: W, pageHeight: H, pages: N } = meta;
  const ritardo = meta.delay?.[0] ?? 100;
  const { data } = await sharp(percorso, { animated: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let fotogrammi = Array.from({ length: N }, (_, n) =>
    data.subarray(n * W * H * 4, (n + 1) * W * H * 4),
  );

  // fotogrammi fermi in coda: si tiene solo il primo della serie
  let fine = fotogrammi.length;
  while (
    fine > 2 &&
    differenza(fotogrammi[fine - 1], fotogrammi[fine - 2]) < FERMO
  )
    fine--;
  const tagliati = fotogrammi.length - fine;
  fotogrammi = fotogrammi.slice(0, fine);

  const scatto = differenza(fotogrammi.at(-1), fotogrammi[0]);
  const avantiIndietro = scatto > SCATTO;
  fotogrammi = fotogrammi.filter((_, n) => n % PASSO === 0);
  if (avantiIndietro)
    fotogrammi = [...fotogrammi, ...fotogrammi.slice(1, -1).reverse()];

  const puliti = fotogrammi.map((f) => togliVerde(f, W, H));

  // un solo ritaglio: ingombro di tutti i fotogrammi più margine
  let [x0, y0, x1, y1] = [W, H, 0, 0];
  for (const f of puliti)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (f[(y * W + x) * 4 + 3] > 160) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
  const bordoAlto = y0 === 0; // la palla tocca il bordo dell'originale: tagliata già nella GIF
  x0 = Math.max(0, x0 - MARGINE);
  y0 = Math.max(0, y0 - MARGINE);
  x1 = Math.min(W - 1, x1 + MARGINE);
  y1 = Math.min(H - 1, y1 + MARGINE);
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;

  // ritaglio e (se serve) riduzione, un fotogramma alla volta: sharp non ridimensiona per pagine
  const lw = Math.round(w * SCALA);
  const lh = Math.round(h * SCALA);
  const ritagliati = Buffer.concat(
    await Promise.all(
      puliti.map((f) => {
        const r = Buffer.alloc(w * h * 4);
        for (let y = 0; y < h; y++)
          f.copy(
            r,
            y * w * 4,
            ((y + y0) * W + x0) * 4,
            ((y + y0) * W + x1 + 1) * 4,
          );
        let p = sharp(r, { raw: { width: w, height: h, channels: 4 } });
        if (SCALA !== 1) p = p.resize(lw, lh);
        return p.raw().toBuffer();
      }),
    ),
  );

  // alfa netta (0 o 255): metà del peso di un fotogramma era l'alfa sfumata; il contorno bianco dello sticker regge il bordo netto
  for (let i = 3; i < ritagliati.length; i += 4) {
    ritagliati[i] = ritagliati[i] >= 128 ? 255 : 0;
    if (!ritagliati[i])
      ritagliati[i - 1] = ritagliati[i - 2] = ritagliati[i - 3] = 0;
  }

  const uscita = `${DESTINAZIONE}/${id}.webp`;
  await sharp(ritagliati, {
    raw: { width: lw, height: lh * puliti.length, channels: 4, pageHeight: lh },
  })
    .webp({ ...QUALITA, loop: 0, delay: puliti.map(() => ritardo * PASSO) })
    .toFile(uscita);
  const fermo = `${DESTINAZIONE}/${id}-fermo.webp`;
  await sharp(ritagliati.subarray(0, lw * lh * 4), {
    raw: { width: lw, height: lh, channels: 4 },
  })
    .webp(QUALITA)
    .toFile(fermo);

  righe.push({
    id,
    misura: `${lw}x${lh}`,
    fotogrammi: `${N} -> ${puliti.length}`,
    fermi_tolti: tagliati,
    scatto: Math.round(scatto),
    avanti_indietro: avantiIndietro,
    palla_al_bordo: bordoAlto,
    kB: +(statSync(uscita).size / 1024).toFixed(1),
    fermo_kB: +(statSync(fermo).size / 1024).toFixed(1),
  });
}
console.table(righe);
const totale = righe.reduce((s, r) => s + r.kB + r.fermo_kB, 0);
console.log(`Totale: ${totale.toFixed(1)} kB`);
