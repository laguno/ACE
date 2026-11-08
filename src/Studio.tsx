import { useEffect, useState } from 'react';
import * as R from './lib/regole';
import { Flashcard, Quiz, type Carta, type Domanda } from './Ripasso';
import { GIORNI } from './spunte';
import { supabase } from './supabase';

// Studio — design/Studio.html. Verifiche in arrivo con il piano di ripasso (sessioni da 15 minuti),
// carte del giorno (ripetizione a intervalli) e quiz liberi. Video più avanti.

type Sessione = { id: string; numero: number; data_prevista: string; tipo: R.TipoSessione; fatta_il: string | null };
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
type Attivita =
  | { tipo: 'carte'; carte: Carta[]; sessione?: string }
  | { tipo: 'quiz'; quizId: string; domande: Domanda[]; sessione?: string };

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
  const [attivita, setAttivita] = useState<Attivita>();

  async function carica() {
    const domani = R.iso(R.prossimoGiornoDiScuola(R.giornoRoma(new Date())));
    const [v, c, k] = await Promise.all([
      supabase
        .from('verifiche')
        .select('id, data, tipo, argomento, pagine_probabili, materie(nome), sessioni_ripasso(id, numero, data_prevista, tipo, fatta_il), quiz(id, domande)')
        .gte('data', oggi)
        .order('data')
        .limit(6),
      supabase.from('flashcard').select(SELECT_CARTA).lte('prossima_revisione', oggi).eq('segnalata_sbagliata', false).order('prossima_revisione').limit(CARTE_PER_GIRO),
      supabase.from('compiti').select('id', { count: 'exact', head: true }).eq('scadenza', domani).is('fatto_il', null),
    ]);
    setVerifiche((v.data ?? []) as unknown as Verifica[]);
    setCarteDelGiorno((c.data ?? []) as Carta[]);
    setCompitiAperti(k.count ?? 0);
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
      return setAttivita({ tipo: 'quiz', quizId: quiz.id, domande, sessione: s.id });
    }
    const { data } = await supabase.from('flashcard').select(SELECT_CARTA).eq('verifica_id', v.id).eq('segnalata_sbagliata', false).limit(15);
    if (data?.length) setAttivita({ tipo: 'carte', carte: data as Carta[], sessione: s.id });
  }

  const chiudi = () => {
    setAttivita(undefined);
    carica();
  };
  if (attivita?.tipo === 'carte') return <Flashcard carte={attivita.carte} sessione={attivita.sessione} chiudi={chiudi} />;
  if (attivita?.tipo === 'quiz') return <Quiz quizId={attivita.quizId} domande={attivita.domande} sessione={attivita.sessione} chiudi={chiudi} />;
  if (!verifiche) return null;

  return (
    <section className="sera">
      <h1>Studio</h1>
      {compitiAperti > 0 && <p className="lady">Prima i compiti di oggi: poi flash card e quiz danno passi.</p>}

      {carteDelGiorno.length > 0 && (
        <div className="carta">
          <h2>Carte del giorno</h2>
          <p className="nota">
            {carteDelGiorno.length} carte da ripassare, circa {Math.max(2, Math.round((carteDelGiorno.length * 25) / 60))} minuti.
          </p>
          <button className="principale largo" onClick={() => setAttivita({ tipo: 'carte', carte: carteDelGiorno })}>
            Inizia
          </button>
        </div>
      )}

      {verifiche.length === 0 && <p>Nessuna verifica in arrivo su Nuvola.</p>}
      {verifiche.map((v) => {
        const sessioni = [...v.sessioni_ripasso].sort((a, b) => a.numero - b.numero);
        const daFare = sessioni.find((s) => !s.fatta_il && s.data_prevista <= oggi);
        const prossima = sessioni.find((s) => !s.fatta_il && s.data_prevista > oggi);
        const g = R.giorno(v.data);
        const titolo = `${v.tipo === 'interrogazione' ? 'Interrogazione' : 'Verifica'} di ${v.materie?.nome ?? 'scuola'}`;
        return (
          <div className="carta" key={v.id}>
            <h2>{titolo}</h2>
            <p className="nota">
              {v.data === oggi ? 'Oggi' : `${GIORNI[g.getDay()]} ${g.getDate()}`}
              {v.argomento && v.argomento !== titolo ? ` · ${v.argomento.split('\n')[0]}` : ''}
            </p>
            {v.pagine_probabili && <p className="nota">Da ripassare: {v.pagine_probabili}</p>}
            {sessioni.length > 0 && (
              <ol className="pallini" aria-label="Sessioni di ripasso">
                {sessioni.map((s) => {
                  const d = R.giorno(s.data_prevista);
                  return (
                    <li key={s.id} className={s.fatta_il ? 'fatta' : s.data_prevista === oggi ? 'oggi' : ''}>
                      <span aria-hidden />
                      {s.data_prevista === oggi ? 'oggi' : GIORNI[d.getDay()].slice(0, 3)}
                    </li>
                  );
                })}
              </ol>
            )}
            {daFare ? (
              <>
                <p>
                  Sessione {daFare.numero} di {sessioni.length}: {COSA[daFare.tipo]}, 15 minuti.
                </p>
                <button className="principale largo" onClick={() => iniziaSessione(v, daFare)}>
                  Inizia
                </button>
              </>
            ) : prossima ? (
              <p className="nota">Prossima sessione: {GIORNI[R.giorno(prossima.data_prevista).getDay()]}.</p>
            ) : null}
            {v.quiz[0] && !daFare && (
              <button className="secondario" onClick={() => setAttivita({ tipo: 'quiz', quizId: v.quiz[0].id, domande: v.quiz[0].domande })}>
                Fai il quiz
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}
