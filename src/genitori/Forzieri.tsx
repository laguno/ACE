import { useEffect, useState, type FormEvent } from 'react';
import { TreasureChest } from '@phosphor-icons/react';
import * as R from '../lib/regole';
import { Attesa, CampoTesto, Elenco, Foglio, Riga } from '../kit';
import { Biglietto } from '../Biglietto';
import { ImmaginePremio, immaginiPremi, type Immagine } from '../ImmaginePremio';
import type { Props } from './comune';

// Forzieri: una riga per forziere (premio e stato), il prossimo da impostare in evidenza; toccando
// una riga si apre il forziere: premio, enigma e soluzione, immagine. Era la scheda Premi.

type Forziere = { n: number; premio: string | null; enigma: string | null; soluzione: string | null; aiutino: string | null; parola: string | null; stato: string };

const nome = (n: number) => (n === 9 ? 'Cima' : `Forziere ${n}`);
function stato(f: Forziere) {
  if (f.stato === 'consegnato') return 'Consegnato';
  if (f.stato === 'aperto') return 'Aperto · da consegnare';
  if (f.stato === 'enigma') return 'Enigma comparso a Lani';
  return f.enigma ? 'Enigma pronto' : f.premio ? 'Enigma da fare' : 'Da scegliere';
}

export default function Forzieri({ client, avvisa }: Props) {
  const [forzieri, setForzieri] = useState<Forziere[]>();
  const [immagini, setImmagini] = useState<Immagine[]>([]);
  const [aperto, setAperto] = useState<number>();
  const [lavoro, setLavoro] = useState(false);
  const [consegna, setConsegna] = useState<number>();
  const carica = () => {
    client.from('forzieri').select('n, premio, enigma, soluzione, aiutino, parola, stato').order('n').then(({ data }) => setForzieri(data ?? []));
    immaginiPremi(undefined, client).then(setImmagini);
  };
  useEffect(() => {
    carica();
  }, []);

  async function salva(e: FormEvent<HTMLFormElement>, n: number) {
    e.preventDefault();
    const premio = String(new FormData(e.currentTarget).get('premio')).trim();
    if (!premio) return;
    setLavoro(true);
    const { error } = await client.from('forzieri').update({ premio }).eq('n', n);
    if (error) {
      setLavoro(false);
      return avvisa('Premio non salvato. Riprova.');
    }
    const { data, error: e2 } = await client.functions.invoke('enigma', { body: { azione: 'genera', n } });
    setLavoro(false);
    // la funzione spiega perché non è riuscito (per la cima: prima gli enigmi dei forzieri 1-8)
    const perche = e2 && 'context' in e2 ? ((await (e2.context as Response).json().catch(() => null))?.errore as string | undefined) : undefined;
    let msg = data?.enigma ? `${nome(n)}: premio salvato ed enigma pronto.` : `${nome(n)}: premio salvato; l'enigma non è riuscito${perche ? ` (${perche})` : ''}, riprova.`;
    // cambiando un premio cambia la sua parola chiave: la cima va rifatta
    const cima = forzieri?.find((x) => x.n === 9);
    if (data?.enigma && n < 9 && cima?.enigma && cima.stato === 'chiuso') msg = `${nome(n)}: enigma pronto. Rifate anche l'enigma della cima: usa le parole dei forzieri.`;
    avvisa(msg);
    carica();
  }
  async function consegnato(n: number) {
    setConsegna(undefined);
    const { error } = await client.from('forzieri').update({ stato: 'consegnato', consegnato_il: new Date().toISOString() }).eq('n', n);
    avvisa(error ? 'Non salvato. Riprova.' : `${nome(n)}: consegnato.`);
    carica();
  }

  if (!forzieri) return <Attesa />;
  const senza = forzieri.filter((f) => !f.premio).length;
  const prossimo = forzieri.find((f) => !f.premio)?.n;
  const f = forzieri.find((x) => x.n === aperto);

  if (f) {
    const conf = R.forziere(f.n);
    const img = immagini.find((x) => x.n === f.n) ?? null;
    return (
      <>
        <button type="button" className="ga-indietro" onClick={() => setAperto(undefined)}>
          ‹ Forzieri
        </button>
        <h2>{nome(f.n)}</h2>
        <p className="ga-nota">
          Tappa {conf.tappa}, {conf.chiavi} chiavi · {stato(f)}. Il premio si cambia finché l’enigma non è comparso a Lani.
        </p>
        {f.stato === 'chiuso' ? (
          <form className="ga-modulo" onSubmit={(e) => salva(e, f.n)}>
            <CampoTesto etichetta="Premio" name="premio" defaultValue={f.premio ?? ''} maxLength={120} required placeholder="Una pizza con le amiche…" />
            <button className="ga-btn pieno largo" disabled={lavoro}>
              {lavoro ? 'Scrivo l’enigma…' : f.premio ? 'Salva e rifai l’enigma' : 'Salva e crea l’enigma'}
            </button>
          </form>
        ) : (
          <Elenco>
            <Riga titolo={f.premio ?? 'Senza premio'} sotto="L’enigma è già comparso a Lani: premio ed enigma non si cambiano più." />
          </Elenco>
        )}
        {f.premio && (
          <div className="ga-modulo premio-genitori">
            <ImmaginePremio img={img} misura={96} vera />
            {img?.manca !== false && <p className="ga-nota">Immagine da rifare: il premio è cambiato. Lani vede il pacco regalo finché non arriva quella nuova.</p>}
          </div>
        )}
        {f.enigma && (
          <details>
            <summary>Enigma e soluzione</summary>
            <Biglietto testo={f.enigma} />
            <p className="ga-nota">Soluzione: {f.soluzione}</p>
            {f.aiutino && <p className="ga-nota">Aiutino (dopo il primo errore): {f.aiutino}</p>}
            {f.parola && <p className="ga-nota">Parola chiave per la cima: {f.parola}</p>}
          </details>
        )}
        {f.stato === 'aperto' && (
          <button type="button" className="ga-btn largo" onClick={() => setConsegna(f.n)}>
            Segna come consegnato
          </button>
        )}
        {consegna && <Consegna n={consegna} conferma={consegnato} chiudi={() => setConsegna(undefined)} />}
      </>
    );
  }

  return (
    <>
      <p className="ga-nota">
        {senza ? `${senza} ${senza === 1 ? 'forziere' : 'forzieri'} senza premio. ` : ''}I primi piccoli, poi sempre più importanti; la cima legata alla pagella di giugno. Lani non vede i premi finché non apre il forziere.
      </p>
      <Elenco etichetta="Forzieri">
        {forzieri.map((x) => {
          const conf = R.forziere(x.n);
          return (
            <Riga
              key={x.n}
              colore={x.stato === 'aperto' ? 'burro' : x.n === prossimo ? 'rosa' : 'lilla'}
              icona={<TreasureChest size={20} weight="bold" aria-hidden />}
              titolo={`${x.n === 9 ? 'Cima' : x.n} · ${x.premio ?? 'Da scegliere'}`}
              sotto={`Tappa ${conf.tappa}, ${conf.chiavi} chiavi · ${x.n === prossimo ? 'il prossimo da scegliere' : stato(x)}`}
              vai={() => setAperto(x.n)}
              azione={
                x.stato === 'aperto' ? (
                  <button type="button" className="ga-btn" onClick={() => setConsegna(x.n)}>
                    Consegnato
                  </button>
                ) : x.n === prossimo ? (
                  <button type="button" className="ga-btn pieno" onClick={() => setAperto(x.n)}>
                    Scegli
                  </button>
                ) : undefined
              }
            />
          );
        })}
      </Elenco>
      {consegna && <Consegna n={consegna} conferma={consegnato} chiudi={() => setConsegna(undefined)} />}
    </>
  );
}

function Consegna({ n, conferma, chiudi }: { n: number; conferma: (n: number) => void; chiudi: () => void }) {
  return (
    <Foglio titolo={`${nome(n)}: consegnato?`} azione="Sì, consegnato" conferma={() => conferma(n)} chiudi={chiudi}>
      <p className="ga-nota">Segnatelo quando Lani ha avuto il premio.</p>
    </Foglio>
  );
}
