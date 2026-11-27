// Carta 4 dei dieci minuti (prototipo, 24/11): converte le GIF dei trick disegnate con Gemini dal signore
// in WebP animati leggeri per public/assets/trick/. Gli originali NON stanno nel repository: per
// default si leggono da C:\progetti\ace\asset\avatar\lani\esercizi (cartella del signore, fuori dalla
// build). Uso: node scripts/trick-webp.mjs [cartella-originali]
//
// Per ogni GIF: toglie il verde (trasparenza), taglia i fotogrammi fermi in coda, un solo ritaglio
// uguale per tutti i fotogrammi con margine, avanti-indietro dove il giro scatterebbe. Scrive anche
// <id>-fermo.webp, il primo fotogramma, per chi ha il movimento ridotto, e <id>-passo1..3.webp per le
// vignette "Come si fa".
import { mkdirSync, statSync } from 'node:fs';
import sharp from 'sharp';

const SORGENTE = process.argv[2] ?? 'C:/progetti/ace/asset/avatar/lani/esercizi';
const DESTINAZIONE = 'public/assets/trick';
const SOLTANTO = process.env.ID?.split(','); // ID=scansione,punte: rifà solo quelli

// id usato dall'app -> file originale (i primi due sono pose base, non escono nelle sessioni)
const TRICK = {
  'palleggio-base': '4-trick_palleggio-base_v3.gif',
  'bagher-base': '4-trick_bagher-base_v3.gif',
  'bagher-un-braccio': '4-trick_bagher-un-braccio_v1.gif',
  'palleggio-seduta': '4-trick_palleggio-seduta_v1.gif',
  'battito-mani': '4-trick_battito-mani_v2.gif',
  'giro-su-se-stessa': '4-trick_giro-su-se-stessa_v1.gif',
  'uno-alto-uno-basso': '4-trick_uno-alto-uno-basso_v2.gif',
  'bagher-palleggio-alternati': '4-trick_bagher-palleggio-alternati_v2.gif',
  'palleggio-di-lato': '4-trick_palleggio-di-lato_v2.gif',
  pancake: '4-trick_pancake_v3.gif',
  'muro-rimbalzo': '4-trick_muro-rimbalzo_v2.gif',
  // esercizi delle altre carte (27/11): gli originali tengono il nome <carta>-<nome>_<esercizio>_v<n>
  camminata: '0-riscaldamento_camminata_v1.gif',
  'rotazioni-spalle': '0-riscaldamento_rotazioni-spalle_v1.gif',
  'rotazioni-caviglie': '0-riscaldamento_rotazioni-caviglie_v2.gif',
  squat: '1-gambe_squat_v1.gif',
  affondi: '1-gambe_affondo_v1.gif',
  'affondi-laterali': '1-gambe_affondo-laterale_v1.gif',
  'salti-stella': '1-gambe_salto-stella_v1.gif',
  'ponte-glutei': '1-gambe_ponte-glutei_v1.gif',
  plank: '2-core_plank_v1.gif',
  'plank-laterale': '2-core_plank-laterale_v1.gif',
  'bird-dog': '2-core_bird-dog_v1.gif',
  superman: '2-core_superman_v1.gif',
  'presa-due-mani': '3-riflessi_presa-due-mani_v1.gif',
  'presa-destra': '3-riflessi_presa-una-mano_v1.gif',
  'presa-sinistra': '3-riflessi_presa-una-mano_v1.gif',
  'muro-rimbalzo-presa': '3-riflessi_muro_v1.gif',
  'mano-opposta': '3-riflessi_mano-opposta_v2.gif',
  'presa-bassa': '3-riflessi_presa-bassa_v2.gif',
  'battito-presa': '3-riflessi_battito-presa_v1.gif',
  'una-gamba': '5-caviglie_una-gamba_v1.gif',
  saltelli: '5-caviglie_saltelli_v2.gif',
  skip: '5-caviglie_skip_v2.gif',
  punte: '5-caviglie_punte_v1.gif',
  farfalla: '6-allungamento_farfalla_v1.gif',
  'busto-avanti': '6-allungamento_busto-avanti_v1.gif',
  quadricipiti: '6-allungamento_quadricipiti_v1.gif',
  spalle: '6-allungamento_spalle_v1.gif',
  respirazione: '7-calma_respirazione_v1.gif',
  scansione: '7-calma_scansione_v1.gif',
  'allungamento-dolce': '7-calma_allungamento-dolce_v1.gif',
};
// lavorazioni dalla consegna di Jarvis del 27/11 (ace/consegna-claude-code-gif-esercizi-2026-11-27.md)
// solo i primi N fotogrammi: dopo comincia un secondo giro e il loop scatta
const SOLO = { 'rotazioni-caviglie': 20, punte: 13, farfalla: 20 };
// esercizi disegnati da un lato solo: dopo il giro si accoda lo stesso specchiato, per l'altro lato
const SPECCHIA = new Set(['rotazioni-caviglie', 'affondi', 'affondi-laterali', 'plank-laterale', 'bird-dog', 'una-gamba', 'quadricipiti', 'spalle', 'allungamento-dolce']);
// specchiati per intero: l'altra mano, e il muro (così la palla va a destra, dove l'app disegna il muro)
const ROVESCIA = new Set(['presa-sinistra', 'muro-rimbalzo-presa']);
// avanti e indietro anche se lo scatto è sotto soglia
const AVANTI_INDIETRO = new Set(['plank', 'bird-dog', 'una-gamba', 'punte', 'respirazione', 'scansione', 'allungamento-dolce']);
// la Calma va a metà velocità
const LENTA = new Set(['respirazione', 'scansione', 'allungamento-dolce']);

// verde dello sfondo: quanto il verde supera il rosso e il blu (sfondo ~55-70, Lani e contorno bianco ~0)
const VERDE_PIENO = 32; // da qui in su: trasparente
const VERDE_NIENTE = 14; // da qui in giù: opaco
const FERMO = 3; // differenza media per pixel sotto cui un fotogramma è uguale al precedente
const SCATTO = 12; // differenza ultimo -> primo sopra cui il giro si vede scattare: avanti-indietro
const MARGINE = 10; // px attorno all'ingombro di tutti i fotogrammi
// Peso (prove del 24/11): un fotogramma costa 4-7 kB comunque (il WebP non ha compensazione del moto;
// senza perdita, sfocatura e qualità più bassa guadagnano poco). Si scende solo con meno fotogrammi e
// lato più piccolo. Dal 25/11 (prova sul telefono: la "intermedia", 3/4 del lato a qualità 50, si vedeva
// sgranata) misura piena dell'originale e qualità 75, ~3,1 MB. Altre da riga di comando: "intermedia"
// SCALA=0.75 Q=50 (~1,8 MB), "leggera" SCALA=0.75 Q=50 PASSO=2 (~840 kB).
const QUALITA = {
  quality: +(process.env.Q ?? 75),
  effort: 6,
  smartSubsample: true,
  minSize: true,
};
const SCALA = +(process.env.SCALA ?? 1); // lato del WebP rispetto al ritaglio
const PASSO = +(process.env.PASSO ?? 1); // 2 = un fotogramma su due (5 al secondo)

const verde = (d, i) => d[i + 1] - Math.max(d[i], d[i + 2]);

function differenza(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
  return s / (a.length / 4);
}

// lo sfondo è verde chiaro (rosso ~100-130); le strisce verdi della palla sono scure (rosso < 80) e restano
const ROSSO_SFONDO = 80;
const VERDE_SEME = 45; // verde pieno dello sfondo (~55-70): i bordi sfumati delle strisce della palla non ci arrivano
// GIF con le scie del movimento (archi bianchi sfumati sul verde): soglie più basse, se no restano puntini
const SCIE = new Set(['rotazioni-spalle']);
const diSfondo = (d, i, niente) => verde(d, i) >= niente && d[i] >= ROSSO_SFONDO;

/**
 * Alfa dal verde, solo sullo sfondo: riempimento che parte dal verde pieno e si allarga sul verde chiaro
 * sfumato. Le strisce verdi scure della palla non sono verde chiaro e restano. Via il riflesso verde sui bordi semitrasparenti.
 */
function togliVerde(f, W, H, scie) {
  const [pieno, niente] = scie ? [14, 4] : [VERDE_PIENO, VERDE_NIENTE];
  const o = Buffer.from(f);
  const sfondo = new Uint8Array(W * H);
  const coda = [];
  const semina = (p) => {
    if (!sfondo[p] && diSfondo(o, p * 4, niente)) {
      sfondo[p] = 1;
      coda.push(p);
    }
  };
  // semi: ogni pixel di verde pieno (anche le sacche chiuse, tra braccia e corpo); si allarga sui bordi sfumati
  for (let p = 0; p < W * H; p++) if (verde(o, p * 4) >= VERDE_SEME && o[p * 4] >= ROSSO_SFONDO) semina(p);
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
    const a = v >= pieno ? 0 : v <= niente ? 255 : Math.round((255 * (pieno - v)) / (pieno - niente));
    o[i + 3] = a;
    if (a === 0) o[i] = o[i + 1] = o[i + 2] = 0;
    else if (v > 0) o[i + 1] = Math.max(o[i], o[i + 2]);
  }
  return o;
}

// specchio attorno al centro della figura nel primo fotogramma, così al cambio di lato non salta
function specchiati(fotogrammi, W, H) {
  let [a, b] = [W, 0];
  for (let i = 3; i < W * H * 4; i += 4)
    if (fotogrammi[0][i] > 160) {
      const x = ((i - 3) / 4) % W;
      if (x < a) a = x;
      if (x > b) b = x;
    }
  return fotogrammi.map((f) => {
    const o = Buffer.alloc(f.length);
    for (let y = 0; y < H; y++)
      for (let x = Math.max(0, a + b - W + 1); x <= Math.min(W - 1, a + b); x++) f.copy(o, (y * W + x) * 4, (y * W + a + b - x) * 4, (y * W + a + b - x + 1) * 4);
    return o;
  });
}

mkdirSync(DESTINAZIONE, { recursive: true });
const righe = [];
for (const [id, file] of Object.entries(TRICK)) {
  if (SOLTANTO && !SOLTANTO.includes(id)) continue;
  const percorso = `${SORGENTE}/${file}`;
  const meta = await sharp(percorso, { animated: true }).metadata();
  const { width: W, pageHeight: H, pages: N } = meta;
  const ritardo = meta.delay?.[0] ?? 100;
  const { data } = await sharp(percorso, { animated: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let fotogrammi = Array.from({ length: SOLO[id] ?? N }, (_, n) => data.subarray(n * W * H * 4, (n + 1) * W * H * 4));

  // fotogrammi fermi in coda: si tiene solo il primo della serie. Non nella Calma, dove il movimento è
  // così lento da sembrare fermo (la scansione restava con 2 fotogrammi)
  let fine = fotogrammi.length;
  while (!LENTA.has(id) && fine > 2 && differenza(fotogrammi[fine - 1], fotogrammi[fine - 2]) < FERMO) fine--;
  const tagliati = fotogrammi.length - fine;
  fotogrammi = fotogrammi.slice(0, fine);

  const scatto = differenza(fotogrammi.at(-1), fotogrammi[0]);
  const avantiIndietro = AVANTI_INDIETRO.has(id) || scatto > SCATTO;
  fotogrammi = fotogrammi.filter((_, n) => n % PASSO === 0);
  if (avantiIndietro) fotogrammi = [...fotogrammi, ...fotogrammi.slice(1, -1).reverse()];

  let puliti = fotogrammi.map((f) => togliVerde(f, W, H, SCIE.has(id)));
  if (ROVESCIA.has(id)) puliti = specchiati(puliti, W, H);
  if (SPECCHIA.has(id)) puliti.push(...specchiati(puliti, W, H));

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
        for (let y = 0; y < h; y++) f.copy(r, y * w * 4, ((y + y0) * W + x0) * 4, ((y + y0) * W + x1 + 1) * 4);
        let p = sharp(r, { raw: { width: w, height: h, channels: 4 } });
        if (SCALA !== 1) p = p.resize(lw, lh);
        return p.raw().toBuffer();
      }),
    ),
  );

  // alfa netta (0 o 255): metà del peso di un fotogramma era l'alfa sfumata; il contorno bianco dello sticker regge il bordo netto
  for (let i = 3; i < ritagliati.length; i += 4) {
    ritagliati[i] = ritagliati[i] >= 128 ? 255 : 0;
    if (!ritagliati[i]) ritagliati[i - 1] = ritagliati[i - 2] = ritagliati[i - 3] = 0;
  }

  const uscita = `${DESTINAZIONE}/${id}.webp`;
  await sharp(ritagliati, {
    raw: { width: lw, height: lh * puliti.length, channels: 4, pageHeight: lh },
  })
    .webp({ ...QUALITA, loop: 0, delay: puliti.map(() => ritardo * PASSO * (LENTA.has(id) ? 2 : 1)) })
    .toFile(uscita);
  const unFotogramma = (k, file) =>
    sharp(ritagliati.subarray(k * lw * lh * 4, (k + 1) * lw * lh * 4), {
      raw: { width: lw, height: lh, channels: 4 },
    })
      .webp(QUALITA)
      .toFile(file);
  const fermo = `${DESTINAZIONE}/${id}-fermo.webp`;
  await unFotogramma(0, fermo);
  // tre momenti del gesto per le vignette "Come si fa" (a 1/6, 3/6 e 5/6 del giro, prima dell'avanti-indietro)
  const andata = Math.ceil(fine / PASSO);
  let passi = 0;
  // le vignette servono solo ai trick ("Come si fa")
  for (const i of file.startsWith('4-trick') ? [1, 2, 3] : []) {
    const file = `${DESTINAZIONE}/${id}-passo${i}.webp`;
    await unFotogramma(Math.min(andata - 1, Math.round((andata * (2 * i - 1)) / 6)), file);
    passi += statSync(file).size;
  }

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
    vignette_kB: +(passi / 1024).toFixed(1),
  });
}
console.table(righe);
const totale = righe.reduce((s, r) => s + r.kB + r.fermo_kB + r.vignette_kB, 0);
console.log(`Totale: ${totale.toFixed(1)} kB`);
