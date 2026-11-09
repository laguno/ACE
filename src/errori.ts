// Errori dell'app (filone H): finiscono in errori_client, nel nostro Supabase (niente servizi
// esterni), e i genitori li vedono nella scheda Stato. Solo messaggio, punto del codice e pila:
// niente dati di Lani. Se non si può registrare (niente rete, niente accesso), resta in console.
import { supabase } from './supabase';

const TETTO = 20; // ponytail: per apertura dell'app; un errore in un ciclo non riempie la tabella
let registrati = 0;

export function registraErrore(dove: string, e: unknown) {
  console.error(dove, e);
  if (registrati >= TETTO) return;
  registrati++;
  const err = e instanceof Error ? e : new Error(typeof e === 'string' ? e : JSON.stringify(e) ?? 'errore');
  supabase
    .from('errori_client')
    .insert({ dove: dove.slice(0, 200), messaggio: (err.message || 'errore').slice(0, 500), dettagli: `${navigator.userAgent}\n${err.stack ?? ''}`.slice(0, 2000) })
    .then(
      () => undefined,
      () => undefined,
    );
}

/** Errori non presi da nessuno: script e promesse. */
export function ascoltaErrori() {
  addEventListener('error', (ev) => registraErrore(`pagina ${location.pathname}`, ev.error ?? ev.message));
  addEventListener('unhandledrejection', (ev) => registraErrore('promessa', ev.reason));
}
