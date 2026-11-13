import { useEffect, useState } from 'react';
import * as R from './lib/regole';
import { supabase } from './supabase';

// R-Evolution la accendono i genitori (Impostazioni): impostazione r_evolution_da con il giorno.
// Copia in localStorage così la barra non salta all'apertura e senza rete resta com'era.
const COPIA = 'ace-r-evolution';

const copia = () => {
  try {
    return localStorage.getItem(COPIA);
  } catch {
    return null;
  }
};

/** Giorno di accensione di R-Evolution ('YYYY-MM-DD'), null se spenta. */
export function useREvolutionDa(): string | null {
  const [da, setDa] = useState<string | null>(copia);
  useEffect(() => {
    supabase
      .from('impostazioni')
      .select('valore')
      .eq('chiave', R.CHIAVE_R_EVOLUTION)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) return;
        const v = typeof data?.valore === 'string' ? data.valore : null;
        try {
          if (v) localStorage.setItem(COPIA, v);
          else localStorage.removeItem(COPIA);
        } catch {
          // senza localStorage vale solo la lettura di adesso
        }
        setDa(v);
      });
  }, []);
  return da;
}
