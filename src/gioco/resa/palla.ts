// Palla ed effetti che vivono solo nel disegno: scia, linee di velocità, scintille, fiamme della mossa finale.
import type { Palla } from '../motore';
import { FIGURE, INCHIOSTRO, RAGGIO_PALLA, Y, pronta } from './comune';
import { nuovoMoto, type Moto } from './giocatore';

/** Effetti che vivono solo nel disegno (tempi in frame a 60 Hz, "punto" e "mossa" in ms). */
type Scintilla = { x: number; y: number; vx: number; vy: number; vita: number };
export type Effetti = {
  moto: Moto[];
  scia: { x: number; y: number }[]; // anello di posizioni della palla, riusato
  sciaN: number;
  sciaI: number;
  scintille: Scintilla[];
  linee: number; // frame rimasti delle linee di velocità della schiacciata
  fiamme: number; // frame rimasti della scia di fiamme della mossa finale
  trauma: number;
  tempoScossa: number;
  punto: number;
  puntoLani: boolean;
  mossa: number; // ms rimasti della scritta della mossa finale
  mossaTesto: string;
  mossaColore: string;
  mossaLato: number;
};
const SCIA = 7;
const LINEE = 14;
export const FIAMME = 90; // frame di scia di fiamme dopo la mossa finale
const VITA_SCINTILLA = 20;
export const nuoviEffetti = (): Effetti => ({
  moto: [nuovoMoto(), nuovoMoto()],
  scia: Array.from({ length: SCIA }, () => ({ x: 0, y: 0 })),
  sciaN: 0,
  sciaI: 0,
  scintille: [],
  linee: 0,
  fiamme: 0,
  trauma: 0,
  tempoScossa: 0,
  punto: 0,
  puntoLani: false,
  mossa: 0,
  mossaTesto: '',
  mossaColore: '',
  mossaLato: 0,
});

/** trauma = quanto tremolio aggiunge (0 = niente, per chi chiede meno movimento); n = scintille. */
export function scoppio(e: Effetti, x: number, y: number, trauma: number, n = 18) {
  e.trauma = Math.min(1, e.trauma + trauma);
  e.linee = LINEE;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI + Math.random() * 0.4;
    const v = 4 + Math.random() * 6;
    // dal bordo della palla in fuori: la palla resta sempre visibile
    const fuori = RAGGIO_PALLA + 6;
    e.scintille.push({ x: x + Math.cos(a) * fuori, y: y + Math.sin(a) * fuori, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vita: VITA_SCINTILLA });
  }
}

/** px = unità del campo per 1 px CSS. */
export function disegnaPalla(ctx: CanvasRenderingContext2D, p: Palla, e: Effetti, f: number, px: number, ora: number) {
  const r = RAGGIO_PALLA;
  const py = Math.max(p.y, r); // disegnata più grande: a terra poggia sul pavimento, non ci affonda
  // ombra a terra, sempre e ben visibile: si stringe con la quota e dice dove scendere
  const via = 1 + p.y / 220;
  ctx.globalAlpha = Math.max(0.3, 0.55 / via);
  ctx.fillStyle = INCHIOSTRO;
  ctx.beginPath();
  ctx.ellipse(p.x, Y(0), (r * 1.1) / via, (r * 0.32) / via, 0, 0, 7);
  ctx.fill();

  // scia quando va forte; dopo la mossa finale è di fiamme e c'è sempre
  const veloce = p.vx * p.vx + p.vy * p.vy > 81;
  const fuoco = e.fiamme > 0;
  if (!veloce && !fuoco) e.sciaN = 0;
  else {
    for (let i = 0; i < e.sciaN; i++) {
      const q = e.scia[(e.sciaI - e.sciaN + i + SCIA) % SCIA];
      const t = (i + 1) / (e.sciaN + 1);
      if (fuoco) {
        // lingue arancioni con il cuore giallo, che tremolano
        const tremo = 1 + 0.15 * Math.sin(ora / 40 + i * 2);
        ctx.globalAlpha = 0.75 * t * Math.min(1, e.fiamme / 30);
        ctx.fillStyle = '#ff6a00';
        ctx.beginPath();
        ctx.arc(q.x, Y(q.y), r * (0.6 + 0.7 * t) * tremo, 0, 7);
        ctx.fill();
        ctx.fillStyle = '#ffd54a';
        ctx.beginPath();
        ctx.arc(q.x, Y(q.y), r * (0.3 + 0.4 * t) * tremo, 0, 7);
        ctx.fill();
      } else {
        ctx.fillStyle = '#ffe27a';
        ctx.globalAlpha = 0.45 * t;
        ctx.beginPath();
        ctx.arc(q.x, Y(q.y), r * (0.4 + 0.5 * t), 0, 7);
        ctx.fill();
      }
    }
    if (f > 0) {
      e.scia[e.sciaI].x = p.x;
      e.scia[e.sciaI].y = p.y;
      e.sciaI = (e.sciaI + 1) % SCIA;
      e.sciaN = Math.min(SCIA, e.sciaN + 1);
    }
  }
  e.fiamme = Math.max(0, e.fiamme - f);

  // schiacciata: linee di velocità dietro la palla
  if (e.linee > 0) {
    const v = Math.hypot(p.vx, p.vy) || 1;
    const dx = p.vx / v;
    const dy = -p.vy / v; // in tela y va in giù
    ctx.globalAlpha = e.linee / LINEE;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4 * px;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      const sx = p.x - dx * (r + 8) - dy * i * r * 0.45;
      const sy = Y(py) - dy * (r + 8) + dx * i * r * 0.45;
      const lungo = (i % 2 === 0 ? 70 : 45) * (0.5 + (0.5 * e.linee) / LINEE);
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - dx * lungo, sy - dy * lungo);
    }
    ctx.stroke();
    e.linee = Math.max(0, e.linee - f);
  }
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.translate(p.x, Y(py));
  ctx.rotate(p.x * 0.02);
  if (pronta(FIGURE.palla)) ctx.drawImage(FIGURE.palla, -r, -r, r * 2, r * 2);
  else {
    ctx.fillStyle = '#ffe27a';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, 7);
    ctx.fill();
  }
  ctx.restore();
  // bordo scuro di 3 px e anello chiaro fuori: la palla si stacca da ogni sfondo
  ctx.lineWidth = 3 * px;
  ctx.strokeStyle = INCHIOSTRO;
  ctx.beginPath();
  ctx.arc(p.x, Y(py), r, 0, 7);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(p.x, Y(py), r + 3 * px, 0, 7);
  ctx.stroke();

  // scintille: si muovono solo fuori dalla pausa; la lista si compatta sul posto
  ctx.fillStyle = '#ffe27a';
  let n = 0;
  for (const z of e.scintille) {
    z.x += z.vx * f;
    z.y += z.vy * f;
    z.vy -= 0.25 * f;
    z.vita -= f;
    if (z.vita <= 0) continue;
    const t = z.vita / VITA_SCINTILLA;
    ctx.globalAlpha = t;
    ctx.beginPath();
    ctx.arc(z.x, Y(z.y), 3 + 5 * t, 0, 7);
    ctx.fill();
    e.scintille[n++] = z;
  }
  e.scintille.length = n;
  ctx.globalAlpha = 1;
}
