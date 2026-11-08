import { useEffect, useState } from 'react';
import * as R from './lib/regole';
import { adesso, passi } from './spunte';
import { supabase } from './supabase';

// Flash card e quiz (design/Flashcard.html, design/Quiz.html). Lani fa, il server decide i passi:
// il giro si salva con l'ora d'inizio (controllo dei 7 secondi a carta), il quiz con le sbagliate.

export type Carta = { id: string; materia_id: string | null; tipo: string; fronte: string; retro: string; intervallo_giorni: number };
export type Domanda = { testo: string; opzioni: string[]; giusta: number; spiegazione: string };

const SECONDI = R.CONFIG.passi.studio_facoltativo.flashcard_secondi_prima_di_girare;

/** Sessione di ripasso fatta: segna l'ora (la timbra il server) e chiede i passi. */
export async function sessioneFatta(id: string): Promise<number> {
  const { error } = await supabase.from('sessioni_ripasso').update({ fatta_il: adesso() }).eq('id', id);
  return error ? 0 : passi('ripasso', id);
}

export function Flashcard({ carte, sessione, chiudi }: { carte: Carta[]; sessione?: string; chiudi: () => void }) {
  const [inizio] = useState(adesso);
  const [i, setI] = useState(0);
  const [girata, setGirata] = useState(false);
  const [restano, setRestano] = useState(SECONDI);
  const [conto, setConto] = useState({ sapevo: 0, quasi: 0, non_sapevo: 0 });
  const [fine, setFine] = useState<string>();

  const carta = carte[i];

  // si può girare solo dopo 7 secondi: il conto riparte a ogni carta
  useEffect(() => {
    if (girata) return;
    setRestano(SECONDI);
    const t = window.setInterval(() => setRestano((r) => Math.max(0, r - 1)), 1000);
    return () => window.clearInterval(t);
  }, [i, girata]);

  const prossima = () => {
    setI(i + 1);
    setGirata(false);
  };

  async function rispondi(esito: R.Esito) {
    const p = R.prossimaRevisione(carta.intervallo_giorni, esito, R.giornoRoma(new Date()));
    supabase.from('flashcard').update({ intervallo_giorni: p.intervallo, prossima_revisione: p.data }).eq('id', carta.id).then();
    const nuovo = { ...conto, [esito]: conto[esito] + 1 };
    setConto(nuovo);
    if (i + 1 < carte.length) return prossima();
    await chiudiGiro(nuovo);
  }

  async function sbagliata() {
    supabase.from('flashcard').update({ segnalata_sbagliata: true }).eq('id', carta.id).then();
    // la carta segnalata non conta nel giro: si passa alla prossima
    if (i + 1 < carte.length) prossima();
    else await chiudiGiro(conto);
  }

  async function chiudiGiro(c: typeof conto) {
    const totale = c.sapevo + c.quasi + c.non_sapevo;
    if (!totale) return chiudi();
    const { data } = await supabase
      .from('flashcard_giri')
      .insert({ iniziato_il: inizio, carte: totale, ...c, materia_id: carta.materia_id })
      .select('id')
      .single();
    let presi = data ? await passi('flashcard', data.id) : 0;
    if (sessione) presi += await sessioneFatta(sessione);
    setFine(
      c.sapevo * 3 < totale
        ? 'Queste erano difficili. Domani le rivediamo, una alla volta.'
        : `${presi ? `Giro finito: +${presi}. ` : ''}${c.sapevo} su ${totale} al primo colpo.${c.quasi ? ` Le ${c.quasi} incerte tornano domani.` : ''}`,
    );
  }

  if (fine)
    return (
      <section className="carta modulo studio">
        <h1>Giro finito</h1>
        <p>{fine}</p>
        <button className="principale" onClick={chiudi}>Torna allo studio</button>
      </section>
    );

  return (
    <section className="studio">
      <p className="sopratitolo">
        Carta {i + 1} di {carte.length}
      </p>
      <div className="carta grande">
        <p className="fronte">{carta.fronte}</p>
        {girata ? (
          <p className="retro">{carta.retro}</p>
        ) : (
          <p className="nota">{restano > 0 ? `Leggi bene: si gira tra ${restano} secondi.` : 'Pronta? Gira la carta.'}</p>
        )}
      </div>
      {girata ? (
        <div className="esiti">
          <button className="principale" onClick={() => rispondi('sapevo')}>Sapevo</button>
          <button className="secondario" onClick={() => rispondi('quasi')}>Quasi</button>
          <button className="secondario" onClick={() => rispondi('non_sapevo')}>Non sapevo</button>
        </div>
      ) : (
        <button className="principale largo" disabled={restano > 0} onClick={() => setGirata(true)}>
          Gira
        </button>
      )}
      <button className="link" onClick={sbagliata}>Questa carta è sbagliata</button>
      <button className="link" onClick={chiudi}>Esci</button>
    </section>
  );
}

export function Quiz({ quizId, domande, sessione, chiudi }: { quizId: string; domande: Domanda[]; sessione?: string; chiudi: () => void }) {
  const [i, setI] = useState(0);
  const [scelta, setScelta] = useState<number>();
  const [sbagliate, setSbagliate] = useState<number[]>([]);
  const [fine, setFine] = useState<string>();
  const d = domande[i];

  function scegli(n: number) {
    if (scelta !== undefined) return;
    setScelta(n);
    if (n !== d.giusta) setSbagliate((s) => [...s, i]);
  }

  async function avanti() {
    if (i + 1 < domande.length) {
      setI(i + 1);
      setScelta(undefined);
      return;
    }
    const totale = domande.length;
    const giuste = totale - sbagliate.length;
    const { data } = await supabase
      .from('quiz_tentativi')
      .insert({ quiz_id: quizId, numero: 0, giuste, totale, sbagliate })
      .select('id, numero')
      .single();
    let presi = data ? await passi('quiz', data.id) : 0;
    if (sessione) presi += await sessioneFatta(sessione);
    const voto = Math.round((giuste / totale) * 10);
    setFine(
      voto >= 9
        ? `${giuste} su ${totale}${(data?.numero ?? 1) > 1 ? `, tentativo ${data?.numero}` : ''}${presi ? `: +${presi}!` : '.'}`
        : voto >= 6
          ? `${giuste} su ${totale}. Le ${sbagliate.length} sbagliate sono diventate flash card.`
          : `${giuste} su ${totale}. Ora sai cosa ripassare: domani si riprova.`,
    );
  }

  if (fine)
    return (
      <section className="carta modulo studio">
        <h1>Quiz finito</h1>
        <p>{fine}</p>
        <button className="principale" onClick={chiudi}>Torna allo studio</button>
      </section>
    );

  return (
    <section className="studio">
      <p className="sopratitolo">
        Domanda {i + 1} di {domande.length}
      </p>
      <div className="carta">
        <h2>{d.testo}</h2>
        <div className="opzioni">
          {d.opzioni.map((o, n) => (
            <button
              key={n}
              className={`opzione ${scelta === undefined ? '' : n === d.giusta ? 'giusta' : n === scelta ? 'sbagliata' : ''}`}
              aria-pressed={scelta === n}
              onClick={() => scegli(n)}
            >
              {o}
            </button>
          ))}
        </div>
        {scelta !== undefined && (
          <p className="spiegazione" role="status">
            {scelta === d.giusta ? 'Giusto. ' : 'Non era questa. '}
            {d.spiegazione}
          </p>
        )}
      </div>
      {scelta !== undefined && (
        <button className="principale largo" onClick={avanti}>
          {i + 1 < domande.length ? 'Avanti' : 'Fine'}
        </button>
      )}
      <button className="link" onClick={chiudi}>Esci</button>
    </section>
  );
}
