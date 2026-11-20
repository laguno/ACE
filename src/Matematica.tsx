import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle, ChartBar } from '@phosphor-icons/react';
import { useSfondo } from './kit';
import * as M from './lib/mate';
import * as R from './lib/regole';
import { adesso, passi } from './spunte';
import { supabase } from './supabase';

// Esercizi di matematica (blocco F del piano di studio, 19/11). Una serie mescolata: problemi di
// metodi diversi, così Lani sceglie la strada. Ogni metodo parte dall'esempio svolto e si svuota
// (manca l'ultimo passaggio, poi due, fino al problema intero) man mano che li fa giusti; il livello
// lo ricava M.livelli dalle serie già fatte. Prima si prova, poi si vede la soluzione. I passi
// li decide il server (tipo "matematica"): per la serie finita, non per le giuste.

export type Serie = { id: string; problemi: M.Problema[] };

const STUDIO = R.CONFIG.passi.studio_facoltativo;

/** Modello a barre di Singapore: una barra per quantità, pezzi in parti uguali, "?" su quello che si cerca. */
export function ModelloBarre({ barre }: { barre: M.Barre }) {
  const lunghe = barre.barre.map((b) => b.segmenti.reduce((a, s) => a + s.parti, 0));
  const massimo = Math.max(...lunghe, 1);
  const descrizione =
    barre.barre.map((b) => `${b.nome}: ${b.segmenti.map((s) => `${s.parti} ${s.parti === 1 ? 'parte' : 'parti'}${s.testo ? ` (${s.testo})` : ''}`).join(', ')}`).join('; ') +
    (barre.totale ? `. In tutto: ${barre.totale}` : '');
  return (
    <figure className="barre" role="img" aria-label={`Modello a barre. ${descrizione}`}>
      <div className="barre-righe">
        {barre.barre.map((b, i) => (
          <div className="barre-riga" key={i}>
            <span className="barre-nome">{b.nome}</span>
            <div className="barre-barra" style={{ width: `${(lunghe[i] / massimo) * 100}%` }}>
              {b.segmenti.map((s, j) => (
                <span key={j} className={s.incognita ? 'incognita' : ''} style={{ flexGrow: s.parti }}>
                  {s.testo}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      {barre.totale && (
        <div className="barre-totale" aria-hidden>
          <span>{barre.totale}</span>
        </div>
      )}
    </figure>
  );
}

function Passo({ p, n }: { p: M.Passaggio; n: number }) {
  return (
    <li className="mate-passo fatto">
      <span className="mate-n" aria-hidden>
        {n}
      </span>
      <div>
        <p>{p.cosa}</p>
        <p className="mate-conto">
          {p.calcolo} = <b>{p.risultato}</b>
        </p>
      </div>
    </li>
  );
}

/** Un vuoto da riempire: prima si prova, al secondo errore arriva la soluzione. */
function Vuoto({ etichetta, attesa, unita, fatto }: { etichetta: string; attesa: string; unita?: string; fatto: (giusto: boolean) => void }) {
  const [testo, setTesto] = useState('');
  const [errori, setErrori] = useState(0);
  const [esito, setEsito] = useState<'giusto' | 'aiuto'>();
  function controlla() {
    if (!testo.trim() || esito) return;
    if (M.giusta(testo, attesa)) {
      setEsito('giusto');
      return fatto(true);
    }
    const e = errori + 1;
    setErrori(e);
    if (e >= M.TENTATIVI) {
      setEsito('aiuto');
      fatto(false);
    }
  }
  return (
    <div className="mate-vuoto">
      <form
        className="mate-riga-ingresso"
        onSubmit={(e) => {
          e.preventDefault();
          controlla();
        }}
      >
        <label>
          <span className="solo-lettori">{etichetta}</span>
          <input className="mate-ingresso" inputMode="decimal" autoComplete="off" value={testo} disabled={!!esito} onChange={(e) => setTesto(e.target.value)} aria-invalid={errori > 0 && !esito ? true : undefined} />
        </label>
        {unita && <span className="mate-unita">{unita}</span>}
        {!esito && (
          <button className="secondario compatto" disabled={!testo.trim()}>
            Controlla
          </button>
        )}
        {esito === 'giusto' && <CheckCircle className="mate-ok" size={28} weight="fill" aria-label="Giusto" />}
      </form>
      {errori > 0 && !esito && (
        <p className="mate-nota" role="status">
          Non ancora: rifai il conto e riprova.
        </p>
      )}
      {esito === 'aiuto' && (
        <p className="mate-nota" role="status">
          Era {attesa}
          {unita ? ` ${unita}` : ''}. Guarda come si fa, la prossima la provi tu.
        </p>
      )}
    </div>
  );
}

const etichettaLivello = (p: M.Problema, livello: number) => {
  const v = M.vuoti(p, livello);
  return v === 0 ? 'Esempio svolto' : M.intero(p, livello) ? 'Problema intero' : v === 1 ? 'Completa 1 passaggio' : `Completa ${v} passaggi`;
};

function Problema({ p, livello, serie, fatto }: { p: M.Problema; livello: number; serie: M.Problema[]; fatto: (e: M.Esito) => void }) {
  const scelta = M.sceltaMetodo(serie, livello);
  const opzioni = useMemo(() => M.metodi(serie).slice(0, 4), [serie]);
  const [metodo, setMetodo] = useState<string>();
  const [barre, setBarre] = useState(livello === 0);
  const [visti, setVisti] = useState(1); // esempio svolto: un passaggio alla volta
  const [esiti, setEsiti] = useState<boolean[]>([]);
  const n = p.passaggi.length;
  const vuoti = M.vuoti(p, livello);
  const pieni = n - vuoti;
  const intero = M.intero(p, livello);
  const metodoGiusto = scelta ? metodo === p.metodo : null;
  const pronto = !scelta || metodo !== undefined;
  const finito = livello === 0 ? visti >= n : intero ? esiti.length === 1 : esiti.length === vuoti;

  return (
    <>
      <p className="mate-livello">{etichettaLivello(p, livello)}</p>
      <h2 className="domanda">{p.testo}</h2>
      {p.barre.barre.length > 0 && (
        <>
          <button className="secondario compatto mate-barre-tasto" aria-expanded={barre} onClick={() => setBarre(!barre)}>
            <ChartBar size={20} weight="bold" aria-hidden /> {barre ? 'Nascondi le barre' : 'Disegna le barre'}
          </button>
          {barre && <ModelloBarre barre={p.barre} />}
        </>
      )}

      {scelta && (
        <fieldset className="mate-metodo">
          <legend>Che strada prendi?</legend>
          <div className="opzioni">
            {opzioni.map((o) => {
              const esito = metodo === undefined ? '' : o === p.metodo ? 'giusta' : o === metodo ? 'sbagliata' : '';
              return (
                <button key={o} className={`opzione ${esito}`} aria-pressed={metodo === o} onClick={() => metodo === undefined && setMetodo(o)}>
                  {o}
                  {esito === 'giusta' && <CheckCircle size={24} weight="fill" aria-hidden />}
                </button>
              );
            })}
          </div>
          {metodo !== undefined && (
            <div className="spiegazione" role="status">
              <b>{metodoGiusto ? 'Strada giusta.' : `Qui serve: ${p.metodo}.`}</b> <span>{p.perche_metodo}</span>
            </div>
          )}
        </fieldset>
      )}

      {pronto && (
        <ol className="mate-passi">
          {livello === 0 && p.passaggi.slice(0, visti).map((s, i) => <Passo key={i} p={s} n={i + 1} />)}
          {livello > 0 && !intero && (
            <>
              {p.passaggi.slice(0, pieni).map((s, i) => <Passo key={i} p={s} n={i + 1} />)}
              {p.passaggi.slice(pieni).map((s, i) =>
                i <= esiti.length ? (
                  <li className="mate-passo" key={pieni + i}>
                    <span className="mate-n" aria-hidden>
                      {pieni + i + 1}
                    </span>
                    <div>
                      <p>{s.cosa}</p>
                      {i < esiti.length && <p className="mate-conto">{s.calcolo}</p>}
                      <Vuoto etichetta={`Risultato del passaggio ${pieni + i + 1}`} attesa={s.risultato} fatto={(g) => setEsiti((e) => [...e, g])} />
                    </div>
                  </li>
                ) : null,
              )}
            </>
          )}
          {intero && (
            <li className="mate-passo">
              <div>
                <p>Risolvilo sul quaderno e scrivi la risposta.</p>
                <Vuoto etichetta="Risposta" attesa={p.risposta} unita={p.unita} fatto={(g) => setEsiti([g])} />
              </div>
            </li>
          )}
          {intero && finito && p.passaggi.map((s, i) => <Passo key={i} p={s} n={i + 1} />)}
        </ol>
      )}

      {pronto && livello === 0 && !finito && (
        <button className="principale largo" onClick={() => setVisti(visti + 1)}>
          Passaggio dopo
        </button>
      )}
      {pronto && finito && (
        <button className="principale largo" onClick={() => fatto({ metodo: p.metodo, livello: vuoti, giusto: livello === 0 || esiti.every(Boolean), metodo_giusto: metodoGiusto })}>
          {livello === 0 ? 'Ho capito' : 'Avanti'}
        </button>
      )}
    </>
  );
}

export function Matematica({ serie, titolo, chiudi }: { serie: Serie; titolo: string; chiudi: () => void }) {
  useSfondo('panna');
  const [inizio] = useState(adesso);
  const [storia, setStoria] = useState<M.Esito[]>();
  const [esiti, setEsiti] = useState<M.Esito[]>([]);
  const [fine, setFine] = useState<string>();
  const i = esiti.length;
  const p = serie.problemi[i];

  useEffect(() => {
    supabase
      .from('mate_tentativi')
      .select('dettaglio')
      .order('fatto_il')
      .then(({ data }) => setStoria((data ?? []).flatMap((t) => (t.dettaglio as M.Esito[]) ?? [])));
  }, []);

  async function fatto(e: M.Esito) {
    const tutti = [...esiti, e];
    setEsiti(tutti);
    if (tutti.length < serie.problemi.length) return window.scrollTo({ top: 0 });
    const totale = serie.problemi.length;
    const { data } = await supabase
      .from('mate_tentativi')
      .insert({ serie_id: serie.id, numero: 0, iniziato_il: inizio, problemi: totale, tentati: totale, dettaglio: tutti })
      .select('id')
      .single();
    const presi = data ? await passi('matematica', data.id) : 0;
    const daSola = tutti.filter((x) => x.livello > 0 && x.giusto).length;
    const provati = tutti.filter((x) => x.livello > 0).length;
    setFine(`${provati ? `${daSola} su ${provati} risolti da sola. ` : ''}${presi ? `+${presi} passi.` : 'Domani si riparte da qui.'}`);
  }

  if (fine)
    return (
      <section className="carta modulo studio">
        <h1>Serie finita</h1>
        <p>{fine}</p>
        <button className="principale" onClick={chiudi}>
          Torna allo studio
        </button>
      </section>
    );

  // p manca solo un attimo, dopo l'ultimo problema e prima che il server risponda
  const livello = storia && p ? (M.livelli([...storia, ...esiti])[p.metodo] ?? 0) : undefined;
  return (
    <section className="studio mate">
      <button className="indietro" onClick={chiudi} aria-label="Torna allo Studio">
        <ArrowLeft size={20} weight="bold" aria-hidden /> Studio
      </button>
      <div className="testa-studio">
        <div className="testa-carta">
          <h1>{titolo}</h1>
          <span>
            {Math.min(i + 1, serie.problemi.length)} di {serie.problemi.length}
          </span>
        </div>
        <div className="avanzamento" role="progressbar" aria-label="Problemi della serie" aria-valuemin={0} aria-valuemax={serie.problemi.length} aria-valuenow={i}>
          <span style={{ width: `${(i / serie.problemi.length) * 100}%` }} />
        </div>
      </div>
      {livello !== undefined && <Problema key={i} p={p} livello={livello} serie={serie.problemi} fatto={fatto} />}
      <p className="regola">Serie finita: {STUDIO.matematica_serie} passi, giuste o no.</p>
    </section>
  );
}
