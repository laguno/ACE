// Motore della pallavolo (docs/09-gioco-pallavolo.md §3.2): funzioni pure, passo fisso a 60 Hz,
// nessuna grafica. Stesso seme e stessi comandi = stessa partita su ogni dispositivo: qui dentro
// solo + - * / e Math.sqrt (esatti per lo standard). Niente sin, cos, pow, hypot né Math.random:
// cambiano da un motore JavaScript all'altro e una partita rigiocata non tornerebbe uguale.
//
// Unità: campo largo 1000, y verso l'alto, pavimento a 0. Lato 0 a sinistra, lato 1 a destra.
// Il ciclo a passo fisso (accumulatore del tempo) sta in chi disegna, non qui.

export const HZ = 60;

/** Misure e fisica: da tarare con la grafica e con Lani, non sono regole del gioco. */
export const M = {
  largo: 1000,
  reteX: 500,
  reteAlta: 230,
  reteMezza: 6,
  raggio: 28, // palla
  gravita: 0.35, // palla, per tic
  vMax: 20, // caduta massima: sotto raggio + reteMezza, così la palla non attraversa la rete
  raggioG: 40, // giocatore: cerchio di tocco (mani alzate; il centro lo dà cerchio()) e mezza larghezza.
  // Era 50 col tocco al petto: con le mani alzate un cerchio largo copriva quasi tutto il campo e gli
  // scambi CPU contro CPU non finivano più (taratura del 20/11 con partite simulate).
  mano: 1, // centro del cerchio = mano × altezza disegnata (cm × uPerCm), cioè alla cima della testa
  centroG: 175, // centro per l'altezza di default con la rete di 224 cm: solo per chi disegna senza stato
  passoG: 6, // velocità piena del giocatore
  accelG: 1.5, // partenza: velocità piena in 4 tic
  frenaG: 2, // frenata (e inversione) più decisa: da piena a ferma in 3 tic
  salto: 13,
  memoriaSalto: 8, // salto premuto in aria: parte se si tocca terra entro memoriaSalto - 2 tic
  gravitaG: 0.6,
  tocco: 13, // velocità della palla dopo un tocco (da terra o in salto)
  // Schiacciata, solo col comando: in aria, palla dal proprio lato sopra la rete e entro
  // margineSchiaccia dal cerchio di tocco. La palla va verso l'altro campo più in giù che può
  // (fino a schiacciaGiu) passando sopra la rete; in orizzontale da schiacciaVx a schiacciaVxMax,
  // più veloce quando serve per scendere anche da lontano.
  margineSchiaccia: 12,
  schiacciaVx: 16,
  schiacciaVxMax: 24,
  schiacciaGiu: 16,
  memoriaSchiaccia: 8, // tic in cui il comando premuto resta valido (premuto un filo prima)
  durataSchiaccia: 14, // tic di animazione; intanto chi ha schiacciato non ritocca la palla
  casa: [250, 750],
  altoBattuta: 330,
  attesa: 60, // tic fermi prima che la palla della battuta scenda
  pausaTocco: 12, // tic entro cui lo stesso contatto non conta come un tocco in più
  tocchiMax: 3,
  scartoIA: 30, // la CPU si mette dietro la palla di tanto, per mandarla verso la rete
  saltoIA: [70, 110, 220], // la CPU salta con la palla in discesa entro [0] in x e tra [1] e [2] sopra il centro
  schiacciaIA: 200, // la CPU schiaccia solo con la palla entro tanto dalla rete: da lontano la palla resta tesa e bassa
  // Altezze (docs/09 §5.5): chi è più alto tocca più in alto, ma poco. Scarto di portata =
  // kAltezza × (cm − CM_DEFAULT) × uPerCm, chiuso tra portataMin e portataMax; il salto è uguale
  // per tutti. Con portataMin = -12 la gattina (25 cm) arriva ancora saltando a una palla appena
  // sopra la rete (prova nei test); papà (187 cm) guadagna circa 5 unità.
  CM_DEFAULT: 170, // come altezza_default_cm di data/config-gioco.json
  kAltezza: 0.3,
  portataMin: -12,
  portataMax: 12,
} as const;

export type Lato = 0 | 1;
/** Palla: x, y del centro. */
export type Palla = { x: number; y: number; vx: number; vy: number };
/** Giocatore: x al centro, y ai piedi; cm = altezza del personaggio; schiaccia = tic di animazione rimasti. */
export type Corpo = Palla & { cm: number; schiaccia: number };

export type Comandi = { sx: boolean; dx: boolean; salta: boolean; schiaccia: boolean };
export const FERMO: Comandi = { sx: false, dx: false, salta: false, schiaccia: false };

/** Tutto JSON: si salva, si confronta, si rigioca. */
export type Stato = {
  tic: number;
  seme: number; // stato del generatore casuale
  palla: Palla;
  giocatori: [Corpo, Corpo];
  uPerCm: number; // unità di campo per cm: M.reteAlta / altezza vera della rete
  prima: [Comandi, Comandi]; // comandi del tic precedente: il salto parte sul fronte di pressione
  memoriaSalto: [number, number]; // tic rimasti al salto premuto in aria (0 = nessuno)
  memoriaSchiaccia: [number, number]; // tic rimasti al comando schiaccia premuto (0 = nessuno)
  punti: [number, number];
  durata: number; // tic di gioco: scaduti, la partita finisce al primo punto che non lascia la parità
  battuta: Lato;
  attesa: number; // tic che mancano alla discesa della palla di battuta
  tocchi: number; // tocchi di fila di latoTocchi
  latoTocchi: Lato | null;
  ticTocco: number; // tic dell'ultimo contatto
  mira: number; // da -1 a 1, estratta a ogni tocco: l'imprecisione della CPU
  vincitore: Lato | null;
};

/** mulberry32: [numero in 0..1, seme nuovo]. */
export function caso(seme: number): [number, number] {
  const a = (seme + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}

function estrai(s: Stato): number {
  const [v, seme] = caso(s.seme);
  s.seme = seme;
  return v;
}

function servi(s: Stato, lato: Lato): void {
  s.giocatori = [
    { x: M.casa[0], y: 0, vx: 0, vy: 0, cm: s.giocatori[0].cm, schiaccia: 0 },
    { x: M.casa[1], y: 0, vx: 0, vy: 0, cm: s.giocatori[1].cm, schiaccia: 0 },
  ];
  s.palla = { x: M.casa[lato], y: M.altoBattuta, vx: 0, vy: 0 };
  s.battuta = lato;
  s.attesa = M.attesa;
  s.tocchi = 0;
  s.latoTocchi = null;
  s.mira = estrai(s) * 2 - 1;
  s.memoriaSalto = [0, 0];
  s.memoriaSchiaccia = [0, 0];
}

/**
 * Partita nuova, a tempo: il seme decide chi batte per primo. durata in tic (secondi × HZ), dai
 * secondi di data/config-gioco.json; cm dei due lati e reteCm da pallavolo.altezze_cm e rete_cm.
 */
export function nuovaPartita(
  seme: number,
  durata: number,
  cm: [number, number] = [M.CM_DEFAULT, M.CM_DEFAULT],
  reteCm = 224,
): Stato {
  const s: Stato = {
    tic: 0,
    seme: seme | 0,
    palla: { x: 0, y: 0, vx: 0, vy: 0 },
    giocatori: [
      { x: 0, y: 0, vx: 0, vy: 0, cm: cm[0], schiaccia: 0 },
      { x: 0, y: 0, vx: 0, vy: 0, cm: cm[1], schiaccia: 0 },
    ],
    uPerCm: M.reteAlta / reteCm,
    prima: [FERMO, FERMO],
    memoriaSalto: [0, 0],
    memoriaSchiaccia: [0, 0],
    punti: [0, 0],
    durata,
    battuta: 0,
    attesa: 0,
    tocchi: 0,
    latoTocchi: null,
    ticTocco: 0,
    mira: 0,
    vincitore: null,
  };
  servi(s, estrai(s) < 0.5 ? 0 : 1);
  return s;
}

// Rally point, a tempo: vince chi ha più punti quando il tempo è scaduto. Lo scambio in corso si
// finisce sempre (si controlla solo a punto fatto) e in parità si va avanti: decide il punto dopo.
function punto(s: Stato, lato: Lato): void {
  s.punti[lato]++;
  if (s.tic >= s.durata && s.punti[0] !== s.punti[1])
    s.vincitore = s.punti[0] > s.punti[1] ? 0 : 1;
  else servi(s, lato);
}

const LATI = [0, 1] as const;
const MIN_X = [M.raggioG, M.reteX + M.reteMezza + M.raggioG];
const MAX_X = [M.reteX - M.reteMezza - M.raggioG, M.largo - M.raggioG];

function pareti(p: Palla): void {
  if (p.x < M.raggio) {
    p.x = M.raggio;
    p.vx = -p.vx;
  } else if (p.x > M.largo - M.raggio) {
    p.x = M.largo - M.raggio;
    p.vx = -p.vx;
  }
}

/**
 * Cerchio di tocco del giocatore (le mani alzate): [quota del centro sopra i piedi, raggio]. Il
 * centro è alla cima della testa della figura di default (mano × CM_DEFAULT × uPerCm) più lo
 * scarto di portata attenuato; il raggio è uguale per tutti.
 */
export function cerchio(s: Stato, g: Corpo): [number, number] {
  const d = Math.min(
    Math.max(M.kAltezza * (g.cm - M.CM_DEFAULT) * s.uPerCm, M.portataMin),
    M.portataMax,
  );
  return [M.mano * M.CM_DEFAULT * s.uPerCm + d, M.raggioG];
}

// rete: un'asta con la cima tonda. xPrima dice da che lato stava la palla: da sotto non passa.
function rete(p: Palla, xPrima: number): void {
  const dxR = p.x - M.reteX;
  const lim = M.raggio + M.reteMezza;
  if (p.y < M.reteAlta) {
    if (Math.abs(dxR) < lim || (xPrima - M.reteX) * dxR < 0) {
      const lato = xPrima < M.reteX ? -1 : 1;
      p.x = M.reteX + lato * lim;
      p.vx = lato * Math.abs(p.vx);
    }
  } else {
    const dy = p.y - M.reteAlta;
    const d2 = dxR * dxR + dy * dy;
    if (d2 < lim * lim) {
      const d = Math.sqrt(d2);
      const nx = d > 0 ? dxR / d : 0;
      const ny = d > 0 ? dy / d : 1;
      p.x = M.reteX + nx * lim;
      p.y = M.reteAlta + ny * lim;
      const vn = p.vx * nx + p.vy * ny;
      if (vn < 0) {
        p.vx -= 2 * vn * nx;
        p.vy -= 2 * vn * ny;
      }
    }
  }
}

/**
 * La palla si può schiacciare? Giocatore in aria e non già in schiacciata, palla dal suo lato e
 * sopra la rete, centro della palla entro margine dal cerchio di tocco.
 */
function aTiro(s: Stato, l: Lato, margine: number): boolean {
  const g = s.giocatori[l];
  const p = s.palla;
  if (g.y <= 0 || g.schiaccia > 0 || p.y <= M.reteAlta) return false;
  if (l === 0 ? p.x >= M.reteX : p.x <= M.reteX) return false;
  const [centro, raggio] = cerchio(s, g);
  const r = M.raggio + raggio + margine;
  const dx = p.x - g.x;
  const dy = p.y - g.y - centro;
  return r > 0 && dx * dx + dy * dy < r * r;
}

/**
 * Schiacciata del lato l. Dopo n tic la palla è a y + n·vy − g·n(n+1)/2 e deve essere ancora a
 * quota `sopra` quando ha superato la cima tonda della rete (x = reteX ± lim): la traiettoria
 * scende, quindi sopra la rete passa tutta. Si sceglie la vy più in giù che lo permette (non oltre
 * schiacciaGiu). Da lontano serve più velocità orizzontale per scendere: con vy = −1 il tempo
 * massimo è nGiu (radice di g/2·n² + (1+g/2)·n = h), da cui vx = distanza / nGiu, nei limiti.
 */
function schiaccia(p: Palla, l: Lato): void {
  const dir = l === 0 ? 1 : -1;
  const lim = M.raggio + M.reteMezza;
  const sopra = M.reteAlta + lim + 4;
  const dist = Math.abs(M.reteX + dir * lim - p.x);
  const h = p.y - sopra;
  const a = 1 + M.gravita / 2;
  const nGiu = h > 0 ? (Math.sqrt(a * a + 2 * M.gravita * h) - a) / M.gravita : 0;
  const vx = Math.min(
    nGiu > 0 ? Math.max(M.schiacciaVx, dist / nGiu) : M.schiacciaVxMax,
    M.schiacciaVxMax,
  );
  const n = Math.max(dist / vx, 1);
  p.vx = dir * vx;
  p.vy = Math.max(-M.schiacciaGiu, (sopra - p.y) / n + (M.gravita * (n + 1)) / 2);
}

/** Un sessantesimo di secondo. Non tocca lo stato ricevuto. A partita finita lo restituisce com'è. */
export function passo(
  prima: Stato,
  comandi: readonly [Comandi, Comandi],
): Stato {
  if (prima.vincitore !== null) return prima;
  const s: Stato = {
    ...prima,
    tic: prima.tic + 1,
    palla: { ...prima.palla },
    giocatori: [{ ...prima.giocatori[0] }, { ...prima.giocatori[1] }],
    punti: [prima.punti[0], prima.punti[1]],
    prima: [{ ...comandi[0] }, { ...comandi[1] }],
    memoriaSalto: [prima.memoriaSalto[0], prima.memoriaSalto[1]],
    memoriaSchiaccia: [prima.memoriaSchiaccia[0], prima.memoriaSchiaccia[1]],
  };

  // Comandi reattivi. Il salto parte solo su una pressione nuova (tenere il tasto non fa rimbalzare);
  // premuto in aria resta in memoria M.memoriaSalto tic e parte all'atterraggio. Niente "coyote"
  // (salto concesso appena lasciata terra): qui si lascia terra solo saltando.
  for (const l of LATI) {
    const g = s.giocatori[l];
    const c = comandi[l];
    if (c.salta && !prima.prima[l].salta) s.memoriaSalto[l] = M.memoriaSalto;
    if (s.memoriaSalto[l] > 0 && g.y === 0) {
      g.vy = M.salto;
      s.memoriaSalto[l] = 0;
    } else if (s.memoriaSalto[l] > 0) s.memoriaSalto[l]--;
    if (c.schiaccia && !prima.prima[l].schiaccia) s.memoriaSchiaccia[l] = M.memoriaSchiaccia;
    else if (s.memoriaSchiaccia[l] > 0) s.memoriaSchiaccia[l]--;
    if (g.schiaccia > 0) g.schiaccia--;
    // velocità verso quella voluta: si parte con accelG, si frena (o si inverte) con frenaG
    const voluta = ((c.dx ? 1 : 0) - (c.sx ? 1 : 0)) * M.passoG;
    const freno = voluta === 0 || g.vx * voluta < 0 ? M.frenaG : M.accelG;
    g.vx = g.vx < voluta ? Math.min(g.vx + freno, voluta) : Math.max(g.vx - freno, voluta);
    const x = Math.min(Math.max(g.x + g.vx, MIN_X[l]), MAX_X[l]);
    if (x !== g.x + g.vx) g.vx = 0; // contro la rete o il fondo ci si ferma
    g.x = x;
    g.vy -= M.gravitaG;
    g.y += g.vy;
    if (g.y <= 0) {
      g.y = 0;
      g.vy = 0;
    }
  }

  if (s.attesa > 0) {
    s.attesa--;
    return s;
  }

  const p = s.palla;
  const xPrima = p.x;
  p.vy = Math.max(p.vy - M.gravita, -M.vMax);
  p.x += p.vx;
  p.y += p.vy;
  pareti(p);

  rete(p, xPrima);
  const xLato = p.x;

  // tocchi: la palla riparte lungo la linea centro del giocatore → centro della palla, oppure,
  // con il comando, è schiacciata. La schiacciata automatica di prima (ogni tocco in aria più
  // forte) è tolta: col pulsante sarebbe stata un doppione, e una palla che parte forte senza
  // averlo chiesto è difficile da controllare per chi gioca.
  for (const l of LATI) {
    const g = s.giocatori[l];
    if (g.schiaccia > 0) continue; // ha appena schiacciato: la palla se ne va, non la ritocca
    const [centro, raggio] = cerchio(s, g);
    const R = M.raggio + raggio;
    const cx = g.x;
    const cy = g.y + centro;
    const dx = p.x - cx;
    const dy = p.y - cy;
    const d2 = dx * dx + dy * dy;
    if (s.memoriaSchiaccia[l] > 0 && aTiro(s, l, M.margineSchiaccia)) {
      schiaccia(p, l);
      g.schiaccia = M.durataSchiaccia;
      s.memoriaSchiaccia[l] = 0;
    } else {
      if (d2 >= R * R) continue;
      const d = Math.sqrt(d2);
      const nx = d > 0 ? dx / d : 0;
      const ny = d > 0 ? dy / d : 1;
      p.x = cx + nx * R;
      p.y = cy + ny * R;
      p.vx = nx * M.tocco;
      p.vy = ny * M.tocco;
    }
    const nuovo = s.latoTocchi !== l || s.tic - s.ticTocco > M.pausaTocco;
    s.ticTocco = s.tic;
    if (!nuovo) continue;
    s.tocchi = s.latoTocchi === l ? s.tocchi + 1 : 1;
    s.latoTocchi = l;
    s.mira = estrai(s) * 2 - 1;
    if (s.tocchi > M.tocchiMax) {
      pareti(p);
      punto(s, l === 0 ? 1 : 0);
      return s;
    }
  }
  // un tocco a ridosso della rete o del muro non deve spingere la palla dall'altra parte
  rete(p, xLato);
  pareti(p);

  if (p.y - M.raggio <= 0) punto(s, p.x < M.reteX ? 1 : 0);
  return s;
}

/**
 * CPU: funzione pura dello stato. Va dove scenderà la palla, un po' dietro per mandarla verso la
 * rete; dal secondo tocco salta e, se la palla è a tiro, schiaccia. `errore` (in unità di campo) è
 * quanto sbaglia la mira: 0 = precisa. Sbaglia anche il tempo della schiacciata: preme quando la
 * palla è entro margineSchiaccia + mira × errore, cioè a volte troppo presto (il comando scade) o
 * mai (tocco normale). mira cambia a ogni tocco: deterministico, senza estrazioni in più.
 * ponytail: la previsione ignora la rete; se la CPU sembra tonta sotto rete, aggiungerla qui.
 */
export function ia(s: Stato, lato: Lato, errore: number): Comandi {
  const g = s.giocatori[lato];
  let { x, y, vx, vy } = s.palla;
  const [centro, raggio] = cerchio(s, g);
  const quota = centro + raggio + M.raggio;
  for (let i = 0; i < 300 && (vy > 0 || y > quota); i++) {
    vy = Math.max(vy - M.gravita, -M.vMax);
    x += vx;
    y += vy;
    if (x < M.raggio) {
      x = M.raggio;
      vx = -vx;
    } else if (x > M.largo - M.raggio) {
      x = M.largo - M.raggio;
      vx = -vx;
    }
  }
  const mia = lato === 0 ? x < M.reteX : x > M.reteX;
  const meta = mia
    ? x + (lato === 0 ? -1 : 1) * M.scartoIA + s.mira * errore
    : M.casa[lato];
  const dx = meta - g.x;
  const alta = s.palla.y - (g.y + centro);
  const salta =
    mia &&
    s.attesa === 0 &&
    s.tocchi >= 1 &&
    s.palla.vy < 0 &&
    Math.abs(s.palla.x - g.x) < M.saltoIA[0] &&
    alta > M.saltoIA[1] &&
    alta < M.saltoIA[2];
  const schiaccia =
    Math.abs(s.palla.x - M.reteX) < M.schiacciaIA &&
    aTiro(s, lato, M.margineSchiaccia + s.mira * errore);
  return { sx: dx < -M.passoG, dx: dx > M.passoG, salta, schiaccia };
}
