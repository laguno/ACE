/**
 * Ripasso distanziato con FSRS-5 (piano studio del 19/11/2026, blocco A).
 *
 * Funzioni pure, a giorni interi: nessun passo di apprendimento in minuti, la carta torna al
 * più presto il giorno dopo (o nella stessa pillola, se sbagliata). Stessa forma di ts-fsrs
 * (voti 1-4, stabilità, difficoltà) così si può passare alla libreria senza cambiare il resto.
 * Numeri da data/config-gioco.json, sezione "ripasso".
 */
import config from '../../../data/config-gioco.json' with { type: 'json' };

const C = config.ripasso;
const W = C.pesi_fsrs;
const DECADIMENTO = -0.5;
const FATTORE = 19 / 81; // con questo valore R(S, S) = 0,9

/** 1 = Di nuovo, 2 = Difficile, 3 = Bene, 4 = Facile. */
export type Voto = 1 | 2 | 3 | 4;
export type Sicurezza = 'sicura' | 'forse' | 'non_lo_so';

export type StatoCarta = {
  stabilita: number;
  difficolta: number;
  ripetizioni: number;
  cadute: number;
  /** Ultimo ripasso, 'YYYY-MM-DD'. */
  ultima: string;
};

/**
 * Voto per l'algoritmo da risposta + sicurezza detta prima di girare la carta.
 * Sbagliata = Di nuovo (sovrastima se era "sicura"); giusta e sicura = Bene; giusta ma
 * "forse" o "non lo so" = Difficile. Facile non si usa: Lani non lo sceglie mai.
 */
export function votoDa(giusta: boolean, sicurezza: Sicurezza): { voto: Voto; sovrastima: boolean } {
  if (!giusta) return { voto: 1, sovrastima: sicurezza === 'sicura' };
  return { voto: sicurezza === 'sicura' ? 3 : 2, sovrastima: false };
}

/** Esito delle flash card di oggi (sapevo / quasi / non sapevo) senza sicurezza. */
export function votoDaEsito(esito: 'sapevo' | 'quasi' | 'non_sapevo'): Voto {
  return esito === 'sapevo' ? 3 : esito === 'quasi' ? 2 : 1;
}

/**
 * Flash card: la sicurezza si dice prima di girare, l'esito dopo. "Non sapevo" è sbagliata;
 * "quasi" è giusta a metà (Difficile anche se era sicura); "sapevo" segue la sicurezza.
 */
export function votoDaCarta(esito: 'sapevo' | 'quasi' | 'non_sapevo', sicurezza: Sicurezza): { voto: Voto; giusta: boolean; sovrastima: boolean } {
  if (esito === 'non_sapevo') return { ...votoDa(false, sicurezza), giusta: false };
  if (esito === 'quasi') return { voto: 2, giusta: true, sovrastima: false };
  return { ...votoDa(true, sicurezza), giusta: true };
}

/**
 * Con una verifica in calendario la carta deve tornare prima della data: intervallo massimo
 * = giorni che mancano meno uno (il giorno prima c'è il ripasso cumulativo). Senza verifica, o
 * già passata, vale il massimo normale.
 */
export function massimoPerVerifica(oggi: string, verifica: string | null | undefined): number {
  if (!verifica) return C.intervallo_massimo_giorni;
  const mancano = giorni(oggi, verifica);
  if (mancano <= 0) return C.intervallo_massimo_giorni;
  return limita(mancano - 1, 1, C.intervallo_massimo_giorni);
}

const limita = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));

function giorni(da: string, a: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${da}T00:00:00Z`)) / 86_400_000);
}

function aggiungi(giorno: string, n: number): string {
  const d = new Date(`${giorno}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Probabilità di ricordare dopo t giorni con stabilità s. */
export function ricordo(t: number, s: number): number {
  return Math.pow(1 + (FATTORE * t) / s, DECADIMENTO);
}

/** Giorni fino al prossimo ripasso per tenere la ritenzione voluta, tra 1 e il massimo. */
export function intervallo(s: number, massimo: number = C.intervallo_massimo_giorni): number {
  const t = (s / FATTORE) * (Math.pow(C.ritenzione, 1 / DECADIMENTO) - 1);
  return limita(Math.round(t), 1, massimo);
}

const difficoltaIniziale = (v: Voto) => W[4] - Math.exp(W[5] * (v - 1)) + 1;

function nuovaDifficolta(d: number, v: Voto): number {
  const passo = -W[6] * (v - 3);
  const smorzata = d + (passo * (10 - d)) / 9;
  return limita(W[7] * difficoltaIniziale(4) + (1 - W[7]) * smorzata, 1, 10);
}

function stabilitaRicordo(d: number, s: number, r: number, v: Voto): number {
  const difficile = v === 2 ? W[15] : 1;
  const facile = v === 4 ? W[16] : 1;
  return s * (Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * difficile * facile + 1);
}

function stabilitaCaduta(d: number, s: number, r: number): number {
  const nuova = W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));
  return Math.min(nuova, s);
}

/**
 * Un ripasso: nuovo stato e giorno del prossimo. `massimo` accorcia l'intervallo (per esempio
 * quando c'è una verifica in calendario); `stato` null = carta mai vista.
 */
export function ripassa(
  stato: StatoCarta | null,
  voto: Voto,
  oggi: string,
  massimo: number = C.intervallo_massimo_giorni,
): { stato: StatoCarta; prossima: string; giorni: number } {
  let s: number;
  let d: number;
  if (!stato) {
    s = W[voto - 1];
    d = limita(difficoltaIniziale(voto), 1, 10);
  } else {
    const t = Math.max(0, giorni(stato.ultima, oggi));
    d = nuovaDifficolta(stato.difficolta, voto);
    if (t === 0) {
      s = stato.stabilita * Math.exp(W[17] * (voto - 3 + W[18]));
    } else {
      const r = ricordo(t, stato.stabilita);
      s = voto === 1 ? stabilitaCaduta(stato.difficolta, stato.stabilita, r) : stabilitaRicordo(stato.difficolta, stato.stabilita, r, voto);
    }
  }
  s = Math.max(0.1, s);
  const n = voto === 1 ? 1 : intervallo(s, Math.max(1, massimo));
  return {
    stato: {
      stabilita: s,
      difficolta: d,
      ripetizioni: (stato?.ripetizioni ?? 0) + 1,
      cadute: (stato?.cadute ?? 0) + (voto === 1 && stato ? 1 : 0),
      ultima: oggi,
    },
    prossima: aggiungi(oggi, n),
    giorni: n,
  };
}

/**
 * Carta da riprendere insieme ai genitori: troppe cadute, esce dal giro automatico.
 * cadute_da_riprendere 0 = mai (decisione del signore, 20/11/2026): la carta resta sempre nel giro.
 */
export function daRiprendere(stato: StatoCarta | null, soglia: number = C.cadute_da_riprendere): boolean {
  return soglia > 0 && (stato?.cadute ?? 0) >= soglia;
}
