import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as C from './lib/calendario';
import * as R from './lib/regole';
import { calcolaSettimana, MOTIVI_SETTIMANA, type Settimana } from './lib/regole/settimana';
import { supabase } from './supabase';

// La settimana in corso per l'app (23/11): legge dal database le stesse cose che legge la funzione
// "chiavi" della domenica e le passa allo stesso calcolo (src/lib/regole/settimana.ts).

/** Evento della finestra dopo ogni spunta che dà passi: la striscia e la settimana si rileggono. */
export const EVENTO_PASSI = 'ace:passi';
export const avvisaPassi = () => window.dispatchEvent(new Event(EVENTO_PASSI));

const piu = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export async function leggiSettimana(client: SupabaseClient = supabase, oggi = R.giornoRoma(new Date())): Promise<Settimana | null> {
  const lun = R.lunedi(oggi);
  const dom = piu(lun, 6);
  const [da, a] = [R.iso(lun), R.iso(dom)];
  const [compiti, fogli, sessioni, movimenti, note, impegni, accesa, assenti] = await Promise.all([
    client.from('compiti').select('id, scadenza').gte('scadenza', da).lte('scadenza', a),
    client.from('fogli_firma').select('id, scadenza, consegnato_il').or(`and(scadenza.gte.${da},scadenza.lte.${a}),and(consegnato_il.gte.${da},consegnato_il.lte.${a}T23:59:59)`),
    client.from('sessioni_ripasso').select('id, data_prevista').gte('data_prevista', da).lte('data_prevista', a),
    client.from('movimenti_passi').select('motivo, riferimento, passi').in('motivo', MOTIVI_SETTIMANA).gte('giorno', R.iso(piu(lun, -42))).lte('giorno', a),
    client.from('note').select('tipo').gte('data', da).lte('data', a).in('tipo', ['disciplinare', 'didattica']),
    client.from('impegni_famiglia').select('titolo, inizio').gte('inizio', lun.toISOString()).lt('inizio', piu(dom, 2).toISOString()),
    client.from('impostazioni').select('valore').eq('chiave', R.CHIAVE_R_EVOLUTION).maybeSingle(),
    client.from('assenze').select('giorno').gte('giorno', da).lte('giorno', R.iso(piu(dom, 1))),
  ]);
  if (compiti.error || movimenti.error || sessioni.error) return null;
  const valore = accesa.data?.valore;
  return calcolaSettimana({
    lunedi: lun,
    compiti: compiti.data ?? [],
    sessioni: sessioni.data ?? [],
    fogli: (fogli.data ?? []).map((f) => ({ id: f.id as string, giorno: String(f.consegnato_il ?? f.scadenza ?? da).slice(0, 10) })),
    sportIl: (impegni.data ?? []).filter((i) => C.tipoImpegno(i.titolo) !== 'famiglia').map((i) => R.iso(R.giornoRoma(i.inizio))),
    assenze: (assenti.data ?? []).map((x) => x.giorno as string),
    rEvolutionDa: typeof valore === 'string' ? valore : null,
    movimenti: (movimenti.data ?? []) as { motivo: string; riferimento: string; passi: number }[],
    note: (note.data ?? []).length,
    oggi,
  });
}

// due componenti montati insieme (striscia e schermata) condividono la stessa lettura
let inCorso: Promise<Settimana | null> | null = null;
const leggiUnaVolta = (client: SupabaseClient) => (inCorso ??= leggiSettimana(client).finally(() => (inCorso = null)));

/** Settimana in corso, riletta dopo ogni spunta e quando l'app torna in primo piano. */
export function useSettimana(client: SupabaseClient = supabase): Settimana | null | undefined {
  const [s, setS] = useState<Settimana | null>();
  useEffect(() => {
    let vivo = true;
    // senza risposta si tiene l'ultima settimana letta (o "non disponibile" se non c'era)
    const tieni = (x: Settimana | null) => vivo && setS((p) => x ?? p ?? null);
    const leggi = () => leggiUnaVolta(client).then(tieni, () => tieni(null));
    const visibile = () => document.visibilityState === 'visible' && leggi();
    leggi();
    window.addEventListener(EVENTO_PASSI, leggi);
    document.addEventListener('visibilitychange', visibile);
    return () => {
      vivo = false;
      window.removeEventListener(EVENTO_PASSI, leggi);
      document.removeEventListener('visibilitychange', visibile);
    };
  }, [client]);
  return s;
}
