import { Fragment, useEffect, useState } from 'react';
import * as R from './lib/regole';
import { stessaSquadra, type RigaClassifica } from './lib/classifiche';
import { Attesa, Emoji, Sticker, useSfondo } from './kit';
import { MESI } from './spunte';
import { supabase } from './supabase';
import { PopupPartita } from './Partita';
import { vaiAiDieciMinuti } from './DieciMinuti';
import { CartaProssimaPartita, notizieProssima, useProssimaPartita } from './ProssimaPartita';

// R-Evolution (sprint 2, docs/03): partite col risultato FIPAV (dal 17/11 Lani non le scrive e
// i genitori non le approvano: "Com'è andata?" si apre qui, PopupPartita), il coach con i dieci
// minuti del mattino (si fanno in Oggi: qui solo il collegamento), dieci minuti del mese e
// classifiche dei campionati dal portale FIPAV (funzione "classifiche"). Si vede da quando i genitori accendono R-Evolution. La squadra e il forziere
// d'oro arrivano dopo (docs/08-sprint-2.md).

type Partita = { id: string; data: string; avversaria: string; set_nostri: number; set_loro: number; in_campo: boolean | null; approvata_il: string | null };
type Classifica = { cid: number; campionato: string; girone: string; squadra: string; righe: RigaClassifica[]; aggiornata_il: string };

export default function REvolution({ apri = () => {} }: { apri?: (v: 'Oggi') => void }) {
  const oggi = R.giornoRoma(new Date());
  const inizioMese = new Date(oggi.getFullYear(), oggi.getMonth(), 1);
  const [d, setD] = useState<{ partite: Partita[]; dieci: number; passiCampo: number; classifiche: Classifica[]; mattino: { da: string | null; il: string | null } | null }>();
  const [errore, setErrore] = useState('');
  const [avviso, setAvviso] = useState('');
  const prossima = useProssimaPartita();
  useSfondo('campo');

  const carica = () =>
    Promise.all([
      supabase.from('partite').select('id, data, avversaria, set_nostri, set_loro, in_campo, approvata_il').order('data', { ascending: false }).limit(20),
      supabase.from('serate').select('data', { count: 'exact', head: true }).gte('data', R.iso(inizioMese)).not('dieci_minuti_il', 'is', null),
      // con gli storni dei genitori (Togli), che hanno motivo 'storno' e riferimento "motivo:..."
      supabase.from('movimenti_passi').select('passi, motivo, riferimento').in('motivo', ['partita', 'partita_vinta', 'dieci_minuti', 'storno']),
      supabase.from('classifiche').select('cid, campionato, girone, squadra, righe, aggiornata_il').order('campionato'),
      supabase.from('serate').select('dieci_minuti_da, dieci_minuti_il').eq('data', R.iso(oggi)).maybeSingle(),
    ]).then(([p, s, m, c, o]) => {
      if (p.error) return setErrore('Non riesco a leggere le partite. Riprova tra poco.');
      setD({
        partite: (p.data ?? []) as Partita[],
        dieci: s.count ?? 0,
        passiCampo: (m.data ?? [])
          .filter((x) => x.motivo !== 'storno' || /^(partita|partita_vinta|dieci_minuti):/.test(x.riferimento))
          .reduce((a, x) => a + x.passi, 0),
        classifiche: (c.data ?? []) as Classifica[],
        mattino: o.data ? { da: o.data.dieci_minuti_da, il: o.data.dieci_minuti_il } : null,
      });
    });
  useEffect(() => {
    carica();
  }, [R.iso(oggi)]);

  if (errore)
    return (
      <section className="schermo">
        <p role="alert">{errore}</p>
      </section>
    );
  if (!d) return <Attesa />;

  // giocate = con la risposta di Lani al popup (approvata_il la scrive rispondi_partita); "Assente": in_campo vuoto
  const giocate = d.partite.filter((p) => p.approvata_il && p.in_campo !== null);
  const vinte = giocate.filter((p) => p.set_nostri > p.set_loro).length;
  // nastro "Ultim'ora": prossima partita e quanto manca, ultimo risultato, posto in classifica
  const ultima = giocate[0];
  const posaTestata = !ultima ? 'lani-battuta' : ultima.set_nostri > ultima.set_loro ? 'lani-festeggia' : 'lani-partita-persa';
  const notizie = [
    ...(prossima ? notizieProssima(prossima, new Date()) : []),
    ...(ultima ? [`ultima partita: ${ultima.set_nostri}-${ultima.set_loro} con ${ultima.avversaria}`] : []),
    ...d.classifiche.flatMap((c) => {
      const r = c.righe.find((x) => stessaSquadra(x.squadra, c.squadra));
      return r ? [`${r.pos}° posto in ${c.campionato}`] : [];
    }),
  ];
  const giro = notizie.map((n) => (
    <Fragment key={n}>
      {n}
      <Emoji e="🏐" />
    </Fragment>
  ));
  return (
    <section className="schermo r-evolution">
      <header className="campo-testata">
        <span className="campo-numero" aria-hidden>
          9
        </span>
        <h1>In campo</h1>
        <Sticker posa={posaTestata} misura={236} className="campo-sticker" />
      </header>
      {notizie.length > 0 && (
        <div className="ultimora" tabIndex={0}>
          <strong aria-hidden>Ultim'ora</strong>
          <p className="solo-lettori">Ultim'ora. {notizie.join('. ')}.</p>
          {/* il secondo span è la copia che chiude il giro */}
          <div className="nastro" aria-hidden>
            <span>{giro}</span>
            <span>{giro}</span>
          </div>
        </div>
      )}
      <CartaProssimaPartita p={prossima} />
      {ultima && (
        <div className="carta tabellone-ultima" aria-label="Ultima partita">
          <small>ULTIMA PARTITA</small>
          <p className="risultato">
            <b>{ultima.set_nostri}</b>
            <span aria-hidden> – </span>
            <b>{ultima.set_loro}</b>
          </p>
          <p className="contro">{ultima.avversaria}</p>
          <ul className="ultime-cinque" aria-label="Ultime cinque partite">
            {giocate.slice(0, 5).map((x) => (
              <li key={x.id} className={x.set_nostri > x.set_loro ? 'vinta' : 'persa'}>
                {x.set_nostri > x.set_loro ? 'V' : 'P'}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Coach mattino={d.mattino} ultima={ultima} apri={apri} />
      {d.classifiche.map((c) => (
        <div className="carta" key={c.cid}>
          <div className="testa-carta">
            <h2>
              <Emoji e="🏆" /> Classifica {c.campionato}
            </h2>
          </div>
          {(() => {
            const i = c.righe.findIndex((x) => stessaSquadra(x.squadra, c.squadra));
            const da = Math.max(0, Math.min(i - 1, c.righe.length - 4));
            return (
              <>
                {i >= 0 && <p className="posto">{c.righe[i].pos}°</p>}
                <ol className="classifica-corta">
                  {c.righe.slice(da, da + 4).map((r) => (
                    <li key={r.pos + r.squadra} className={stessaSquadra(r.squadra, c.squadra) ? 'lani' : undefined}>
                      <b>{r.pos}°</b> <span>{r.squadra}</span> <small>{r.punti} pt</small>
                    </li>
                  ))}
                </ol>
              </>
            );
          })()}
          <details className="classifica-tutta">
          <summary>Tutta la classifica</summary>
          <table className="classifica">
            <thead>
              <tr>
                <th scope="col">
                  <abbr title="Posizione">Pos</abbr>
                </th>
                <th scope="col">Squadra</th>
                <th scope="col">
                  <abbr title="Punti">Pt</abbr>
                </th>
                <th scope="col">
                  <abbr title="Partite giocate">G</abbr>
                </th>
                <th scope="col">
                  <abbr title="Partite vinte">V</abbr>
                </th>
              </tr>
            </thead>
            <tbody>
              {c.righe.map((r) => (
                <tr key={r.pos + r.squadra} className={stessaSquadra(r.squadra, c.squadra) ? 'lani' : undefined}>
                  <td>{r.pos}</td>
                  <td>{r.squadra}</td>
                  <td>{r.punti}</td>
                  <td>{r.giocate}</td>
                  <td>{r.vinte}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </details>
          <p className="nota">
            {c.girone}, dal portale FIPAV. Aggiornata il {new Date(c.aggiornata_il).getDate()} {MESI[new Date(c.aggiornata_il).getMonth()]}.
          </p>
        </div>
      ))}
      <dl className="numeri tabellone">
        <div>
          <dt>
            <Emoji e="🏐" /> partite
          </dt>
          <dd>{giocate.length}</dd>
        </div>
        <div>
          <dt>
            <Emoji e="🏆" /> vinte
          </dt>
          <dd>{vinte}</dd>
        </div>
        <div>
          <dt>
            <Emoji e="⏱️" /> dieci minuti a {MESI[oggi.getMonth()]}
          </dt>
          <dd>{d.dieci}</dd>
        </div>
      </dl>
      <details className="carta tutte-le-partite">
        <summary>
          <h2>
            <Emoji e="📣" /> Tutte le partite
          </h2>
        </summary>
        <div className="testa-carta" hidden>
          <h2>
            <Emoji e="📣" /> Partite
          </h2>
        </div>
        {d.partite.length === 0 ? (
          <p>Ancora nessuna partita. Dopo la gara il risultato compare qui.</p>
        ) : (
          <ul className="partite">
            {d.partite.map((p) => {
              const g = R.giorno(p.data);
              const vinta = p.set_nostri > p.set_loro;
              return (
                <li key={p.id}>
                  <span>
                    {p.avversaria}
                    <small>
                      {g.getDate()} {MESI[g.getMonth()]}
                      {!p.approvata_il ? ', aspetta la tua risposta' : p.in_campo === null && ', assente'}
                    </small>
                  </span>
                  <b className={vinta ? 'vinta' : 'persa'}>
                    {p.set_nostri}-{p.set_loro}
                  </b>
                </li>
              );
            })}
          </ul>
        )}
      </details>
      {avviso && (
        <p className="nota" role="status">
          {avviso}
        </p>
      )}
      <PopupPartita avvisa={setAvviso} quandoRisposto={carica} />
    </section>
  );
}

const FINESTRA = R.CONFIG.dieci_minuti.finestra;
const ora = (hhmm: string) => hhmm.replace(/^0/, '');

/**
 * Il coach (pose dell'allenatore, sprint 2): una riga sui dieci minuti del mattino e il collegamento
 * alla carta in Oggi, dove si fanno. Il collegamento c'è solo quando quella carta si vede (dentro la
 * finestra del mattino, o timer già avviato). Testi scelti dal signore il 17/11 (docs/05).
 */
function Coach({ mattino, ultima, apri }: { mattino: { da: string | null; il: string | null } | null; ultima?: Partita; apri: (v: 'Oggi') => void }) {
  const fatti = !!mattino?.il;
  const avviati = !!mattino?.da;
  const finestra = R.dentroFinestraDieciMinuti(new Date());
  const vinta = ultima && ultima.set_nostri > ultima.set_loro;
  const posa = fatti ? 'allenatore-applaude' : vinta === false ? 'allenatore-timeout' : 'allenatore-pollice';
  const riga = fatti
    ? 'Allenamento fatto. Brava, così si lavora.'
    : avviati
      ? 'Timer partito. Fino in fondo, poi spunta.'
      : finestra
        ? `Dieci minuti di allenamento, da avviare entro le ${ora(FINESTRA.ultimo_avvio)}. Forza, ti aspetto.`
        : `I dieci minuti si avviano dalle ${ora(FINESTRA.da)} alle ${ora(FINESTRA.ultimo_avvio)}. Domani ti aspetto.`;
  return (
    <div className="carta coach" aria-label="Il coach">
      <Sticker posa={posa} misura={72} />
      <div>
        <h2>
          <Emoji e="📋" /> Il coach
        </h2>
        <p>{riga}</p>
        {(finestra || avviati) && (
          <button className="collegamento" onClick={() => (vaiAiDieciMinuti(), apri('Oggi'))}>
            {fatti ? 'Guarda in Oggi' : 'Si parte'}
          </button>
        )}
      </div>
    </div>
  );
}
