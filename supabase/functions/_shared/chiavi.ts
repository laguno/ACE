// Chiavi della domenica sera, condivise dalla Edge Function "chiavi" e dal simulatore dell'anno:
// conta la settimana da lunedì a domenica, scrive le chiavi in settimane (da quel momento niente
// storni), applica la rimonta ×1,25 se Lani era indietro e ha preso almeno la prima chiave, e
// aggiorna i forzieri.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import * as C from '../../../src/lib/calendario/index.ts';
import * as R from '../../../src/lib/regole/index.ts';
import * as S from '../../../src/lib/regole/settimana.ts';
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

  const [compiti, fogli, sessioni, movimenti, note, impegni, prima, accesa, assenti] = await Promise.all([
    db.from('compiti').select('id, scadenza').gte('scadenza', da).lte('scadenza', a),
    db.from('fogli_firma').select('id, scadenza, consegnato_il').or(`and(scadenza.gte.${da},scadenza.lte.${a}),and(consegnato_il.gte.${da},consegnato_il.lte.${a}T23:59:59)`),
    db.from('sessioni_ripasso').select('id, data_prevista').gte('data_prevista', da).lte('data_prevista', a),
    // anche le settimane prima: un compito fatto in anticipo conta nella settimana della scadenza
    db.from('movimenti_passi').select('motivo, riferimento, passi').in('motivo', S.MOTIVI_SETTIMANA).gte('giorno', R.iso(piu(lun, -42))).lte('giorno', a),
    db.from('note').select('tipo').gte('data', da).lte('data', a).in('tipo', ['disciplinare', 'didattica']),
    db.from('impegni_famiglia').select('titolo, inizio').gte('inizio', lun.toISOString()).lt('inizio', piu(dom, 2).toISOString()),
    db.from('movimenti_passi').select('passi, moltiplicatore').lt('giorno', da),
    db.from('impostazioni').select('valore').eq('chiave', R.CHIAVE_R_EVOLUTION).maybeSingle(),
    // assenze fino al lunedì dopo: la cartella di domenica sera non conta se lunedì Lani è a casa
    db.from('assenze').select('giorno').gte('giorno', da).lte('giorno', R.iso(piu(dom, 1))),
  ]);
  // giorni a casa (docs/02, Assenze): le cose obbligatorie di quei giorni escono dal calcolo
  const assenze = ok(assenti, 'assenze').map((x) => x.giorno as string);
  // R-Evolution la accendono i genitori: da quel giorno i dieci minuti contano e la bandierina pesa di più
  const valore = ok(accesa, 'impostazioni')?.valore;
  const rEvolutionDa = typeof valore === 'string' ? valore : null;

  // lo stesso calcolo che Lani vede in "La mia settimana" (src/lib/regole/settimana.ts, 23/11)
  const conta = S.calcolaSettimana({
    lunedi: lun,
    compiti: ok(compiti, 'compiti'),
    sessioni: ok(sessioni, 'sessioni'),
    fogli: ok(fogli, 'fogli').map((f) => ({ id: f.id as string, giorno: (f.consegnato_il ?? f.scadenza ?? da).slice(0, 10) })),
    sportIl: ok(impegni, 'impegni')
      .filter((i) => C.tipoImpegno(i.titolo) !== 'famiglia')
      .map((i) => R.iso(R.giornoRoma(i.inizio))),
    assenze,
    rEvolutionDa,
    movimenti: ok(movimenti, 'movimenti'),
    note: ok(note, 'note').length,
  });
  const chiavi = conta.chiavi;

  // rimonta: indietro di più di una tappa e mezza rispetto alla bandierina di lunedì
  const passiPrima = ok(prima, 'saldo').reduce((s, m) => s + Math.round(m.passi * Number(m.moltiplicatore)), 0);
  const molt = R.moltiplicatoreRimonta(passiPrima, R.bandierina(lun, undefined, R.inizioREvolution(rEvolutionDa), await giorniAssenza(db)), chiavi);
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
  // nel registro solo i numeri, non la griglia giorno per giorno
  const { passiPossibili, passiFatti, cosePossibili, coseFatte, note: n } = conta;
  return { settimana: da, chiavi, rimonta: molt > 1, passiPossibili, passiFatti, cosePossibili, coseFatte, note: n, forzieri: await aggiornaForzieri(db) };
}

/** Tutti i giorni di assenza segnati (per la bandierina, che conta dall'inizio dell'anno). */
export async function giorniAssenza(db: SupabaseClient): Promise<string[]> {
  return ok(await db.from('assenze').select('giorno'), 'assenze').map((x) => x.giorno as string);
}
