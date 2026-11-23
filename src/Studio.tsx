import { useEffect, useState } from 'react';
import { Calculator, Cards, ChatCircleText, ClipboardText } from '@phosphor-icons/react';
import { Riquadro, Testata } from './kit';
import * as R from './lib/regole';
import { Flashcard, Quiz, SELECT_CARTA, type Carta, type Domanda } from './Ripasso';
import { componiPillola } from './lib/regole/pillola';
import { Matematica, type Serie } from './Matematica';
import { GIORNI, MESI, maiuscola } from './spunte';
import { supabase } from './supabase';
import { ComeTiConosci, MicroLezione, VotoPrevisto, usePrevisioni } from './Metacognizione';
import { Spiegamelo } from './Tutor';
import { useVerificaImportante } from './verificaImportante';
import { coloreMateria } from './colori';

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
  recupero_vago: boolean;
  /** caduta in un giorno a casa e non ancora spostata dai genitori (docs/02, Assenze) */
  daRecuperare?: boolean;
  materie: { nome: string } | null;
  sessioni_ripasso: Sessione[];
  quiz: { id: string; domande: Domanda[] }[];
  /** esercizi di matematica (blocco F): una serie per verifica */
  mate_serie?: Serie[];
};
type Attivita = ({ tipo: 'carte'; carte: Carta[] } | { tipo: 'quiz'; quizId: string; domande: Domanda[] } | { tipo: 'mate'; serie: Serie }) & { titolo: string; sessione?: string };
const titoloQuiz = (v: Verifica) => `Quiz di ${(v.materie?.nome ?? 'ripasso').toLowerCase()}`;

const COSA: Record<R.TipoSessione, string> = {
  rilettura_flashcard: 'rilettura e flash card',
  flashcard_mappa: 'flash card e mappa',
  quiz: 'quiz',
  quiz_errori: 'quiz breve sugli errori',
};
// pillola: si pescano le carte in scadenza e si mescolano tra argomenti (config ripasso.pillola)
const DA_PESCARE = R.CONFIG.ripasso.pillola.carte_da_pescare;
// finché i compiti di domani non sono spuntati, dentro la prima carta (decisione del signore, 9/11)
const AVVISO_COMPITI = 'Finiti i compiti, flash card e quiz valgono passi';

export default function Studio() {
  const importante = useVerificaImportante();
  const oggi = R.iso(R.giornoRoma(new Date()));
  const [verifiche, setVerifiche] = useState<Verifica[]>();
  const [carteDelGiorno, setCarteDelGiorno] = useState<Carta[]>([]);
  const [compitiAperti, setCompitiAperti] = useState(0);
  const [carteTotali, setCarteTotali] = useState(0);
  const [attivita, setAttivita] = useState<Attivita>();
  const previsioni = usePrevisioni();
  const [spiegamelo, setSpiegamelo] = useState(false);

  async function carica() {
    const domani = R.iso(R.prossimoGiornoDiScuola(R.giornoRoma(new Date())));
    const sel = 'id, data, tipo, argomento, pagine_probabili, recupero_vago, materie(nome), sessioni_ripasso(id, numero, data_prevista, tipo, fatta_il), quiz(id, domande), mate_serie(id, problemi)';
    const { data: casa } = await supabase.from('assenze').select('giorno').lt('giorno', oggi);
    const [v, r, c, k, n] = await Promise.all([
      supabase.from('verifiche').select(sel).gte('data', oggi).order('data').limit(6),
      casa?.length
        ? supabase
            .from('verifiche')
            .select(sel)
            .in('data', casa.map((x) => x.giorno))
            .is('data_spostata', null)
        : { data: [] },
      supabase.from('flashcard').select(SELECT_CARTA).lte('prossima_revisione', oggi).eq('segnalata_sbagliata', false).neq('da_riprendere', true).order('prossima_revisione').limit(DA_PESCARE),
      supabase.from('compiti').select('id', { count: 'exact', head: true }).eq('scadenza', domani).is('fatto_il', null),
      supabase.from('flashcard').select('id', { count: 'exact', head: true }).eq('segnalata_sbagliata', false),
    ]);
    // prima quelle da recuperare: la data la decidono mamma e papà con la prof
    const recuperare = ((r.data ?? []) as unknown as Verifica[]).map((x) => ({ ...x, daRecuperare: true }));
    setVerifiche([...recuperare, ...((v.data ?? []) as unknown as Verifica[])]);
    setCarteDelGiorno(componiPillola((c.data ?? []) as unknown as Carta[]));
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
    const { data } = await supabase.from('flashcard').select(SELECT_CARTA).eq('verifica_id', v.id).eq('segnalata_sbagliata', false).neq('da_riprendere', true).limit(15);
    if (data?.length) setAttivita({ tipo: 'carte', carte: data as unknown as Carta[], titolo: v.materie?.nome ?? 'Ripasso', sessione: s.id });
  }

  const chiudi = () => {
    setAttivita(undefined);
    carica();
  };
  const testata = <Testata sfondo="panna" posa="lani-pensierosa" misura={132} sopra="Studio" titolo="Le tue verifiche" riga={<p>Il ripasso è già organizzato nei pomeriggi liberi.</p>} />;
  if (spiegamelo) return <Spiegamelo chiudi={() => setSpiegamelo(false)} />;
  if (attivita?.tipo === 'carte') return <Flashcard carte={attivita.carte} titolo={attivita.titolo} sessione={attivita.sessione} chiudi={chiudi} />;
  if (attivita?.tipo === 'mate') return <Matematica serie={attivita.serie} titolo={attivita.titolo} chiudi={chiudi} />;
  if (attivita?.tipo === 'quiz') return <Quiz quizId={attivita.quizId} titolo={attivita.titolo} domande={attivita.domande} sessione={attivita.sessione} chiudi={chiudi} />;
  // intestazione subito, i dati dopo: titolo e avatar sono il primo disegno (Lighthouse, 13/11)
  if (!verifiche) return <section className="schermo schermo-studio">{testata}</section>;

  return (
    <section className="schermo schermo-studio">
      {testata}
      <MicroLezione />

      {verifiche.length === 0 && (
        <div className="carta">
          <p>Nessuna verifica in arrivo su Nuvola.</p>
          {compitiAperti > 0 && <p className="avviso-compiti">{AVVISO_COMPITI}</p>}
        </div>
      )}
      {verifiche.map((v, i) => {
        const sessioni = [...v.sessioni_ripasso].sort((a, b) => a.numero - b.numero);
        const daFare = sessioni.find((s) => !s.fatta_il && s.data_prevista <= oggi);
        const prossima = sessioni.find((s) => !s.fatta_il && s.data_prevista > oggi);
        const g = R.giorno(v.data);
        const fra = Math.round((g.getTime() - R.giorno(oggi).getTime()) / 86400000);
        const materia = v.materie?.nome ?? 'Verifica';
        const argomento = v.argomento?.split('\n')[0];
        return (
          <div className="carta studio-verifica" key={v.id}>
            <div className="verifica-testa">
              {/* v2: timbro della data nel colore della materia (un solo file: src/colori.ts) */}
              <div className="timbro-materia" aria-hidden style={{ background: coloreMateria(materia).fondo, color: coloreMateria(materia).testo }}>
                {v.daRecuperare || v.recupero_vago ? (
                  <b>?</b>
                ) : (
                  <>
                    <small>{GIORNI[g.getDay()].slice(0, 3).toUpperCase()}</small>
                    <b>{g.getDate()}</b>
                  </>
                )}
              </div>
            <div className="testa-carta">
              <h2>
                {materia}
                {importante?.id === v.id && <span className="importante"> IMPORTANTE</span>}
              </h2>
              {/* fucsia solo se è vicina (entro 2 giorni) o da recuperare; oltre, il colore dei testi secondari */}
              <span className={`valore${v.daRecuperare || (!v.recupero_vago && fra <= 2) ? '' : ' quieto'}`}>{v.daRecuperare ? 'da recuperare' : v.recupero_vago ? 'settimana prossima' : fra === 0 ? 'oggi' : fra === 1 ? 'domani' : `fra ${fra} giorni`}</span>
            </div>
            </div>
            <p className="data-verifica">
              {v.daRecuperare
                ? `Era ${GIORNI[g.getDay()]} ${g.getDate()} ${MESI[g.getMonth()]}, eri a casa`
                : v.recupero_vago
                  ? 'Settimana prossima, il giorno lo dice la prof'
                  : `${maiuscola(GIORNI[g.getDay()])} ${g.getDate()} ${MESI[g.getMonth()]}`}
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
            {!v.daRecuperare && !v.recupero_vago && <VotoPrevisto verifica={v} previsto={previsioni.previste.get(v.id)} ricarica={previsioni.ricarica} />}
            {i === 0 && compitiAperti > 0 && <p className="avviso-compiti">{AVVISO_COMPITI}</p>}
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
            {v.mate_serie?.map((serie) => (
              <button key={serie.id} className="secondario compatto" onClick={() => setAttivita({ tipo: 'mate', serie, titolo: 'Esercizi di matematica' })}>
                <Calculator size={20} weight="bold" aria-hidden /> Esercizi
              </button>
            ))}
          </div>
        );
      })}

      <ComeTiConosci {...previsioni} />

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
      {/* tutor (blocco E): spiegare con parole proprie, il tutor dice cosa manca; nessun voto, nessun passo */}
      <div className="carta">
        <ul className="cose">
          <li>
            <Riquadro colore="lilla">
              <ChatCircleText size={24} weight="bold" aria-hidden />
            </Riquadro>
            <span className="allarga">
              <b>Spiegamelo tu</b>
              <small>Spiega un argomento con parole tue</small>
            </span>
            <button className="secondario compatto" onClick={() => setSpiegamelo(true)}>
              Prova
            </button>
          </li>
        </ul>
      </div>

    </section>
  );
}
