import { supabase } from './supabase';

// Iscrizione alle notifiche push (Web Push). La chiave VAPID pubblica è fatta per stare nel client;
// la privata sta solo nei segreti di Supabase (VAPID_PRIVATE_KEY). Su iPhone funziona solo con ACE
// aggiunta alla schermata Home (iOS 16.4+).
const CHIAVE_PUBBLICA = 'BB4oXSiIZWa9eWn89UTk5LhUAI8y2B1sgiQBSX5c_lnzH0UtFcKfNbWrX3EyRCi_j84e6LRVkaT2ALfSmdJGQTc';

const pushNelBrowser = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const notifichePossibili = () => pushNelBrowser() && Notification.permission === 'default';

function chiaveBinaria(b64: string) {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

/** Iscrizione del browser (quella che c'è o una nuova) salvata sul server; upsert sull'endpoint. */
async function iscrivi(): Promise<boolean> {
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chiaveBinaria(CHIAVE_PUBBLICA) }));
  const j = sub.toJSON();
  if (!j.endpoint || !j.keys) return false;
  const { error } = await supabase.from('push_iscrizioni').upsert({ endpoint: j.endpoint, chiavi: j.keys }, { onConflict: 'endpoint' });
  return !error;
}

export async function attivaNotifiche(): Promise<boolean> {
  if ((await Notification.requestPermission()) !== 'granted') return false;
  return iscrivi();
}

/**
 * A ogni apertura, con le notifiche già permesse: se il browser ha perso l'iscrizione (scaduta o
 * cambiata) se ne fa una nuova, e in ogni caso si risalva. Il server cancella quelle morte (404/410
 * in supabase/functions/_shared/push.ts): così una cancellata per sbaglio torna alla prossima apertura.
 */
export async function rinnovaIscrizione() {
  if (pushNelBrowser() && Notification.permission === 'granted') await iscrivi();
}
