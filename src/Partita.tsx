import { useEffect, useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as C from './lib/calendario';
import * as R from './lib/regole';

// Sprint 2: un genitore segna la partita di Lani con il risultato in set. I passi (giocata, vinta
// in più) li decide la funzione "passi" sul server; Lani vede il popup del copione.

type Props = { client: SupabaseClient; passi: (tipo: string, id: string) => Promise<number>; avvisa: (s: string) => void };

const SET = [0, 1, 2, 3];

export function SegnaPartita({ client, passi, avvisa }: Props) {
  const [lavoro, setLavoro] = useState(false);
  const oggi = R.giornoRoma(new Date());
  // giorno proposto: l'ultima partita di Lani nel calendario di famiglia negli ultimi 7 giorni, se c'è
  const [giorno, setGiorno] = useState(R.iso(oggi));
  useEffect(() => {
    const da = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() - 7);
    client
      .from('impegni_famiglia')
      .select('titolo, inizio')
      .gte('inizio', da.toISOString())
      .lte('inizio', new Date().toISOString())
      .order('inizio', { ascending: false })
      .then(({ data }) => {
        const p = (data ?? []).find((i: { titolo: string }) => C.tipoImpegno(i.titolo) === 'partita');
        if (p) setGiorno(R.iso(R.giornoRoma(p.inizio)));
      });
  }, [client]);
  const { giocata, vinta_in_piu } = R.CONFIG.passi.partite;

  async function salva(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const riga = { data: String(f.get('data')), avversaria: String(f.get('avversaria')).trim(), set_nostri: Number(f.get('nostri')), set_loro: Number(f.get('loro')) };
    if (riga.set_nostri === riga.set_loro) return avvisa('Nella pallavolo non c’è il pareggio: controlla i set.');
    setLavoro(true);
    const modulo = e.currentTarget;
    const { data, error } = await client.from('partite').insert(riga).select('id').single();
    if (error || !data) {
      setLavoro(false);
      return avvisa('Non salvata. Riprova.');
    }
    const p = await passi('partita', data.id);
    setLavoro(false);
    modulo.reset();
    avvisa(`Partita ${riga.set_nostri}-${riga.set_loro} con ${riga.avversaria}: +${p} passi.`);
  }

  return (
    <div className="carta">
      <div className="testa-carta">
        <h2>Partita</h2>
        <span className="valore">
          +{giocata}, vinta +{giocata + vinta_in_piu}
        </span>
      </div>
      <form className="modulo" onSubmit={salva}>
        <label>
          Giorno
          <input name="data" type="date" value={giorno} onChange={(e) => setGiorno(e.target.value)} required />
        </label>
        <label>
          Contro
          <input name="avversaria" maxLength={80} required autoComplete="off" />
        </label>
        <div className="griglia">
          <label>
            Set di Lani
            <select name="nostri" defaultValue={3}>
              {SET.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            Set loro
            <select name="loro" defaultValue={0}>
              {SET.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        <button className="principale" disabled={lavoro}>
          {lavoro ? 'Salvo…' : 'Segna la partita'}
        </button>
      </form>
    </div>
  );
}
