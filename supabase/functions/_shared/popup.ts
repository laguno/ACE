// Accoda un popup del copione (uno per evento, chiave unica) e sblocca la figurina della sua posa
// la prima volta che compare (docs/05, Figurine): le pose della serie nera non si sbloccano qui,
// restano in attesa del riscatto.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import manifest from '../../../data/manifest.json' with { type: 'json' };
import * as K from '../../../src/lib/copione/index.ts';
import * as R from '../../../src/lib/regole/index.ts';

const ALBUM = manifest.avatar.filter((a) => a.personaggio !== 'allenatore');

export async function accoda(db: SupabaseClient, evento: string, chiave: K.ChiavePopup, v: Record<string, string | number> = {}) {
  // prima dell'inizio del gioco niente popup né figurine: l'album parte da zero il primo giorno
  if (new Date().toISOString().slice(0, 10) < R.CONFIG.periodo.inizio) return;
  const p = K.componi(chiave, v);
  const { data, error } = await db
    .from('popup_coda')
    .upsert({ chiave: evento, situazione: chiave, ...p }, { onConflict: 'chiave', ignoreDuplicates: true })
    .select('id');
  if (error) throw error;
  const id = data?.[0]?.id;
  if (!id) return; // già accodato

  const posa = ALBUM.find((a) => a.id === p.posa);
  if (!posa) return;
  const { data: f } = await db.from('figurine').select('sbloccata_il').eq('posa', posa.id).maybeSingle();
  if (f?.sbloccata_il) return;
  if (posa.tono === 'arrabbiato' || posa.tono === 'dispettoso') {
    // ponytail: il riscatto (7 giorni fatti bene) che sblocca la serie nera è ancora da fare
    await db.from('figurine').upsert({ posa: posa.id, serie_nera: true, in_attesa_di_riscatto_dal: new Date().toISOString().slice(0, 10) });
    return;
  }
  await db.from('figurine').upsert({ posa: posa.id, sbloccata_il: new Date().toISOString() });
  const { count } = await db.from('figurine').select('posa', { count: 'exact', head: true }).not('sbloccata_il', 'is', null);
  await db.from('popup_coda').update({ figurina: `Nuova figurina: ${K.nomeFigurina(posa.id)}. Album ${count ?? 1}/${ALBUM.length}.` }).eq('id', id);
}
