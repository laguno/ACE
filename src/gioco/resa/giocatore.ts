// Disegno di un giocatore: figurina all'altezza vera, con schiacciamento, corsa, respiro e schiacciata.
import { M, type Corpo } from '../motore';
import { INCHIOSTRO, Y, pronta } from './comune';

const SOGLIA_ALFA = 20; // sopra questa opacità un pixel è figura

/** Parte non trasparente della figurina (dalla testa ai piedi) e x dei piedi, misurate una volta. */
type Riquadro = { x: number; y: number; w: number; h: number; piede: number };
const riquadri = new Map<HTMLImageElement, Riquadro>();
function riquadro(img: HTMLImageElement): Riquadro {
  const visto = riquadri.get(img);
  if (visto) return visto;
  const { naturalWidth: w, naturalHeight: h } = img;
  let r: Riquadro = { x: 0, y: 0, w, h, piede: w / 2 };
  const tela = Object.assign(document.createElement('canvas'), { width: w, height: h });
  const ctx = tela.getContext('2d', { willReadFrequently: true });
  if (ctx) {
    ctx.drawImage(img, 0, 0);
    const a = ctx.getImageData(0, 0, w, h).data;
    const piena = (x: number, y: number) => a[(y * w + x) * 4 + 3] > SOGLIA_ALFA;
    let [x0, y0, x1, y1] = [w, h, -1, -1];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (piena(x, y)) {
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          y0 = Math.min(y0, y);
          y1 = y;
        }
    if (x1 >= 0) {
      // i piedi: centro dei pixel pieni nelle righe più basse (l'ultimo 4% della figura)
      let somma = 0;
      let n = 0;
      for (let y = y1 - Math.max(2, Math.round((y1 - y0) * 0.04)); y <= y1; y++)
        for (let x = x0; x <= x1; x++)
          if (piena(x, y)) {
            somma += x;
            n++;
          }
      r = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, piede: somma / n + 0.5 };
    }
  }
  riquadri.set(img, r);
  return r;
}

/** Stato della sola animazione, ricavato da y/vx/vy tra un frame e l'altro: il motore non lo sa. */
export type Moto = { y: number; fase: number; stacco: number; atterra: number; durataSch: number };
export const nuovoMoto = (): Moto => ({ y: 0, fase: 0, stacco: 0, atterra: 0, durataSch: 0 });
const STACCO = 5; // frame (a 60 Hz) di schiacciamento alla spinta del salto
const ATTERRA = 8; // frame di schiacciamento all'atterraggio

/**
 * f = frame a 60 Hz passati dall'ultimo disegno; alto = altezza vera in unità del motore;
 * specchio = la figurina si ribalta per guardare la rete.
 */
export function disegnaGiocatore(
  ctx: CanvasRenderingContext2D,
  g: Corpo,
  l: number,
  fig: HTMLImageElement,
  specchio: boolean,
  alto: number,
  m: Moto,
  f: number,
  ora: number,
) {
  if (g.y > 0 && m.y <= 0) m.stacco = STACCO;
  if (g.y <= 0 && m.y > 0) m.atterra = ATTERRA;
  m.y = g.y;
  m.stacco = Math.max(0, m.stacco - f);
  m.atterra = Math.max(0, m.atterra - f);
  if (g.schiaccia <= 0) m.durataSch = 0;
  else if (m.durataSch === 0) m.durataSch = g.schiaccia;

  // tutto attorno ai piedi: a riposo l'altezza resta quella vera (il respiro muove lo 0,6%)
  let sy: number; // allungamento verticale
  let giro = 0; // inclinazione
  let su = 0; // saltello della corsa
  const corsa = Math.min(1, Math.abs(g.vx) / M.passoG);
  if (g.y > 0) {
    // in salita si stira, in discesa torna dritto; appena staccato è ancora schiacciato dalla spinta
    const volo = 1 + Math.max(-0.04, Math.min(0.12, g.vy * 0.01));
    const t = m.stacco / STACCO;
    sy = volo * (1 - t) + 0.86 * t;
  } else if (m.atterra > 0) sy = 1 - 0.16 * (m.atterra / ATTERRA);
  else if (corsa > 0.05) {
    m.fase += Math.abs(g.vx) * f * 0.09;
    su = Math.abs(Math.sin(m.fase)) * 5 * corsa;
    sy = 1 - 0.035 * Math.abs(Math.cos(m.fase)) * corsa;
    giro = Math.sign(g.vx) * 0.13 * corsa; // il busto va avanti nel verso di marcia
  } else sy = 1 + 0.006 * Math.sin((ora / 1000) * 2 * Math.PI * 0.55 + l * 2); // respiro
  const sx = 2 - sy; // il volume resta più o meno quello

  // ombra a terra: si stringe e sbiadisce quando sale
  const r = pronta(fig) ? riquadro(fig) : null;
  const k = r ? alto / r.h : 1;
  const largo = r ? r.w * k : M.raggioG * 2;
  const via = 1 + g.y / 140;
  ctx.globalAlpha = 0.3 / via;
  ctx.fillStyle = INCHIOSTRO;
  ctx.beginPath();
  ctx.ellipse(g.x, Y(0), (largo * 0.36) / via, (largo * 0.08) / via, 0, 0, 7);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.translate(g.x, Y(g.y + su));
  ctx.rotate(giro);
  if (m.durataSch > 0) {
    // schiacciata: indietro col busto e poi giù di frusta verso la rete, attorno ai fianchi
    const p = 1 - g.schiaccia / m.durataSch;
    const versoRete = l === 0 ? 1 : -1;
    ctx.translate(0, -alto * 0.5);
    ctx.rotate(-versoRete * Math.sin(p * 2 * Math.PI) * 0.4);
    ctx.translate(0, alto * 0.5);
  }
  ctx.scale(specchio ? -sx : sx, sy);
  if (r) ctx.drawImage(fig, r.x, r.y, r.w, r.h, -(r.piede - r.x) * k, -alto, r.w * k, alto);
  else {
    ctx.fillStyle = l === 0 ? '#c2185b' : '#7b6ae0';
    ctx.beginPath();
    ctx.arc(0, -M.centroG, M.raggioG, 0, 7);
    ctx.fill();
  }
  ctx.restore();
}
