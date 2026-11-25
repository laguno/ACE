import { useEffect, useState } from 'react';
import type { Tema } from './lib/regole/dieci-minuti';
import './sfondi.css';

// Sfondi della sessione dei dieci minuti (specifica del 25/11): un motivo per carta, disegnato in codice.
// I colori stanno nel tema della carta (data/config-dieci-minuti.json). Si muovono solo transform e opacity.
// Gli effetti leggono le fasi che il timer calcola già, senza toccarne la logica.

type Momento = {
  /** esercizio mostrato: quando cambia riparte l'effetto del cambio */
  esercizio: string;
  /** si sta lavorando (non pausa, riscaldamento o record) */
  lavoro: boolean;
  /** "3, 2, 1… cambio" */
  cambio: boolean;
  /** quanto dei dieci minuti è passato, da 0 a 1 */
  avanzamento: number;
};

function useNascosta() {
  const [nascosta, setNascosta] = useState(() => document.hidden);
  useEffect(() => {
    const cambia = () => setNascosta(document.hidden);
    document.addEventListener('visibilitychange', cambia);
    return () => document.removeEventListener('visibilitychange', cambia);
  }, []);
  return nascosta;
}

const conta = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Carta 1, futurismo storico: schegge, un cuneo, linee di forza; in lavoro una scia ogni 2 secondi. */
function Futurismo({ lavoro }: Momento) {
  return (
    <>
      <svg viewBox="0 0 390 800" preserveAspectRatio="xMidYMid slice" className="pieno">
        <path className="nero" d="M-20 70 L170 150 L-20 190 Z" />
        <path className="crema" d="M-20 205 L120 215 L-20 260 Z" />
        <path className="nero" d="M410 250 L250 360 L410 330 Z" />
        <path className="giallo" d="M410 70 L215 215 L410 185 Z" />
        <path className="crema" d="M410 460 L300 520 L410 505 Z" />
        <path className="nero" d="M-20 520 L110 640 L-20 600 Z" />
      </svg>
      <div className="forza">
        {conta(6).map((i) => (
          <i key={i} className={`f${i}`} />
        ))}
      </div>
      {lavoro && (
        <div className="scia">
          <i />
          <i />
          <i />
        </div>
      )}
    </>
  );
}

const Ingranaggio = ({ classe }: { classe: string }) => (
  <svg viewBox="-50 -50 100 100" className={`ingranaggio ${classe}`}>
    {conta(10).map((i) => (
      <rect key={i} x="-7" y="-49" width="14" height="16" rx="2" transform={`rotate(${i * 36})`} />
    ))}
    <circle r="31" className="corona" />
    <circle r="9" className="perno" />
    {conta(5).map((i) => (
      <rect key={i} x="-3" y="-27" width="6" height="20" transform={`rotate(${i * 72})`} />
    ))}
  </svg>
);

/** Carta 2, steampunk: ingranaggi, un tubo di rame, rivetti; sbuffo di vapore al cambio. */
function Steampunk({ esercizio }: Momento) {
  return (
    <>
      <svg viewBox="0 0 390 800" preserveAspectRatio="none" className="pieno tubo">
        <path d="M-10 150 H34 Q52 150 52 168 V430 Q52 448 34 448 H-10" />
      </svg>
      <Ingranaggio classe="g1" />
      <Ingranaggio classe="g2" />
      <Ingranaggio classe="g3" />
      <div className="rivetti sinistra" />
      <div className="rivetti destra" />
      <div className="vapore" key={esercizio}>
        <i />
        <i />
        <i />
      </div>
    </>
  );
}

const PALAZZI = [
  [0, 90, 46],
  [48, 140, 38],
  [88, 70, 52],
  [142, 110, 34],
  [178, 60, 48],
  [228, 150, 40],
  [270, 95, 56],
  [328, 125, 62],
] as const;

/** Carta 3, cyberpunk: skyline, griglia in prospettiva che scorre, glitch al cambio. */
function Cyberpunk({ cambio }: Momento) {
  return (
    <>
      <svg viewBox="0 0 390 160" preserveAspectRatio="none" className="citta">
        {PALAZZI.map(([x, h, w]) => (
          <g key={x}>
            <rect x={x} y={160 - h} width={w} height={h} className="palazzo" />
            {conta(Math.floor(h / 22)).map((i) => (
              <rect key={i} x={x + 7 + ((i * 11) % (w - 18))} y={168 - h + i * 20} width="5" height="7" className="finestra" />
            ))}
          </g>
        ))}
      </svg>
      <div className="suolo">
        <div className="griglia" />
      </div>
      <div className={`glitch${cambio ? ' forte' : ''}`}>
        <i />
        <i />
        <i />
      </div>
    </>
  );
}

const Stella = ({ n }: { n: number }) => (
  <svg viewBox="-10 -10 20 20" className={`stella s${n}`}>
    <path d="M0 -10 L1.6 -1.6 L10 0 L1.6 1.6 L0 10 L-1.6 1.6 L-10 0 L-1.6 -1.6 Z" />
    <circle r="2.4" />
  </svg>
);

/** Carta 4, retrofuturismo: orbite, il pallone come pianeta con l'anello, stelline, un boomerang. */
function Retrofuturismo({ esercizio }: Momento) {
  return (
    <>
      <svg viewBox="-200 -110 400 220" className="orbite">
        <g transform="rotate(-12)">
          <ellipse rx="185" ry="72" />
          <ellipse rx="140" ry="98" className="seconda" />
        </g>
      </svg>
      {/* il giro: il piano schiaccia il cerchio in ellisse, il pianeta si raddrizza al contrario */}
      <div className="orbita">
        <div className="giro" key={esercizio}>
          <div className="posto">
            <div className="dritto">
              <svg viewBox="-30 -30 60 60" className="pianeta">
                <path className="anello-dietro" d="M-27 0 A27 8 0 0 1 27 0" />
                <circle r="17" className="palla" />
                <path className="rossa" d="M-16 -6 C-6 -14 8 -12 15 -8" />
                <path className="verde" d="M-17 3 C-5 -4 7 -2 17 3" />
                <path className="rossa" d="M-13 11 C-4 7 6 8 12 12" />
                <path className="anello-davanti" d="M-27 0 A27 8 0 0 0 27 0" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <svg viewBox="0 0 80 50" className="boomerang">
        <path d="M6 40 Q18 6 40 6 Q62 6 74 40 Q58 22 40 22 Q22 22 6 40 Z" />
      </svg>
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <Stella key={n} n={n} />
      ))}
    </>
  );
}

const Circuito = ({ lato }: { lato: 'sinistra' | 'destra' }) => (
  <div className={`circuito ${lato}`}>
    {['spento', 'acceso'].map((stato) => (
      <svg key={stato} viewBox="0 0 50 300" className={stato}>
        <path d="M0 20 H22 V70 H38 V130 M0 100 H14 V190 H34 V230 M0 280 H26 V250" />
        {[
          [38, 130],
          [34, 230],
          [26, 250],
          [22, 20],
        ].map(([x, y]) => (
          <circle key={y} cx={x} cy={y} r="4" />
        ))}
      </svg>
    ))}
  </div>
);

/** Carta 5, afrofuturismo: fasce geometriche, circuiti dorati. Le fasce pulsano in saltelli e skip, il
 * circuito si accende mentre si tiene l'equilibrio. I triangoli sopra il nome stanno in sfondi.css. */
function Afrofuturismo({ esercizio, lavoro }: Momento) {
  const ritmo = lavoro && (esercizio === 'saltelli' || esercizio === 'skip');
  const equilibrio = lavoro && (esercizio === 'una-gamba' || esercizio === 'punte');
  return (
    <>
      <div className={`fasce${ritmo ? ' ritmo' : ''}`}>
        <i className="f-oro" />
        <svg viewBox="0 0 390 24" preserveAspectRatio="none">
          <path d={`M0 20 ${conta(26).map((i) => `L${i * 15 + 7.5} 4 L${i * 15 + 15} 20`).join(' ')}`} />
        </svg>
        <i className="f-verde" />
        <i className="f-bruciato" />
      </div>
      <div className={equilibrio ? 'circuiti accesi' : 'circuiti'}>
        <Circuito lato="sinistra" />
        <Circuito lato="destra" />
      </div>
    </>
  );
}

/** Carta 6, solarpunk: il sole sale lungo i dieci minuti, foglie che si aprono, celle solari. */
function Solarpunk({ avanzamento }: Momento) {
  return (
    <>
      <svg viewBox="-50 -50 100 100" className="sole" style={{ transform: `translateY(${(1 - avanzamento) * 14}vh)` }}>
        {conta(12).map((i) => (
          <rect key={i} x="-2.5" y="-48" width="5" height="17" rx="2.5" transform={`rotate(${i * 30})`} />
        ))}
        <circle r="24" />
      </svg>
      {[1, 2, 3, 4].map((n) => (
        <svg key={n} viewBox="0 0 60 100" className={`foglia l${n}`}>
          <path d="M30 100 C-8 70 2 22 30 0 C58 22 68 70 30 100 Z" />
          <path className="vena" d="M30 96 V14" />
        </svg>
      ))}
      <svg viewBox="0 0 130 120" className="celle">
        {[
          [30, 30],
          [30, 66],
          [30, 102],
          [61, 48],
          [61, 84],
          [92, 102],
        ].map(([x, y]) => (
          <path key={`${x}-${y}`} d={`M${x - 20} ${y} l10 -17 h20 l10 17 l-10 17 h-20 Z`} />
        ))}
      </svg>
    </>
  );
}

const COSTELLAZIONI = [
  [
    [30, 90],
    [62, 62],
    [96, 84],
    [118, 46],
    [150, 60],
  ],
  [
    [250, 130],
    [284, 160],
    [318, 138],
    [346, 176],
    [366, 150],
  ],
] as const;

/** Carta 7, celestiale: nebulose, aurora lenta, costellazioni complete all'ultimo blocco. */
function Celestiale({ avanzamento }: Momento) {
  const punti = COSTELLAZIONI.flatMap((c, k) => c.map((p, i) => ({ p, prima: i ? c[i - 1] : null, ordine: k * 5 + i })));
  // l'ultimo blocco comincia all'80% dei dieci minuti
  const accese = Math.max(1, Math.ceil(Math.min(1, avanzamento / 0.8) * punti.length));
  return (
    <>
      <div className="nebulosa n1" />
      <div className="nebulosa n2" />
      <div className="aurora a1" />
      <div className="aurora a2" />
      <div className="cielo" />
      <svg viewBox="0 0 390 200" className="costellazioni">
        {punti.map(({ p, prima, ordine }) => (
          <g key={ordine} className={ordine < accese ? 'accesa' : 'spenta'}>
            {prima && <line x1={prima[0]} y1={prima[1]} x2={p[0]} y2={p[1]} />}
            <circle cx={p[0]} cy={p[1]} r="3.2" />
          </g>
        ))}
      </svg>
    </>
  );
}

const MOTIVI: Record<string, (m: Momento) => React.ReactNode> = {
  futurismo: Futurismo,
  steampunk: Steampunk,
  cyberpunk: Cyberpunk,
  retrofuturismo: Retrofuturismo,
  afrofuturismo: Afrofuturismo,
  solarpunk: Solarpunk,
  celestiale: Celestiale,
};

export function Sfondo({ tema, ...momento }: { tema: Tema } & Momento) {
  const Motivo = MOTIVI[tema.motivo];
  const nascosta = useNascosta();
  const colori = Object.fromEntries(Object.entries(tema.colori).map(([k, v]) => [`--${k}`, v]));
  return (
    <div className={`sfondo ${tema.motivo}${nascosta ? ' fermo' : ''}`} style={{ background: tema.fondo, ...colori }} aria-hidden>
      {Motivo && <Motivo {...momento} />}
    </div>
  );
}
