import { Gift } from '@phosphor-icons/react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Immagini dei premi (bucket privato "premi"): le dà solo la funzione "premi", con URL firmati.
// Lani riceve la sagoma finché il premio è nascosto e l'immagine vera quando risolve l'enigma o apre
// il forziere: sul client non si sfoca né si oscura niente, perché l'originale prima non arriva proprio.
// Premio cambiato e immagine non ancora rifatta: il pacco regalo con il punto di domanda.

export type Immagine = { n: number; sbloccato: boolean; manca: boolean; sagoma: string | null; vera: string | null };

export async function immaginiPremi(n?: number, client: SupabaseClient = supabase): Promise<Immagine[]> {
  const { data } = await client.functions.invoke('premi', { body: n ? { n } : {} });
  return (data?.immagini as Immagine[] | undefined) ?? [];
}

/** Sagoma, immagine vera o pacco regalo; "vera" la mostra solo se il server l'ha data. */
export function ImmaginePremio({ img, misura = 180, vera = false }: { img: Immagine | null | undefined; misura?: number; vera?: boolean }) {
  if (img === undefined) return <span className="premio-immagine" style={{ width: misura, height: misura }} aria-hidden />;
  const src = img && !img.manca ? (vera ? img.vera : img.sagoma) : null;
  if (!src)
    return (
      <span className="premio-immagine premio-pacco" style={{ width: misura, height: misura }} role="img" aria-label="Un regalo a sorpresa">
        <Gift size={misura * 0.55} weight="duotone" aria-hidden />
        <b aria-hidden>?</b>
      </span>
    );
  return <img className="premio-immagine" src={src} alt={vera ? 'Il premio del forziere' : 'La sagoma del premio'} width={misura} height={misura} />;
}
