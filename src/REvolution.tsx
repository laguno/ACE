import { useEffect, useState } from 'react';
import * as R from './lib/regole';
import { Attesa, Testata } from './kit';
import { MESI } from './spunte';
import { supabase } from './supabase';

// R-Evolution (sprint 2, docs/03): le partite con il risultato e i dieci minuti del mese.
// Si vede da periodo.r_evolution_da. La squadra, le classifiche e il forziere d'oro arrivano dopo
// (docs/08-sprint-2.md).

type Partita = { id: string; data: string; avversaria: string; set_nostri: number; set_loro: number };

export default function REvolution() {
  const oggi = R.giornoRoma(new Date());
  const inizioMese = new Date(oggi.getFullYear(), oggi.getMonth(), 1);
  const [d, setD] = useState<{ partite: Partita[]; dieci: number; passiCampo: number }>();
  const [errore, setErrore] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('partite').select('id, data, avversaria, set_nostri, set_loro').order('data', { ascending: false }).limit(20),
      supabase.from('serate').select('data', { count: 'exact', head: true }).gte('data', R.iso(inizioMese)).not('dieci_minuti_il', 'is', null),
      supabase.from('movimenti_passi').select('passi').in('motivo', ['partita', 'partita_vinta', 'dieci_minuti']),
    ]).then(([p, s, m]) => {
      if (p.error) return setErrore('Non riesco a leggere le partite. Riprova tra poco.');
      setD({ partite: p.data ?? [], dieci: s.count ?? 0, passiCampo: (m.data ?? []).reduce((a, x) => a + x.passi, 0) });
    });
  }, [R.iso(oggi)]);

  if (errore)
    return (
      <section className="schermo">
        <p role="alert">{errore}</p>
      </section>
    );
  if (!d) return <Attesa />;

  const vinte = d.partite.filter((p) => p.set_nostri > p.set_loro).length;
  return (
    <section className="schermo r-evolution">
      <Testata sfondo="rosa" posa="lani-divisa" sopra="R-Evolution" titolo="In campo" riga={<p className="conto">+{d.passiCampo} passi presi in campo.</p>} />

      <dl className="numeri">
        <div>
          <dt>Partite</dt>
          <dd>{d.partite.length}</dd>
          <dt>{vinte === 1 ? 'una vinta' : `${vinte} vinte`}</dt>
        </div>
        <div>
          <dt>Dieci minuti</dt>
          <dd>{d.dieci}</dd>
          <dt>a {MESI[oggi.getMonth()]}</dt>
        </div>
      </dl>

      <div className="carta">
        <div className="testa-carta">
          <h2>Partite</h2>
          <span className="valore">
            +{R.CONFIG.passi.partite.giocata}, vinta +{R.CONFIG.passi.partite.giocata + R.CONFIG.passi.partite.vinta_in_piu}
          </span>
        </div>
        {d.partite.length === 0 ? (
          <p>Ancora nessuna partita segnata. La segnano mamma o papà dopo la gara.</p>
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
    </section>
  );
}
