import {
  ArrowFatLineUp,
  ArrowLeft,
  ArrowsClockwise,
  Armchair,
  Backpack,
  Bed,
  Camera,
  Cards,
  Certificate,
  ChatCircleSlash,
  Desk,
  ForkKnife,
  HandPalm,
  Handbag,
  ListChecks,
  NoteBlank,
  Notebook,
  PlayCircle,
  PuzzlePiece,
  Shower,
  Signature,
  Star,
  TShirt,
  Timer,
  Trophy,
  TrendUp,
  Volleyball,
  Warning,
  type Icon,
} from '@phosphor-icons/react';
import { Riquadro, Sticker } from './kit';
import { useREvolutionDa } from './accensione';
import * as R from './lib/regole';
import { blocchiPassi, type Icona } from './lib/regole/come-passi';

// "Come si fanno i passi": da Astra (pulsante vicino al contapassi), dalla prima accensione e dalla
// tabellina di Oggi (i gesti di casa). Nell'area genitori la versione completa: tutti i blocchi,
// con i dettagli già aperti. Numeri e testi da blocchiPassi (config); testi del copione, docs/05.
// Dal 18/11 è anche il glossario: ogni voce ha un'icona e una riga che dice cosa fare.

const ICONE: Record<Icona, Icon> = {
  Notebook, Backpack, Handbag, Signature, ArrowsClockwise, Camera, Cards, PlayCircle, ListChecks,
  Star, TrendUp, ArrowFatLineUp, PuzzlePiece, Certificate, Timer, Volleyball, Trophy, Armchair,
  Desk, ForkKnife, Bed, TShirt, Warning, NoteBlank, Shower, HandPalm, ChatCircleSlash,
};
// un colore del kit per blocco, così le icone dello stesso blocco si leggono insieme
const COLORE: Record<string, 'rosa' | 'lilla' | 'burro'> = { 'ogni-giorno': 'burro', studio: 'lilla', voti: 'rosa', 'r-evolution': 'lilla', casa: 'burro', meno: 'rosa' };

export default function ComePassi({ chiudi, completa = false, indietro = 'Astra' }: { chiudi?: () => void; completa?: boolean; indietro?: string }) {
  const accesaDa = useREvolutionDa();
  const blocchi = blocchiPassi(R.CONFIG, { rEvolution: completa || accesaDa !== null });
  return (
    <section className="come-passi">
      {chiudi && (
        <button className="indietro" onClick={chiudi} aria-label={`Torna a ${indietro}`}>
          <ArrowLeft size={20} weight="bold" aria-hidden /> {indietro}
        </button>
      )}
      {!completa && <h1>Come si fanno i passi</h1>}
      {blocchi.map((b) => (
        <article key={b.id} className="carta blocco-passi" data-ancora={`blocco-${b.id}`}>
          <header>
            <Sticker posa={b.posa} cartella={b.cartella} misura={56} />
            <h2>{b.titolo}</h2>
          </header>
          {b.riga && <p className="nota">{b.riga}</p>}
          <ul>
            {b.voci.map((v) => {
              const Disegno = v.icona && ICONE[v.icona];
              return (
                <li key={v.testo} className={Disegno ? 'con-icona' : undefined}>
                  {Disegno && (
                    <Riquadro colore={COLORE[b.id] ?? 'lilla'}>
                      <Disegno size={22} weight="bold" aria-hidden />
                    </Riquadro>
                  )}
                  <span>
                    {v.testo}
                    {v.spiega && <small>{v.spiega}</small>}
                  </span>
                  <b className="valore">{v.valore}</b>
                </li>
              );
            })}
          </ul>
          {b.dettagli.length > 0 && (
            <details open={completa}>
              <summary>Come funziona</summary>
              {b.dettagli.map((d) => (
                <p key={d}>{d}</p>
              ))}
            </details>
          )}
        </article>
      ))}
    </section>
  );
}
