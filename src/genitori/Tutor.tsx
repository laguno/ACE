import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import config from '../../data/config-gioco.json';
import * as R from '../lib/regole';

// Storico del tutor (blocco E, 19/11) per i genitori, nella scheda Settimana: cosa ha chiesto Lani,
// come ci ha provato, quali indizi ha aperto, cosa ha spiegato con "Spiegamelo tu" e cosa le ha
// risposto il tutor. Le chiamate di oggi accanto al tetto (config-gioco.json, tutor).

type Richiesta = {
  id: string;
  tipo: 'spiegazione' | 'tentativo' | 'indizio' | 'spiegamelo';
  argomento: string | null;
  testo: string | null;
  risposta: Record<string, unknown> | null;
  ia: boolean;
  esito: 'ok' | 'tetto' | 'bloccata' | 'errore';
  giorno: string;
  creato_il: string;
  compiti: { testo: string } | null;
  profili: { nome: string } | null;
};

const ESITO: Record<Richiesta['esito'], string> = {
  ok: '',
  tetto: 'tetto del giorno pieno',
  bloccata: 'conteneva il risultato: scartata dal controllo',
  errore: 'il tutor non ha risposto',
};

export function riassunto(r: Richiesta): { titolo: string; sotto: string } {
  const compito = r.compiti?.testo ?? 'compito';
  const esito = ESITO[r.esito];
  const testo = (() => {
    if (r.tipo === 'tentativo') return `Ha provato così: ${r.testo ?? ''}`;
    if (r.tipo === 'indizio') return `Indizio ${String(r.risposta?.n ?? '')}: ${String(r.risposta?.indizio ?? '')}`;
    if (r.tipo === 'spiegamelo') {
      const manca = (r.risposta?.cosa_manca as string[] | undefined) ?? [];
      return `Ha scritto: ${r.testo ?? ''}${manca.length ? ` · Manca: ${manca.join('; ')}` : ''}`;
    }
    return r.ia ? 'Spiegazione nuova del tutor' : 'Ha riaperto la spiegazione';
  })();
  const titolo = r.tipo === 'spiegamelo' ? `Spiegamelo tu: ${r.argomento ?? ''}` : `Non ho capito: ${compito}`;
  return { titolo, sotto: esito ? `${testo} · ${esito}` : testo };
}

export function StoricoTutor({ client }: { client: SupabaseClient }) {
  const [righe, setRighe] = useState<Richiesta[]>();
  useEffect(() => {
    client
      .from('tutor_richieste')
      .select('id, tipo, argomento, testo, risposta, ia, esito, giorno, creato_il, compiti(testo), profili(nome)')
      .gte('creato_il', new Date(Date.now() - config.tutor.storico_giorni_genitori * 864e5).toISOString())
      .order('creato_il', { ascending: false })
      .limit(200)
      .then(({ data }) => setRighe((data ?? []) as unknown as Richiesta[]));
  }, [client]);

  if (!righe?.length) return null;
  const oggi = R.iso(R.giornoRoma(new Date()));
  const chiamateOggi = righe.filter((r) => r.ia && r.giorno === oggi && r.profili?.nome === 'Lani').length;
  return (
    // chiusa: si apre per guardare, non c'è niente da fare
    <details className="ga-chiusa">
      <summary>Tutor ({righe.length})</summary>
      <p className="ga-nota">
        Le ultime {config.tutor.storico_giorni_genitori} giornate. Chiamate di Lani al tutor oggi: {chiamateOggi} su {config.tutor.chiamate_al_giorno}.
      </p>
      <ul className="ga-elenco">
        {righe.map((r) => {
          const { titolo, sotto } = riassunto(r);
          return (
            <li key={r.id}>
              <div className="ga-riga">
                <span className="ga-riga-testo">
                  <b>{titolo}</b>
                  <small>
                    {r.profili?.nome && r.profili.nome !== 'Lani' ? `${r.profili.nome} · ` : ''}
                    {new Date(r.creato_il).toLocaleString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {sotto}
                  </small>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
