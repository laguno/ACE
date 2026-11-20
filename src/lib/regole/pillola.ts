/**
 * Pillola di ripasso (piano studio del 19/11/2026, blocco B): 8-12 carte in scadenza, mescolate
 * tra argomenti diversi; le carte mai viste vanno a blocco all'inizio, raggruppate per argomento
 * (la prima volta si impara, poi si mescola). Numeri da config-gioco.json, ripasso.pillola.
 */
import config from '../../../data/config-gioco.json' with { type: 'json' };

const P = config.ripasso.pillola;

export type CartaPillola = {
  id: string;
  materia_id: string | null;
  argomento: string;
  ripetizioni: number;
  prossima_revisione: string;
};

const chiaveArgomento = (c: CartaPillola) => `${c.materia_id ?? ''}|${c.argomento}`;

/** Alterna gli argomenti: una carta per argomento a turno, così due carte vicine non sono dello stesso. */
function alterna<T extends CartaPillola>(carte: T[]): T[] {
  const gruppi = new Map<string, T[]>();
  for (const c of carte) gruppi.set(chiaveArgomento(c), [...(gruppi.get(chiaveArgomento(c)) ?? []), c]);
  const file = [...gruppi.values()];
  const fuori: T[] = [];
  while (file.some((f) => f.length))
    for (const f of file) {
      const c = f.shift();
      if (c) fuori.push(c);
    }
  return fuori;
}

/**
 * Compone la pillola dalle carte in scadenza (già ordinate per urgenza). Le più urgenti entrano
 * prima, ma se in cima c'è un solo argomento si pesca anche da un altro.
 */
export function componiPillola<T extends CartaPillola>(scadute: T[], quante: number = P.carte_max): T[] {
  const n = Math.max(0, Math.min(quante, scadute.length));
  if (!n) return [];
  const scelte = scadute.slice(0, n);
  const argomenti = new Set(scelte.map(chiaveArgomento));
  if (argomenti.size < P.argomenti_minimi) {
    const altra = scadute.slice(n).find((c) => !argomenti.has(chiaveArgomento(c)));
    if (altra) scelte[scelte.length - 1] = altra;
  }
  const nuove = scelte.filter((c) => !c.ripetizioni);
  const viste = scelte.filter((c) => !!c.ripetizioni);
  nuove.sort((a, b) => chiaveArgomento(a).localeCompare(chiaveArgomento(b)));
  return [...nuove, ...alterna(viste)];
}
