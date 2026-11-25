import { useEffect, useState } from 'react';
import type { Tema } from './lib/regole/dieci-minuti';
import './sfondi.css';

// Sfondi della sessione dei dieci minuti (specifica del 25/11): un motivo per carta, disegnato in codice.
// I colori stanno nel tema della carta (data/config-dieci-minuti.json). Si muovono solo transform e opacity.
// `esercizio` cambia a ogni esercizio nuovo e fa ripartire l'effetto legato al cambio.

function useNascosta() {
  const [nascosta, setNascosta] = useState(() => document.hidden);
  useEffect(() => {
    const cambia = () => setNascosta(document.hidden);
    document.addEventListener('visibilitychange', cambia);
    return () => document.removeEventListener('visibilitychange', cambia);
  }, []);
  return nascosta;
}

/** Stellina atomica anni Sessanta: quattro punte lunghe e un pallino. */
const Stella = ({ n }: { n: number }) => (
  <svg viewBox="-10 -10 20 20" className={`stella s${n}`}>
    <path d="M0 -10 L1.6 -1.6 L10 0 L1.6 1.6 L0 10 L-1.6 1.6 L-10 0 L-1.6 -1.6 Z" />
    <circle r="2.4" />
  </svg>
);

/** Carta 4, retrofuturismo: orbite, il pallone come pianeta con l'anello, stelline, un boomerang. */
function Retrofuturismo({ esercizio }: { esercizio: string }) {
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

const MOTIVI: Record<string, typeof Retrofuturismo> = { retrofuturismo: Retrofuturismo };

export function Sfondo({ tema, esercizio }: { tema: Tema; esercizio: string }) {
  const Motivo = MOTIVI[tema.motivo];
  const nascosta = useNascosta();
  const colori = Object.fromEntries(Object.entries(tema.colori).map(([k, v]) => [`--${k}`, v]));
  return (
    <div className={`sfondo ${tema.motivo}${nascosta ? ' fermo' : ''}`} style={{ background: tema.fondo, ...colori }} aria-hidden>
      {Motivo && <Motivo esercizio={esercizio} />}
    </div>
  );
}
