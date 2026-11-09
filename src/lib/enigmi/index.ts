// Enigmi dei forzieri (data/enigmi.json): le parti meccaniche le fa il codice, non l'IA, così non
// sbagliano mai: cifrare, fare i calcoli, mescolare le lettere, costruire la griglia, comporre la
// parola della cima. L'IA scrive i testi; qui si assembla e si controlla. Funzioni pure, con test.

/** Generatore pseudo-casuale con seme (stesso seme, stesso enigma): mulberry32. */
export function casuale(seme: number) {
  let s = seme >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Rng = () => number;
const scegli = <T>(rng: Rng, lista: T[]) => lista[Math.floor(rng() * lista.length)];

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Maiuscole senza accenti ("Perché" -> "PERCHE"): le lettere del biglietto sono solo A-Z. */
export function pulisci(testo: string): string {
  return testo.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, "'").toUpperCase();
}
export const soloLettere = (testo: string) => pulisci(testo).replace(/[^A-Z]/g, '');

/** Codice segreto: ogni lettera spostata avanti di k (Z torna ad A); il resto resta com'è. */
export function cifra(testo: string, k = 1): string {
  return pulisci(testo).replace(/[A-Z]/g, (c) => ALFABETO[(ALFABETO.indexOf(c) + k + 26) % 26]);
}

/** La striscia dell'alfabeto per decifrare (spostamento di una): due righe da 13, larghezza 25. */
export function striscia(k = 1): string {
  const righe: string[] = [];
  for (const parte of [0, 13]) {
    const vere = ALFABETO.slice(parte, parte + 13).split('');
    righe.push(vere.map((c) => ALFABETO[(ALFABETO.indexOf(c) + k) % 26]).join(' '), vere.map(() => '|').join(' '), vere.join(' '));
    if (!parte) righe.push('');
  }
  return righe.join('\n');
}

/** Valore di una lettera: A=1 ... Z=26. */
export const valore = (c: string) => ALFABETO.indexOf(c) + 1;
const APICI: Record<string, string> = { 2: '²', 3: '³' };
const mcd = (a: number, b: number): number => (b ? mcd(b, a % b) : a);

/** Un calcolo da seconda media che fa v: potenza più o meno qualcosa, frazione di, percentuale di, radice. */
export function calcolo(v: number, rng: Rng, tipo?: 'potenza' | 'frazione' | 'percentuale' | 'radice'): string {
  const tipi = ['potenza', 'frazione', 'percentuale', 'radice'] as const;
  const t = tipo ?? scegli(rng, [...tipi]);
  if (t === 'potenza') {
    const opzioni: string[] = [];
    for (const b of [2, 3])
      for (let a = 2; a <= 5; a++) {
        const c = v - a ** b;
        if (c !== 0 && Math.abs(c) <= 12) opzioni.push(`${a}${APICI[b]} ${c > 0 ? '+' : '−'} ${Math.abs(c)}`);
      }
    if (opzioni.length) return scegli(rng, opzioni);
  }
  if (t === 'frazione' || t === 'potenza') {
    const opzioni: string[] = [];
    for (const d of [2, 3, 4, 5, 6, 8])
      for (let n = 1; n < d; n++) if (mcd(n, d) === 1 && (v * d) % n === 0) opzioni.push(`${n}/${d} di ${(v * d) / n}`);
    if (opzioni.length) return scegli(rng, opzioni);
  }
  if (t === 'percentuale') {
    const opzioni = [10, 20, 25, 50, 75].filter((p) => (v * 100) % p === 0).map((p) => `il ${p}% di ${(v * 100) / p}`);
    if (opzioni.length) return scegli(rng, opzioni);
  }
  return `√${v * v}`;
}

/** Calcolo -> numero, per i test e per il controllo prima di salvare. */
export function risolviCalcolo(espressione: string): number {
  const e = espressione.trim();
  let m = e.match(/^(\d+)([²³]) ([+−]) (\d+)$/);
  if (m) return Number(m[1]) ** (m[2] === '²' ? 2 : 3) + (m[3] === '+' ? 1 : -1) * Number(m[4]);
  m = e.match(/^(\d+)\/(\d+) di (\d+)$/);
  if (m) return (Number(m[1]) * Number(m[3])) / Number(m[2]);
  m = e.match(/^il (\d+)% di (\d+)$/);
  if (m) return (Number(m[1]) * Number(m[2])) / 100;
  m = e.match(/^√(\d+)$/);
  if (m) return Math.sqrt(Number(m[1]));
  throw new Error(`calcolo sconosciuto: ${e}`);
}

/** Codice matematico: un calcolo per lettera, a tipi alterni; righe numerate per il biglietto. */
export function calcoli(parola: string, rng: Rng): string[] {
  const tipi = ['potenza', 'frazione', 'percentuale', 'radice'] as const;
  const inizio = Math.floor(rng() * 4);
  return soloLettere(parola)
    .split('')
    .map((c, i) => calcolo(valore(c), rng, tipi[(inizio + i) % 4]));
}

/** Anagramma: le lettere mescolate (mai nell'ordine giusto), separate da spazi. */
export function anagramma(parola: string, rng: Rng): string {
  const lettere = soloLettere(parola).split('');
  for (let giro = 0; giro < 50; giro++) {
    const m = [...lettere];
    for (let i = m.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [m[i], m[j]] = [m[j], m[i]];
    }
    if (m.join('') !== lettere.join('')) return m.join(' ');
  }
  return [...lettere].reverse().join(' ');
}
export const stesseLettere = (a: string, b: string) => soloLettere(a).split('').sort().join('') === soloLettere(b).split('').sort().join('');

/**
 * Griglia tipo battaglia navale: ogni lettera del messaggio c'è una volta sola, le altre caselle
 * hanno lettere che nel messaggio non ci sono; coordinate "colonna+riga" (B4) parola per parola.
 */
export function griglia(messaggio: string, rng: Rng, lato = 6): { griglia: string; coordinate: string[][] } {
  const parole = pulisci(messaggio).split(/[^A-Z]+/).filter(Boolean);
  const servono = [...new Set(parole.join(''))];
  if (servono.length > lato * lato) throw new Error('messaggio troppo vario per la griglia');
  const riempitivi = ALFABETO.split('').filter((c) => !servono.includes(c));
  const caselle = Array.from({ length: lato * lato }, (_, i) => i);
  for (let i = caselle.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [caselle[i], caselle[j]] = [caselle[j], caselle[i]];
  }
  const celle: string[] = Array(lato * lato).fill('');
  const dove = new Map<string, number>();
  servono.forEach((c, i) => {
    celle[caselle[i]] = c;
    dove.set(c, caselle[i]);
  });
  for (let i = 0; i < celle.length; i++) if (!celle[i]) celle[i] = scegli(rng, riempitivi);
  const colonne = ALFABETO.slice(0, lato).split('');
  const testo = ['   ' + colonne.join(' '), ...Array.from({ length: lato }, (_, r) => `${r + 1}  ${celle.slice(r * lato, r * lato + lato).join(' ')}`)].join('\n');
  const coordinate = parole.map((p) => p.split('').map((c) => `${colonne[dove.get(c)! % lato]}${Math.floor(dove.get(c)! / lato) + 1}`));
  return { griglia: testo, coordinate };
}

/** Legge le coordinate sulla griglia (controllo prima di salvare). */
export function leggiGriglia(testo: string, coordinate: string[][]): string {
  const righe = testo.split('\n').slice(1).map((r) => r.slice(3).split(' '));
  return coordinate.map((p) => p.map((c) => righe[Number(c.slice(1)) - 1][ALFABETO.indexOf(c[0])]).join('')).join(' ');
}

/** Acrostico: le iniziali delle righe (per controllare che formino la parola). */
export const iniziali = (righe: string[]) => righe.map((r) => soloLettere(r)[0] ?? '').join('');

/**
 * Cima: una lettera da ciascuna delle parole dei forzieri 1-8 forma la parola finale. Prova le
 * parole candidate (lunghe quante le parole date) e restituisce la prima che si può comporre, con
 * per ogni lettera il forziere e la posizione.
 */
export function cima(parole: string[], candidate: string[]): { parola: string; mappa: { forziere: number; posizione: number }[] } | null {
  const pulite = parole.map(soloLettere);
  for (const candidata of candidate.map(soloLettere).filter((c) => c.length === pulite.length)) {
    const usati = new Set<number>();
    const mappa: { forziere: number; posizione: number }[] = [];
    const prova = (i: number): boolean => {
      if (i === candidata.length) return true;
      for (let f = 0; f < pulite.length; f++) {
        if (usati.has(f)) continue;
        const p = pulite[f].indexOf(candidata[i]);
        if (p < 0) continue;
        usati.add(f);
        mappa[i] = { forziere: f + 1, posizione: p + 1 };
        if (prova(i + 1)) return true;
        usati.delete(f);
      }
      return false;
    };
    if (prova(0)) return { parola: candidata, mappa };
  }
  return null;
}

/** Righe della tabella della cima, per il biglietto. */
export const righeCima = (mappa: { forziere: number; posizione: number }[]) =>
  mappa.map((m, i) => `${String(i + 1).padStart(2)}ª lettera: forziere ${m.forziere}, la ${m.posizione}ª`);
