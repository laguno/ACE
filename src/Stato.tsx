import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Attesa } from './kit';
import { GIORNI, MESI } from './spunte';
import { prossimo } from './lib/calendario';

// Scheda "Stato" dell'area genitori (filone H): ACE sta lavorando? Ultime sincronizzazioni,
// ultime chiavi, errori recenti e quando ripassano i cron. Solo conteggi e righe dei genitori.

type Giro = { fonte: string; esito: string | null; iniziato_il: string; finito_il: string | null };
type Errore = { creato_il: string; dove: string | null; messaggio: string; origine: string };

/** Orari dei cron in ora italiana (supabase/migrations/*cron*): servono solo a dire "il prossimo". */
const PROSSIMI: [string, string[]][] = [
  ['Nuvola', ['14:30', '19:30']],
  ['Calendario', Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:05`)],
];

const quando = (iso: string) => {
  const d = new Date(iso);
  const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
  const oggi = new Date().toDateString() === d.toDateString();
  return oggi ? `oggi alle ${ora}` : `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]} alle ${ora}`;
};

export default function Stato({ client }: { client: SupabaseClient }) {
  const [s, setS] = useState<{ giri: Giro[]; chiavi: { inizio: string; chiavi: number } | null; errori: Errore[]; erroriSettimana: number }>();
  useEffect(() => {
    const settimana = new Date(Date.now() - 7 * 864e5).toISOString();
    Promise.all([
      client.from('sync_log').select('fonte, esito, iniziato_il, finito_il').order('iniziato_il', { ascending: false }).limit(30),
      client.from('settimane').select('inizio, chiavi').not('chiavi', 'is', null).order('inizio', { ascending: false }).limit(1),
      client.from('errori_client').select('creato_il, dove, messaggio, origine').order('creato_il', { ascending: false }).limit(5),
      client.from('errori_client').select('id', { count: 'exact', head: true }).gte('creato_il', settimana),
    ]).then(([g, k, e, n]) =>
      setS({ giri: (g.data ?? []) as Giro[], chiavi: k.data?.[0] ?? null, errori: (e.data ?? []) as Errore[], erroriSettimana: n.count ?? 0 }),
    );
  }, [client]);
  if (!s) return <Attesa />;

  const ultimo = (fonte: string) => s.giri.find((g) => g.fonte === fonte);
  const riga = (nome: string, fonte: string, orari?: string[]) => {
    const g = ultimo(fonte);
    const ok = g?.esito === 'ok';
    return (
      <li key={fonte}>
        <b>{nome}</b>
        <span className={ok ? 'stato-ok' : 'stato-ko'}>{!g ? 'mai sincronizzato' : g.esito === null ? `in corso da ${quando(g.iniziato_il)}` : `${ok ? 'ok' : 'non riuscita'}, ${quando(g.iniziato_il)}`}</span>
        {orari && <small>Prossima: {prossimo(orari)}</small>}
      </li>
    );
  };

  return (
    <>
      <div className="carta">
        <h2>Sincronizzazioni</h2>
        <ul className="stato-elenco">
          {riga('Nuvola', 'nuvola', PROSSIMI[0][1])}
          {riga('Calendario', 'calendario', PROSSIMI[1][1])}
          <li>
            <b>Chiavi della domenica</b>
            <span>{s.chiavi ? `${s.chiavi.chiavi} ${s.chiavi.chiavi === 1 ? 'chiave' : 'chiavi'} nella settimana dal ${Number(s.chiavi.inizio.slice(8))}` : 'ancora nessuna settimana contata'}</span>
            <small>Prossime: domenica alle 21:30</small>
          </li>
        </ul>
      </div>
      <div className="carta">
        <h2>Errori degli ultimi 7 giorni: {s.erroriSettimana}</h2>
        {s.errori.length === 0 ? (
          <p className="nota">Nessun errore registrato.</p>
        ) : (
          <ul className="stato-elenco">
            {s.errori.map((e) => (
              <li key={e.creato_il + e.messaggio}>
                <b>{e.dove ?? (e.origine === 'funzione' ? 'Server' : 'App')}</b>
                <span>{e.messaggio}</span>
                <small>{quando(e.creato_il)}</small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
