import config from '../../../data/config-dieci-minuti.json' with { type: 'json' };

// Dieci minuti a carte (progetto del 25/11/2026, docs/dieci-minuti.md): regole pure della sessione.
// Durate, carte, esercizi e testi in data/config-dieci-minuti.json. La carta del giorno la fissa il
// server (gira_ruota). La fase si calcola dai secondi passati dall'avvio, così il timer resta giusto
// anche se il telefono spegne lo schermo o mette l'app in sottofondo.

export const DIECI = config;
export type ConfigDieci = typeof config;
export type Esercizio = { id: string; nome: string; come?: string[] };
export type RecordCarta =
  | { tipo: 'numero'; su: string; domanda: string }
  | { tipo: 'scelta'; su: string; domanda: string; valori: string[] }
  | { tipo: 'trick'; domanda: string };
export type Carta = {
  n: number;
  nome: string;
  peso: 'pesante' | 'leggera';
  pesca: 'rotazione' | 'caso';
  figura: string;
  fumetto_lavoro?: string;
  riscaldamento?: Esercizio[];
  esercizi: Esercizio[];
  finale?: Esercizio;
  record: RecordCarta | null;
  visore?: { interruttore: string; figura: string; esercizio: Esercizio; record: RecordCarta | null };
};
export const CARTE = config.carte as Carta[];
export const carta = (n: number): Carta | undefined => CARTE.find((c) => c.n === n);

export type Fase =
  | { tipo: 'riscaldamento'; da: number; a: number }
  | { tipo: 'lavoro'; da: number; a: number; blocco: number }
  | { tipo: 'pausa'; da: number; a: number; blocco: number }
  | { tipo: 'record'; da: number; a: number };

/** La scaletta: riscaldamento, poi per ogni blocco lavoro e pausa, poi il minuto del record. */
export function scaletta(d: ConfigDieci['durate'] = config.durate): Fase[] {
  const fasi: Fase[] = [{ tipo: 'riscaldamento', da: 0, a: d.riscaldamento }];
  let t = d.riscaldamento;
  for (let blocco = 0; blocco < d.blocchi; blocco++) {
    fasi.push({ tipo: 'lavoro', da: t, a: (t += d.lavoro), blocco });
    fasi.push({ tipo: 'pausa', da: t, a: (t += d.pausa), blocco });
  }
  fasi.push({ tipo: 'record', da: t, a: t + d.record });
  return fasi;
}

export const durataTotale = (fasi: Fase[]) => fasi.at(-1)?.a ?? 0;

/** La fase in corso dopo `secondi` dall'avvio, con i secondi che mancano alla sua fine; null a sessione finita. */
export function faseA(fasi: Fase[], secondi: number): { fase: Fase; mancano: number } | null {
  const fase = fasi.find((f) => secondi >= f.da && secondi < f.a);
  return fase ? { fase, mancano: Math.ceil(fase.a - secondi) } : null;
}

/** Mescola (Fisher-Yates) senza toccare l'originale; `caso` restituisce un numero in [0, 1). */
export function mescola<T>(tutti: readonly T[], caso: () => number = Math.random): T[] {
  const mazzo = [...tutti];
  for (let i = mazzo.length - 1; i > 0; i--) {
    const j = Math.floor(caso() * (i + 1));
    [mazzo[i], mazzo[j]] = [mazzo[j], mazzo[i]];
  }
  return mazzo;
}

/**
 * Gli esercizi degli 8 blocchi (decisione del 25/11): con meno di 8 esercizi si ripetono in ordine
 * fisso; nelle carte "caso" se ne pescano 8 diversi in ordine casuale (se fossero meno, si ripetono);
 * carta 3 col visore: Beat Saber per tutti i blocchi.
 */
export function eserciziDellaSessione(c: Carta, visore = false, caso: () => number = Math.random, blocchi = config.durate.blocchi): Esercizio[] {
  const v = visore ? c.visore : undefined;
  if (v) return Array.from({ length: blocchi }, () => v.esercizio);
  const base = c.pesca === 'caso' ? mescola(c.esercizi, caso) : c.esercizi;
  return Array.from({ length: blocchi }, (_, i) => base[i % base.length]);
}

/** Il record della carta (null: nessuno, come la Calma o la carta 3 col visore). */
export function recordDellaCarta(c: Carta, visore = false): RecordCarta | null {
  return visore && c.visore ? c.visore.record : c.record;
}

/** Su cosa si fa il record: per i trick uno a caso fra quelli della sessione, altrimenti quello del config. */
export function suCosa(r: RecordCarta, sessione: readonly Esercizio[], caso: () => number = Math.random): string {
  return r.tipo === 'trick' ? sessione[Math.floor(caso() * sessione.length)].nome : r.su;
}

/**
 * L'esercizio sullo schermo: nel lavoro quello del blocco; nella pausa (e negli ultimi secondi del riscaldamento,
 * lunghi quanto una pausa) quello che arriva, così la prima volta c'è il tempo di leggere "Come si fa".
 */
export function esercizioInVista<T>(fase: Fase, mancano: number, sessione: readonly T[], d = config.durate): { esercizio: T; prossimo: boolean } | null {
  if (fase.tipo === 'lavoro') return { esercizio: sessione[fase.blocco], prossimo: false };
  if (fase.tipo === 'pausa') return fase.blocco + 1 < sessione.length ? { esercizio: sessione[fase.blocco + 1], prossimo: true } : null;
  if (fase.tipo === 'riscaldamento' && mancano <= d.pausa) return { esercizio: sessione[0], prossimo: true };
  return null;
}

/** Il riscaldamento della carta: uguale per tutte (decisione del 25/11), la carta 4 tiene il suo con la palla. */
export const riscaldamentoDi = (c: Carta): Esercizio[] => c.riscaldamento ?? config.riscaldamento;

export type Segnale = 'conto' | 'cambio' | 'avviso' | null;

/**
 * Cosa si sente quando comincia il secondo `mancano` di una fase: "3, 2, 1" (vibrazione corta) negli ultimi
 * secondi di ogni fase prima del record, "cambio" (vibrazione lunga) al primo secondo di ogni fase dopo la
 * prima, "ancora 10 secondi" nel lavoro.
 */
export function segnale(fase: Fase, mancano: number, d = config.durate): Segnale {
  if (fase.da > 0 && mancano === fase.a - fase.da) return 'cambio';
  if (fase.tipo !== 'record' && mancano <= d.conto_alla_rovescia) return 'conto';
  if (fase.tipo === 'lavoro' && mancano === d.avviso) return 'avviso';
  return null;
}

/** Il fumetto dell'allenatore; nel minuto finale senza record (Calma) invita a respirare. */
export function fumetto(fase: Fase | null, mancano: number, c?: Carta, conRecord = true, f = config.fumetti, d = config.durate): string {
  if (!fase) return f.fine;
  if (fase.tipo !== 'record' && mancano <= d.conto_alla_rovescia) return f.cambio;
  if (fase.tipo === 'lavoro' && mancano <= d.avviso) return f.avviso;
  // negli ultimi secondi del riscaldamento arriva il primo esercizio (esercizioInVista): il fumetto lo dice
  if (fase.tipo === 'riscaldamento' && mancano <= d.pausa) return f.arriva;
  if (fase.tipo === 'lavoro') return c?.fumetto_lavoro ?? f.lavoro;
  if (fase.tipo === 'record' && !conRecord) return f.calma;
  return f[fase.tipo];
}

/** Record: si festeggia solo quando batte il migliore salvato (il primo si salva e basta). */
export function esitoRecord(migliore: number | undefined, n: number): 'battuto' | 'primo' | 'resta' {
  if (migliore === undefined) return 'primo';
  return n > migliore ? 'battuto' : 'resta';
}

/** Il valore da mostrare: per la scelta (carta 6) la parola, altrimenti il numero. */
export const mostraRecord = (r: RecordCarta, n: number): string => (r.tipo === 'scelta' ? (r.valori[n] ?? String(n)) : String(n));

/** Carte già uscite nella settimana (lunedì-domenica) dato l'elenco dei giorni girati: per spegnere gli spicchi. */
export function usciteInSettimana(giorni: readonly { data: string; carta: number }[], oggi: string): number[] {
  const g = new Date(`${oggi}T12:00:00Z`);
  const lunedi = new Date(g.getTime() - ((g.getUTCDay() + 6) % 7) * 86400000).toISOString().slice(0, 10);
  return [...new Set(giorni.filter((x) => x.data >= lunedi && x.data <= oggi).map((x) => x.carta))];
}
