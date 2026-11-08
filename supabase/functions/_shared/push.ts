// Invio delle notifiche push (Web Push, chiavi VAPID nei segreti) a tutti i dispositivi di un ruolo.
// Le iscrizioni scadute (404/410) si cancellano.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

let pronto = false;

export async function inviaPush(db: SupabaseClient, ruolo: 'lani' | 'genitore', messaggio: { titolo: string; testo: string; tipo: string }) {
  if (!pronto) {
    webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);
    pronto = true;
  }
  const { data: profili } = await db.from('profili').select('id').eq('ruolo', ruolo);
  const { data: iscrizioni } = await db.from('push_iscrizioni').select('id, endpoint, chiavi').in('profilo_id', (profili ?? []).map((p) => p.id));
  let inviate = 0;
  for (const s of iscrizioni ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.chiavi }, JSON.stringify(messaggio));
      inviate++;
    } catch (e) {
      const stato = (e as { statusCode?: number }).statusCode;
      if (stato === 404 || stato === 410) await db.from('push_iscrizioni').delete().eq('id', s.id);
      else console.error('push', stato);
    }
  }
  return inviate;
}

/**
 * Avviso ai genitori quando una sincronizzazione fallisce, solo alla prima di fila: se anche la
 * precedente era fallita, l'avviso è già partito (revisione di Jarvis, 8/11).
 */
export async function avvisaSeFallita(db: SupabaseClient, fonte: string, nome: string, logId: string) {
  const { data } = await db.from('sync_log').select('esito').eq('fonte', fonte).neq('id', logId).not('esito', 'is', null).order('iniziato_il', { ascending: false }).limit(1);
  if (data?.[0]?.esito === 'errore') return 0;
  return inviaPush(db, 'genitore', { titolo: 'ACE', testo: `${nome} non si sincronizza: controllate l'accesso`, tipo: `sync-${fonte}` });
}
