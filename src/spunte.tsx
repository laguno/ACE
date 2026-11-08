import { useState } from 'react';
import { Check, Lightbulb } from '@phosphor-icons/react';
import { supabase } from './supabase';

// Pezzi comuni a Oggi e Sera: la spunta di un compito e il suo aspetto.

export type Compito = { id: string; testo: string; fatto_il: string | null; materie: { nome: string } | null };

export const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
export const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
export const maiuscola = (s: string) => s.replace(/^./, (c) => c.toUpperCase());
export const adesso = () => new Date().toISOString();

export const SELECT_COMPITI = 'id, testo, fatto_il, materie(nome)';

/** La funzione "passi" decide i passi dallo stato del database; restituisce quanti ne ha dati. */
export async function passi(tipo: string, id: string): Promise<number> {
  const { data } = await supabase.functions.invoke('passi', { body: { tipo, id } });
  return data?.passi ?? 0;
}

export function RigaCompito({ c, numero, nota, onSpunta, onAiuto, onAnnulla }: {
  c: Compito;
  numero?: number;
  /** riga piccola sotto il testo (es. "Inizia da qui: è il più lungo") */
  nota?: string;
  onSpunta: () => void;
  onAiuto?: () => void;
  /** presente nei 5 secondi dopo la spunta */
  onAnnulla?: () => void;
}) {
  return (
    <li className={onAiuto || onAnnulla ? 'con-aiuto' : undefined}>
      <label className={numero !== undefined ? 'numerata' : undefined}>
        <input type="checkbox" checked={!!c.fatto_il} disabled={!!c.fatto_il} onChange={onSpunta} />
        {/* nel pomeriggio il numero dell'ordine fa da casella (bozza Pomeriggio): con la spunta diventa ✓ */}
        {numero !== undefined && (
          <span className="bollino" aria-hidden>
            {c.fatto_il ? <Check size={18} weight="bold" /> : numero}
          </span>
        )}
        <span>
          <b>{c.materie?.nome ?? 'Compito'}</b>: {c.testo}
          {nota && <small className="nota-riga">{nota}</small>}
        </span>
      </label>
      {onAnnulla && (
        <button className="lampadina annulla" onClick={onAnnulla}>
          Annulla
        </button>
      )}
      {onAiuto && !c.fatto_il && !onAnnulla && (
        <button className="tondo" onClick={onAiuto} aria-label={`Non ho capito: ${c.materie?.nome ?? 'compito'}`}>
          <Lightbulb size={26} weight="bold" aria-hidden />
        </button>
      )}
    </li>
  );
}

/** Spunta di un compito: si vede subito, poi si salva e si chiamano i passi. */
export async function spuntaCompito(
  id: string,
  segna: (fatto_il: string | null) => void,
  errore: (msg: string) => void,
) {
  segna(adesso());
  const { error } = await supabase.from('compiti').update({ fatto_il: adesso() }).eq('id', id);
  if (error) {
    segna(null);
    return errore('Spunta non salvata. Riprova.');
  }
  await passi('compito', id);
}

/**
 * "Annulla" per 5 secondi dopo una spunta, prima dell'invio al server (revisione di Jarvis): la
 * spunta si vede subito, l'invio parte allo scadere; dopo, la correzione resta dei genitori.
 * Se si cambia schermata prima dei 5 secondi, l'invio parte lo stesso.
 */
export const SECONDI_ANNULLA = 5;
export function useAnnulla() {
  const [attesa, setAttesa] = useState<Record<string, number>>({});
  const togli = (id: string) => setAttesa(({ [id]: _, ...resto }) => resto);
  return {
    inAttesa: (id: string) => id in attesa,
    avvia(id: string, invia: () => void) {
      const t = window.setTimeout(() => {
        togli(id);
        invia();
      }, SECONDI_ANNULLA * 1000);
      setAttesa((a) => ({ ...a, [id]: t }));
    },
    annulla(id: string, torna: () => void) {
      window.clearTimeout(attesa[id]);
      togli(id);
      torna();
    },
  };
}
