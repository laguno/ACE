// Riscatto della serie nera (docs/02, Figurine; definizione del signore del 10/11): una figurina
// arrabbiata o dispettosa resta in attesa dal giorno del rimprovero e si sblocca con N giorni di
// scuola fatti bene di fila (config figurine), contati dal giorno dopo fino a ieri. Lo lancia
// sync-nuvola a ogni giro, dopo voti e note: idempotente, ricalcola tutto ogni volta.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import * as K from '../../../src/lib/copione/index.ts';
import * as R from '../../../src/lib/regole/index.ts';

const dopo = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** Sblocca le figurine della serie nera riscattate; restituisce le pose sbloccate. */
export async function riscatti(db: SupabaseClient, adesso = new Date()): Promise<string[]> {
  const { data: attesa, error } = await db.from('figurine').select('posa, in_attesa_di_riscatto_dal').eq('serie_nera', true).is('sbloccata_il', null).not('in_attesa_di_riscatto_dal', 'is', null);
  if (error) throw error;
  if (!attesa?.length) return [];

  const ieri = dopo(R.giornoRoma(adesso), -1);
  const da = attesa.map((f) => f.in_attesa_di_riscatto_dal as string).sort()[0];
  const [compiti, serate, sgridate, note] = await Promise.all([
    db.from('compiti').select('scadenza, fatto_il').gt('scadenza', da).lte('scadenza', R.iso(ieri)),
    db.from('serate').select('data, cartella_il').gte('data', da).lte('data', R.iso(ieri)),
    db.from('sgridate').select('data').gt('data', da).lte('data', R.iso(ieri)),
    db.from('note').select('data, tipo').gt('data', da).lte('data', R.iso(ieri)),
  ]);
  for (const r of [compiti, serate, sgridate, note]) if (r.error) throw r.error;

  const bene = (d: Date) => {
    const g = R.iso(d);
    const sera = R.iso(dopo(d, -1));
    const delGiorno = (compiti.data ?? []).filter((c) => c.scadenza === g);
    const s = (serate.data ?? []).find((x) => x.data === sera);
    return R.giornoFattoBene({
      compitiInScadenza: delGiorno.length,
      compitiInTempo: delGiorno.filter((c) => c.fatto_il && R.compitoInTempo(d, R.giornoRoma(c.fatto_il))).length,
      cartella: !!s?.cartella_il && R.iso(R.giornoRoma(s.cartella_il)) === sera,
      sgridate: (sgridate.data ?? []).filter((x) => x.data === g).length,
      note: (note.data ?? []).filter((x) => x.data === g && x.tipo !== 'merito').length,
    });
  };

  const sbloccate: string[] = [];
  for (const f of attesa) {
    const esiti: boolean[] = [];
    for (let d = dopo(R.giorno(f.in_attesa_di_riscatto_dal as string), 1); d <= ieri; d = dopo(d, 1)) if (R.giornoDiScuola(d)) esiti.push(bene(d));
    if (!R.riscattoFatto(esiti)) continue;
    const { error: e1 } = await db.from('figurine').update({ sbloccata_il: adesso.toISOString() }).eq('posa', f.posa);
    if (e1) throw e1;
    const p = K.componi('figurina_nera', { nome: K.nomeFigurina(f.posa) });
    const { error: e2 } = await db
      .from('popup_coda')
      .upsert({ chiave: `riscatto:${f.posa}`, situazione: 'figurina_nera', ...p, posa: f.posa }, { onConflict: 'chiave', ignoreDuplicates: true });
    if (e2) throw e2;
    sbloccate.push(f.posa);
  }
  return sbloccate;
}
