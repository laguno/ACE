import { useEffect, useState } from 'react';
import { supabase } from './supabase';

// Frasi nei momenti (docs/05): una al giorno al massimo, mai la stessa prima di 30 giorni, mai nei
// rimproveri. Sceglie il server (frase_del_giorno): la prima richiesta del giorno prende il momento,
// gli altri momenti dello stesso giorno restano senza.

export type FraseDelGiorno = { testo: string; autore: string | null };
export type Momento = 'apertura' | 'inizio_settimana' | 'verifica' | 'chiusura' | 'tappa' | 'forziere_bloccato' | 'cima';

/** Popup che possono portare una frase; i rimproveri no. */
export const MOMENTO_DEL_POPUP: Record<string, Momento> = { tappa: 'tappa', forziere_lucchetto: 'forziere_bloccato', cima: 'cima' };

export async function fraseDelGiorno(momento: Momento): Promise<FraseDelGiorno | null> {
  const { data } = await supabase.rpc('frase_del_giorno', { p_momento: momento });
  return (data as FraseDelGiorno[] | null)?.[0] ?? null;
}

export function VistaFrase({ frase, className = '' }: { frase: FraseDelGiorno; className?: string }) {
  return (
    <figure className={`frase-giorno ${className}`}>
      <blockquote>{frase.testo}</blockquote>
      {frase.autore && <figcaption>{frase.autore}</figcaption>}
    </figure>
  );
}

/** Frase del momento, se oggi tocca a questo momento; altrimenti niente. */
export function Frase({ momento }: { momento: Momento | null }) {
  const [frase, setFrase] = useState<FraseDelGiorno | null>(null);
  useEffect(() => {
    if (momento) fraseDelGiorno(momento).then(setFrase);
  }, [momento]);
  return frase ? <VistaFrase frase={frase} /> : null;
}
