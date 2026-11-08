import { supabase } from './supabase';

// Pezzi comuni a Oggi e Sera: la spunta di un compito e il suo aspetto.

export type Compito = { id: string; testo: string; fatto_il: string | null; materie: { nome: string } | null };

export const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
export const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
export const maiuscola = (s: string) => s.replace(/^./, (c) => c.toUpperCase());
export const adesso = () => new Date().toISOString();

export const SELECT_COMPITI = 'id, testo, fatto_il, materie(nome)';

/** La funzione "passi" decide i passi dallo stato del database; l'esito non serve al client. */
export async function passi(tipo: string, id: string) {
  await supabase.functions.invoke('passi', { body: { tipo, id } });
}

export function RigaCompito({ c, numero, onSpunta }: { c: Compito; numero?: number; onSpunta: () => void }) {
  return (
    <li>
      <label>
        <input type="checkbox" checked={!!c.fatto_il} disabled={!!c.fatto_il} onChange={onSpunta} />
        <span>
          {numero !== undefined && <span className="numero">{numero}</span>}
          <b>{c.materie?.nome ?? 'Compito'}</b>: {c.testo}
        </span>
      </label>
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
