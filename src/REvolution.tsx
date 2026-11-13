import { useEffect, useState } from 'react';
import * as R from './lib/regole';
import { stessaSquadra, type RigaClassifica } from './lib/classifiche';
import { Attesa, Testata } from './kit';
import { MESI } from './spunte';
import { supabase } from './supabase';
import { SegnaPartita } from './Partita';

// R-Evolution (sprint 2, docs/03): partite segnate da Lani (passi dopo l'approvazione di un
// genitore), dieci minuti del mese e classifiche dei campionati dal portale FIPAV (funzione
// "classifiche"). Si vede da quando i genitori accendono R-Evolution. La squadra e il forziere
// d'oro arrivano dopo (docs/08-sprint-2.md).

type Partita = { id: string; data: string; avversaria: string; set_nostri: number; set_loro: number; approvata_il: string | null };
type Classifica = { cid: number; campionato: string; girone: string; squadra: string; righe: RigaClassifica[]; aggiornata_il: string };

export default function REvolution() {
  const oggi = R.giornoRoma(new Date());
  const inizioMese = new Date(oggi.getFullYear(), oggi.getMonth(), 1);
  const [d, setD] = useState<{ partite: Partita[]; dieci: number; passiCampo: number; classifiche: Classifica[] }>();
  const [errore, setErrore] = useState('');
  const [avviso, setAvviso] = useState('');

  const carica = () =>
    Promise.all([
      supabase.from('partite').select('id, data, avversaria, set_nostri, set_loro, approvata_il').order('data', { ascending: false }).limit(20),
      supabase.from('serate').select('data', { count: 'exact', head: true }).gte('data', R.iso(inizioMese)).not('dieci_minuti_il', 'is', null),
      supabase.from('movimenti_passi').select('passi').in('motivo', ['partita', 'partita_vinta', 'dieci_minuti']),
      supabase.from('classifiche').select('cid, campionato, girone, squadra, righe, aggiornata_il').order('campionato'),
    ]).then(([p, s, m, c]) => {
      if (p.error) return setErrore('Non riesco a leggere le partite. Riprova tra poco.');
      setD({
        partite: (p.data ?? []) as Partita[],
        dieci: s.count ?? 0,
        passiCampo: (m.data ?? []).reduce((a, x) => a + x.passi, 0),
        classifiche: (c.data ?? []) as Classifica[],
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

  const giocate = d.partite.filter((p) => p.approvata_il);
  const vinte = giocate.filter((p) => p.set_nostri > p.set_loro).length;
  return (
    <section className="schermo r-evolution">
      <Testata sfondo="rosa" posa="lani-divisa" sopra="R-Evolution" titolo="In campo" riga={<p className="conto">+{d.passiCampo} passi presi in campo.</p>} />

      <dl className="numeri">
        <div>
          <dt>Partite</dt>
          <dd>{giocate.length}</dd>
          <dt>{vinte === 1 ? 'una vinta' : `${vinte} vinte`}</dt>
        </div>
        <div>
          <dt>Dieci minuti</dt>
          <dd>{d.dieci}</dd>
          <dt>a {MESI[oggi.getMonth()]}</dt>
        </div>
      </dl>

      {d.classifiche.map((c) => (
        <div className="carta" key={c.cid}>
          <div className="testa-carta">
            <h2>Classifica {c.campionato}</h2>
          </div>
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
          <p className="nota">
            {c.girone}, dal portale FIPAV. Aggiornata il {new Date(c.aggiornata_il).getDate()} {MESI[new Date(c.aggiornata_il).getMonth()]}.
          </p>
        </div>
      ))}

      <div className="carta">
        <div className="testa-carta">
          <h2>Partite</h2>
        </div>
        {d.partite.length === 0 ? (
          <p>Ancora nessuna partita segnata. Dopo la gara la segni qui sotto.</p>
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
                      {!p.approvata_il && ', da approvare'}
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
      </div>

      {avviso && (
        <p className="nota" role="status">
          {avviso}
        </p>
      )}
      <SegnaPartita client={supabase} avvisa={setAvviso} quandoSegnata={carica} />
    </section>
  );
}
