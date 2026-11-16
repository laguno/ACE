// Schermata di prova del gioco di pallavolo (docs/09-gioco-pallavolo.md, Fase 1): Lani contro la CPU.
// Qui stanno solo disegno, comandi e ciclo a passo fisso; le regole sono in ./motore.
// Per ora si apre solo in sviluppo da #gioco (main.tsx): niente voce nell'app, niente tetto, niente server.
// ponytail: personaggi e testi sono segnaposto (pose che esistono già), in attesa delle figurine
// intere del signore e del copione.
import { ArrowFatUp, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import config from '../../data/config-gioco.json' with { type: 'json' };
import './gioco.css';
import { HZ, M, ia, nuovaPartita, passo, type Comandi, type Corpo } from './motore';

const DURATA = config.pallavolo.secondi * HZ;
const PASSO_MS = 1000 / HZ;
// taratura del disegno e della CPU: da rivedere con Lani
const ERRORE_CPU = 40;
const ALTO = 562; // campo visibile: 1000 × 562 (16:9)
const SUOLO = 70; // il pavimento sta a 70 dal bordo basso
const SPRITE = 170; // lato del disegno del personaggio

const immagine = (src: string) => Object.assign(new Image(), { src });
const FIGURE = {
  sfondo: immagine('/assets/sfondi/sfondo-1-colline.webp'),
  palla: immagine('/assets/oggetti/pallone.webp'),
  giocatori: [immagine('/assets/avatar/lani/lani-battuta.webp'), immagine('/assets/avatar/leo/leo-tennis.webp')],
};
const pronta = (i: HTMLImageElement) => i.complete && i.naturalWidth > 0;
const Y = (y: number) => ALTO - SUOLO - y; // il motore ha y verso l'alto, la tela verso il basso

function disegna(c: HTMLCanvasElement, s: ReturnType<typeof nuovaPartita>) {
  const ctx = c.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(c.clientWidth * dpr);
  const h = Math.round(c.clientHeight * dpr);
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  const k = Math.min(w / M.largo, h / ALTO);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.setTransform(k, 0, 0, k, (w - M.largo * k) / 2, (h - ALTO * k) / 2);

  // sfondo a tutto campo (ritagliato al centro), pavimento, rete
  const f = FIGURE.sfondo;
  if (pronta(f)) {
    const lato = Math.min(f.naturalWidth, (f.naturalHeight * M.largo) / ALTO);
    const alto = (lato * ALTO) / M.largo;
    ctx.drawImage(f, (f.naturalWidth - lato) / 2, (f.naturalHeight - alto) / 2, lato, alto, 0, 0, M.largo, ALTO);
  }
  ctx.fillStyle = 'rgba(255, 246, 250, 0.85)';
  ctx.fillRect(0, Y(0), M.largo, SUOLO);
  ctx.fillStyle = '#3d2350';
  ctx.fillRect(M.reteX - M.reteMezza, Y(M.reteAlta), M.reteMezza * 2, M.reteAlta);

  // personaggi: una figura sola, il movimento viene da inclinazione e schiacciamento (docs/09 §3.3)
  s.giocatori.forEach((g: Corpo, l) => {
    ctx.save();
    ctx.translate(g.x, Y(g.y));
    ctx.rotate(g.vx * 0.012);
    const sy = 1 + g.vy * 0.012;
    ctx.scale((l === 0 ? 1 : -1) / sy, sy);
    const fig = FIGURE.giocatori[l];
    if (pronta(fig)) ctx.drawImage(fig, -SPRITE / 2, -SPRITE, SPRITE, SPRITE);
    else {
      ctx.fillStyle = l === 0 ? '#c2185b' : '#7b6ae0';
      ctx.beginPath();
      ctx.arc(0, -M.centroG, M.raggioG, 0, 7);
      ctx.fill();
    }
    ctx.restore();
  });

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

export default function Gioco() {
  const tela = useRef<HTMLCanvasElement>(null);
  const tasti = useRef<Comandi>({ sx: false, dx: false, salta: false });
  const [partita, setPartita] = useState(0);
  const [fine, setFine] = useState<[number, number] | null>(null);

  useEffect(() => {
    const c = tela.current;
    if (!c) return;
    const verticale = matchMedia('(orientation: portrait)');
    let s = nuovaPartita(Date.now(), DURATA);
    let prima = performance.now();
    let resto = 0;
    let giro = 0;
    const ciclo = (ora: number) => {
      // passo fisso: il tempo vero si accumula e si consuma a sessantesimi; dopo una pausa lunga
      // (scheda nascosta, telefono in verticale) non si recupera più di un quarto di secondo
      resto = verticale.matches ? 0 : Math.min(resto + ora - prima, 250);
      prima = ora;
      for (; resto >= PASSO_MS; resto -= PASSO_MS) s = passo(s, [tasti.current, ia(s, 1, ERRORE_CPU)]);
      disegna(c, s);
      if (s.vincitore === null) giro = requestAnimationFrame(ciclo);
      else setFine(s.punti);
    };
    giro = requestAnimationFrame(ciclo);

    // tastiera, per provare dal computer: frecce e spazio
    const TASTI: Record<string, keyof Comandi> = { ArrowLeft: 'sx', ArrowRight: 'dx', ArrowUp: 'salta', ' ': 'salta' };
    const tasto = (giu: boolean) => (e: KeyboardEvent) => {
      const quale = TASTI[e.key];
      if (!quale) return;
      e.preventDefault();
      tasti.current[quale] = giu;
    };
    const giu = tasto(true);
    const su = tasto(false);
    addEventListener('keydown', giu);
    addEventListener('keyup', su);
    return () => {
      cancelAnimationFrame(giro);
      removeEventListener('keydown', giu);
      removeEventListener('keyup', su);
    };
  }, [partita]);

  const comando = (quale: keyof Comandi) => {
    const premi = (giu: boolean) => () => {
      tasti.current[quale] = giu;
    };
    return { onPointerDown: premi(true), onPointerUp: premi(false), onPointerCancel: premi(false), onPointerLeave: premi(false) };
  };

  return (
    <main className="gioco">
      <canvas ref={tela} aria-label="Campo di pallavolo" />
      <div className="gioco-tasti gioco-sx">
        <button type="button" aria-label="Sinistra" {...comando('sx')}>
          <CaretLeft size={36} weight="bold" aria-hidden />
        </button>
        <button type="button" aria-label="Destra" {...comando('dx')}>
          <CaretRight size={36} weight="bold" aria-hidden />
        </button>
      </div>
      <div className="gioco-tasti gioco-dx">
        <button type="button" className="gioco-salta" aria-label="Salta" {...comando('salta')}>
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
