/**
 * Regole di gioco di ACE: passi, tappe, chiavi, forzieri, rimonta, bandierina.
 *
 * Funzioni pure, senza accesso al database: ricevono i fatti e restituiscono numeri.
 * Tutti i valori arrivano da data/config-gioco.json (unica fonte, approvata dal signore
 * il 7 novembre 2026). Per ritarare il gioco si cambia il JSON, non questo file.
 */
import config from '../../../data/config-gioco.json';

export type Config = typeof config;
export const CONFIG: Config = config;

// ---------------------------------------------------------------- percorso e tappe

/** Soglie cumulative: soglie[i] = passi per completare la tappa i+1. */
export function soglieTappe(costi: number[] = CONFIG.percorso.costi_tappe): number[] {
  const out: number[] = [];
  let tot = 0;
  for (const c of costi) {
    tot += c;
    out.push(tot);
  }
  return out;
}

export interface PosizionePercorso {
  /** Tappe completate (0..27). */
  tappeFatte: number;
  /** Passi necessari per la prossima tappa (0 se in cima). */
  mancanoPassi: number;
  /** Frazione della tappa in corso già percorsa, 0..1. */
  avanzamentoTappa: number;
  inCima: boolean;
}

export function posizione(passi: number, costi: number[] = CONFIG.percorso.costi_tappe): PosizionePercorso {
  const s = soglieTappe(costi);
  let tappeFatte = 0;
  while (tappeFatte < s.length && passi >= s[tappeFatte]) tappeFatte++;
  if (tappeFatte >= s.length) return { tappeFatte: s.length, mancanoPassi: 0, avanzamentoTappa: 1, inCima: true };
  const inizio = tappeFatte === 0 ? 0 : s[tappeFatte - 1];
  const costo = costi[tappeFatte];
  return {
    tappeFatte,
    mancanoPassi: s[tappeFatte] - passi,
    avanzamentoTappa: (passi - inizio) / costo,
    inCima: false,
  };
}

// ---------------------------------------------------------------- forzieri

export type StatoForziere = 'lontano' | 'enigma' | 'mancano_chiavi' | 'aperto';

/**
 * Stato di un forziere.
 * - L'enigma compare quando manca l'ultima tappa prima del forziere.
 * - Arrivata alla tappa, si apre se le chiavi totali raccolte bastano; altrimenti aspetta.
 * Le chiavi non si spendono: il numero sul lucchetto è un traguardo di chiavi totali.
 */
export function statoForziere(n: number, passi: number, chiaviTotali: number): StatoForziere {
  const f = CONFIG.forzieri.find((x) => x.n === n);
  if (!f) throw new Error(`Forziere ${n} inesistente`);
  const { tappeFatte } = posizione(passi);
  if (tappeFatte >= f.tappa) return chiaviTotali >= f.chiavi ? 'aperto' : 'mancano_chiavi';
  if (tappeFatte === f.tappa - 1) return 'enigma';
  return 'lontano';
}

// ---------------------------------------------------------------- passi delle singole azioni

const P = CONFIG.passi;

/** Compito fatto: 10 passi, 13 se fatto almeno due giorni prima della scadenza. */
export function passiCompito(scadenza: Date, fattoIl: Date): number {
  const giorni = Math.floor((startOfDay(scadenza).getTime() - startOfDay(fattoIl).getTime()) / 86_400_000);
  const base = P.obbligatori.compiti;
  return giorni >= P.compiti_anticipo.giorni_prima_min ? Math.round(base * P.compiti_anticipo.moltiplicatore) : base;
}

/**
 * Quiz a scalare sullo stesso argomento.
 * tentativo: 1, 2, 3, 4... (dal quarto vale sempre 1 passo).
 */
export function passiQuiz(tentativo: number, giuste: number, totale: number): number {
  if (tentativo < 1 || totale <= 0) return 0;
  const tab = P.studio_facoltativo.quiz.tentativi as Record<string, number[]>;
  const riga = tentativo >= 4 ? tab['4+'] : tab[String(tentativo)];
  const bravo = giuste / totale >= P.studio_facoltativo.quiz.soglia_giuste;
  return bravo ? riga[0] : riga[1];
}

export type TipoStudio = 'flashcard' | 'video' | 'quiz';

/**
 * Lo studio facoltativo dà passi solo con i compiti del giorno spuntati
 * e solo fino a 4 attività al giorno per tipo (le successive valgono 0).
 */
export function studioConta(tipo: TipoStudio, giaFatteOggi: number, compitiSpuntati: boolean): boolean {
  const s = P.studio_facoltativo;
  if (s.richiede_compiti_spuntati && !compitiSpuntati) return false;
  return giaFatteOggi < s.max_al_giorno_per_tipo;
}

/** Gesti di casa dati dai genitori: +2 ciascuno, tetto 6 al giorno. */
export function passiGestiCasa(voci: Array<keyof typeof P.gesti_casa.voci>): number {
  const tot = voci.reduce((a, v) => a + (P.gesti_casa.voci[v] ?? 0), 0);
  return Math.min(tot, P.gesti_casa.tetto_giornaliero);
}

export interface Voto {
  voto: number;
  /** Voto precedente nella stessa materia, se c'è. */
  precedente?: number;
  /** true se il voto precedente nella materia era insufficiente. */
  precedenteInsufficiente?: boolean;
}

/** Bonus di un voto. Nessun voto toglie passi. */
export function passiVoto({ voto, precedente, precedenteInsufficiente }: Voto): number {
  const v = P.voti;
  let b = voto >= 9 ? v['9-10'] : voto >= 8 ? v['8'] : voto >= 7 ? v['7'] : 0;
  if (precedente !== undefined && voto > precedente && voto >= 6) b += v.migliorato_almeno_6;
  if (precedenteInsufficiente && voto >= 6) b += v.recupero_dopo_insufficienza;
  return b;
}

// ---------------------------------------------------------------- chiavi della settimana

export interface SettimanaObbligatori {
  /** Passi obbligatori possibili nella settimana (compiti, cartella, borsa, fogli, ripasso, dieci minuti). */
  passiPossibili: number;
  passiFatti: number;
  /** Numero di cose obbligatorie possibili e fatte. */
  cosePossibili: number;
  coseFatte: number;
  /** Note (didattiche o disciplinari) ricevute nella settimana. */
  note: number;
}

/** 0..3 chiavi, contate la domenica sera solo sulle cose obbligatorie. */
export function chiaviSettimana(s: SettimanaObbligatori): number {
  if (s.passiPossibili <= 0) return 0;
  if (s.passiFatti < 0.7 * s.passiPossibili) return 0;
  if (s.note > 0) return 1;
  if (s.cosePossibili > 0 && s.coseFatte >= 0.95 * s.cosePossibili) return 3;
  return 2;
}

// ---------------------------------------------------------------- bandierina e rimonta

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function iso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function giornoDiScuola(d: Date): boolean {
  const g = d.getDay();
  if (g === 0 || g === 6) return false;
  const s = iso(d);
  return !CONFIG.calendario.vacanze.some(([a, b]) => s >= a && s <= b);
}

/** Peso di un giorno per la bandierina: 0 se non c'è scuola. */
function pesoGiorno(d: Date, rEvolutionDa: string): number {
  if (!giornoDiScuola(d)) return 0;
  const b = CONFIG.calendario.bandierina;
  return iso(d) >= rEvolutionDa ? b.peso_giorno_dopo_r_evolution : b.peso_giorno_prima_r_evolution;
}

/**
 * Passi a cui si trova la bandierina alla fine del giorno `oggi`.
 * Avanza solo nei giorni di scuola, si ferma in vacanza e arriva in cima l'ultimo giorno.
 */
export function bandierina(
  oggi: Date,
  totale: number = CONFIG.percorso.totale_passi,
  rEvolutionDa: string = CONFIG.periodo.r_evolution_da,
): number {
  const inizio = new Date(CONFIG.periodo.inizio + 'T00:00:00');
  const fine = new Date(CONFIG.periodo.fine + 'T00:00:00');
  let fatto = 0;
  let tutto = 0;
  for (let d = new Date(inizio); d <= fine; d.setDate(d.getDate() + 1)) {
    const w = pesoGiorno(d, rEvolutionDa);
    tutto += w;
    if (d <= startOfDay(oggi)) fatto += w;
  }
  return tutto === 0 ? 0 : Math.round((fatto / tutto) * totale);
}

/**
 * Moltiplicatore della settimana: ×1,25 se a inizio settimana Lani era indietro
 * di più di una tappa e mezza rispetto alla bandierina, e solo se in quella settimana
 * ha preso almeno la prima chiave.
 */
export function moltiplicatoreRimonta(passiInizioSettimana: number, bandierinaInizioSettimana: number, chiaviPrese: number): number {
  const r = CONFIG.rimonta;
  const costoMedio = CONFIG.percorso.totale_passi / CONFIG.percorso.costi_tappe.length;
  const indietro = bandierinaInizioSettimana - passiInizioSettimana > r.ritardo_tappe * costoMedio;
  if (!indietro) return 1;
  if (r.solo_settimane_con_prima_chiave && chiaviPrese < 1) return 1;
  return r.moltiplicatore;
}
