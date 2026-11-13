// Chiavi della domenica sera, condivise dalla Edge Function "chiavi" e dal simulatore dell'anno:
// conta la settimana da lunedì a domenica, scrive le chiavi in settimane (da quel momento niente
// storni), applica la rimonta ×1,25 se Lani era indietro e ha preso almeno la prima chiave, e
// aggiorna i forzieri.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import * as C from '../../../src/lib/calendario/index.ts';
import * as R from '../../../src/lib/regole/index.ts';
import { aggiornaForzieri } from './forzieri.ts';
import { accoda } from './popup.ts';

export const piu = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const ok = <T>(r: { data: T | null; error: { message: string } | null }, cosa: string): T => {
  if (r.error) throw new Error(`${cosa}: ${r.error.message}`);
  return r.data as T;
};

/** Chiavi della settimana che comincia il lunedì dato (una settimana già contata resta com'è). */
export async function contaChiavi(db: SupabaseClient, lun: Date) {
  const dom = piu(lun, 6);
  const [da, a] = [R.iso(lun), R.iso(dom)];
  const { data: gia } = await db.from('settimane').select('chiavi').eq('inizio', da).maybeSingle();
  if (gia?.chiavi != null) return { settimana: da, gia: true, chiavi: gia.chiavi };

  const [compiti, fogli, sessioni, movimenti, note, impegni, prima] = await Promise.all([
    db.from('compiti').select('scadenza').gte('scadenza', da).lte('scadenza', a),
    db.from('fogli_firma').select('id').or(`and(scadenza.gte.${da},scadenza.lte.${a}),and(consegnato_il.gte.${da},consegnato_il.lte.${a}T23:59:59)`),
    db.from('sessioni_ripasso').select('id').gte('data_prevista', da).lte('data_prevista', a),
    db.from('movimenti_passi').select('id, motivo, passi').gte('giorno', da).lte('giorno', a),
    db.from('note').select('tipo').gte('data', da).lte('data', a).in('tipo', ['disciplinare', 'didattica']),
    db.from('impegni_famiglia').select('titolo, inizio').gte('inizio', lun.toISOString()).lt('inizio', piu(dom, 2).toISOString()),
    db.from('movimenti_passi').select('passi, moltiplicatore').lt('giorno', da),
  ]);

  const giorni = Array.from({ length: 7 }, (_, i) => piu(lun, i));
  const sportIl = new Set(
    ok(impegni, 'impegni')
      .filter((i) => C.tipoImpegno(i.titolo) !== 'famiglia')
      .map((i) => R.iso(R.giornoRoma(i.inizio))),
  );
  const conta = R.contaSettimana({
    compiti: ok(compiti, 'compiti').filter((c) => R.giornoDiScuola(R.giorno(c.scadenza))).length,
    sereCartella: giorni.filter((d) => R.cartellaConta(d)).length,
    sereBorsa: giorni.filter((d) => sportIl.has(R.iso(piu(d, 1)))).length,
    fogli: ok(fogli, 'fogli').length,
    sessioni: ok(sessioni, 'sessioni').length,
    sereDieciMinuti: giorni.filter((d) => R.dieciMinutiAttivi(d)).length,
    movimenti: ok(movimenti, 'movimenti'),
    note: ok(note, 'note').length,
  });
  const chiavi = R.chiaviSettimana(conta);

  // rimonta: indietro di più di una tappa e mezza rispetto alla bandierina di lunedì
  const passiPrima = ok(prima, 'saldo').reduce((s, m) => s + Math.round(m.passi * Number(m.moltiplicatore)), 0);
  const molt = R.moltiplicatoreRimonta(passiPrima, R.bandierina(lun), chiavi);
  if (molt > 1) {
    const { error } = await db.from('movimenti_passi').update({ moltiplicatore: molt }).gte('giorno', da).lte('giorno', a).gt('passi', 0);
    if (error) throw new Error(`rimonta: ${error.message}`);
  }

  const { error } = await db.from('settimane').upsert({
    inizio: da,
    passi_obbligatori_possibili: conta.passiPossibili,
    passi_obbligatori_fatti: conta.passiFatti,
    cose_possibili: conta.cosePossibili,
    cose_fatte: conta.coseFatte,
    note: conta.note,
    chiavi,
    rimonta: molt > 1,
  });
  if (error) throw new Error(`settimane: ${error.message}`);
  const mancano = conta.cosePossibili - conta.coseFatte;
  await accoda(db, `chiavi:${da}`, `chiavi_${chiavi}` as 'chiavi_0', {
    cosa: chiavi === 1 ? 'una settimana senza note' : `${mancano} ${mancano === 1 ? 'cosa' : 'cose'} in più`,
  });
  return { settimana: da, chiavi, rimonta: molt > 1, ...conta, forzieri: await aggiornaForzieri(db) };
}
