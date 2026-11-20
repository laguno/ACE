// Schermata di prova del gioco di pallavolo (docs/09-gioco-pallavolo.md, Fase 1): Lani contro la CPU.
// Qui stanno solo disegno, comandi e ciclo a passo fisso; le regole sono in ./motore.
// Per ora si apre solo in sviluppo da #gioco (main.tsx): niente voce nell'app, niente tetto, niente server.
// ponytail: personaggi e testi sono segnaposto (pose che esistono già), in attesa delle figurine
// intere del signore e del copione.
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { ArrowFatUp, CaretLeft, CaretRight, HandFist } from '@phosphor-icons/react';
import { useEffect, useState, type PointerEvent } from 'react';
import config from '../../data/config-gioco.json' with { type: 'json' };
import './gioco.css';
import { HZ, M, ia, nuovaPartita, passo, puoSchiacciare, type Comandi, type Corpo } from './motore';

type Stato = ReturnType<typeof nuovaPartita>;
type Tasto = keyof Comandi;

const P = config.pallavolo;
const DURATA = P.secondi * HZ;
const PASSO_MS = 1000 / HZ;
const cmDi = (v: number | null | undefined) => v ?? P.altezza_default_cm;
const CM: [number, number] = [cmDi(P.altezze_cm.lani), cmDi(P.altezze_cm.leo)];
// taratura del disegno e della CPU: da rivedere con Lani
const ERRORE_CPU = 40;
// Il campo prende tutta la larghezza; sotto la linea di fondo c'è il pavimento in primo piano, alto
// PRIMO_PIANO px CSS, dove poggiano i pulsanti (gioco.css): così non coprono mai giocatori e palla.
const PRIMO_PIANO = 112;
const VISTA_MIN = 360; // unità che si vedono almeno sopra il pavimento: la palla della battuta (330) entra tutta
const SOGLIA_ALFA = 20; // sopra questa opacità un pixel è figura
const FERMO_COLPO = 4; // frame di pausa alla schiacciata (hit-stop)
const PUNTO_MS = 800; // quanto resta la scritta "Punto!"

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
  ctx.fillStyle = `rgba(47, 42, 110, ${0.28 / via})`;
  ctx.beginPath();
  ctx.ellipse(g.x, Y(0), (largo * 0.36) / via, (largo * 0.08) / via, 0, 0, 7);
  ctx.fill();

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

/** Effetti che vivono solo nel disegno (tempi in frame a 60 Hz, "punto" in ms). */
type Scintilla = { x: number; y: number; vx: number; vy: number; vita: number };
type Effetti = {
  moto: Moto[];
  scia: { x: number; y: number }[];
  scintille: Scintilla[];
  sbuffo: { x: number; y: number; t: number } | null;
  tremolio: number;
  punto: number;
};
const nuoviEffetti = (): Effetti => ({ moto: [nuovoMoto(), nuovoMoto()], scia: [], scintille: [], sbuffo: null, tremolio: 0, punto: 0 });
const VITA_SCINTILLA = 20;
const VITA_SBUFFO = 14;

function scoppio(e: Effetti, x: number, y: number) {
  e.tremolio = 12;
  e.sbuffo = { x, y, t: VITA_SBUFFO };
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * 2 * Math.PI + Math.random() * 0.4;
    const v = 4 + Math.random() * 6;
    e.scintille.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vita: VITA_SCINTILLA });
  }
}

function disegnaPalla(ctx: CanvasRenderingContext2D, s: Stato, e: Effetti, f: number, cima: number) {
  const p = s.palla;
  // ombra a terra, sempre: si stringe con la quota e dice dove scendere
  const via = 1 + p.y / 220;
  ctx.fillStyle = `rgba(47, 42, 110, ${Math.max(0.22, 0.45 / via)})`;
  ctx.beginPath();
  ctx.ellipse(p.x, Y(0), (M.raggio * 1.1) / via, (M.raggio * 0.3) / via, 0, 0, 7);
  ctx.fill();

  // scia quando va forte
  const veloce = Math.hypot(p.vx, p.vy) > 9;
  if (!veloce) e.scia.length = 0;
  else {
    e.scia.forEach((q, i) => {
      const t = (i + 1) / (e.scia.length + 1);
      ctx.fillStyle = `rgba(255, 226, 122, ${0.45 * t})`;
      ctx.beginPath();
      ctx.arc(q.x, Y(q.y), M.raggio * (0.45 + 0.5 * t), 0, 7);
      ctx.fill();
    });
    if (f > 0) {
      e.scia.push({ x: p.x, y: p.y });
      if (e.scia.length > 7) e.scia.shift();
    }
  }

  ctx.save();
  ctx.translate(p.x, Y(p.y));
  ctx.rotate(p.x * 0.02);
  if (pronta(FIGURE.palla)) ctx.drawImage(FIGURE.palla, -M.raggio, -M.raggio, M.raggio * 2, M.raggio * 2);
  else {
    ctx.fillStyle = '#ffe27a';
    ctx.beginPath();
    ctx.arc(0, 0, M.raggio, 0, 7);
    ctx.fill();
  }
  ctx.restore();

  // palla sopra lo schermo: un segno in alto dice dov'è
  if (p.y - M.raggio > cima) {
    ctx.fillStyle = '#ffe27a';
    ctx.strokeStyle = '#3d2350';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(p.x, Y(cima) + 6);
    ctx.lineTo(p.x - 16, Y(cima) + 30);
    ctx.lineTo(p.x + 16, Y(cima) + 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // schiacciata: sbuffo che si allarga e scintille che cadono
  if (e.sbuffo) {
    const t = 1 - e.sbuffo.t / VITA_SBUFFO;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.55 * (1 - t)})`; // lampo
    ctx.strokeStyle = `rgba(255, 226, 122, ${1 - t})`;
    ctx.lineWidth = 8 * (1 - t) + 3;
    ctx.beginPath();
    ctx.arc(e.sbuffo.x, Y(e.sbuffo.y), M.raggio + 80 * t, 0, 7);
    ctx.fill();
    ctx.stroke();
    e.sbuffo.t -= f;
    if (e.sbuffo.t <= 0) e.sbuffo = null;
  }
  e.scintille = e.scintille.filter((z) => {
    z.x += z.vx * f;
    z.y += z.vy * f;
    z.vy -= 0.25 * f;
    z.vita -= f;
    const t = z.vita / VITA_SCINTILLA;
    ctx.fillStyle = z.vita % 6 < 3 ? `rgba(255, 226, 122, ${t})` : `rgba(255, 255, 255, ${t})`;
    ctx.beginPath();
    ctx.arc(z.x, Y(z.y), 4 + 7 * t, 0, 7);
    ctx.fill();
    return z.vita > 0;
  });
}

function disegna(c: HTMLCanvasElement, s: Stato, e: Effetti, f: number, ora: number) {
  const ctx = c.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(c.clientWidth * dpr);
  const h = Math.round(c.clientHeight * dpr);
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  const terra = h - PRIMO_PIANO * dpr; // linea di fondo, dove poggiano i piedi
  const k = Math.min(w / M.largo, terra / VISTA_MIN);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // tremolio della schiacciata: tutta la scena, pulsanti esclusi
  const scossa = e.tremolio > 0 ? e.tremolio * 0.7 * dpr : 0;
  e.tremolio = Math.max(0, e.tremolio - f);
  const dx = (Math.random() - 0.5) * scossa;
  const dy = (Math.random() - 0.5) * scossa;

  // sfondo a tutta tela (ritagliato al centro)
  const fs = FIGURE.sfondo;
  if (pronta(fs)) {
    const z = Math.max(w / fs.naturalWidth, h / fs.naturalHeight) * 1.03;
    ctx.drawImage(fs, (w - fs.naturalWidth * z) / 2 + dx, (h - fs.naturalHeight * z) / 2 + dy, fs.naturalWidth * z, fs.naturalHeight * z);
  }

  // pavimento in primo piano: parte della scena, con le linee che vengono verso chi guarda
  const pav = ctx.createLinearGradient(0, terra, 0, h);
  pav.addColorStop(0, '#ffe3ef');
  pav.addColorStop(1, '#ffc8e1');
  ctx.fillStyle = pav;
  ctx.fillRect(0, terra + dy, w, h - terra);
  ctx.strokeStyle = 'rgba(149, 128, 207, 0.35)';
  ctx.lineWidth = 2 * dpr;
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(w / 2 + i * w * 0.07 + dx, terra + dy);
    ctx.lineTo(w / 2 + i * w * 0.16 + dx, h + dy);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, terra - 2 * dpr + dy, w, 4 * dpr); // linea di fondo del campo

  ctx.setTransform(k, 0, 0, k, (w - M.largo * k) / 2 + dx, terra + dy);
  ctx.fillStyle = '#3d2350';
  ctx.fillRect(M.reteX - M.reteMezza, Y(M.reteAlta), M.reteMezza * 2, M.reteAlta);

  // personaggi all'altezza vera: cm × unità per cm (docs/09 §3.3)
  s.giocatori.forEach((g, l) => disegnaGiocatore(ctx, g, l, g.cm * s.uPerCm, e.moto[l], f, ora));
  disegnaPalla(ctx, s, e, f, terra / k);

  // punteggio, tempo e "Punto!" in px dello schermo
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const secondi = Math.ceil(Math.max(0, s.durata - s.tic) / HZ);
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#3d2350';
  const scritta = (testo: string, x: number, y: number, font: string, bordo: number) => {
    ctx.font = font;
    ctx.lineWidth = bordo;
    ctx.strokeText(testo, x, y);
    ctx.fillText(testo, x, y);
  };
  const mezzo = w / dpr / 2;
  scritta(`${s.punti[0]}  ·  ${s.punti[1]}`, mezzo, 42, '800 38px "Baloo 2", sans-serif', 6);
  scritta(`${Math.floor(secondi / 60)}:${String(secondi % 60).padStart(2, '0')}`, mezzo, 64, '800 18px Nunito, sans-serif', 5);
  if (e.punto > 0) {
    const t = 1 - e.punto / PUNTO_MS;
    const z = 1 + 0.35 * Math.max(0, 1 - t * 6); // entra grande e si assesta
    ctx.globalAlpha = Math.min(1, e.punto / 200);
    ctx.save();
    ctx.translate(mezzo, (terra / dpr) * 0.45);
    ctx.scale(z, z);
    ctx.strokeStyle = '#7b2342';
    ctx.fillStyle = '#ffe27a';
    scritta('Punto!', 0, 0, '800 76px "Baloo 2", sans-serif', 14);
    ctx.restore();
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
 * breve di un sessantesimo, e anche uno fatto durante la pausa della schiacciata.
 */
type Ingressi = {
  premuti: Record<Tasto, Set<number | string>>;
  visti: Set<Tasto>;
  bottoni: Partial<Record<Tasto, HTMLButtonElement | null>>;
};
const nuoviIngressi = (): Ingressi => ({
  premuti: Object.fromEntries(TASTI.map((t) => [t, new Set()])) as Ingressi['premuti'],
  visti: new Set(),
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

export default function Gioco() {
  const [tela, setTela] = useState<HTMLCanvasElement | null>(null);
  const [ing] = useState(nuoviIngressi);
  const [partita, setPartita] = useState(0);
  const [fine, setFine] = useState<[number, number] | null>(null);

  // Nell'APK (dalla 1.3) il gioco gira lo schermo da solo e uscendo lo rimette dritto: il resto di ACE
  // è verticale. Nel browser e negli APK vecchi il blocco non c'è: resta "Gira il telefono".
  useEffect(() => {
    void ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => {});
    return () => void ScreenOrientation.lock({ orientation: 'portrait' }).catch(() => {});
  }, []);

  useEffect(() => {
    const c = tela;
    if (!c) return;
    const verticale = matchMedia('(orientation: portrait)');
    let s = nuovaPartita(Date.now(), DURATA, CM, P.rete_cm);
    const e = nuoviEffetti();
    let prima = performance.now();
    let resto = 0;
    let fermo = 0;
    let giro = 0;
    let toccoVisto = s.tocco?.tic ?? -1;
    let puntiVisti = 0;
    let acceso = false;
    c.setAttribute('aria-label', 'Campo di pallavolo, 0 a 0');

    // Eventi del tic appena fatto: vibrazioni ed effetti. true = schiacciata, si ferma tutto un attimo.
    const eventi = (): boolean => {
      let colpo = false;
      const t = s.tocco;
      if (t && t.tic !== toccoVisto) {
        toccoVisto = t.tic;
        if (t.lato === 0) vibra(t.schiacciata ? 70 : 20);
        if (t.schiacciata) {
          scoppio(e, s.palla.x, s.palla.y);
          fermo = FERMO_COLPO;
          colpo = true;
        }
      }
      const punti = s.punti[0] + s.punti[1];
      if (punti !== puntiVisti) {
        puntiVisti = punti;
        vibra([45, 70, 45]);
        e.punto = PUNTO_MS;
        c.setAttribute('aria-label', `Campo di pallavolo, ${s.punti[0]} a ${s.punti[1]}`);
      }
      return colpo;
    };

    const ciclo = (ora: number) => {
      // passo fisso: il tempo vero si accumula e si consuma a sessantesimi; dopo una pausa lunga
      // (scheda nascosta, telefono in verticale) non si recupera più di un quarto di secondo.
      // Durante la pausa della schiacciata il tempo non si accumula: i tasti premuti restano in
      // "premuti" e "visti" e li legge il primo tic dopo.
      const dt = Math.min(ora - prima, 250);
      prima = ora;
      if (verticale.matches) resto = 0;
      else if (fermo > 0) fermo -= dt / PASSO_MS;
      else resto += dt;
      for (; resto >= PASSO_MS && fermo <= 0; resto -= PASSO_MS) {
        s = passo(s, [leggi(ing), ia(s, 1, ERRORE_CPU)]);
        if (eventi()) resto = PASSO_MS; // dopo questo tic il ciclo si ferma
      }
      const pronto = puoSchiacciare(s, 0);
      if (pronto !== acceso) {
        acceso = pronto;
        ing.bottoni.schiaccia?.classList.toggle('pronto', pronto);
      }
      disegna(c, s, e, fermo > 0 ? 0 : dt / PASSO_MS, ora);
      if (s.vincitore === null) giro = requestAnimationFrame(ciclo);
      else setFine(s.punti);
    };
    giro = requestAnimationFrame(ciclo);

    const tasto = (giu: boolean) => (ev: KeyboardEvent) => {
      const t = TASTIERA[ev.code];
      if (!t) return;
      ev.preventDefault();
      if (!giu) lascia(ing, t, ev.code);
      else if (!ev.repeat) premi(ing, t, ev.code);
    };
    const su = tasto(false);
    const giu = tasto(true);
    // finestra lasciata con un tasto giù: il keyup non arriva più
    const via = () => TASTI.forEach((t) => [...ing.premuti[t]].forEach((chi) => lascia(ing, t, chi)));
    addEventListener('keydown', giu);
    addEventListener('keyup', su);
    addEventListener('blur', via);
    return () => {
      cancelAnimationFrame(giro);
      removeEventListener('keydown', giu);
      removeEventListener('keyup', su);
      removeEventListener('blur', via);
      via();
      ing.bottoni.schiaccia?.classList.remove('pronto');
    };
  }, [tela, ing, partita]);

  // Il dito resta del pulsante finché non si alza, anche se scivola fuori (pointer capture).
  const comando = (t: Tasto) => {
    const molla = (ev: PointerEvent) => lascia(ing, t, ev.pointerId);
    return {
      ref: (b: HTMLButtonElement | null) => {
        ing.bottoni[t] = b;
      },
      onPointerDown: (ev: PointerEvent<HTMLButtonElement>) => {
        ev.preventDefault();
        ev.currentTarget.setPointerCapture(ev.pointerId);
        premi(ing, t, ev.pointerId);
      },
      onPointerUp: molla,
      onPointerCancel: molla,
      onLostPointerCapture: molla,
    };
  };

  return (
    <main className="gioco" onContextMenu={(ev) => ev.preventDefault()}>
      <canvas ref={setTela} aria-label="Campo di pallavolo" />
      <div className="gioco-tasti gioco-sx">
        <button type="button" aria-label="Sinistra" title="Sinistra (freccia sinistra o A)" {...comando('sx')}>
          <CaretLeft size={54} weight="bold" aria-hidden />
        </button>
        <button type="button" aria-label="Destra" title="Destra (freccia destra o D)" {...comando('dx')}>
          <CaretRight size={54} weight="bold" aria-hidden />
        </button>
      </div>
      <div className="gioco-tasti gioco-dx">
        <button type="button" className="gioco-schiaccia" aria-label="Schiaccia" title="Schiaccia (K)" {...comando('schiaccia')}>
          <HandFist size={50} weight="fill" aria-hidden />
        </button>
        <button type="button" className="gioco-salta" aria-label="Salta" title="Salta (spazio o freccia su)" {...comando('salta')}>
          <ArrowFatUp size={50} weight="fill" aria-hidden />
        </button>
      </div>
      <p className="gioco-gira">Gira il telefono</p>
      {fine && (
        <div className="gioco-fine" role="dialog" aria-label="Partita finita">
          <h1>Partita finita</h1>
          <p>
            Tu {fine[0]} · Leo {fine[1]}
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
