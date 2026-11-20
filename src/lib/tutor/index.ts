// Regole del tutor (blocco E, 19/11/2026): funzioni pure, usate dalla Edge Function `spiega`.
// - Il tentativo di Lani prima del primo indizio, e la spiegazione di "Spiegamelo tu": lunghezze da
//   config-gioco.json (tutor).
// - Il tetto giornaliero di chiamate a Claude.
// - Il secondo controllo, lato server, che la risposta non contenga il risultato del compito: Claude
//   scrive a parte i risultati (campo che l'app non vede mai) e qui si cercano nel testo per Lani.
import config from '../../../data/config-gioco.json' with { type: 'json' };

export const TUTOR = config.tutor;

/** Testo pulito di Lani: spazi ripetuti via, null se troppo corto; tagliato al massimo. */
export function testoDiLani(testo: unknown, min: number, max: number): string | null {
  if (typeof testo !== 'string') return null;
  const t = testo.replace(/\s+/g, ' ').trim();
  return t.length >= min ? t.slice(0, max) : null;
}

export const tettoRaggiunto = (usate: number, tetto = TUTOR.chiamate_al_giorno) => usate >= tetto;

/** Minuscole, senza accenti, virgola decimale come punto, niente spazi attorno ai simboli. */
export function normalizza(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/\s*([=+\-×*:/÷^])\s*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Il testo contiene uno dei risultati? Confronto per parola intera: "5" non si trova in "45" né in
 * "1.5", "3/4" non in "13/45"; le frasi si cercano intere. Risultati vuoti si ignorano. */
export function contieneRisultato(testo: string, risultati: readonly string[]): boolean {
  const t = normalizza(testo);
  return risultati.some((r) => {
    const n = normalizza(String(r ?? ''));
    if (!n) return false;
    return new RegExp(`(?<![a-z0-9]|[0-9][./])${escape(n)}(?![a-z0-9]|[./][0-9])`).test(t);
  });
}

export type Aiuto = { spiegazione: string; indizi: string[]; risultati: string[] };

/** Cosa si può mostrare a Lani di una risposta dell'IA: gli indizi con il risultato si scartano;
 * se il risultato è nella spiegazione, o in tutti gli indizi, la risposta non va (da rifare). */
export function controllaAiuto(a: Aiuto): { va: boolean; indizi: string[]; scartati: number } {
  const risultati = (a.risultati ?? []).filter((r) => typeof r === 'string' && r.trim());
  const indizi = (a.indizi ?? []).filter((x) => !contieneRisultato(x, risultati));
  const scartati = (a.indizi ?? []).length - indizi.length;
  const va = !contieneRisultato(a.spiegazione ?? '', risultati) && indizi.length > 0;
  return { va, indizi, scartati };
}
