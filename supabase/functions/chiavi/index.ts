// Edge Function "chiavi": la domenica sera (21:30, cron) conta la settimana da lunedì a domenica,
// scrive le chiavi in settimane (da quel momento niente storni), applica la rimonta ×1,25 se Lani
// era indietro e ha preso almeno la prima chiave, e aggiorna i forzieri.
// Un genitore (o il cron) può chiedere una settimana precisa con { lunedi: 'YYYY-MM-DD' }.
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as C from '../../../src/lib/calendario/index.ts';
import * as R from '../../../src/lib/regole/index.ts';
import { aggiornaForzieri } from '../_shared/forzieri.ts';
import { accoda } from '../_shared/popup.ts';
import { chiChiama, cronOGenitore } from '../_shared/accesso.ts';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const piu = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const ok = <T>(r: { data: T | null; error: { message: string } | null }, cosa: string): T => {
  if (r.error) throw new Error(`${cosa}: ${r.error.message}`);
  return r.data as T;
};

async function contaChiavi(lun: Date) {
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

const autorizzato = async (req: Request) => cronOGenitore(await chiChiama(db, req, Deno.env.get('CRON_SEGRETO')));

const risposta = (corpo: unknown, stato = 200) =>
  new Response(JSON.stringify(corpo), { status: stato, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (!(await autorizzato(req))) return risposta({ errore: 'solo il cron o un genitore' }, 401);
  const corpo = await req.json().catch(() => ({}));
  const oggi = R.giornoRoma(new Date());
  let lun = R.lunedi(oggi);
  if (corpo.lunedi) lun = R.lunedi(R.giorno(corpo.lunedi));
  else if (oggi.getDay() !== 0 || C.oraRoma(new Date().toISOString()) < '21:00') return risposta({ saltato: 'non è domenica sera' });
  // il gioco parte con periodo.inizio: le settimane di prima non danno chiavi
  if (R.iso(piu(lun, 6)) < R.CONFIG.periodo.inizio) return risposta({ saltato: 'settimana prima dell’inizio del gioco' });

  const { data: log } = await db.from('sync_log').insert({ fonte: 'chiavi' }).select('id').single();
  try {
    const esito = await contaChiavi(lun);
    await db.from('sync_log').update({ finito_il: new Date().toISOString(), esito: 'ok', dettagli: esito }).eq('id', log!.id);
    return risposta(esito);
  } catch (e) {
    const errore = e instanceof Error ? e.message : 'errore imprevisto';
    await db.from('sync_log').update({ finito_il: new Date().toISOString(), esito: 'errore', dettagli: { errore } }).eq('id', log!.id);
    return risposta({ errore }, 500);
  }
});
