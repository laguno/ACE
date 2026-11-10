import { createClient } from '@supabase/supabase-js';
import type { Database } from './tipi-database';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const chiave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// Senza rete una lettura che il service worker non ha salvato fallisce subito: Supabase la
// riproverebbe tre volte in 7 secondi e la schermata resterebbe vuota nel frattempo. Il 504 non si
// riprova e per Supabase vuol dire "rete che non risponde", come l'errore vero.
const global = {
  fetch: (...a: Parameters<typeof fetch>) =>
    fetch(...a).catch((e: unknown) => {
      if (navigator.onLine) throw e;
      return new Response(null, { status: 504, statusText: 'senza rete' });
    }),
};

// Sessione del dispositivo, persistente: Lani sul suo telefono e sull'iPad, ogni genitore sul suo.
export const CHIAVE_SESSIONE = 'ace-sessione';
export const supabase = createClient<Database>(url, chiave, { auth: { storageKey: CHIAVE_SESSIONE }, global });

// Sessione di un genitore sui dispositivi di Lani (iPad): tenuta a parte, si usa solo dopo il PIN.
export const supabaseGenitore = createClient<Database>(url, chiave, { auth: { storageKey: 'ace-genitore' }, global });

export interface Profilo {
  id: string;
  ruolo: 'lani' | 'genitore';
  nome: string;
}
