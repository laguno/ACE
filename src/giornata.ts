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
      supabase.from('impostazioni').select('valore').eq('chiave', 'ora_chiusura').maybeSingle(),
    ]).then(([impegni, i]) => {
      const base: string | null = i.data?.valore?.[oggi.getDay()] ?? null;
      setG({ impegni, chiusura: C.oraChiusura(base, impegni) });
    });
  }, []);
  return g;
}

export const oraAdesso = () => C.oraRoma(new Date().toISOString());
