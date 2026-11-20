// Schermata di prova del gioco di pallavolo (docs/09-gioco-pallavolo.md, Fase 1): Lani contro la CPU.
// Qui stanno solo disegno, comandi e ciclo a passo fisso; le regole sono in ./motore.
// Per ora si apre solo in sviluppo da #gioco (main.tsx): niente voce nell'app, niente tetto, niente server.
// ponytail: personaggi e testi sono segnaposto (pose che esistono già), in attesa delle figurine
// intere del signore e del copione.
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { ArrowFatUp, CaretLeft, CaretRight, HandFist } from '@phosphor-icons/react';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import config from '../../data/config-gioco.json' with { type: 'json' };
import './gioco.css';
import { HZ, M, ia, nuovaPartita, passo, puoSchiacciare, type Comandi, type Corpo, type Palla } from './motore';

type Stato = ReturnType<typeof nuovaPartita>;
type Tasto = keyof Comandi;

const P = config.pallavolo;
const DURATA = P.secondi * HZ;
const PASSO_MS = 1000 / HZ;
const MEZZO_PASSO = PASSO_MS / 2; // resto di partenza: lontano dalla soglia, niente tic doppi o saltati
const cmDi = (v: number | null | undefined) => v ?? P.altezza_default_cm;
const CM: [number, number] = [cmDi(P.altezze_cm.lani), cmDi(P.altezze_cm.leo)];
// taratura del disegno e della CPU: da rivedere con Lani
const ERRORE_CPU = 40;
// Il pavimento (linea dei piedi) sta subito sopra i pulsanti, misurati sulla pagina (bordo sicuro
// compreso): giocatori e palla, che non scendono mai sotto i piedi, non finiscono mai sotto un
// pulsante, in nessun punto del campo. Sotto c'è il pavimento in primo piano.
const SOPRA_TASTI = 26; // px CSS tra la cima dei pulsanti e i piedi (ci sta l'anello di Schiaccia acceso)
const FONDO_RISERVA = 126; // px CSS se i pulsanti non si possono misurare
const VISTA_MIN = 340; // unità che si vedono almeno sopra il pavimento: la palla della battuta (330) quasi tutta
const DPR_MAX = 2; // oltre non si vede la differenza e il telefono scalda
const SOGLIA_ALFA = 20; // sopra questa opacità un pixel è figura
const FERMO_COLPO = 4; // frame di pausa alla schiacciata (hit-stop)
const PUNTO_MS = 1200; // quanto resta la scritta del punto
const RAGGIO_PALLA = M.raggio * 1.25; // la palla si disegna più grande del 25%: il motore non cambia
const COLORE_FONDO = '#ffe3ef'; // finché lo sfondo non è caricato
const INCHIOSTRO = '#2f2a6e'; // ombre, bordi, pillola del punteggio
// Tremolio (skill game-feel): trauma che cala nel tempo vero, scossa = trauma², seni lisci.
const TRAUMA_COLPO = 0.6;
const TRAUMA_CALO = 1.6; // al secondo
const SCOSSA_PX: [number, number] = [14, 9];

const immagine = (src: string) => Object.assign(new Image(), { src });
// Le figurine guardano tutte a sinistra: quella del lato 0 (a sinistra della rete) si ribalta.
const FIGURE = {
  sfondo: immagine('/assets/sfondi/sfondo-1-colline.webp'),
  palla: immagine('/assets/oggetti/pallone.webp'),
  giocatori: [immagine('/assets/avatar/lani/lani-battuta.webp'), immagine('/assets/avatar/leo/leo-tennis.webp')],
};
const pronta = (i: HTMLImageElement) => i.complete && i.naturalWidth > 0;
const Y = (y: number) => -y; // il motore ha y verso l'alto, la tela verso il basso; 0 = pavimento

/** Vibrazione dove c'è (Chrome Android sì, Safari no): mai un errore per questo. */
function vibra(schema: number | number[]) {
  try {
    navigator.vibrate?.(schema);
  } catch {
    /* niente vibrazione */
  }
}

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
type Moto = { y: number; fase: number; stacco: number; atterra: number; durataSch: number };
const nuovoMoto = (): Moto => ({ y: 0, fase: 0, stacco: 0, atterra: 0, durataSch: 0 });
const STACCO = 5; // frame (a 60 Hz) di schiacciamento alla spinta del salto
const ATTERRA = 8; // frame di schiacciamento all'atterraggio

/** f = frame a 60 Hz passati dall'ultimo disegno; alto = altezza vera in unità del motore. */
function disegnaGiocatore(
  ctx: CanvasRenderingContext2D,
  g: Corpo,
  l: number,
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
  const fig = FIGURE.giocatori[l];
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
  ctx.scale(l === 0 ? -sx : sx, sy);
  if (r) ctx.drawImage(fig, r.x, r.y, r.w, r.h, -(r.piede - r.x) * k, -alto, r.w * k, alto);
  else {
    ctx.fillStyle = l === 0 ? '#c2185b' : '#7b6ae0';
    ctx.beginPath();
    ctx.arc(0, -M.centroG, M.raggioG, 0, 7);
    ctx.fill();
  }
  ctx.restore();
}

/** Quello che si disegna: tra il tic di prima e quello nuovo (interpolazione), oggetti riusati. */
type Vista = { palla: Palla; giocatori: [Corpo, Corpo] };
const corpoVuoto = (): Corpo => ({ x: 0, y: 0, vx: 0, vy: 0, cm: 0, schiaccia: 0 });
const nuovaVista = (): Vista => ({ palla: { x: 0, y: 0, vx: 0, vy: 0 }, giocatori: [corpoVuoto(), corpoVuoto()] });
function mescola(d: Palla, a: Palla, b: Palla, t: number) {
  // un salto lungo è una battuta nuova (tutti a casa): lì niente scivolata
  const nuovo = Math.abs(b.x - a.x) > 80 || Math.abs(b.y - a.y) > 80;
  d.x = nuovo ? b.x : a.x + (b.x - a.x) * t;
  d.y = nuovo ? b.y : a.y + (b.y - a.y) * t;
  d.vx = b.vx;
  d.vy = b.vy;
}
function interpola(v: Vista, a: Stato, b: Stato, t: number) {
  mescola(v.palla, a.palla, b.palla, t);
  for (const l of [0, 1] as const) {
    mescola(v.giocatori[l], a.giocatori[l], b.giocatori[l], t);
    v.giocatori[l].cm = b.giocatori[l].cm;
    v.giocatori[l].schiaccia = b.giocatori[l].schiaccia;
  }
}

/** Effetti che vivono solo nel disegno (tempi in frame a 60 Hz, "punto" in ms). */
type Scintilla = { x: number; y: number; vx: number; vy: number; vita: number };
type Effetti = {
  moto: Moto[];
  scia: { x: number; y: number }[]; // anello di posizioni della palla, riusato
  sciaN: number;
  sciaI: number;
  scintille: Scintilla[];
  linee: number; // frame rimasti delle linee di velocità della schiacciata
  trauma: number;
  tempoScossa: number;
  punto: number;
  puntoLani: boolean;
};
const SCIA = 7;
const LINEE = 14;
const VITA_SCINTILLA = 20;
const nuoviEffetti = (): Effetti => ({
  moto: [nuovoMoto(), nuovoMoto()],
  scia: Array.from({ length: SCIA }, () => ({ x: 0, y: 0 })),
  sciaN: 0,
  sciaI: 0,
  scintille: [],
  linee: 0,
  trauma: 0,
  tempoScossa: 0,
  punto: 0,
  puntoLani: false,
});

function scoppio(e: Effetti, x: number, y: number, scossa: boolean) {
  if (scossa) e.trauma = Math.min(1, e.trauma + TRAUMA_COLPO);
  e.linee = LINEE;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * 2 * Math.PI + Math.random() * 0.4;
    const v = 4 + Math.random() * 6;
    // dal bordo della palla in fuori: la palla resta sempre visibile
    const fuori = RAGGIO_PALLA + 6;
    e.scintille.push({ x: x + Math.cos(a) * fuori, y: y + Math.sin(a) * fuori, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vita: VITA_SCINTILLA });
  }
}

/** px = unità del campo per 1 px CSS. */
function disegnaPalla(ctx: CanvasRenderingContext2D, p: Palla, e: Effetti, f: number, px: number) {
  const r = RAGGIO_PALLA;
  const py = Math.max(p.y, r); // disegnata più grande: a terra poggia sul pavimento, non ci affonda
  // ombra a terra, sempre e ben visibile: si stringe con la quota e dice dove scendere
  const via = 1 + p.y / 220;
  ctx.globalAlpha = Math.max(0.3, 0.55 / via);
  ctx.fillStyle = INCHIOSTRO;
  ctx.beginPath();
  ctx.ellipse(p.x, Y(0), (r * 1.1) / via, (r * 0.32) / via, 0, 0, 7);
  ctx.fill();

  // scia quando va forte
  const veloce = p.vx * p.vx + p.vy * p.vy > 81;
  if (!veloce) e.sciaN = 0;
  else {
    ctx.fillStyle = '#ffe27a';
    for (let i = 0; i < e.sciaN; i++) {
      const q = e.scia[(e.sciaI - e.sciaN + i + SCIA) % SCIA];
      const t = (i + 1) / (e.sciaN + 1);
      ctx.globalAlpha = 0.45 * t;
      ctx.beginPath();
      ctx.arc(q.x, Y(q.y), r * (0.4 + 0.5 * t), 0, 7);
      ctx.fill();
    }
    if (f > 0) {
      e.scia[e.sciaI].x = p.x;
      e.scia[e.sciaI].y = p.y;
      e.sciaI = (e.sciaI + 1) % SCIA;
      e.sciaN = Math.min(SCIA, e.sciaN + 1);
    }
  }

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

/** Sfondo e pavimento in primo piano, disegnati una volta per misura di schermo (con un bordo per la scossa). */
type Fondale = { tela: HTMLCanvasElement; w: number; h: number; margine: number; conSfondo: boolean };
function fondale(f: Fondale | null, w: number, h: number, terra: number, dpr: number): Fondale {
  const conSfondo = pronta(FIGURE.sfondo);
  if (f && f.w === w && f.h === h && f.conSfondo === conSfondo) return f;
  const margine = Math.ceil(SCOSSA_PX[0] * dpr) + 2;
  const tela = f?.tela ?? document.createElement('canvas');
  tela.width = w + margine * 2;
  tela.height = h + margine * 2;
  const ctx = tela.getContext('2d');
  if (ctx) {
    ctx.translate(margine, margine);
    ctx.fillStyle = COLORE_FONDO;
    ctx.fillRect(-margine, -margine, tela.width, tela.height);
    const fs = FIGURE.sfondo;
    if (conSfondo) {
      const z = Math.max(tela.width / fs.naturalWidth, tela.height / fs.naturalHeight);
      ctx.drawImage(fs, (w - fs.naturalWidth * z) / 2, (h - fs.naturalHeight * z) / 2, fs.naturalWidth * z, fs.naturalHeight * z);
    }
    // pavimento in primo piano: parte della scena, con le linee che vengono verso chi guarda
    const pav = ctx.createLinearGradient(0, terra, 0, h);
    pav.addColorStop(0, '#ffe3ef');
    pav.addColorStop(1, '#ffc8e1');
    ctx.fillStyle = pav;
    ctx.fillRect(-margine, terra, tela.width, h - terra + margine);
    ctx.strokeStyle = 'rgba(149, 128, 207, 0.35)';
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    for (let i = -7; i <= 7; i++) {
      ctx.moveTo(w / 2 + i * w * 0.07, terra);
      ctx.lineTo(w / 2 + i * w * 0.16, h + margine);
    }
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-margine, terra - 2 * dpr, tela.width, 4 * dpr); // linea di fondo del campo
  }
  return { tela, w, h, margine, conSfondo };
}

/** Pillola del punteggio: si ridisegna solo quando cambia qualcosa. */
type Hud = { tela: HTMLCanvasElement; chiave: number };
function hud(o: Hud | null, punti: [number, number], secondi: number, dpr: number): Hud {
  // chiave numerica: niente stringhe nuove a ogni frame quando non cambia niente
  const chiave = ((punti[0] * 1000 + punti[1]) * 10000 + secondi) * 100 + dpr * 10 + (document.fonts.status === 'loaded' ? 1 : 0);
  if (o && o.chiave === chiave) return o;
  const tempo = `${Math.floor(secondi / 60)}:${String(secondi % 60).padStart(2, '0')}`;
  const tela = o?.tela ?? document.createElement('canvas');
  const ctx = tela.getContext('2d');
  if (!ctx) return { tela, chiave };
  const NOMI = `800 ${20 * dpr}px Nunito, sans-serif`;
  const NUMERI = `800 ${32 * dpr}px "Baloo 2", sans-serif`;
  const TEMPO = `800 ${22 * dpr}px Nunito, sans-serif`;
  const numeri = `${punti[0]} · ${punti[1]}`;
  ctx.font = NOMI;
  const wLani = ctx.measureText('Lani').width;
  const wLeo = ctx.measureText('Leo').width;
  ctx.font = NUMERI;
  const wNum = ctx.measureText(numeri).width;
  const pad = 18 * dpr;
  const gap = 12 * dpr;
  const larga = Math.ceil(pad * 2 + wLani + wNum + wLeo + gap * 2);
  tela.width = larga;
  tela.height = Math.ceil(70 * dpr);
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = INCHIOSTRO;
  ctx.beginPath();
  ctx.roundRect(0, 0, tela.width, tela.height, 22 * dpr);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = NOMI;
  ctx.fillText('Lani', pad, 36 * dpr);
  ctx.fillText('Leo', larga - pad - wLeo, 36 * dpr);
  ctx.font = NUMERI;
  ctx.fillStyle = '#ffe27a';
  ctx.fillText(numeri, pad + wLani + gap, 38 * dpr);
  ctx.textAlign = 'center';
  ctx.font = TEMPO;
  ctx.fillStyle = '#f3e6fd';
  ctx.fillText(tempo, larga / 2, 62 * dpr);
  return { tela, chiave };
}

type Tela = { ctx: CanvasRenderingContext2D; fondale: Fondale | null; hud: Hud | null; fondo: number; misura: number };

/** a = vista interpolata; f = frame a 60 Hz di animazione (0 in pausa); scossa in px CSS. */
function disegna(c: HTMLCanvasElement, t: Tela, s: Stato, a: Vista, e: Effetti, f: number, ora: number) {
  const { ctx } = t;
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

  t.fondale = fondale(t.fondale, w, h, terra, dpr);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(t.fondale.tela, -t.fondale.margine + dx, -t.fondale.margine + dy);

  ctx.setTransform(k, 0, 0, k, ox + dx, terra + dy);
  ctx.fillStyle = '#3d2350';
  ctx.fillRect(M.reteX - M.reteMezza, Y(M.reteAlta), M.reteMezza * 2, M.reteAlta);
  // personaggi all'altezza vera: cm × unità per cm (docs/09 §3.3)
  a.giocatori.forEach((g, l) => disegnaGiocatore(ctx, g, l, g.cm * s.uPerCm, e.moto[l], f, ora));
  disegnaPalla(ctx, a.palla, e, f, dpr / k);

  // in px dello schermo: pillola del punteggio, segno della palla fuori schermo, scritta del punto
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  t.hud = hud(t.hud, s.punti, Math.ceil(Math.max(0, s.durata - s.tic) / HZ), dpr);
  const hx = Math.round((w - t.hud.tela.width) / 2);
  const hy = Math.round(8 * dpr);
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

  if (e.punto > 0) {
    const tt = 1 - e.punto / PUNTO_MS;
    const z = dpr * (1 + 0.35 * Math.max(0, 1 - tt * 6)); // entra grande e si assesta
    ctx.globalAlpha = Math.min(1, e.punto / 250);
    ctx.setTransform(z, 0, 0, z, w / 2, terra * 0.42);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.font = '800 64px "Baloo 2", sans-serif';
    ctx.lineWidth = 12;
    ctx.strokeStyle = e.puntoLani ? '#7b2342' : '#ffffff';
    ctx.fillStyle = e.puntoLani ? '#ffe27a' : '#7b6ae0';
    const testo = e.puntoLani ? 'Punto!' : 'Punto di Leo';
    ctx.strokeText(testo, 0, 0);
    ctx.fillText(testo, 0, 0);
    ctx.globalAlpha = 1;
    e.punto -= f * PASSO_MS;
  }
}

const TASTI: Tasto[] = ['sx', 'dx', 'salta', 'schiaccia'];
// tastiera, per provare dal computer (codici fisici: valgono con ogni disposizione di tasti)
const TASTIERA: Record<string, Tasto> = {
  ArrowLeft: 'sx',
  KeyA: 'sx',
  ArrowRight: 'dx',
  KeyD: 'dx',
  ArrowUp: 'salta',
  Space: 'salta',
  KeyK: 'schiaccia',
};

/**
 * Chi tiene premuto ogni tasto (dita per pointerId, tasti per codice): due dita sullo stesso
 * pulsante non si spengono a vicenda. "visti" tiene acceso per almeno un tic anche un tocco più
 * breve di un sessantesimo, e anche uno fatto durante la pausa della schiacciata. "dita" dice da
 * che parte della croce sta ogni dito.
 */
type Ingressi = {
  premuti: Record<Tasto, Set<number | string>>;
  visti: Set<Tasto>;
  dita: Map<number, Tasto>;
  bottoni: Partial<Record<Tasto, HTMLElement | null>>;
};
const nuoviIngressi = (): Ingressi => ({
  premuti: Object.fromEntries(TASTI.map((t) => [t, new Set()])) as Ingressi['premuti'],
  visti: new Set(),
  dita: new Map(),
  bottoni: {},
});
function premi(i: Ingressi, t: Tasto, chi: number | string) {
  if (i.premuti[t].size === 0 && (t === 'salta' || t === 'schiaccia')) vibra(12);
  i.premuti[t].add(chi);
  i.visti.add(t);
  i.bottoni[t]?.classList.add('giu'); // il pulsante resta giù finché c'è un dito
}
function lascia(i: Ingressi, t: Tasto, chi: number | string) {
  i.premuti[t].delete(chi);
  if (i.premuti[t].size === 0) i.bottoni[t]?.classList.remove('giu');
}
function leggi(i: Ingressi): Comandi {
  const d = Object.fromEntries(TASTI.map((t) => [t, i.premuti[t].size > 0 || i.visti.has(t)])) as Comandi;
  i.visti.clear();
  return d;
}
function cattura(ev: PointerEvent<HTMLElement>) {
  try {
    ev.currentTarget.setPointerCapture(ev.pointerId);
  } catch {
    /* dito già alzato: premi è già stato chiamato, basta così */
  }
}

export default function Gioco() {
  const [tela, setTela] = useState<HTMLCanvasElement | null>(null);
  const [ing] = useState(nuoviIngressi);
  const [partita, setPartita] = useState(0);
  const [fine, setFine] = useState<[number, number] | null>(null);
  const [inPausa, setInPausa] = useState(false);
  const riprendi = useRef(() => {});

  // Nell'APK (dalla 1.3) il gioco gira lo schermo da solo e uscendo lo rimette dritto: il resto di ACE
  // è verticale. Nel browser e negli APK vecchi il blocco non c'è: resta "Gira il telefono".
  useEffect(() => {
    void ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => {});
    return () => void ScreenOrientation.lock({ orientation: 'portrait' }).catch(() => {});
  }, []);

  useEffect(() => {
    const c = tela;
    const ctx = c?.getContext('2d', { alpha: false });
    if (!c || !ctx) return;
    const t: Tela = { ctx, fondale: null, hud: null, fondo: FONDO_RISERVA, misura: 0 };
    const verticale = matchMedia('(orientation: portrait)');
    const calmo = matchMedia('(prefers-reduced-motion: reduce)');
    let s = nuovaPartita(Date.now(), DURATA, CM, P.rete_cm);
    let vecchio = s;
    const vista = nuovaVista();
    const e = nuoviEffetti();
    let prima = performance.now();
    let resto = MEZZO_PASSO;
    let fermo = 0;
    let giro = 0;
    let pausa = false;
    let toccoVisto = s.tocco?.tic ?? -1;
    let puntiVisti: [number, number] = [0, 0];
    let acceso = false;
    c.setAttribute('aria-label', 'Campo di pallavolo, Lani 0 a 0 Leo');

    // Eventi del tic appena fatto: vibrazioni ed effetti. true = schiacciata, si ferma tutto un attimo.
    const eventi = (): boolean => {
      let colpo = false;
      const tc = s.tocco;
      if (tc && tc.tic !== toccoVisto) {
        toccoVisto = tc.tic;
        if (tc.lato === 0) vibra(tc.schiacciata ? 70 : 20);
        if (tc.schiacciata) {
          scoppio(e, s.palla.x, s.palla.y, !calmo.matches);
          fermo = FERMO_COLPO;
          colpo = true;
        }
      }
      if (s.punti[0] !== puntiVisti[0] || s.punti[1] !== puntiVisti[1]) {
        e.puntoLani = s.punti[0] !== puntiVisti[0];
        puntiVisti = [s.punti[0], s.punti[1]];
        vibra([45, 70, 45]);
        e.punto = PUNTO_MS;
        c.setAttribute('aria-label', `Campo di pallavolo, Lani ${s.punti[0]} a ${s.punti[1]} Leo`);
      }
      return colpo;
    };

    const ciclo = (ora: number) => {
      // passo fisso: il tempo vero si accumula e si consuma a sessantesimi; dopo una pausa lunga non
      // si recupera più di un quarto di secondo. Durante la pausa della schiacciata il tempo non si
      // accumula: i tasti premuti restano in "premuti" e "visti" e li legge il primo tic dopo.
      const dt = Math.min(ora - prima, 250);
      prima = ora;
      let tic = false;
      if (pausa || verticale.matches) resto = MEZZO_PASSO;
      else if (fermo > 0) fermo -= dt / PASSO_MS;
      else resto += dt;
      while (resto >= PASSO_MS && fermo <= 0) {
        vecchio = s;
        s = passo(s, [leggi(ing), ia(s, 1, ERRORE_CPU)]);
        resto -= PASSO_MS;
        tic = true;
        if (eventi()) {
          // si resta fermi sul colpo: dopo la pausa si riparte da qui senza tornare indietro
          vecchio = s;
          resto = 0;
        }
      }
      if (tic) {
        const pronto = puoSchiacciare(s, 0);
        if (pronto !== acceso) {
          acceso = pronto;
          ing.bottoni.schiaccia?.classList.toggle('pronto', pronto);
        }
      }
      // la scossa cala nel tempo vero, anche durante la pausa del colpo
      e.trauma = Math.max(0, e.trauma - (TRAUMA_CALO * dt) / 1000);
      e.tempoScossa += (dt / 1000) * 30;
      interpola(vista, vecchio, s, resto / PASSO_MS);
      disegna(c, t, s, vista, e, fermo > 0 || pausa ? 0 : dt / PASSO_MS, ora);
      if (s.vincitore === null) giro = requestAnimationFrame(ciclo);
      else setFine(s.punti);
    };
    giro = requestAnimationFrame(ciclo);

    const tasto = (giu: boolean) => (ev: KeyboardEvent) => {
      const tt = TASTIERA[ev.code];
      if (!tt) return;
      ev.preventDefault();
      if (!giu) lascia(ing, tt, ev.code);
      else if (!ev.repeat) premi(ing, tt, ev.code);
    };
    const su = tasto(false);
    const giu = tasto(true);
    // finestra lasciata con un tasto giù: il keyup non arriva più
    const via = () => {
      TASTI.forEach((tt) => [...ing.premuti[tt]].forEach((chi) => lascia(ing, tt, chi)));
      ing.dita.clear();
    };
    // in secondo piano si ferma; al ritorno si aspetta un tocco, e il tempo riparte da lì
    const visibile = () => {
      if (document.visibilityState !== 'hidden' || s.vincitore !== null) return;
      pausa = true;
      via();
      setInPausa(true);
    };
    riprendi.current = () => {
      pausa = false;
      prima = performance.now();
      resto = MEZZO_PASSO;
      setInPausa(false);
    };
    addEventListener('keydown', giu);
    addEventListener('keyup', su);
    addEventListener('blur', via);
    document.addEventListener('visibilitychange', visibile);
    return () => {
      cancelAnimationFrame(giro);
      removeEventListener('keydown', giu);
      removeEventListener('keyup', su);
      removeEventListener('blur', via);
      document.removeEventListener('visibilitychange', visibile);
      via();
      ing.bottoni.schiaccia?.classList.remove('pronto');
      setInPausa(false);
    };
  }, [tela, ing, partita]);

  const rif = (t: Tasto) => (b: HTMLElement | null) => {
    ing.bottoni[t] = b;
  };

  // Salta e Schiaccia: il dito resta del pulsante finché non si alza, anche se scivola fuori.
  const comando = (t: Tasto) => {
    const molla = (ev: PointerEvent) => lascia(ing, t, ev.pointerId);
    return {
      ref: rif(t),
      onPointerDown: (ev: PointerEvent<HTMLButtonElement>) => {
        ev.preventDefault();
        premi(ing, t, ev.pointerId);
        cattura(ev);
      },
      onPointerUp: molla,
      onPointerCancel: molla,
      onLostPointerCapture: molla,
    };
  };

  // Croce: una zona sola, la direzione la dà la x del dito rispetto al centro. Scivolando da una
  // parte all'altra si cambia verso senza alzare il dito; niente spazio morto in mezzo.
  const verso = (ev: PointerEvent<HTMLElement>): Tasto => {
    const r = ev.currentTarget.getBoundingClientRect();
    return ev.clientX < r.left + r.width / 2 ? 'sx' : 'dx';
  };
  const molla = (ev: PointerEvent) => {
    const t = ing.dita.get(ev.pointerId);
    if (!t) return;
    lascia(ing, t, ev.pointerId);
    ing.dita.delete(ev.pointerId);
  };
  const croce = {
    onPointerDown: (ev: PointerEvent<HTMLDivElement>) => {
      ev.preventDefault();
      const t = verso(ev);
      ing.dita.set(ev.pointerId, t);
      premi(ing, t, ev.pointerId);
      cattura(ev);
    },
    onPointerMove: (ev: PointerEvent<HTMLDivElement>) => {
      const prima = ing.dita.get(ev.pointerId);
      if (!prima) return;
      const t = verso(ev);
      if (t === prima) return;
      lascia(ing, prima, ev.pointerId);
      ing.dita.set(ev.pointerId, t);
      premi(ing, t, ev.pointerId);
    },
    onPointerUp: molla,
    onPointerCancel: molla,
    onLostPointerCapture: molla,
  };

  return (
    <main className="gioco" onContextMenu={(ev) => ev.preventDefault()}>
      <canvas ref={setTela} aria-label="Campo di pallavolo" />
      <div className="gioco-croce" role="group" aria-label="Corri: tocca a sinistra o a destra" title="Corri (frecce o A e D)" {...croce}>
        <span className="gioco-freccia" ref={rif('sx')}>
          <CaretLeft size={54} weight="bold" aria-hidden />
        </span>
        <span className="gioco-freccia" ref={rif('dx')}>
          <CaretRight size={54} weight="bold" aria-hidden />
        </span>
      </div>
      <div className="gioco-tasti">
        <button type="button" className="gioco-schiaccia" title="Schiaccia (K)" {...comando('schiaccia')}>
          <HandFist size={40} weight="fill" aria-hidden />
          Schiaccia
        </button>
        <button type="button" className="gioco-salta" title="Salta (spazio o freccia su)" {...comando('salta')}>
          <ArrowFatUp size={40} weight="fill" aria-hidden />
          Salta
        </button>
      </div>
      <p className="gioco-gira">Gira il telefono</p>
      {inPausa && !fine && (
        <button type="button" className="gioco-pausa" onClick={() => riprendi.current()}>
          Tocca per continuare
        </button>
      )}
      {fine && (
        <div className="gioco-fine" role="dialog" aria-label="Partita finita">
          <h1>Partita finita</h1>
          <p>
            Lani {fine[0]} · {fine[1]} Leo
          </p>
          <button
            type="button"
            className="principale"
            onClick={() => {
              setFine(null);
              setPartita((n) => n + 1);
            }}
          >
            Ancora
          </button>
        </div>
      )}
    </main>
  );
}
