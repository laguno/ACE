import { useEffect, useState, type CSSProperties } from 'react';
import { Calculator, Camera, CaretDown, Cards, ChatCircleText, Star } from '@phosphor-icons/react';
import { Testata } from './kit';
import { Fotografa, SELECT_RICHIESTE, descrizione, type RichiestaFoto } from './Foto';
import * as R from './lib/regole';
import { Flashcard, Quiz, SELECT_CARTA, type Carta, type Domanda } from './Ripasso';
import { componiPillola } from './lib/regole/pillola';
import { Matematica, type Serie } from './Matematica';
import { GIORNI, MESI } from './spunte';
import { supabase } from './supabase';
import { ComeTiConosci, MicroLezione, VotoPrevisto, usePrevisioni } from './Metacognizione';
import { Spiegamelo } from './Tutor';
import { useVerificaImportante } from './verificaImportante';
import { coloreMateria } from './colori';

// Studio — design/v2/Studio-v2.dc.html (23/11): carte delle verifiche nel colore della materia (gialla se
// importante), timbro della data, pallini del ripasso, foto delle pagine, tessere Ripassa e Spiegamelo tu.
// Prima: design/Studio.html. Verifiche in arrivo con il piano di ripasso (sessioni da 15 minuti),
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
  materia_id: string | null;
  materie: { nome: string } | null;
  sessioni_ripasso: Sessione[];
  quiz: { id: string; domande: Domanda[] }[];
  /** esercizi di matematica (blocco F): una serie per verifica */
  mate_serie?: Serie[];
};
type Attivita = ({ tipo: 'carte'; carte: Carta[] } | { tipo: 'quiz'; quizId: string; domande: Domanda[] } | { tipo: 'mate'; serie: Serie }) & { titolo: string; sessione?: string };
const titoloQuiz = (v: Verifica) => `Quiz di ${(v.materie?.nome ?? 'ripasso').toLowerCase()}`;

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
  const [foto, setFoto] = useState<RichiestaFoto[]>([]);
  const [fotoFatta, setFotoFatta] = useState('');

  async function carica() {
    const domani = R.iso(R.prossimoGiornoDiScuola(R.giornoRoma(new Date())));
    const sel = 'id, data, tipo, argomento, pagine_probabili, recupero_vago, materia_id, materie(nome), sessioni_ripasso(id, numero, data_prevista, tipo, fatta_il), quiz(id, domande), mate_serie(id, problemi)';
    const { data: casa } = await supabase.from('assenze').select('giorno').lt('giorno', oggi);
    const [v, r, c, k, n, rf] = await Promise.all([
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
      supabase.from('richieste_foto').select(SELECT_RICHIESTE).eq('stato', 'aperta').order('creato_il'),
    ]);
    // prima quelle da recuperare: la data la decidono mamma e papà con la prof
    const recuperare = ((r.data ?? []) as unknown as Verifica[]).map((x) => ({ ...x, daRecuperare: true }));
    setVerifiche([...recuperare, ...((v.data ?? []) as unknown as Verifica[])]);
    setCarteDelGiorno(componiPillola((c.data ?? []) as unknown as Carta[]));
    setCompitiAperti(k.count ?? 0);
    setCarteTotali(n.count ?? 0);
    setFoto((rf.data ?? []) as unknown as RichiestaFoto[]);
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
  const testata = <Testata sfondo="pomeriggio" posa="lani-concentrata" misura={92} piccola sopra="Studio" titolo="Le verifiche" />;
  if (spiegamelo) return <Spiegamelo chiudi={() => setSpiegamelo(false)} />;
  if (attivita?.tipo === 'carte') return <Flashcard carte={attivita.carte} titolo={attivita.titolo} sessione={attivita.sessione} chiudi={chiudi} />;
  if (attivita?.tipo === 'mate') return <Matematica serie={attivita.serie} titolo={attivita.titolo} chiudi={chiudi} />;
  if (attivita?.tipo === 'quiz') return <Quiz quizId={attivita.quizId} titolo={attivita.titolo} domande={attivita.domande} sessione={attivita.sessione} chiudi={chiudi} />;
  // intestazione subito, i dati dopo: titolo e avatar sono il primo disegno (Lighthouse, 13/11)
  if (!verifiche) return <section className="schermo schermo-studio">{testata}</section>;

  const materieVerifiche = new Set(verifiche.map((v) => v.materia_id).filter(Boolean));
  const fotoSenzaVerifica = foto.filter((r) => !r.materia_id || !materieVerifiche.has(r.materia_id));
  const fotoTolta = (id: string) => (p: number) => {
    setFoto((l) => l.filter((x) => x.id !== id));
    setFotoFatta(p > 0 ? `Foto salvata: +${p}.` : 'Foto salvata.');
  };
  const minutiCarte = Math.max(2, Math.round((Math.min(carteDelGiorno.length, 12) * 25) / 60));

  return (
    <section className="schermo schermo-studio">
      {testata}

      {verifiche.length === 0 && (
        <div className="carta">
          <p>Nessuna verifica in arrivo su Nuvola.</p>
          {compitiAperti > 0 && <p className="avviso-compiti">{AVVISO_COMPITI}</p>}
        </div>
      )}
      {verifiche.map((v, i) => {
        const sessioni = [...v.sessioni_ripasso].sort((a, b) => a.numero - b.numero);
        const daFare = sessioni.find((s) => !s.fatta_il && s.data_prevista <= oggi);
        const g = R.giorno(v.data);
        const fra = Math.round((g.getTime() - R.giorno(oggi).getTime()) / 86400000);
        const materia = v.materie?.nome ?? 'Verifica';
        const argomento = v.argomento?.split('\n')[0];
        const col = coloreMateria(materia);
        const eImportante = importante?.id === v.id;
        const quando = v.daRecuperare ? 'da recuperare' : v.recupero_vago ? 'settimana prossima' : fra === 0 ? 'oggi' : fra === 1 ? 'domani' : `fra ${fra} giorni`;
        const fatte = sessioni.filter((s) => s.fatta_il).length;
        const fotoQui = v.materia_id ? foto.filter((r) => r.materia_id === v.materia_id) : [];
        return (
          <section
            className={`studio-verifica${eImportante ? ' importante' : ''}`}
            key={v.id}
            aria-label={`Verifica di ${materia}, ${quando}`}
            style={{ '--materia': col.testo, '--velo': col.fondo } as CSSProperties}
          >
            <div className="verifica-testa">
              {/* timbro della data pieno, nel colore della materia (un solo file: src/colori.ts) */}
              <div className="timbro-materia" aria-hidden>
                {v.daRecuperare || v.recupero_vago ? (
                  <b>?</b>
                ) : (
                  <>
                    <small>{GIORNI[g.getDay()].slice(0, 3).toUpperCase()}</small>
                    <b>{g.getDate()}</b>
                  </>
                )}
              </div>
              <div className="verifica-titolo">
                <div className="riga-materia">
                  <h2>{materia}</h2>
                  <span className="quando">{quando}</span>
                </div>
                {eImportante && (
                  <span className="importante">
                    <Star size={13} weight="fill" aria-hidden /> IMPORTANTE
                  </span>
                )}
                {argomento && argomento !== materia && <p className="argomento">{argomento}</p>}
              </div>
            </div>
            {(v.daRecuperare || v.recupero_vago || v.tipo === 'interrogazione') && (
              <p className="nota">
                {v.daRecuperare
                  ? `Era ${GIORNI[g.getDay()]} ${g.getDate()} ${MESI[g.getMonth()]}, eri a casa`
                  : v.recupero_vago
                    ? 'Settimana prossima, il giorno lo dice la prof'
                    : 'Interrogazione'}
              </p>
            )}
            {v.pagine_probabili && <p className="nota">Da ripassare: {v.pagine_probabili}</p>}
            {i === 0 && compitiAperti > 0 && <p className="avviso-compiti">{AVVISO_COMPITI}</p>}
            {(sessioni.length > 0 || daFare || v.quiz[0]) && (
              <div className="riga-ripasso">
                <span className="et">Ripasso</span>
                {sessioni.length > 0 && (
                  <ol className="pallini-materia" aria-label={`${fatte} di ${sessioni.length} fatti`}>
                    {sessioni.map((s) => (
                      <li key={s.id} className={s.fatta_il ? 'fatta' : ''} />
                    ))}
                  </ol>
                )}
                <span className="allarga" />
                {daFare ? (
                  <button className="ripassa-ora" onClick={() => iniziaSessione(v, daFare)}>
                    Ripassa ora
                  </button>
                ) : v.quiz[0] ? (
                  <button
                    className="ripassa-ora"
                    onClick={() =>
                      setAttivita({
                        tipo: 'quiz',
                        quizId: v.quiz[0].id,
                        domande: v.quiz[0].domande,
                        titolo: titoloQuiz(v),
                      })
                    }
                  >
                    Prova il quiz
                  </button>
                ) : null}
              </div>
            )}
            {v.mate_serie?.map((serie) => (
              <button key={serie.id} className="ripassa-ora vuoto" onClick={() => setAttivita({ tipo: 'mate', serie, titolo: 'Esercizi di matematica' })}>
                <Calculator size={20} weight="bold" aria-hidden /> Esercizi
              </button>
            ))}
            {fotoQui.map((r) => (
              <div className="foto-verifica" key={r.id}>
                <span className="foto-verifica-testo">
                  <Camera size={18} weight="bold" aria-hidden />
                  <b>Fotografa {r.pagine}</b>
                  <small>poi faccio le carte</small>
                </span>
                <Fotografa client={supabase} richiesta={r} studio fatto={fotoTolta(r.id)} />
              </div>
            ))}
            {!v.daRecuperare && !v.recupero_vago && <VotoPrevisto verifica={v} previsto={previsioni.previste.get(v.id)} ricarica={previsioni.ricarica} />}
          </section>
        );
      })}

      {fotoSenzaVerifica.length > 0 && (
        <details className="foto-compiti">
          <summary>
            <span className="cerchio-foto" aria-hidden>
              <Camera size={18} weight="bold" />
            </span>
            <b className="allarga">Foto dei compiti</b>
            <span className="chip-materie" aria-hidden>
              {[...new Set(fotoSenzaVerifica.map((r) => r.materie?.nome).filter((x): x is string => !!x))].slice(0, 2).map((nome) => (
                <span key={nome} style={{ background: coloreMateria(nome).fondo, color: coloreMateria(nome).testo }}>
                  {nome}
                </span>
              ))}
            </span>
            <span className="conta-foto">
              {fotoSenzaVerifica.length}
              <span className="solo-lettori"> da fotografare</span>
            </span>
            <CaretDown size={18} weight="bold" aria-hidden />
          </summary>
          <ul className="lista-foto">
            {fotoSenzaVerifica.map((r) => (
              <li key={r.id}>
                <span>{descrizione(r)}</span>
                <Fotografa client={supabase} richiesta={r} studio fatto={fotoTolta(r.id)} />
              </li>
            ))}
          </ul>
        </details>
      )}
      {fotoFatta && (
        <p className="nota accento" role="status">
          {fotoFatta}
        </p>
      )}

      <div className={`tessere-studio${carteTotali > 0 ? '' : ' sola'}`}>
        {carteTotali > 0 &&
          (carteDelGiorno.length > 0 ? (
            <button className="tessera piena" onClick={() => setAttivita({ tipo: 'carte', carte: carteDelGiorno, titolo: 'Carte del giorno' })}>
              <Cards size={30} weight="bold" aria-hidden />
              <b>Ripassa {carteDelGiorno.length} carte</b>
              <small>{minutiCarte} minuti</small>
            </button>
          ) : (
            <div className="tessera piena ferma">
              <Cards size={30} weight="bold" aria-hidden />
              <b>Carte a posto</b>
              <small>{carteTotali} carte, nessuna oggi</small>
            </div>
          ))}
        {/* tutor (blocco E): spiegare con parole proprie, il tutor dice cosa manca; nessun voto, nessun passo */}
        <button className="tessera" onClick={() => setSpiegamelo(true)}>
          <ChatCircleText size={30} weight="bold" aria-hidden />
          <b>Spiegamelo tu</b>
        </button>
      </div>

      <MicroLezione />
      <ComeTiConosci {...previsioni} />
    </section>
  );
}
