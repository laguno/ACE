// Stato dei forzieri, aggiornato dal server dopo ogni cambio di passi o di chiavi.
// Solo in avanti: chiuso -> enigma (manca l'ultima tappa) -> aperto (tappa raggiunta e chiavi
// totali bastano). "consegnato" lo segnano i genitori. Aprendo un forziere si sblocca una figurina rara.
// Con nuoviPassi (quelli appena dati) accoda anche i popup di tappa, cima, enigma, lucchetto e forziere aperto.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import * as R from '../../../src/lib/regole/index.ts';
import { accoda } from './popup.ts';
import manifest from '../../../data/manifest.json' with { type: 'json' };

const ORDINE = { chiuso: 0, enigma: 1, aperto: 2, consegnato: 3 } as const;
type Stato = keyof typeof ORDINE;

// Figurine dei forzieri (revisione di Jarvis, 8/11): prima le pose senza un momento naturale, poi
// le altre non ancora sbloccate, esclusa la serie nera e le pose che hanno il loro momento nel
// copione (detective, sorpresa, leo-gamer, bart-festeggia). La cima dà lani-cima.
const PRIMA = ['leo-tennis', 'leo-copertina', 'leo-dispiaciuto', 'leo-partita-persa'];
const HANNO_UN_MOMENTO = new Set(['lani-detective', 'lani-sorpresa', 'leo-gamer', 'bart-festeggia', 'lani-cima']);
const ALTRE = manifest.avatar
  .filter((a) => a.personaggio !== 'allenatore' && a.tono !== 'arrabbiato' && a.tono !== 'dispettoso')
  .map((a) => a.id)
  .filter((id) => !PRIMA.includes(id) && !HANNO_UN_MOMENTO.has(id));

async function figurinaRara(db: SupabaseClient, n: number) {
  const { data } = await db.from('figurine').select('posa').not('sbloccata_il', 'is', null);
  const prese = new Set((data ?? []).map((f) => f.posa));
  const posa = (n === 9 && !prese.has('lani-cima') ? 'lani-cima' : [...PRIMA, ...ALTRE].find((p) => !prese.has(p))) ?? null;
  if (posa) await db.from('figurine').upsert({ posa, sbloccata_il: new Date().toISOString() });
  return posa;
}

export async function aggiornaForzieri(db: SupabaseClient, nuoviPassi?: number): Promise<{ n: number; stato: Stato; figurina?: string | null }[]> {
  const [{ data: s }, { data: c }, { data: forzieri }] = await Promise.all([
    db.from('saldo_passi').select('passi').single(),
    db.from('chiavi_totali').select('chiavi').single(),
    db.from('forzieri').select('n, stato, enigma, premio'),
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
    if (nuovo === 'aperto') await accoda(db, `forziere:${f.n}:aperto`, 'forziere_aperto', { premio: f.premio ?? 'un premio da scegliere con mamma e papà' });
    else if (f.enigma) await accoda(db, `forziere:${f.n}:enigma`, 'enigma_comparso', { n: R.CONFIG.enigma.tentativi });
  }

  if (nuoviPassi) {
    const prima = R.posizione(passi - nuoviPassi).tappeFatte;
    const dopo = R.posizione(passi);
    if (dopo.inCima && prima < dopo.tappeFatte) await accoda(db, 'cima', 'cima');
    else if (dopo.tappeFatte > prima) {
      await accoda(db, `tappa:${dopo.tappeFatte}`, 'tappa', { tappa: dopo.tappeFatte, mancano_passi: dopo.mancanoPassi });
      const conf = R.CONFIG.forzieri.find((x) => x.tappa === dopo.tappeFatte);
      if (conf && chiavi < conf.chiavi) await accoda(db, `forziere:${conf.n}:lucchetto`, 'forziere_lucchetto', { n: conf.chiavi - chiavi });
    }
  }
  return cambiati;
}
