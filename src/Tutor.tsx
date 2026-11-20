import { useEffect, useState, type FormEvent } from 'react';
import { Testata } from './kit';
import { supabase } from './supabase';
import config from '../data/config-gioco.json';

// Il tutor (blocco E, 19/11): lampadina "Non ho capito" di un compito e "Spiegamelo tu" di Studio.
// Tutto passa dalla Edge Function `spiega`: gli indizi arrivano solo dopo il tentativo di Lani, uno
// alla volta; il server controlla che non ci sia il risultato e tiene il tetto giornaliero.
// Testi provvisori (docs/05, Studio, "Tutor"): da confermare dal signore.

const T = config.tutor;
type Stato = { spiegazione: string; tentativo: string | null; indizi: string[]; totale_indizi: number };
type Esito = Stato | 'tetto' | null | undefined;

const TETTO = 'Per oggi la lampadina ha dato tutto. Domani si riaccende; intanto chiedi a mamma o papà.';
const SPENTA = 'Adesso la lampadina non si accende. Riprova tra poco, oppure chiedi a mamma o papà.';

async function chiama<R>(body: Record<string, unknown>): Promise<R | 'tetto' | null> {
  const { data, error } = await supabase.functions.invoke('spiega', { body });
  if (error) {
    const stato = (error as { context?: Response }).context?.status;
    return stato === 429 ? 'tetto' : null;
  }
  return data as R;
}

/** Lampadina "Non ho capito": l'argomento con un altro esempio; poi il tentativo; poi un indizio alla volta. */
export function Aiuto({ compito, chiudi }: { compito: { id: string; testo: string; materie?: { nome: string } | null }; chiudi: () => void }) {
  const [r, setR] = useState<Esito>();
  const [prova, setProva] = useState('');
  const [attesa, setAttesa] = useState(false);
  const [errore, setErrore] = useState<string>();
  useEffect(() => {
    chiama<Stato>({ compito_id: compito.id }).then((x) => setR(x && x !== 'tetto' && !x.spiegazione ? null : x));
  }, [compito.id]);

  async function salvaTentativo(e: FormEvent) {
    e.preventDefault();
    if (!r || r === 'tetto') return;
    if (prova.trim().length < T.tentativo_min_caratteri) return setErrore('Scrivi almeno una parola su come hai provato.');
    setAttesa(true);
    const x = await chiama<{ tentativo: string }>({ compito_id: compito.id, azione: 'tentativo', testo: prova });
    setAttesa(false);
    if (!x || x === 'tetto') return setErrore('Non salvato. Riprova.');
    setErrore(undefined);
    setR({ ...r, tentativo: x.tentativo });
  }

  async function indizio() {
    setAttesa(true);
    const x = await chiama<Stato>({ compito_id: compito.id, azione: 'indizio' });
    setAttesa(false);
    if (x && x !== 'tetto') setR(x);
  }

  return (
    <section className="schermo">
      <Testata sfondo="pomeriggio" posa="lani-pensierosa" sopra={compito.materie?.nome ?? 'Compito'} titolo="Non ho capito" riga={<p>{compito.testo}</p>} />
      <div className="carta" aria-live="polite">
        {r === undefined && <p>Ok, vediamola con un altro esempio…</p>}
        {r === null && <p>{SPENTA}</p>}
        {r === 'tetto' && <p>{TETTO}</p>}
        {r && r !== 'tetto' && (
          <>
            <p>Ok, vediamola con un altro esempio.</p>
            <p>{r.spiegazione}</p>
            {r.tentativo === null ? (
              <form className="modulo" onSubmit={salvaTentativo}>
                <label>
                  Prima dimmi come ci hai provato
                  <textarea value={prova} onChange={(e) => setProva(e.target.value)} maxLength={T.tentativo_max_caratteri} rows={3} placeholder="Dove ti blocchi? Bastano due parole." />
                </label>
                {errore && <p role="alert">{errore}</p>}
                <button className="secondario" disabled={attesa}>
                  Ci ho provato così
                </button>
              </form>
            ) : (
              <>
                <p className="nota">Il tuo tentativo: {r.tentativo}</p>
                {r.indizi.map((x, n) => (
                  <p key={n} className="indizio">
                    <b>Indizio {n + 1}.</b> {x}
                  </p>
                ))}
                {r.indizi.length < r.totale_indizi && (
                  <button className="secondario" onClick={indizio} disabled={attesa}>
                    {r.indizi.length ? 'Un altro indizio' : 'Un indizio'}
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
      <button className="principale largo" onClick={chiudi}>
        Torna ai compiti
      </button>
    </section>
  );
}

type Ritorno = { cosa_va: string[]; cosa_manca: string[]; da_sistemare: string[]; domanda: string };

/** "Spiegamelo tu": Lani spiega un argomento con parole sue; il tutor dice cosa c'è e cosa manca. Nessun voto. */
export function Spiegamelo({ chiudi }: { chiudi: () => void }) {
  const [argomento, setArgomento] = useState('');
  const [testo, setTesto] = useState('');
  const [esito, setEsito] = useState<Ritorno | 'tetto' | null>();
  const [attesa, setAttesa] = useState(false);
  const [errore, setErrore] = useState<string>();

  async function controlla(e: FormEvent) {
    e.preventDefault();
    if (!argomento.trim()) return setErrore('Scrivi di quale argomento parli.');
    if (testo.trim().length < T.spiegamelo_min_caratteri) return setErrore('Scrivi almeno due frasi.');
    setErrore(undefined);
    setAttesa(true);
    setEsito(await chiama<Ritorno>({ azione: 'spiegamelo', argomento, testo }));
    setAttesa(false);
  }

  const lista = (titolo: string, voci: string[]) =>
    voci.length > 0 && (
      <>
        <h2>{titolo}</h2>
        <ul>
          {voci.map((v, n) => (
            <li key={n}>{v}</li>
          ))}
        </ul>
      </>
    );

  return (
    <section className="schermo">
      <Testata sfondo="panna" posa="lani-pensierosa" misura={132} sopra="Studio" titolo="Spiegamelo tu" riga={<p>Spiega un argomento con parole tue. Ti dico cosa c'è e cosa manca, senza voto.</p>} />
      <div className="carta" aria-live="polite">
        {esito && esito !== 'tetto' ? (
          <>
            {lista("Cosa c'è", esito.cosa_va)}
            {lista('Cosa manca', esito.cosa_manca)}
            {lista('Da sistemare', esito.da_sistemare)}
            {esito.domanda && <p className="indizio">{esito.domanda}</p>}
            <button className="secondario" onClick={() => setEsito(undefined)}>
              Riprova a spiegarlo
            </button>
          </>
        ) : (
          <form className="modulo" onSubmit={controlla}>
            <label>
              Argomento
              <input value={argomento} onChange={(e) => setArgomento(e.target.value)} maxLength={T.argomento_max_caratteri} placeholder="Le frazioni" />
            </label>
            <label>
              La tua spiegazione
              <textarea value={testo} onChange={(e) => setTesto(e.target.value)} maxLength={T.spiegamelo_max_caratteri} rows={6} placeholder="Come lo spiegheresti a un'amica?" />
            </label>
            {errore && <p role="alert">{errore}</p>}
            {esito === 'tetto' && <p role="status">{TETTO}</p>}
            {esito === null && <p role="status">{SPENTA}</p>}
            <button className="principale" disabled={attesa}>
              {attesa ? 'Leggo…' : 'Controlla'}
            </button>
          </form>
        )}
      </div>
      <button className="principale largo" onClick={chiudi}>
        Torna allo studio
      </button>
    </section>
  );
}
