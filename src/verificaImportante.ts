import { useEffect, useState } from 'react';
import * as R from './lib/regole';
import { verificaImportante, type VerificaCandidata } from './lib/regole/verifica-importante';
import { supabase } from './supabase';

// La verifica importante di oggi (regola del 23/11, src/lib/regole/verifica-importante.ts): qui si
// leggono verifiche e voti dal database e si passa tutto alla funzione pura.

export type Importante = VerificaCandidata & { ripassi: { fatti: number; totale: number; prossimo: string | null } };

export function useVerificaImportante(): Importante | null | undefined {
  const [v, setV] = useState<Importante | null>();
  useEffect(() => {
    let vivo = true;
    const oggi = R.giornoRoma(new Date());
    const fino = R.iso(new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() + R.CONFIG.verifica_importante.giorni_prima));
    (async () => {
      const { data: ver } = await supabase.from('verifiche').select('id, data, tipo, argomento, materia_id, materie(nome)').gte('data', R.iso(oggi)).lte('data', fino);
      const candidate: VerificaCandidata[] = ((ver ?? []) as unknown as (Omit<VerificaCandidata, 'materia'> & { materie: { nome: string } | null })[]).map((x) => ({ ...x, materia: x.materie?.nome ?? null }));
      const ids = [...new Set(candidate.map((c) => c.materia_id).filter((x): x is string => !!x))];
      const { data: voti } = ids.length ? await supabase.from('voti').select('materia_id, voto, peso, fa_media, data').in('materia_id', ids) : { data: [] };
      const scelta = verificaImportante(candidate, (voti ?? []) as never, oggi);
      if (!scelta) return vivo && setV(null);
      const { data: ses } = await supabase.from('sessioni_ripasso').select('numero, data_prevista, fatta_il').eq('verifica_id', scelta.id).order('numero');
      const lista = ses ?? [];
      const prossimo = lista.find((s) => !s.fatta_il)?.data_prevista ?? null;
      vivo && setV({ ...scelta, ripassi: { fatti: lista.filter((s) => s.fatta_il).length, totale: lista.length, prossimo } });
    })().catch(() => vivo && setV(null));
    return () => {
      vivo = false;
    };
  }, []);
  return v;
}
