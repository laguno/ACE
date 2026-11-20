import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as R from '../lib/regole';
import * as D from '../lib/regole/metacognizione';
import { Elenco, Riga } from '../kit';
import { piu } from './comune';

// Riepilogo della settimana per i genitori (blocco D, 19/11/2026): la domenica è completo, gli
// altri giorni è "finora". Solo numeri: ripassi, carte, pillole e "sicura ma sbagliata" quando
// ci sono (blocchi C e B), scarto tra voto previsto e vero, minuti del piano, lezione letta.
// ponytail: pillole e carte sicure arrivano dai blocchi C e B; finché le loro tabelle non ci sono
// restano null e la riga non compare.

export default function Riepilogo({ client }: { client: SupabaseClient }) {
  const oggi = R.giornoRoma(new Date());
  const lun = R.lunedi(oggi);
  const [da, a] = [R.iso(lun), R.iso(piu(lun, 6))];
  const [righe, setRighe] = useState<D.RigaRiepilogo[]>();

  useEffect(() => {
    (async () => {
      const finoA = R.iso(oggi) < a ? R.iso(oggi) : a;
      const [s, g, p, pv, l] = await Promise.all([
        client.from('sessioni_ripasso').select('fatta_il').gte('data_prevista', da).lte('data_prevista', finoA),
        client.from('flashcard_giri').select('id', { count: 'exact', head: true }).gte('fatto_il', `${da}T00:00:00+01:00`).lte('fatto_il', `${a}T23:59:59+01:00`),
        client.from('piano_voci').select('minuti_stimati, iniziata_il, finita_il, giorno').gte('giorno', da).lte('giorno', a),
        client.from('voti_previsti').select('verifica_id, voto, verifiche(id, materia_id, data, tipo)'),
        client.from('micro_lezioni_lette').select('settimana').eq('settimana', da).maybeSingle(),
      ]);
      const sessioni = s.data ?? [];
      // previsioni con il voto vero arrivato in questa settimana
      const previste = (pv.data ?? []) as unknown as { verifica_id: string; voto: number; verifiche: D.VerificaDaAbbinare | null }[];
      const verifiche = previste.map((x) => x.verifiche).filter((v) => !!v) as D.VerificaDaAbbinare[];
      let previsioni: { previsto: number; vero: number }[] = [];
      if (verifiche.length) {
        const min = verifiche.reduce((m, v) => (v.data < m ? v.data : m), verifiche[0].data);
        const { data: voti } = await client.from('voti').select('id, materia_id, data, voto, tipo').gte('data', min);
        const abbinati = D.abbinaVoti(verifiche, (voti ?? []).map((v) => ({ ...v, voto: Number(v.voto) })));
        previsioni = previste.flatMap((x) => {
          const v = abbinati.get(x.verifica_id);
          return v && v.data >= da && v.data <= a ? [{ previsto: Number(x.voto), vero: v.voto }] : [];
        });
      }
      setRighe(
        D.riepilogoSettimana({
          ripassi: { fatti: sessioni.filter((x) => x.fatta_il).length, previsti: sessioni.length },
          giriCarte: g.count ?? 0,
          pillole: null,
          sicure: null,
          previsioni,
          piano: (p.data ?? []) as D.VocePiano[],
          lezioneLetta: !!l.data,
        }),
      );
    })();
  }, []);

  if (!righe) return null;
  return (
    <section className="ga-sezione" aria-labelledby="riepilogo-studio">
      <h2 id="riepilogo-studio">{oggi.getDay() === 0 ? 'Come ha studiato questa settimana' : 'Come ha studiato finora'}</h2>
      <Elenco etichetta="Riepilogo dello studio">
        {righe.map((r) => (
          <Riga key={r.chiave} titolo={r.valore} sotto={r.testo} />
        ))}
      </Elenco>
    </section>
  );
}
