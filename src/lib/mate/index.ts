// Esercizi di matematica (blocco F del piano di studio, 19/11): serie mescolate, esempi svolti che
// si svuotano e modello a barre. Funzioni pure: le usano la schermata (src/Matematica.tsx) e la
// funzione genera-mate (controllo di quello che scrive l'IA).
//
// Le idee, dalle evidenze:
// - pratica mescolata (interleaving): problemi di tipi diversi nella stessa serie, così si sceglie
//   il metodo e non si ripete a memoria lo stesso gesto;
// - esempi svolti che si svuotano (backward fading): prima l'esempio completo, poi manca l'ultimo
//   passaggio, poi gli ultimi due, fino al problema intero;
// - tentativo prima della soluzione: la soluzione arriva solo dopo una risposta.

export type Passaggio = {
  /** cosa si fa, in parole: "Trovo quanto vale una parte" */
  cosa: string;
  /** il conto: "48 : 4" */
  calcolo: string;
  /** il risultato del passaggio: "12" */
  risultato: string;
};

export type Segmento = {
  /** quello che si scrive dentro il pezzo: "12", "?" o vuoto */
  testo: string;
  /** lunghezza in parti uguali: così le barre si allineano */
  parti: number;
  /** il pezzo che si cerca: si colora */
  incognita: boolean;
};

export type Barra = { nome: string; segmenti: Segmento[] };

/** Modello a barre (Singapore): barre una sotto l'altra, graffa del totale a destra. */
export type Barre = { barre: Barra[]; totale: string };

export type Problema = {
  /** il metodo, in due o tre parole: "percentuale", "frazione di un numero" */
  metodo: string;
  /** perché si usa quel metodo, una frase: lo legge chi sceglie il metodo sbagliato */
  perche_metodo: string;
  testo: string;
  passaggi: Passaggio[];
  risposta: string;
  unita: string;
  /** vuoto (nessuna barra) per i problemi che non sono a parole */
  barre: Barre;
};

/** Un problema già risolto da Lani, quello che si salva in mate_tentativi.dettaglio. */
export type Esito = {
  metodo: string;
  /** quanti passaggi c'erano da completare (0 = esempio svolto) */
  livello: number;
  /** tutti i vuoti giusti senza vedere la soluzione */
  giusto: boolean;
  /** metodo scelto giusto; null se la scelta non c'era */
  metodo_giusto: boolean | null;
};

/** Oltre questo si fa il problema intero (ogni problema ha da 2 a 4 passaggi). */
export const LIVELLO_MASSIMO = 4;
/** Tentativi per ogni vuoto prima di vedere la soluzione. */
export const TENTATIVI = 2;

// ------------------------------------------------------------------ risposte

const MIGLIAIA = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/;

/** Il numero dentro una risposta scritta a mano: "1.500", "2,5", "3/4", "12 : 4", "30%", "15 cm". */
export function numero(testo: string): number | null {
  let t = testo.trim().toLowerCase().replace(/\s+/g, '').replace(/[€%°]/g, '').replace(/[a-z²³]+$/, '');
  if (MIGLIAIA.test(t)) t = t.replace(/\./g, '');
  t = t.replace(',', '.');
  const frazione = t.match(/^(-?\d+(?:\.\d+)?)[/:](\d+(?:\.\d+)?)$/);
  if (frazione) {
    const d = Number(frazione[2]);
    return d === 0 ? null : Number(frazione[1]) / d;
  }
  if (!/^-?(\d+(\.\d*)?|\.\d+)$/.test(t)) return null;
  return Number(t);
}

const pulito = (t: string) => t.trim().toLowerCase().replace(/\s+/g, '').replace(',', '.');

/** Risposta giusta? Numeri con un po' di tolleranza (2/3 e 0,67 vanno bene), il resto a parole. */
export function giusta(inserita: string, attesa: string): boolean {
  if (!inserita.trim()) return false;
  const a = numero(attesa);
  const b = numero(inserita);
  if (a !== null) return b !== null && Math.abs(a - b) <= Math.max(0.005, Math.abs(a) * 1e-6);
  return pulito(inserita) === pulito(attesa);
}

// ------------------------------------------------------------------ svuotamento

/**
 * Livello di ogni metodo dallo storico (dal più vecchio): parte da 0 (esempio completo), sale di
 * uno a ogni problema giusto al livello raggiunto, scende di uno dopo due sbagliati di fila.
 */
export function livelli(storia: Esito[]): Record<string, number> {
  const l: Record<string, number> = {};
  const sbagliati: Record<string, number> = {};
  for (const e of storia) {
    const ora = l[e.metodo] ?? 0;
    if (e.giusto) {
      sbagliati[e.metodo] = 0;
      if (e.livello >= ora) l[e.metodo] = Math.min(e.livello + 1, LIVELLO_MASSIMO);
    } else if (e.livello > 0) {
      sbagliati[e.metodo] = (sbagliati[e.metodo] ?? 0) + 1;
      if (sbagliati[e.metodo] >= 2) {
        l[e.metodo] = Math.max(ora - 1, 0);
        sbagliati[e.metodo] = 0;
      }
    }
  }
  return l;
}

/** Passaggi da completare per questo problema: tutti = problema intero. */
export const vuoti = (p: Problema, livello: number) => Math.min(livello, p.passaggi.length);

/** Il problema intero: solo il testo e la risposta finale, i passaggi si vedono dopo. */
export const intero = (p: Problema, livello: number) => vuoti(p, livello) >= p.passaggi.length;

// ------------------------------------------------------------------ serie mescolata

/**
 * Ordine della serie: mai due problemi dello stesso metodo di fila, finché si può. A ogni passo
 * il metodo con più problemi rimasti (a parità, quello che compare prima). Stabile.
 */
export function mescola<T extends { metodo: string }>(problemi: T[]): T[] {
  const gruppi = new Map<string, T[]>();
  for (const p of problemi) gruppi.set(p.metodo, [...(gruppi.get(p.metodo) ?? []), p]);
  const fuori: T[] = [];
  let prima: string | undefined;
  while (fuori.length < problemi.length) {
    const scelte = [...gruppi.entries()].filter(([, g]) => g.length);
    const altri = scelte.filter(([m]) => m !== prima);
    const [m, g] = (altri.length ? altri : scelte).reduce((a, b) => (b[1].length > a[1].length ? b : a));
    fuori.push(g.shift() as T);
    prima = m;
  }
  return fuori;
}

/** I metodi della serie, nell'ordine in cui compaiono: le scelte di "Che strada prendi?". */
export const metodi = (problemi: Problema[]) => [...new Set(problemi.map((p) => p.metodo))];

/** La scelta del metodo c'è solo se la serie ne ha almeno due e il problema non è un esempio. */
export const sceltaMetodo = (problemi: Problema[], livello: number) => livello > 0 && metodi(problemi).length >= 2;

// ------------------------------------------------------------------ controllo dell'IA

/**
 * Problema usabile: testo, da 2 a 4 passaggi, l'ultimo risultato uguale alla risposta, barre
 * coerenti (parti positive). Quelli storti si scartano prima di salvarli.
 */
export function problemaValido(p: Problema): boolean {
  if (!p.metodo?.trim() || !p.testo?.trim() || !p.risposta?.trim()) return false;
  if (p.passaggi.length < 2 || p.passaggi.length > LIVELLO_MASSIMO) return false;
  if (p.passaggi.some((s) => !s.cosa.trim() || !s.risultato.trim())) return false;
  if (!giusta(p.passaggi[p.passaggi.length - 1].risultato, p.risposta)) return false;
  return p.barre.barre.every((b) => b.segmenti.length > 0 && b.segmenti.every((s) => s.parti > 0 && s.parti <= 20));
}

/** Serie usabile: almeno 6 problemi validi e almeno 2 metodi, ognuno con almeno 2 problemi. */
export function serieValida(problemi: Problema[]): Problema[] | null {
  const buoni = problemi.filter(problemaValido);
  const conta = new Map<string, number>();
  for (const p of buoni) conta.set(p.metodo, (conta.get(p.metodo) ?? 0) + 1);
  const tenuti = buoni.filter((p) => (conta.get(p.metodo) ?? 0) >= 2);
  return tenuti.length >= 6 && new Set(tenuti.map((p) => p.metodo)).size >= 2 ? mescola(tenuti) : null;
}
