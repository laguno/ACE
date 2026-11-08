// Stato dei forzieri, aggiornato dal server dopo ogni cambio di passi o di chiavi.
// Solo in avanti: chiuso -> enigma (manca l'ultima tappa) -> aperto (tappa raggiunta e chiavi
// totali bastano). "consegnato" lo segnano i genitori. Aprendo un forziere si sblocca una figurina rara.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import * as R from '../../../src/lib/regole/index.ts';

const ORDINE = { chiuso: 0, enigma: 1, aperto: 2, consegnato: 3 } as const;
type Stato = keyof typeof ORDINE;

// Figurine rare dei forzieri (docs/02): prima le pose senza un momento naturale, poi le altre
// "extra"; la cima (forziere 9) dà lani-cima se non è già presa.
// ponytail: elenco scelto da Claude, da confermare con il signore.
const RARE = ['leo-tennis', 'leo-copertina', 'leo-dispiaciuto', 'leo-partita-persa', 'lani-detective', 'lani-sorpresa', 'leo-gamer', 'bart-festeggia'];

async function figurinaRara(db: SupabaseClient, n: number) {
  const { data } = await db.from('figurine').select('posa').not('sbloccata_il', 'is', null);
  const prese = new Set((data ?? []).map((f) => f.posa));
  const posa = (n === 9 && !prese.has('lani-cima') ? 'lani-cima' : RARE.find((p) => !prese.has(p))) ?? null;
  if (posa) await db.from('figurine').upsert({ posa, sbloccata_il: new Date().toISOString() });
  return posa;
}

export async function aggiornaForzieri(db: SupabaseClient): Promise<{ n: number; stato: Stato; figurina?: string | null }[]> {
  const [{ data: s }, { data: c }, { data: forzieri }] = await Promise.all([
    db.from('saldo_passi').select('passi').single(),
    db.from('chiavi_totali').select('chiavi').single(),
    db.from('forzieri').select('n, stato'),
  ]);
  const passi = s?.passi ?? 0;
  const chiavi = c?.chiavi ?? 0;
  const cambiati: { n: number; stato: Stato; figurina?: string | null }[] = [];
  for (const f of forzieri ?? []) {
    const r = R.statoForziere(f.n, passi, chiavi);
    const nuovo: Stato = r === 'aperto' ? 'aperto' : r === 'lontano' ? 'chiuso' : 'enigma';
    if (ORDINE[nuovo] <= ORDINE[f.stato as Stato]) continue;
    const campi: Record<string, unknown> = { stato: nuovo };
    if (nuovo === 'aperto') campi.aperto_il = new Date().toISOString();
    const { error } = await db.from('forzieri').update(campi).eq('n', f.n);
    if (error) throw error;
    cambiati.push({ n: f.n, stato: nuovo, figurina: nuovo === 'aperto' ? await figurinaRara(db, f.n) : undefined });
  }
  return cambiati;
}
