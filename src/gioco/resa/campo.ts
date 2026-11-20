// Sfondo, campo in prospettiva e rete: si disegnano una volta per misura di schermo.
import { M } from '../motore';
import { COLORE_FONDO, FIGURE, INCHIOSTRO, SCOSSA_PX, pronta } from './comune';

/**
 * Sfondo e campo, disegnati una volta per misura di schermo su due tele fuori schermo, con un bordo
 * per la scossa (e per il parallasse, lo sfondo). Il campo è in prospettiva solo nel disegno: la
 * fisica resta 2D e giocatori e palla stanno sulla linea di mezzo del trapezio (la linea dei piedi).
 */
export type Fondale = { sfondo: HTMLCanvasElement; campo: HTMLCanvasElement; w: number; h: number; terra: number; margine: number; conSfondo: boolean };
const PROFONDO = 40; // px CSS dalla linea di mezzo al bordo lontano e a quello vicino
const SCALA_PROFONDO = 0.15; // il bordo lontano è più stretto del 15%, quello vicino più largo
const SBIECO = 26; // px CSS: il lontano va a destra e il vicino a sinistra, così la rete si vede in diagonale
export const PARALLASSE = 6; // px CSS che lo sfondo si sposta seguendo la palla
export function fondale(f: Fondale | null, w: number, h: number, terra: number, k: number, ox: number, dpr: number): Fondale {
  const conSfondo = pronta(FIGURE.sfondo);
  if (f && f.w === w && f.h === h && f.terra === terra && f.conSfondo === conSfondo) return f;
  const margine = Math.ceil((SCOSSA_PX[0] + PARALLASSE) * dpr) + 2;
  const sfondo = f?.sfondo ?? document.createElement('canvas');
  const campo = f?.campo ?? document.createElement('canvas');
  sfondo.width = campo.width = w + margine * 2;
  sfondo.height = campo.height = h + margine * 2;
  const sc = sfondo.getContext('2d');
  if (sc) {
    sc.fillStyle = COLORE_FONDO;
    sc.fillRect(0, 0, sfondo.width, sfondo.height);
    const fs = FIGURE.sfondo;
    if (conSfondo) {
      const z = Math.max(sfondo.width / fs.naturalWidth, sfondo.height / fs.naturalHeight);
      sc.drawImage(fs, (sfondo.width - fs.naturalWidth * z) / 2, (sfondo.height - fs.naturalHeight * z) / 2, fs.naturalWidth * z, fs.naturalHeight * z);
    }
  }
  const ctx = campo.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, campo.width, campo.height);
    ctx.translate(margine, margine);
    const cx = w / 2;
    // punto del campo: xu in unità del motore, d da -1 (bordo lontano) a 1 (bordo vicino)
    const X = (xu: number, d: number) => cx + (ox + xu * k - cx) * (1 + d * SCALA_PROFONDO) - d * SBIECO * dpr;
    const Yp = (d: number) => terra + d * PROFONDO * dpr;
    const alto = (d: number) => M.reteAlta * k * (1 + d * SCALA_PROFONDO); // altezza della rete a quella profondità
    const linea = (x1: number, d1: number, x2: number, d2: number) => {
      ctx.moveTo(X(x1, d1), Yp(d1));
      ctx.lineTo(X(x2, d2), Yp(d2));
    };

    // pavimento dal bordo lontano fino in fondo allo schermo
    const pav = ctx.createLinearGradient(0, Yp(-1), 0, h);
    pav.addColorStop(0, '#ffd9e8');
    pav.addColorStop(1, '#ffc8e1');
    ctx.fillStyle = pav;
    ctx.fillRect(-margine, Yp(-1), campo.width, h - Yp(-1) + margine);
    // il campo: un trapezio un po' più caldo, con le linee bianche
    ctx.fillStyle = '#ffe6cf';
    ctx.beginPath();
    ctx.moveTo(X(0, -1), Yp(-1));
    ctx.lineTo(X(M.largo, -1), Yp(-1));
    ctx.lineTo(X(M.largo, 1), Yp(1));
    ctx.lineTo(X(0, 1), Yp(1));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3 * dpr;
    ctx.lineJoin = 'round';
    ctx.stroke(); // fondo e laterali
    ctx.beginPath();
    const tre = M.largo / 6; // linea dei 3 metri: un terzo di metà campo (9 m)
    for (const xu of [M.reteX, M.reteX - tre, M.reteX + tre]) linea(xu, -1, xu, 1);
    ctx.stroke();

    // ombra della rete sul pavimento
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = INCHIOSTRO;
    ctx.beginPath();
    ctx.moveTo(X(M.reteX, -1), Yp(-1));
    ctx.lineTo(X(M.reteX, 1), Yp(1));
    ctx.lineTo(X(M.reteX + 70, 1), Yp(1));
    ctx.lineTo(X(M.reteX + 70, -1), Yp(-1));
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // rete: palo lontano (più basso e sottile), fascia in diagonale con la maglia, palo vicino
    const palo = (d: number, largo: number) => {
      ctx.fillStyle = '#3d2350';
      const x = X(M.reteX, d);
      ctx.fillRect(x - (largo * dpr) / 2, Yp(d) - alto(d) - 8 * k, largo * dpr, alto(d) + 8 * k);
    };
    palo(-1, 4);
    const fascia = 0.42; // la fascia è alta il 42% della rete, dalla cima in giù
    const cima = (d: number) => Yp(d) - alto(d);
    const sotto = (d: number) => cima(d) + alto(d) * fascia;
    ctx.fillStyle = 'rgba(61, 35, 80, 0.18)';
    ctx.beginPath();
    ctx.moveTo(X(M.reteX, -1), cima(-1));
    ctx.lineTo(X(M.reteX, 1), cima(1));
    ctx.lineTo(X(M.reteX, 1), sotto(1));
    ctx.lineTo(X(M.reteX, -1), sotto(-1));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(61, 35, 80, 0.55)';
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    for (let i = 1; i < 12; i++) {
      const d = -1 + (2 * i) / 12;
      ctx.moveTo(X(M.reteX, d), cima(d));
      ctx.lineTo(X(M.reteX, d), sotto(d));
    }
    for (let j = 1; j < 5; j++) {
      const q = j / 5;
      ctx.moveTo(X(M.reteX, -1), cima(-1) + alto(-1) * fascia * q);
      ctx.lineTo(X(M.reteX, 1), cima(1) + alto(1) * fascia * q);
    }
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4 * dpr;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(X(M.reteX, -1), cima(-1));
    ctx.lineTo(X(M.reteX, 1), cima(1));
    ctx.stroke();
    palo(1, 8);
  }
  return { sfondo, campo, w, h, terra, margine, conSfondo };
}
