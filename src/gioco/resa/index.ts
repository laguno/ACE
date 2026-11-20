// Disegno di un frame: fondale, giocatori, palla, pillola del punteggio con le barre della mossa, scritte.
import { HZ, M, type Corpo, type Palla, type Stato } from '../motore';
import { INCHIOSTRO, RAGGIO_PALLA, SCOSSA_PX } from './comune';
import { fondale, PARALLASSE, type Fondale } from './campo';
import { disegnaGiocatore } from './giocatore';
import { disegnaPalla, type Effetti } from './palla';

export { TRAUMA_CALO, TRAUMA_COLPO, TRAUMA_MOSSA, immagine } from './comune';
export { FIAMME, nuoviEffetti, scoppio } from './palla';

const PASSO_MS = 1000 / HZ;
// Il pavimento (linea dei piedi) sta subito sopra i pulsanti, misurati sulla pagina (bordo sicuro
// compreso): giocatori e palla, che non scendono mai sotto i piedi, non finiscono mai sotto un
// pulsante, in nessun punto del campo. Sotto c'è il pavimento in primo piano.
const SOPRA_TASTI = 26; // px CSS tra la cima dei pulsanti e i piedi (ci sta l'anello di Schiaccia acceso)
export const FONDO_RISERVA = 126; // px CSS se i pulsanti non si possono misurare
const VISTA_MIN = 340; // unità che si vedono almeno sopra il pavimento: la palla della battuta (330) quasi tutta
const DPR_MAX = 2; // oltre non si vede la differenza e il telefono scalda
export const PUNTO_MS = 1200; // quanto resta la scritta del punto
export const MOSSA_MS = 1000; // quanto resta il nome della mossa finale
const BARRA_CHIARA = '#d9c2ff'; // barra della mossa: dal viola chiaro...
const BARRA_SCURA = '#4a148c'; // ...al viola scuro

/** I due in campo, scelti nella selezione: figurina, verso, nome, colore. */
export type Squadra = {
  figure: [HTMLImageElement, HTMLImageElement];
  specchio: [boolean, boolean];
  nomi: [string, string];
  colori: [string, string];
};

/** Quello che si disegna: tra il tic di prima e quello nuovo (interpolazione), oggetti riusati. */
export type Vista = { palla: Palla; giocatori: [Corpo, Corpo] };
const corpoVuoto = (): Corpo => ({ x: 0, y: 0, vx: 0, vy: 0, cm: 0, schiaccia: 0 });
export const nuovaVista = (): Vista => ({ palla: { x: 0, y: 0, vx: 0, vy: 0 }, giocatori: [corpoVuoto(), corpoVuoto()] });
function mescola(d: Palla, a: Palla, b: Palla, t: number) {
  // un salto lungo è una battuta nuova (tutti a casa): lì niente scivolata
  const nuovo = Math.abs(b.x - a.x) > 80 || Math.abs(b.y - a.y) > 80;
  d.x = nuovo ? b.x : a.x + (b.x - a.x) * t;
  d.y = nuovo ? b.y : a.y + (b.y - a.y) * t;
  d.vx = b.vx;
  d.vy = b.vy;
}
export function interpola(v: Vista, a: Stato, b: Stato, t: number) {
  mescola(v.palla, a.palla, b.palla, t);
  for (const l of [0, 1] as const) {
    mescola(v.giocatori[l], a.giocatori[l], b.giocatori[l], t);
    v.giocatori[l].cm = b.giocatori[l].cm;
    v.giocatori[l].schiaccia = b.giocatori[l].schiaccia;
  }
}

/** Pillola del punteggio: si ridisegna solo quando cambia qualcosa. barre = dove stanno le barre della mossa. */
type Barra = { x: number; y: number; w: number; h: number };
type Hud = { tela: HTMLCanvasElement; chiave: number; carica: number; barre: [Barra, Barra] };
function hud(o: Hud | null, nomi: [string, string], s: Stato, secondi: number, dpr: number): Hud {
  const { punti } = s;
  const pieno = [s.carica[0] / s.caricaMax, s.carica[1] / s.caricaMax].map((v) => Math.max(0, Math.min(1, v)));
  // chiavi numeriche: niente stringhe nuove a ogni frame quando non cambia niente
  const chiave = ((punti[0] * 1000 + punti[1]) * 10000 + secondi) * 100 + dpr * 10 + (document.fonts.status === 'loaded' ? 1 : 0);
  const carica = Math.round(pieno[0] * 100) * 1000 + Math.round(pieno[1] * 100);
  if (o && o.chiave === chiave && o.carica === carica) return o;
  const tempo = `${Math.floor(secondi / 60)}:${String(secondi % 60).padStart(2, '0')}`;
  const tela = o?.tela ?? document.createElement('canvas');
  const vuote: [Barra, Barra] = [
    { x: 0, y: 0, w: 0, h: 0 },
    { x: 0, y: 0, w: 0, h: 0 },
  ];
  const ctx = tela.getContext('2d');
  if (!ctx) return { tela, chiave, carica, barre: vuote };
  const NOMI = `800 ${20 * dpr}px Nunito, sans-serif`;
  const NUMERI = `800 ${32 * dpr}px "Baloo 2", sans-serif`;
  const TEMPO = `800 ${22 * dpr}px Nunito, sans-serif`;
  const numeri = `${punti[0]} · ${punti[1]}`;
  ctx.font = NOMI;
  const barraMin = 60 * dpr;
  const wA = Math.max(ctx.measureText(nomi[0]).width, barraMin);
  const wB = Math.max(ctx.measureText(nomi[1]).width, barraMin);
  ctx.font = NUMERI;
  const wNum = ctx.measureText(numeri).width;
  const pad = 18 * dpr;
  const gap = 12 * dpr;
  const larga = Math.ceil(pad * 2 + wA + wNum + wB + gap * 2);
  tela.width = larga;
  tela.height = Math.ceil(78 * dpr);
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = INCHIOSTRO;
  ctx.beginPath();
  ctx.roundRect(0, 0, tela.width, tela.height, 22 * dpr);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = NOMI;
  ctx.textAlign = 'left';
  ctx.fillText(nomi[0], pad, 30 * dpr);
  ctx.textAlign = 'right';
  ctx.fillText(nomi[1], larga - pad, 30 * dpr);
  // barre della mossa, sotto i nomi: il colore va dal viola chiaro al viola scuro man mano che si riempie
  const barre: [Barra, Barra] = [
    { x: pad, y: 38 * dpr, w: wA, h: 10 * dpr },
    { x: larga - pad - wB, y: 38 * dpr, w: wB, h: 10 * dpr },
  ];
  barre.forEach((b, l) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, b.h / 2);
    ctx.fill();
    if (pieno[l] <= 0) return;
    const g = ctx.createLinearGradient(b.x, 0, b.x + b.w, 0);
    g.addColorStop(0, BARRA_CHIARA);
    g.addColorStop(1, BARRA_SCURA);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, Math.max(b.h, b.w * pieno[l]), b.h, b.h / 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, b.h / 2);
    ctx.stroke();
  });
  ctx.font = NUMERI;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffe27a';
  ctx.fillText(numeri, pad + wA + gap, 44 * dpr);
  ctx.textAlign = 'center';
  ctx.font = TEMPO;
  ctx.fillStyle = '#f3e6fd';
  ctx.fillText(tempo, larga / 2, 70 * dpr);
  return { tela, chiave, carica, barre };
}

/** Barra piena: bagliore attorno e lingue di fuoco che ballano sopra (ferme se si chiede meno movimento). */
function fiammeBarra(ctx: CanvasRenderingContext2D, b: Barra, ox: number, oy: number, dpr: number, ora: number, calmo: boolean) {
  const x = ox + b.x;
  const y = oy + b.y;
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = '#ff8a00';
  ctx.beginPath();
  ctx.roundRect(x - 4 * dpr, y - 4 * dpr, b.w + 8 * dpr, b.h + 8 * dpr, b.h);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (calmo) return;
  const n = Math.max(4, Math.round(b.w / (10 * dpr)));
  for (const [colore, scala] of [
    ['#ff6a00', 1],
    ['#ffd54a', 0.55],
  ] as const) {
    ctx.fillStyle = colore;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const cx = x + ((i + 0.5) * b.w) / n;
      const alto = (7 + 5 * Math.sin(ora / 70 + i * 1.9)) * dpr * scala;
      const mezzo = (b.w / n / 2) * scala;
      ctx.moveTo(cx - mezzo, y + 2 * dpr);
      ctx.quadraticCurveTo(cx + Math.sin(ora / 50 + i) * 2 * dpr, y - alto * 0.4, cx, y - alto);
      ctx.quadraticCurveTo(cx, y - alto * 0.4, cx + mezzo, y + 2 * dpr);
    }
    ctx.fill();
  }
}

export type Tela = {
  ctx: CanvasRenderingContext2D;
  fondale: Fondale | null;
  hud: Hud | null;
  fondo: number;
  misura: number;
  squadra: Squadra;
  calmo: MediaQueryList;
};

/** a = vista interpolata; f = frame a 60 Hz di animazione (0 in pausa); scossa in px CSS. */
export function disegna(c: HTMLCanvasElement, t: Tela, s: Stato, a: Vista, e: Effetti, f: number, ora: number) {
  const { ctx, squadra } = t;
  const dpr = Math.min(DPR_MAX, window.devicePixelRatio || 1);
  const w = Math.round(c.clientWidth * dpr);
  const h = Math.round(c.clientHeight * dpr);
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  if (t.misura !== w * 100000 + h) {
    // a ogni nuova misura di schermo: cima dei pulsanti → linea dei piedi
    t.misura = w * 100000 + h;
    const cime = [...document.querySelectorAll('.gioco-freccia, .gioco-tasti button')].map((b) => b.getBoundingClientRect().top);
    t.fondo = cime.length ? c.clientHeight - Math.min(...cime) + SOPRA_TASTI : FONDO_RISERVA;
  }
  const terra = h - t.fondo * dpr; // linea dei piedi
  const k = Math.min(w / M.largo, terra / VISTA_MIN);
  const ox = (w - M.largo * k) / 2;
  const sh = e.trauma * e.trauma;
  const dx = SCOSSA_PX[0] * dpr * sh * Math.sin(e.tempoScossa * 1.7);
  const dy = SCOSSA_PX[1] * dpr * sh * Math.sin(e.tempoScossa * 2.3);

  t.fondale = fondale(t.fondale, w, h, terra, k, ox, dpr);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const m = t.fondale.margine;
  const parallasse = ((M.reteX - a.palla.x) / M.reteX) * PARALLASSE * dpr; // lo sfondo è lontano: si muove poco
  ctx.drawImage(t.fondale.sfondo, -m + dx + parallasse, -m + dy);
  ctx.drawImage(t.fondale.campo, -m + dx, -m + dy);

  ctx.setTransform(k, 0, 0, k, ox + dx, terra + dy);
  // personaggi all'altezza vera: cm × unità per cm (docs/09 §3.3)
  a.giocatori.forEach((g, l) => disegnaGiocatore(ctx, g, l, squadra.figure[l], squadra.specchio[l], g.cm * s.uPerCm, e.moto[l], f, ora));
  disegnaPalla(ctx, a.palla, e, f, dpr / k, ora);

  // in px dello schermo: pillola del punteggio, segno della palla fuori schermo, scritte
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  t.hud = hud(t.hud, squadra.nomi, s, Math.ceil(Math.max(0, s.durata - s.tic) / HZ), dpr);
  const hx = Math.round((w - t.hud.tela.width) / 2);
  const hy = Math.round(8 * dpr);
  for (const l of [0, 1] as const)
    if (s.carica[l] >= s.caricaMax) fiammeBarra(ctx, t.hud.barre[l], hx, hy, dpr, ora, t.calmo.matches);
  ctx.drawImage(t.hud.tela, hx, hy);

  const p = a.palla;
  if ((p.y - RAGGIO_PALLA) * k > terra + dy) {
    const x = ox + dx + p.x * k;
    const sotto = x > hx - 24 * dpr && x < hx + t.hud.tela.width + 24 * dpr; // mai sotto la pillola
    const y = sotto ? hy + t.hud.tela.height + 6 * dpr : 6 * dpr;
    ctx.fillStyle = '#ffe27a';
    ctx.strokeStyle = INCHIOSTRO;
    ctx.lineWidth = 3 * dpr;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 14 * dpr, y + 22 * dpr);
    ctx.lineTo(x + 14 * dpr, y + 22 * dpr);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  if (e.punto > 0) {
    const tt = 1 - e.punto / PUNTO_MS;
    const z = dpr * (1 + 0.35 * Math.max(0, 1 - tt * 6)); // entra grande e si assesta
    ctx.globalAlpha = Math.min(1, e.punto / 250);
    ctx.setTransform(z, 0, 0, z, w / 2, terra * 0.42);
    ctx.font = '800 64px "Baloo 2", sans-serif';
    ctx.lineWidth = 12;
    ctx.strokeStyle = e.puntoLani ? '#7b2342' : '#ffffff';
    ctx.fillStyle = e.puntoLani ? '#ffe27a' : '#7b6ae0';
    const testo = e.puntoLani ? 'Punto!' : `Punto di ${squadra.nomi[1]}`;
    ctx.strokeText(testo, 0, 0);
    ctx.fillText(testo, 0, 0);
    ctx.globalAlpha = 1;
    e.punto -= f * PASSO_MS;
  }

  // nome della mossa finale, grande, col colore del personaggio; sotto la scritta del punto
  if (e.mossa > 0) {
    const tt = 1 - e.mossa / MOSSA_MS;
    ctx.font = '800 56px "Baloo 2", sans-serif';
    const largo = ctx.measureText(e.mossaTesto).width + 12;
    const z = Math.min(dpr * (1 + 0.5 * Math.max(0, 1 - tt * 5)), (w * 0.92) / largo); // i nomi lunghi stanno nello schermo
    ctx.globalAlpha = Math.min(1, e.mossa / 200);
    ctx.setTransform(z, 0, 0, z, w / 2, terra * 0.64);
    ctx.lineWidth = 12;
    ctx.strokeStyle = INCHIOSTRO;
    ctx.fillStyle = e.mossaColore;
    ctx.strokeText(e.mossaTesto, 0, 0);
    ctx.fillText(e.mossaTesto, 0, 0);
    ctx.globalAlpha = 1;
    e.mossa -= f * PASSO_MS;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
