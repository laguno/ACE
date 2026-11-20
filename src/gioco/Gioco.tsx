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
import { HZ, M, ia, nuovaPartita, passo, type Comandi, type Corpo } from './motore';

type Stato = ReturnType<typeof nuovaPartita>;
type Tasto = keyof Comandi;

const P = config.pallavolo;
const DURATA = P.secondi * HZ;
const PASSO_MS = 1000 / HZ;
const cmDi = (v: number | null | undefined) => v ?? P.altezza_default_cm;
const CM: [number, number] = [cmDi(P.altezze_cm.lani), cmDi(P.altezze_cm.leo)];
// taratura del disegno e della CPU: da rivedere con Lani
const ERRORE_CPU = 40;
const SOPRA = 492; // campo visibile sopra il pavimento: 1000 × 492
const FASCIA_TASTI = 112; // px CSS sotto il pavimento per i pulsanti (gioco.css: 88 + margine, anche col bordo sicuro dell'iPhone)
const SOGLIA_ALFA = 20; // sopra questa opacità un pixel è figura

const immagine = (src: string) => Object.assign(new Image(), { src });
// Le figurine guardano tutte a sinistra: quella del lato 0 (a sinistra della rete) si ribalta.
const FIGURE = {
  sfondo: immagine('/assets/sfondi/sfondo-1-colline.webp'),
  palla: immagine('/assets/oggetti/pallone.webp'),
  giocatori: [immagine('/assets/avatar/lani/lani-battuta.webp'), immagine('/assets/avatar/leo/leo-tennis.webp')],
};
const pronta = (i: HTMLImageElement) => i.complete && i.naturalWidth > 0;
const Y = (y: number) => SOPRA - y; // il motore ha y verso l'alto, la tela verso il basso

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

function disegna(c: HTMLCanvasElement, s: Stato, moto: Moto[], f: number, ora: number) {
  const ctx = c.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(c.clientWidth * dpr);
  const h = Math.round(c.clientHeight * dpr);
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  // il pavimento sta sopra la fascia dei pulsanti: così i pulsanti non coprono mai chi gioca
  const terra = h - FASCIA_TASTI * dpr;
  const k = Math.min(w / M.largo, terra / Y(0));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // sfondo a tutta tela (ritagliato al centro) e pavimento fino in fondo, dove stanno i pulsanti
  const fs = FIGURE.sfondo;
  if (pronta(fs)) {
    const z = Math.max(w / fs.naturalWidth, h / fs.naturalHeight);
    ctx.drawImage(fs, (w - fs.naturalWidth * z) / 2, (h - fs.naturalHeight * z) / 2, fs.naturalWidth * z, fs.naturalHeight * z);
  }
  ctx.fillStyle = 'rgba(255, 246, 250, 0.85)';
  ctx.fillRect(0, terra, w, h - terra);

  ctx.setTransform(k, 0, 0, k, (w - M.largo * k) / 2, terra - Y(0) * k);
  ctx.fillStyle = '#3d2350';
  ctx.fillRect(M.reteX - M.reteMezza, Y(M.reteAlta), M.reteMezza * 2, M.reteAlta);

  // personaggi all'altezza vera: cm × unità per cm (docs/09 §3.3)
  s.giocatori.forEach((g, l) => disegnaGiocatore(ctx, g, l, g.cm * s.uPerCm, moto[l], f, ora));

  const p = s.palla;
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

  // punteggio e tempo
  const secondi = Math.ceil(Math.max(0, s.durata - s.tic) / HZ);
  ctx.fillStyle = '#3d2350';
  ctx.textAlign = 'center';
  ctx.font = '800 54px "Baloo 2", sans-serif';
  ctx.fillText(`${s.punti[0]}  ·  ${s.punti[1]}`, M.reteX, 62);
  ctx.font = '800 26px Nunito, sans-serif';
  ctx.fillText(`${Math.floor(secondi / 60)}:${String(secondi % 60).padStart(2, '0')}`, M.reteX, 96);
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

export default function Gioco() {
  const tela = useRef<HTMLCanvasElement>(null);
  // Chi tiene premuto ogni tasto (dita per pointerId, tasti per codice): due dita sullo stesso
  // pulsante non si spengono a vicenda. "visti" tiene acceso per almeno un tic anche un tocco
  // più breve di un sessantesimo di secondo.
  const premuti = useRef(
    Object.fromEntries(TASTI.map((t) => [t, new Set<number | string>()])) as Record<Tasto, Set<number | string>>,
  );
  const visti = useRef(new Set<Tasto>());
  const [partita, setPartita] = useState(0);
  const [fine, setFine] = useState<[number, number] | null>(null);

  // Nell'APK (dalla 1.3) il gioco gira lo schermo da solo e uscendo lo rimette dritto: il resto di ACE
  // è verticale. Nel browser e negli APK vecchi il blocco non c'è: resta "Gira il telefono".
  useEffect(() => {
    void ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => {});
    return () => void ScreenOrientation.lock({ orientation: 'portrait' }).catch(() => {});
  }, []);

  useEffect(() => {
    const c = tela.current;
    if (!c) return;
    const giu = premuti.current;
    const leggi = (): Comandi => {
      const d = Object.fromEntries(TASTI.map((t) => [t, giu[t].size > 0 || visti.current.has(t)])) as Comandi;
      visti.current.clear();
      return d;
    };

    const verticale = matchMedia('(orientation: portrait)');
    let s = nuovaPartita(Date.now(), DURATA, CM, P.rete_cm);
    const moto = [nuovoMoto(), nuovoMoto()];
    let prima = performance.now();
    let resto = 0;
    let giro = 0;
    const ciclo = (ora: number) => {
      // passo fisso: il tempo vero si accumula e si consuma a sessantesimi; dopo una pausa lunga
      // (scheda nascosta, telefono in verticale) non si recupera più di un quarto di secondo
      const dt = Math.min(ora - prima, 250);
      resto = verticale.matches ? 0 : resto + dt;
      prima = ora;
      for (; resto >= PASSO_MS; resto -= PASSO_MS) s = passo(s, [leggi(), ia(s, 1, ERRORE_CPU)]);
      disegna(c, s, moto, dt / PASSO_MS, ora);
      if (s.vincitore === null) giro = requestAnimationFrame(ciclo);
      else setFine(s.punti);
    };
    giro = requestAnimationFrame(ciclo);

    const tasto = (premi: boolean) => (e: KeyboardEvent) => {
      const t = TASTIERA[e.code];
      if (!t) return;
      e.preventDefault();
      if (!premi) giu[t].delete(e.code);
      else if (!e.repeat) {
        giu[t].add(e.code);
        visti.current.add(t);
      }
    };
    const premi = tasto(true);
    const lascia = tasto(false);
    // finestra lasciata con un tasto giù: il keyup non arriva più
    const via = () => TASTI.forEach((t) => giu[t].clear());
    addEventListener('keydown', premi);
    addEventListener('keyup', lascia);
    addEventListener('blur', via);
    return () => {
      cancelAnimationFrame(giro);
      removeEventListener('keydown', premi);
      removeEventListener('keyup', lascia);
      removeEventListener('blur', via);
      via();
    };
  }, [partita]);

  // Il dito resta del pulsante finché non si alza, anche se scivola fuori (pointer capture).
  const comando = (t: Tasto) => {
    const lascia = (e: PointerEvent) => void premuti.current[t].delete(e.pointerId);
    return {
      onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        premuti.current[t].add(e.pointerId);
        visti.current.add(t);
      },
      onPointerUp: lascia,
      onPointerCancel: lascia,
      onLostPointerCapture: lascia,
    };
  };

  return (
    <main className="gioco" onContextMenu={(e) => e.preventDefault()}>
      <canvas ref={tela} aria-label="Campo di pallavolo" />
      <div className="gioco-tasti gioco-sx">
        <button type="button" aria-label="Sinistra" title="Sinistra (freccia sinistra o A)" {...comando('sx')}>
          <CaretLeft size={40} weight="bold" aria-hidden />
        </button>
        <button type="button" aria-label="Destra" title="Destra (freccia destra o D)" {...comando('dx')}>
          <CaretRight size={40} weight="bold" aria-hidden />
        </button>
      </div>
      <div className="gioco-tasti gioco-dx">
        <button type="button" className="gioco-schiaccia" aria-label="Schiaccia" title="Schiaccia (K)" {...comando('schiaccia')}>
          <HandFist size={40} weight="fill" aria-hidden />
        </button>
        <button type="button" className="gioco-salta" aria-label="Salta" title="Salta (spazio o freccia su)" {...comando('salta')}>
          <ArrowFatUp size={44} weight="fill" aria-hidden />
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
