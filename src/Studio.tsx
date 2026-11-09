import { useEffect, useState } from 'react';
import { Cards, ClipboardText } from '@phosphor-icons/react';
import { Riquadro, Testata } from './kit';
import * as R from './lib/regole';
import { Flashcard, Quiz, type Carta, type Domanda } from './Ripasso';
import { GIORNI, MESI, maiuscola } from './spunte';
import { supabase } from './supabase';

// Studio — design/Studio.html. Verifiche in arrivo con il piano di ripasso (sessioni da 15 minuti),
// carte del giorno (ripetizione a intervalli) e quiz liberi. Video più avanti.

type Sessione = {
  id: string;
  numero: number;
  data_prevista: string;
  tipo: R.TipoSessione;
  fatta_il: string | null;
};
type Verifica = {
  id: string;
  data: string;
  tipo: string;
  argomento: string | null;
  pagine_probabili: string | null;
  materie: { nome: string } | null;
  sessioni_ripasso: Sessione[];
  quiz: { id: string; domande: Domanda[] }[];
};
type Attivita = ({ tipo: 'carte'; carte: Carta[] } | { tipo: 'quiz'; quizId: string; domande: Domanda[] }) & { titolo: string; sessione?: string };
const titoloQuiz = (v: Verifica) => `Quiz di ${(v.materie?.nome ?? 'ripasso').toLowerCase()}`;

const COSA: Record<R.TipoSessione, string> = {
  rilettura_flashcard: 'rilettura e flash card',
  flashcard_mappa: 'flash card e mappa',
  quiz: 'quiz',
  quiz_errori: 'quiz breve sugli errori',
};
const CARTE_PER_GIRO = 12;
const SELECT_CARTA = 'id, materia_id, tipo, fronte, retro, intervallo_giorni';

export default function Studio() {
  const oggi = R.iso(R.giornoRoma(new Date()));
  const [verifiche, setVerifiche] = useState<Verifica[]>();
  const [carteDelGiorno, setCarteDelGiorno] = useState<Carta[]>([]);
  const [compitiAperti, setCompitiAperti] = useState(0);
  const [carteTotali, setCarteTotali] = useState(0);
  const [attivita, setAttivita] = useState<Attivita>();

  async function carica() {
    const domani = R.iso(R.prossimoGiornoDiScuola(R.giornoRoma(new Date())));
    const [v, c, k, n] = await Promise.all([
      supabase
        .from('verifiche')
        .select('id, data, tipo, argomento, pagine_probabili, materie(nome), sessioni_ripasso(id, numero, data_prevista, tipo, fatta_il), quiz(id, domande)')
        .gte('data', oggi)
        .order('data')
        .limit(6),
      supabase.from('flashcard').select(SELECT_CARTA).lte('prossima_revisione', oggi).eq('segnalata_sbagliata', false).order('prossima_revisione').limit(CARTE_PER_GIRO),
      supabase.from('compiti').select('id', { count: 'exact', head: true }).eq('scadenza', domani).is('fatto_il', null),
      supabase.from('flashcard').select('id', { count: 'exact', head: true }).eq('segnalata_sbagliata', false),
    ]);
    setVerifiche((v.data ?? []) as unknown as Verifica[]);
    setCarteDelGiorno((c.data ?? []) as Carta[]);
    setCompitiAperti(k.count ?? 0);
    setCarteTotali(n.count ?? 0);
  }

  useEffect(() => {
    carica();
  }, []);

  async function iniziaSessione(v: Verifica, s: Sessione) {
    const quiz = v.quiz[0];
    if ((s.tipo === 'quiz' || s.tipo === 'quiz_errori') && quiz) {
      let domande = quiz.domande;
      if (s.tipo === 'quiz_errori') {
        const { data } = await supabase.from('quiz_tentativi').select('sbagliate').eq('quiz_id', quiz.id).order('fatto_il', { ascending: false }).limit(1);
        const sbagliate: number[] = data?.[0]?.sbagliate ?? [];
        domande = (sbagliate.length ? sbagliate.map((n) => quiz.domande[n]) : quiz.domande).filter(Boolean).slice(0, 5);
      }
      return setAttivita({
        tipo: 'quiz',
        quizId: quiz.id,
        domande,
        titolo: titoloQuiz(v),
        sessione: s.id,
      });
    }
    const { data } = await supabase.from('flashcard').select(SELECT_CARTA).eq('verifica_id', v.id).eq('segnalata_sbagliata', false).limit(15);
    if (data?.length) setAttivita({ tipo: 'carte', carte: data as Carta[], titolo: v.materie?.nome ?? 'Ripasso', sessione: s.id });
  }

  const chiudi = () => {
    setAttivita(undefined);
    carica();
  };
  if (attivita?.tipo === 'carte') return <Flashcard carte={attivita.carte} titolo={attivita.titolo} sessione={attivita.sessione} chiudi={chiudi} />;
  if (attivita?.tipo === 'quiz') return <Quiz quizId={attivita.quizId} titolo={attivita.titolo} domande={attivita.domande} sessione={attivita.sessione} chiudi={chiudi} />;
  if (!verifiche) return null;

  return (
    <section className="schermo">
      <Testata sfondo="panna" posa="lani-pensierosa" misura={132} sopra="Studio" titolo="Le tue verifiche" riga={<p>Il ripasso è già organizzato nei pomeriggi liberi.</p>} />
      {compitiAperti > 0 && <p className="lady">Prima i compiti di oggi: poi flash card e quiz danno passi.</p>}

      {verifiche.length === 0 && (
        <div className="carta">
          <p>Nessuna verifica in arrivo su Nuvola.</p>
        </div>
      )}
      {verifiche.map((v) => {
        const sessioni = [...v.sessioni_ripasso].sort((a, b) => a.numero - b.numero);
        const daFare = sessioni.find((s) => !s.fatta_il && s.data_prevista <= oggi);
        const prossima = sessioni.find((s) => !s.fatta_il && s.data_prevista > oggi);
        const g = R.giorno(v.data);
        const fra = Math.round((g.getTime() - R.giorno(oggi).getTime()) / 86400000);
        const materia = v.materie?.nome ?? 'Verifica';
        const argomento = v.argomento?.split('\n')[0];
        return (
          <div className="carta studio-verifica" key={v.id}>
            <div className="testa-carta">
              <h2>{materia}</h2>
              <span className="valore">{fra === 0 ? 'oggi' : fra === 1 ? 'domani' : `fra ${fra} giorni`}</span>
            </div>
            <p className="data-verifica">
              {maiuscola(GIORNI[g.getDay()])} {g.getDate()} {MESI[g.getMonth()]}
              {v.tipo === 'interrogazione' ? ' · interrogazione' : ''}
            </p>
            {argomento && argomento !== materia && <p>{argomento}</p>}
            {v.pagine_probabili && <p className="nota">Da ripassare: {v.pagine_probabili}</p>}
            {daFare ? (
              <p>
                Sessione {daFare.numero} di {sessioni.length}: {COSA[daFare.tipo]}, 15 minuti.
              </p>
            ) : prossima ? (
              <p className="nota">Prossima sessione: {GIORNI[R.giorno(prossima.data_prevista).getDay()]}.</p>
            ) : null}
            {(sessioni.length > 0 || daFare || v.quiz[0]) && (
              <div className="riga-pallini">
                <ol className="pallini" aria-label="Sessioni di ripasso">
                  {sessioni.map((s) => (
                    <li key={s.id} className={s.fatta_il ? 'fatta' : s.data_prevista === oggi ? 'oggi' : ''}>
                      <span aria-hidden />
                      {s.data_prevista === oggi ? 'oggi' : GIORNI[R.giorno(s.data_prevista).getDay()].slice(0, 3)}
                    </li>
                  ))}
                </ol>
                {daFare ? (
                  <button className="secondario compatto" onClick={() => iniziaSessione(v, daFare)}>
                    <Cards size={20} weight="bold" aria-hidden /> Inizia
                  </button>
                ) : v.quiz[0] ? (
                  <button
                    className="secondario compatto"
                    onClick={() =>
                      setAttivita({
                        tipo: 'quiz',
                        quizId: v.quiz[0].id,
                        domande: v.quiz[0].domande,
                        titolo: titoloQuiz(v),
                      })
                    }
                  >
                    <ClipboardText size={20} weight="bold" aria-hidden /> Prova il quiz
                  </button>
                ) : null}
              </div>
            )}
          </div>
        );
      })}

      {carteTotali > 0 && (
        <div className="carta">
          <ul className="cose">
            <li>
              <Riquadro colore="rosa">
                <Cards size={24} weight="bold" aria-hidden />
              </Riquadro>
              <span className="allarga">
                <b>Le tue carte</b>
                <small>
                  {carteTotali} carte
                  {carteDelGiorno.length > 0 ? `, ${carteDelGiorno.length} da ripassare oggi` : ', nessuna da ripassare oggi'}
                </small>
              </span>
              {carteDelGiorno.length > 0 && (
                <button className="secondario compatto" onClick={() => setAttivita({ tipo: 'carte', carte: carteDelGiorno, titolo: 'Carte del giorno' })}>
                  Ripassa
                </button>
              )}
            </li>
          </ul>
        </div>
      )}
    </section>
  );
}
