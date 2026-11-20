// Coda dei ripassi senza rete (piano studio del 19/11/2026, blocco B). Ogni carta ripassata
// diventa una voce salvata sul telefono; la coda si svuota appena c'è rete. Il ripasso ha una
// chiave unica: se una voce arriva due volte, il server tiene la prima.
import { supabase } from './supabase';
import type { Database } from './tipi-database';

type AggiornaCarta = Database['public']['Tables']['flashcard']['Update'];
type NuovoRipasso = Database['public']['Tables']['ripassi_carte']['Insert'];
export type VoceCoda = { carta: string; aggiorna: AggiornaCarta; ripasso: NuovoRipasso };

const CHIAVE = 'ace-coda-ripassi';
let inCorso: Promise<void> | null = null;

function leggi(): VoceCoda[] {
  try {
    return JSON.parse(localStorage.getItem(CHIAVE) ?? '[]') as VoceCoda[];
  } catch {
    return [];
  }
}

function scrivi(voci: VoceCoda[]) {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(voci));
  } catch {
    // memoria piena o bloccata: la voce resta solo in questa pagina
  }
}

export function nuovaChiave(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Mette in coda un ripasso e prova subito a mandarlo. */
export function accodaRipasso(voce: VoceCoda): Promise<void> {
  scrivi([...leggi(), voce]);
  return svuota();
}

async function manda(v: VoceCoda): Promise<boolean> {
  const r = await supabase.from('ripassi_carte').upsert(v.ripasso, { onConflict: 'chiave', ignoreDuplicates: true });
  if (r.error) return false;
  const c = await supabase.from('flashcard').update(v.aggiorna).eq('id', v.carta);
  return !c.error;
}

/** Manda le voci in ordine; alla prima che non passa si ferma e riprova più tardi. */
export function svuota(): Promise<void> {
  if (inCorso) return inCorso;
  inCorso = (async () => {
    // prima un giro dell'event loop: senza, con la coda vuota il finally sotto girerebbe prima
    // dell'assegnazione a inCorso e la coda resterebbe bloccata per sempre
    await Promise.resolve();
    try {
      let voci = leggi();
      while (voci.length) {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) break;
        let ok = false;
        try {
          ok = await manda(voci[0]);
        } catch {
          ok = false;
        }
        if (!ok) break;
        voci = leggi().filter((x) => x.ripasso.chiave !== voci[0].ripasso.chiave);
        scrivi(voci);
      }
    } finally {
      inCorso = null;
    }
  })();
  return inCorso;
}

export const vociInCoda = () => leggi().length;

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void svuota());
  void svuota();
}
