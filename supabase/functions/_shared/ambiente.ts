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
  const { data, error } = await db.from('sync_log').insert({ fonte }).select('id').single();
  if (error || !data) throw new Error(`sync_log: ${error?.message ?? 'nessuna riga'}`);
  return data.id;
}
