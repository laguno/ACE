import { supabase } from './supabase';

// Iscrizione alle notifiche push (Web Push). La chiave VAPID pubblica è fatta per stare nel client;
// la privata sta solo nei segreti di Supabase (VAPID_PRIVATE_KEY). Su iPhone funziona solo con ACE
// aggiunta alla schermata Home (iOS 16.4+).
const CHIAVE_PUBBLICA = 'BB4oXSiIZWa9eWn89UTk5LhUAI8y2B1sgiQBSX5c_lnzH0UtFcKfNbWrX3EyRCi_j84e6LRVkaT2ALfSmdJGQTc';

export const notifichePossibili = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && Notification.permission === 'default';

function chiaveBinaria(b64: string) {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

export async function attivaNotifiche(): Promise<boolean> {
  if ((await Notification.requestPermission()) !== 'granted') return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chiaveBinaria(CHIAVE_PUBBLICA) });
  const j = sub.toJSON();
  if (!j.endpoint || !j.keys) return false;
  const { error } = await supabase.from('push_iscrizioni').upsert({ endpoint: j.endpoint, chiavi: j.keys }, { onConflict: 'endpoint' });
  return !error;
}
