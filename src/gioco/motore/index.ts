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
  raggioG: 50, // giocatore: un cerchio (testa e mani) col centro a centroG dai piedi
  centroG: 60,
  passoG: 6,
  salto: 13,
  gravitaG: 0.6,
  tocco: 13, // velocità della palla dopo un tocco da terra
  schiacciata: 17, // dopo un tocco in salto
  casa: [250, 750],
  altoBattuta: 330,
  attesa: 60, // tic fermi prima che la palla della battuta scenda
  pausaTocco: 12, // tic entro cui lo stesso contatto non conta come un tocco in più
  tocchiMax: 3,
  scartoIA: 30, // la CPU si mette dietro la palla di tanto, per mandarla verso la rete
} as const;

export type Lato = 0 | 1;
/** Palla: x, y del centro. Giocatore: x al centro, y ai piedi. */
export type Corpo = { x: number; y: number; vx: number; vy: number };
export type Comandi = { sx: boolean; dx: boolean; salta: boolean };
export const FERMO: Comandi = { sx: false, dx: false, salta: false };

/** Tutto JSON: si salva, si confronta, si rigioca. */
export type Stato = {
  tic: number;
  seme: number; // stato del generatore casuale
  palla: Corpo;
  giocatori: [Corpo, Corpo];
  punti: [number, number];
  puntiSet: number;
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
    { x: M.casa[0], y: 0, vx: 0, vy: 0 },
    { x: M.casa[1], y: 0, vx: 0, vy: 0 },
  ];
  s.palla = { x: M.casa[lato], y: M.altoBattuta, vx: 0, vy: 0 };
  s.battuta = lato;
  s.attesa = M.attesa;
  s.tocchi = 0;
  s.latoTocchi = null;
  s.mira = estrai(s) * 2 - 1;
}

/** Partita nuova: il seme decide chi batte per primo. puntiSet viene da data/config-gioco.json. */
export function nuovaPartita(seme: number, puntiSet: number): Stato {
  const s: Stato = {
    tic: 0,
    seme: seme | 0,
    palla: { x: 0, y: 0, vx: 0, vy: 0 },
    giocatori: [
      { x: 0, y: 0, vx: 0, vy: 0 },
      { x: 0, y: 0, vx: 0, vy: 0 },
    ],
    punti: [0, 0],
    puntiSet,
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

// rally point; il set si vince a puntiSet con due punti di scarto
function punto(s: Stato, lato: Lato): void {
  s.punti[lato]++;
  if (
    s.punti[lato] >= s.puntiSet &&
    s.punti[lato] - s.punti[lato === 0 ? 1 : 0] >= 2
  )
    s.vincitore = lato;
  else servi(s, lato);
}

const LATI = [0, 1] as const;
const MIN_X = [M.raggioG, M.reteX + M.reteMezza + M.raggioG];
const MAX_X = [M.reteX - M.reteMezza - M.raggioG, M.largo - M.raggioG];

function pareti(p: Corpo): void {
  if (p.x < M.raggio) {
    p.x = M.raggio;
    p.vx = -p.vx;
  } else if (p.x > M.largo - M.raggio) {
    p.x = M.largo - M.raggio;
    p.vx = -p.vx;
  }
}

// rete: un'asta con la cima tonda. xPrima dice da che lato stava la palla: da sotto non passa.
function rete(p: Corpo, xPrima: number): void {
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
  };

  for (const l of LATI) {
    const g = s.giocatori[l];
    const c = comandi[l];
    g.vx = ((c.dx ? 1 : 0) - (c.sx ? 1 : 0)) * M.passoG;
    if (c.salta && g.y === 0) g.vy = M.salto;
    g.x = Math.min(Math.max(g.x + g.vx, MIN_X[l]), MAX_X[l]);
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

  // tocchi: la palla riparte lungo la linea centro del giocatore → centro della palla
  const R = M.raggio + M.raggioG;
  for (const l of LATI) {
    const g = s.giocatori[l];
    const cx = g.x;
    const cy = g.y + M.centroG;
    const dx = p.x - cx;
    const dy = p.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= R * R) continue;
    const d = Math.sqrt(d2);
    const nx = d > 0 ? dx / d : 0;
    const ny = d > 0 ? dy / d : 1;
    const forza = g.y > 0 ? M.schiacciata : M.tocco;
    p.x = cx + nx * R;
    p.y = cy + ny * R;
    p.vx = nx * forza;
    p.vy = ny * forza;
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
 * rete; dal secondo tocco salta. `errore` (in unità di campo) è quanto sbaglia la mira: 0 = precisa.
 * ponytail: la previsione ignora la rete; se la CPU sembra tonta sotto rete, aggiungerla qui.
 */
export function ia(s: Stato, lato: Lato, errore: number): Comandi {
  const g = s.giocatori[lato];
  let { x, y, vx, vy } = s.palla;
  const quota = M.centroG + M.raggioG + M.raggio;
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
  const alta = s.palla.y - (g.y + M.centroG);
  const salta =
    mia &&
    s.attesa === 0 &&
    s.tocchi >= 1 &&
    s.palla.vy < 0 &&
    Math.abs(s.palla.x - g.x) < 70 &&
    alta > 110 &&
    alta < 220;
  return { sx: dx < -M.passoG, dx: dx > M.passoG, salta };
}
