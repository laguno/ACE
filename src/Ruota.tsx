import { useState } from 'react';
import { CARTE, DIECI } from './lib/regole/dieci-minuti';
import { senti } from './sensi';
import { useMovimentoRidotto, vibra } from './SessioneDieci';

// La ruota dei dieci minuti (progetto del 25/11, docs/dieci-minuti.md): sette spicchi con gli sticker, le carte
// già uscite nella settimana spente, suono e vibrazione al giro. L'esito lo decide il server (gira_ruota):
// la ruota parte quando arriva la risposta e si ferma sulla carta.

const SPICCHIO = 360 / CARTE.length;
const R = 150;
// un dettaglio del motivo di ogni carta, vicino al bordo dello spicchio (specifica sfondi del 25/11)
const DETTAGLI: Record<string, string> = {
  futurismo: 'M-13 6 L13 -9 L2 8 Z M-12 -8 L4 -6 L-10 -2 Z',
  steampunk: 'M-3 -11 H3 L4 -7 L8 -9 L11 -4 L8 -2 V2 L11 4 L8 9 L4 7 L3 11 H-3 L-4 7 L-8 9 L-11 4 L-8 2 V-2 L-11 -4 L-8 -9 L-4 -7 Z M0 -4 A4 4 0 1 0 0 4 A4 4 0 1 0 0 -4 Z',
  cyberpunk: 'M-14 9 H14 V11 H-14 Z M-12 9 V-3 H-6 V9 Z M-3 9 V-11 H4 V9 Z M7 9 V0 H12 V9 Z',
  retrofuturismo: 'M0 -7 A7 7 0 1 0 0 7 A7 7 0 1 0 0 -7 Z M-15 3 Q0 11 15 -3 Q2 4 -15 3 Z',
  afrofuturismo: 'M-15 7 L-8 -7 L-1 7 Z M1 7 L8 -7 L15 7 Z',
  solarpunk: 'M0 -6 A6 6 0 1 0 0 6 A6 6 0 1 0 0 -6 Z M-1.5 -13 H1.5 V-8 H-1.5 Z M-1.5 8 H1.5 V13 H-1.5 Z M-13 -1.5 H-8 V1.5 H-13 Z M8 -1.5 H13 V1.5 H8 Z',
  celestiale: 'M0 -12 L3 -3 L12 0 L3 3 L0 12 L-3 3 L-12 0 L-3 -3 Z',
};

// una posa per carta (28/11): un fotogramma di un suo esercizio, il primo salvo l'affondo (posa piegata)
const POSE: Record<number, string> = { 1: 'affondi-posa', 2: 'plank-fermo', 3: 'presa-due-mani-fermo', 4: 'palleggio-base-fermo', 5: 'una-gamba-fermo', 6: 'farfalla-fermo', 7: 'respirazione-fermo' };
const immagine = (n: number) => `/assets/trick/${POSE[n]}.webp`;

function punto(gradi: number, r: number) {
  const a = ((gradi - 90) * Math.PI) / 180;
  return [R + r * Math.cos(a), R + r * Math.sin(a)];
}

/** Angolo finale perché lo spicchio della carta `n` si fermi sotto la freccia, in alto, dopo qualche giro. */
export const angoloPer = (n: number, giri = 5) => giri * 360 - ((n - 1) * SPICCHIO + SPICCHIO / 2);

/** `gira` chiede la carta al server; `fermata` arriva quando la ruota si è fermata su quella carta. */
export function Ruota({ uscite, gira, fermata }: { uscite: number[]; gira: () => Promise<number | null>; fermata: (n: number) => void }) {
  const ridotto = useMovimentoRidotto();
  const [angolo, setAngolo] = useState(0);
  const [carta, setCarta] = useState<number | null>(null);
  const [girando, setGirando] = useState(false);

  async function via() {
    setGirando(true);
    if (!ridotto) vibra(DIECI.vibrazione_ms.ruota);
    const n = await gira();
    if (!n) return setGirando(false);
    setCarta(n);
    setAngolo(angoloPer(n, ridotto ? 0 : 6));
    setTimeout(
      () => {
        setGirando(false);
        senti('tappa');
        fermata(n);
      },
      ridotto ? 0 : 3200,
    );
  }

  return (
    <div className="ruota">
      <div className="ruota-freccia" aria-hidden />
      <svg viewBox={`0 0 ${2 * R} ${2 * R}`} className="ruota-disco" style={{ transform: `rotate(${angolo}deg)` }} role="img" aria-label={carta ? `Ruota: è uscita ${CARTE[carta - 1].nome}` : 'Ruota delle sette carte'}>
        {CARTE.map((c, i) => {
          const [x1, y1] = punto(i * SPICCHIO, R - 4);
          const [x2, y2] = punto((i + 1) * SPICCHIO, R - 4);
          const [ix, iy] = punto((i + 0.5) * SPICCHIO, R * 0.6);
          const spenta = uscite.includes(c.n) && c.n !== carta;
          return (
            <g key={c.n} className={spenta ? 'spenta' : undefined}>
              <path d={`M${R} ${R} L${x1} ${y1} A${R - 4} ${R - 4} 0 0 1 ${x2} ${y2} Z`} fill={c.tema?.fondo} />
              {c.tema && <path className="dettaglio" d={DETTAGLI[c.tema.motivo]} fill={c.tema.anello} fillRule="evenodd" transform={`rotate(${(i + 0.5) * SPICCHIO} ${ix} ${iy}) translate(${ix} ${iy - 41})`} />}
              <image href={immagine(c.n)} x={ix - 30} y={iy - 30} width="60" height="60" transform={`rotate(${(i + 0.5) * SPICCHIO} ${ix} ${iy})`} />
              <text x={ix} y={iy + 44} transform={`rotate(${(i + 0.5) * SPICCHIO} ${ix} ${iy})`}>
                {c.n}
              </text>
            </g>
          );
        })}
        <circle cx={R} cy={R} r={R - 4} className="ruota-bordo" />
        <circle cx={R} cy={R} r={22} className="ruota-perno" />
      </svg>
      {!carta && !girando && (
        <button className="sessione-via ruota-gira" onClick={via}>
          {DIECI.ruota.gira}
        </button>
      )}
      {!carta && uscite.length > 0 && <p className="ruota-nota">{DIECI.ruota.uscite}</p>}
      {girando && <span className="ruota-gira-ancora" role="status">La ruota gira…</span>}
    </div>
  );
}
