import type { SupabaseClient } from '@supabase/supabase-js';
import * as R from '../lib/regole';
import { GIORNI } from '../spunte';

// Pezzi in comune alle quattro schede dell'area genitori (restyling del 16/11, docs/genitori-ux.md).



export type Props = {
  client: SupabaseClient;
  passi: (tipo: string, id: string) => Promise<number>;
  /** riprova: in caso di errore la pillola ha il bottone "Riprova", che rifà la stessa azione */
  avvisa: (s: string, riprova?: () => void) => void;
};

export const VOCI_GESTI = [
  ['scrivania', 'Scrivania in ordine'],
  ['lavastoviglie', 'Lavastoviglie fatta'],
  ['letto', 'Letto fatto'],
  ['vestiti', 'Vestiti in ordine'],
] as const;

export const SGRIDATE = [
  ['bagno', 'Bagno da sistemare', 'Asciugamani, tappetino, specchio'],
  ['antisportivo', 'Antisportiva', 'Un gesto antisportivo in campo'],
  ['balla', 'Balla', 'Una cosa non vera o un imbroglio voluto'],
] as const;

/**
 * Balla (correzione del signore del 16/11): 2-3 frasi pronte e il testo libero come ultima scelta,
 * al massimo 80 caratteri. Il testo finisce nel popup di Lani ("{Cosa}. −10. Con la verità si perde
 * sempre meno.", docs/05): per questo le frasi pronte hanno il "tu" (a sinistra quello che leggono i
 * genitori, a destra quello che legge Lani).
 */
export const FRASI_BALLA = [
  ['Compiti spuntati ma non fatti', 'Compiti spuntati ma non fatti'],
  ['Ha detto di aver studiato', 'Hai detto di aver studiato, ma non era così'],
  ['Ha detto una cosa non vera', 'Hai detto una cosa non vera'],
] as const;
export const BALLA_MAX = 80;
// il popup tiene 25 parole: 8 sono della frase fissa del copione
const BALLA_PAROLE = 16;

/** Testo libero della balla pronto per il popup, oppure il motivo per cui non va. */
export function notaBalla(testo: string): { nota: string } | { errore: string } {
  const t = testo.trim().replace(/\s+/g, ' ').replace(/[.!?;:,\s]+$/, '');
  if (!t) return { errore: 'Scrivete che cosa non era vero.' };
  if (t.length > BALLA_MAX) return { errore: `Al massimo ${BALLA_MAX} caratteri.` };
  if (t.split(' ').length > BALLA_PAROLE) return { errore: `Al massimo ${BALLA_PAROLE} parole: il popup di Lani è corto.` };
  return { nota: t[0].toUpperCase() + t.slice(1) };
}

export const meno = (n: number) => String(n).replace('-', '−');

/** "lunedì 23/11" */
export const bello = (iso: string) => {
  const d = R.giorno(iso);
  return `${GIORNI[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
};

export const piu = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Ora di Roma, "HH:MM". */
export const oraRoma = (d = new Date()) => d.toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hour12: false });
