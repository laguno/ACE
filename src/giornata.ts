import { useEffect, useState } from 'react';
import * as C from './lib/calendario';
import * as R from './lib/regole';
import { supabase } from './supabase';

export type Impegno = { titolo: string; inizio: string; tutto_il_giorno: boolean };

/** Impegni del calendario di famiglia tra due giorni (date locali, mezzanotte). */
export async function impegniTra(da: Date, a: Date): Promise<Impegno[]> {
  const { data } = await supabase
    .from('impegni_famiglia')
    .select('titolo, inizio, tutto_il_giorno')
    .gte('inizio', da.toISOString())
    .lt('inizio', a.toISOString())
    .order('inizio');
  return data ?? [];
}

export const piuGiorni = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Giornata di oggi: impegni e ora della chiusura serale (null se stasera non si chiude). */
export function useGiornata() {
  const [g, setG] = useState<{ impegni: Impegno[]; chiusura: string | null }>();
  useEffect(() => {
    const oggi = R.giornoRoma(new Date());
    Promise.all([
      impegniTra(oggi, piuGiorni(oggi, 1)),
      impegniTra(piuGiorni(oggi, 1), piuGiorni(oggi, 2)),
      supabase.from('impostazioni').select('chiave, valore').in('chiave', ['ora_chiusura', 'ora_chiusura_breve']),
    ]).then(([impegni, domani, i]) => {
      const imp = Object.fromEntries((i.data ?? []).map((r) => [r.chiave, r.valore]));
      const base = (imp.ora_chiusura as (string | null)[] | undefined)?.[oggi.getDay()] ?? null;
      const breve = C.partitaTra(domani) ? ((imp.ora_chiusura_breve as string | null | undefined) ?? null) : null;
      setG({ impegni, chiusura: C.oraChiusura(base, impegni, breve) });
    });
  }, []);
  return g;
}

export const oraAdesso = () => C.oraRoma(new Date().toISOString());
