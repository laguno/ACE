import { useState } from 'react';
import { CARTE, DIECI } from './lib/regole/dieci-minuti';
import { senti } from './sensi';
import { useMovimentoRidotto, vibra } from './SessioneDieci';

// La ruota dei dieci minuti (progetto del 25/11, docs/dieci-minuti.md): sette spicchi con gli sticker, le carte
// già uscite nella settimana spente, suono e vibrazione al giro. L'esito lo decide il server (gira_ruota):
// la ruota parte quando arriva la risposta e si ferma sulla carta.

const SPICCHIO = 360 / CARTE.length;
const R = 150;
const colori = ['#ffb3d1', '#c9b6ff', '#b8f0d9', '#ffe08a', '#a8dcff', '#ffcfa8', '#e3d4ff'];

const immagine = (n: number) => (n === 4 ? '/assets/trick/palleggio-base-fermo.webp' : n === 3 ? '/assets/avatar/lani/lani-vr.webp' : '/assets/avatar/lani/lani-dieci-minuti.webp');

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
          const [ix, iy] = punto((i + 0.5) * SPICCHIO, R * 0.62);
          const spenta = uscite.includes(c.n) && c.n !== carta;
          return (
            <g key={c.n} className={spenta ? 'spenta' : undefined}>
              <path d={`M${R} ${R} L${x1} ${y1} A${R - 4} ${R - 4} 0 0 1 ${x2} ${y2} Z`} fill={colori[i]} />
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
