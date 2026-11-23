import { useState } from 'react';
import { Check, Lightbulb } from '@phosphor-icons/react';
import { supabase } from './supabase';
import { avvisaPassi } from './datiSettimana';
import { senti } from './sensi';

// Pezzi comuni a Oggi e Sera: la spunta di un compito e il suo aspetto.

export type Compito = { id: string; testo: string; fatto_il: string | null; scadenza_spostata?: string | null; materie: { nome: string } | null };

export const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
export const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
export const maiuscola = (s: string) => s.replace(/^./, (c) => c.toUpperCase());
export const adesso = () => new Date().toISOString();

/**
 * Prova (revisione del 16/11, approvata dal signore): i "+N" in testa alle carte di Oggi e Sera si vedono solo
 * dopo il primo gesto fatto in quella carta, non prima. I numeri non cambiano. Per spegnerla: false
 * (tornano sempre in vista, come prima).
 */
export const VALORE_DOPO_IL_GESTO = true;
export const mostraValore = (gestoFatto: boolean) => !VALORE_DOPO_IL_GESTO || gestoFatto;

export const SELECT_COMPITI = 'id, testo, fatto_il, scadenza_spostata, materie(nome)';

/** La funzione "passi" decide i passi dallo stato del database; restituisce quanti ne ha dati. */
export async function passi(tipo: string, id: string): Promise<number> {
  const { data } = await supabase.functions.invoke('passi', { body: { tipo, id } });
  avvisaPassi();
  return data?.passi ?? 0;
}

/** Compito spostato dai genitori alla lezione dopo un giorno a casa (docs/02, Assenze). */
const SPOSTATO = 'Spostato: eri a casa';

export function RigaCompito({ c, numero, nota, onSpunta, onAiuto, onAnnulla, valore }: {
  c: Compito;
  numero?: number;
  /** riga piccola sotto il testo (es. "Inizia da qui: è il più lungo") */
  nota?: string;
  onSpunta: () => void;
  onAiuto?: () => void;
  /** presente nei 5 secondi dopo la spunta */
  onAnnulla?: () => void;
  /** passi della spunta: "+N" che sale subito dopo il gesto */
  valore?: number;
}) {
  // appena spuntato (i 5 secondi dell'Annulla): il cerchio si riempie con un rimbalzo e il "+N" sale
  const appena = !!onAnnulla && !!c.fatto_il;
  return (
    <li className={[onAiuto || onAnnulla ? 'con-aiuto' : '', appena ? 'appena' : ''].filter(Boolean).join(' ') || undefined}>
      <label className="numerata">
        {appena && valore ? (
          <span className="spunta-piu" aria-hidden>
            +{valore}
          </span>
        ) : null}
        <input type="checkbox" checked={!!c.fatto_il} disabled={!!c.fatto_il} onChange={onSpunta} />
        {/* un solo bersaglio per Pomeriggio e Sera: il cerchio fa da casella, con la spunta diventa ✓;
            nel pomeriggio dentro c'è il numero dell'ordine */}
        <span className="bollino" aria-hidden>
          {c.fatto_il ? <Check size={18} weight="bold" /> : numero}
        </span>
        <span>
          <b>{c.materie?.nome ?? 'Compito'}</b>: {c.testo}
          {(nota ?? (c.scadenza_spostata && SPOSTATO)) && <small className="nota-riga">{nota ?? SPOSTATO}</small>}
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
const SECONDI_ANNULLA = 5;
export function useAnnulla() {
  const [attesa, setAttesa] = useState<Record<string, number>>({});
  const togli = (id: string) => setAttesa(({ [id]: _, ...resto }) => resto);
  return {
    inAttesa: (id: string) => id in attesa,
    avvia(id: string, invia: () => void) {
      // ogni spunta passa di qui: tic e vibrazione minuscoli dicono "presa" (sensi.ts; niente vibrazione
      // su iPhone e iPad, che non vibrano, né col movimento ridotto)
      senti('spunta');
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
