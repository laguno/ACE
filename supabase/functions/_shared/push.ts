// Invio delle notifiche push a tutti i dispositivi di un ruolo: Web Push (chiavi VAPID nei segreti)
// per i browser e l'iPad, Firebase Cloud Messaging per il guscio Android (segreto
// FCM_SERVICE_ACCOUNT, il JSON della chiave del service account). Le iscrizioni scadute si cancellano.
// I limiti del copione (quante al giorno, lunghezza) li tiene chi chiama: qui si consegna e basta.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { ambiente } from './ambiente.ts';

let pronto = false;
type Messaggio = { titolo: string; testo: string; tipo: string };

export async function inviaPush(db: SupabaseClient, ruolo: 'lani' | 'genitore', messaggio: Messaggio) {
  const { data: profili } = await db.from('profili').select('id').eq('ruolo', ruolo);
  const { data: iscrizioni } = await db.from('push_iscrizioni').select('id, endpoint, chiavi, tipo').in('profilo_id', (profili ?? []).map((p) => p.id));
  let inviate = 0;
  for (const s of iscrizioni ?? []) {
    try {
      if (s.tipo === 'fcm') await inviaFcm(s.endpoint, messaggio);
      else {
        if (!pronto) {
          webpush.setVapidDetails(ambiente('VAPID_SUBJECT'), ambiente('VAPID_PUBLIC_KEY'), ambiente('VAPID_PRIVATE_KEY'));
          pronto = true;
        }
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.chiavi }, JSON.stringify(messaggio));
      }
      inviate++;
    } catch (e) {
      const stato = (e as { statusCode?: number }).statusCode;
      if (stato === 404 || stato === 410) await db.from('push_iscrizioni').delete().eq('id', s.id);
      else console.error('push', s.tipo, stato ?? (e as Error).message);
    }
  }
  return inviate;
}

// ---------------------------------------------------------------- FCM (API HTTP v1)
type ServiceAccount = { client_email: string; private_key: string; project_id: string; token_uri?: string };
let accesso: { gettone: string; scade: number } | undefined;

const b64url = (b: ArrayBuffer | string) =>
  btoa(typeof b === 'string' ? b : String.fromCharCode(...new Uint8Array(b))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

/** Gettone OAuth del service account (JWT firmato RS256 con WebCrypto), tenuto per 50 minuti. */
async function gettoneGoogle(sa: ServiceAccount) {
  if (accesso && accesso.scade > Date.now()) return accesso.gettone;
  const tokenUri = sa.token_uri ?? 'https://oauth2.googleapis.com/token';
  const ora = Math.floor(Date.now() / 1000);
  const corpo = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: tokenUri, iat: ora, exp: ora + 3600 }))}`;
  const der = Uint8Array.from(atob(sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')), (c) => c.charCodeAt(0));
  const chiave = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const firma = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', chiave, new TextEncoder().encode(corpo));
  const r = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${corpo}.${b64url(firma)}` }),
  });
  if (!r.ok) throw new Error(`FCM: accesso Google rifiutato (${r.status})`);
  const j = await r.json();
  accesso = { gettone: j.access_token, scade: Date.now() + 50 * 60_000 };
  return accesso.gettone;
}

async function inviaFcm(gettoneDispositivo: string, m: Messaggio) {
  const sa: ServiceAccount = JSON.parse(ambiente('FCM_SERVICE_ACCOUNT'));
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: 'POST',
    headers: { authorization: `Bearer ${await gettoneGoogle(sa)}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      message: {
        token: gettoneDispositivo,
        notification: { title: m.titolo, body: m.testo },
        android: { priority: 'HIGH', notification: { tag: m.tipo } },
      },
    }),
  });
  // 404 = UNREGISTERED: app disinstallata o gettone cambiato, l'iscrizione si cancella (come il 410 web)
  if (!r.ok) throw Object.assign(new Error(`FCM ${r.status}`), { statusCode: r.status });
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
