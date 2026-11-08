import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const chiave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// Sessione del dispositivo, persistente: Lani sul suo telefono e sull'iPad, ogni genitore sul suo.
export const supabase = createClient(url, chiave, { auth: { storageKey: 'ace-sessione' } });

// Sessione di un genitore sui dispositivi di Lani (iPad): tenuta a parte, si usa solo dopo il PIN.
export const supabaseGenitore = createClient(url, chiave, { auth: { storageKey: 'ace-genitore' } });

export interface Profilo {
  id: string;
  ruolo: 'lani' | 'genitore';
  nome: string;
}
