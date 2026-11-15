// Segreti e client del server: se un segreto manca, un errore che dice quale, non un undefined
// che esplode più avanti.
import { createClient } from 'npm:@supabase/supabase-js@2';

export function ambiente(nome: string): string {
  const v = Deno.env.get(nome);
  if (!v) throw new Error(`manca il segreto ${nome}`);
  return v;
}

/** Client con la chiave di servizio (scavalca la RLS): solo dentro le Edge Functions. */
export const dbServizio = () => createClient(ambiente('SUPABASE_URL'), ambiente('SUPABASE_SERVICE_ROLE_KEY'));

/** Apre una riga di sync_log (cron e sincronizzazioni) e ne restituisce l'id. */
export async function apriRegistro(db: ReturnType<typeof dbServizio>, fonte: string): Promise<string> {
  // una riga rimasta aperta da più di 5 minuti è di un giro spento a metà: si chiude come interrotta
  const prima = new Date(Date.now() - 5 * 60_000).toISOString();
  await db.from('sync_log').update({ finito_il: new Date().toISOString(), esito: 'interrotta' }).eq('fonte', fonte).is('finito_il', null).lt('iniziato_il', prima);
  const { data, error } = await db.from('sync_log').insert({ fonte }).select('id').single();
  if (error || !data) throw new Error(`sync_log: ${error?.message ?? 'nessuna riga'}`);
  return data.id;
}

/**
 * Errore di una funzione: in console e in errori_client (scheda Stato dei genitori). Solo messaggio
 * e pila, con gli indirizzi tolti (un indirizzo può contenere un segreto, come quello del calendario).
 */
export async function registraErroreServer(db: ReturnType<typeof dbServizio>, dove: string, e: unknown) {
  console.error(dove, e);
  const err = e instanceof Error ? e : new Error(typeof e === 'string' ? e : JSON.stringify(e));
  const pulito = (s: string) => s.replace(/https?:\/\/\S+/g, '[indirizzo]');
  await db
    .from('errori_client')
    .insert({ origine: 'funzione', dove, messaggio: pulito(err.message || 'errore').slice(0, 500), dettagli: pulito(err.stack ?? '').slice(0, 2000) })
    .then(
      () => undefined,
      () => undefined,
    );
}
