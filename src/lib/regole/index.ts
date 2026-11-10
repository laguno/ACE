/**
 * Regole di gioco di ACE: passi, tappe, chiavi, forzieri, rimonta, bandierina.
 *
 * Funzioni pure, senza accesso al database: ricevono i fatti e restituiscono numeri.
 * Tutti i valori arrivano da data/config-gioco.json (unica fonte, approvata dal signore
 * il 7 novembre 2026). Per ritarare il gioco si cambia il JSON, non questo file.
 */
import config from '../../../data/config-gioco.json' with { type: 'json' };

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
/** Il forziere n di config-gioco.json (tappa, chiavi); errore se non esiste. */
export function forziere(n: number) {
  const f = CONFIG.forzieri.find((x) => x.n === n);
  if (!f) throw new Error(`Forziere ${n} inesistente`);
  return f;
}

export function statoForziere(n: number, passi: number, chiaviTotali: number): StatoForziere {
  const f = forziere(n);
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

/** Passi dei voti di una materia, in ordine di data: ognuno confrontato con quello prima. */
export function passiVotiMateria(voti: number[]): number[] {
  return voti.map((voto, i) =>
    passiVoto(i ? { voto, precedente: voti[i - 1], precedenteInsufficiente: voti[i - 1] < 6 } : { voto }),
  );
}

/** Nota di merito +50, disciplinare −20; le didattiche contano a gruppi di tre (malusDimenticanze). */
/**
 * Foto di un compito richiesta da ACE (docs/02): passi a Lani se la foto l'ha caricata lei, una volta
 * per richiesta (riferimento = id della richiesta). Le foto dei genitori chiudono la richiesta e basta.
 */
export function passiFoto(f: { richiestaDaAce: boolean; caricataDaLani: boolean }): number {
  return f.richiestaDaAce && f.caricataDaLani ? P.foto_compito : 0;
}

export function passiNota(tipo: 'disciplinare' | 'didattica' | 'merito' | 'altro'): number {
  if (tipo === 'merito') return P.nota_merito;
  if (tipo === 'disciplinare') return P.malus.nota_disciplinare;
  return 0;
}

/** Note per dimenticanza in ordine di data: −10 sulla terza, sesta, nona... (ne restituisce gli id). */
export function malusDimenticanze(ids: string[]): string[] {
  return ids.filter((_, i) => (i + 1) % 3 === 0);
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
  if (s.passiFatti < CONFIG.chiavi_settimana.soglia_passi_prima * s.passiPossibili) return 0;
  if (s.note > 0) return 1;
  if (s.cosePossibili > 0 && s.coseFatte >= CONFIG.chiavi_settimana.soglia_cose_terza * s.cosePossibili) return 3;
  return 2;
}

// ---------------------------------------------------------------- bandierina e rimonta

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function iso(d: Date): string {
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

// ---------------------------------------------------------------- correzione delle spunte

export interface Movimento {
  passi: number;
  moltiplicatore: number;
}

/**
 * Storno di una spunta corretta da un genitore: un movimento opposto che annulla
 * esattamente i passi presi (non è un malus). Vale solo finché le chiavi della
 * settimana del movimento non sono state date (domenica sera); dopo, null.
 */
export function storno(m: Movimento, chiaviSettimanaGiaDate: boolean): Movimento | null {
  if (chiaviSettimanaGiaDate || m.passi === 0) return null;
  return { passi: -m.passi, moltiplicatore: m.moltiplicatore };
}

/**
 * Compito rispuntato dopo uno storno: di nuovo i passi base (senza bonus anticipo),
 * motivo 'compito_rifatto' con lo stesso riferimento, una sola volta per compito,
 * e solo prima delle chiavi della domenica della settimana del compito.
 */
export function passiCompitoRifatto(f: { stornato: boolean; giaRifatto: boolean; chiaviSettimanaGiaDate: boolean }): number {
  if (!f.stornato || f.giaRifatto || f.chiaviSettimanaGiaDate) return 0;
  return P.obbligatori.compiti;
}

// ---------------------------------------------------------------- controlli dell'Edge Function dei passi

/** Giorno di calendario a Roma di un istante, come Date a mezzanotte locale (in qualsiasi fuso giri il server). */
export function giornoRoma(istante: string | Date): Date {
  const [a, m, g] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' })
    .format(new Date(istante))
    .split('-')
    .map(Number);
  return new Date(a, m - 1, g);
}

/** Giorno da 'YYYY-MM-DD' (colonne date di Postgres) a mezzanotte locale. */
export function giorno(s: string): Date {
  const [a, m, g] = s.split('-').map(Number);
  return new Date(a, m - 1, g);
}

/** Lunedì della settimana di `d`: chiave della tabella settimane. */
export function lunedi(d: Date): Date {
  const l = startOfDay(d);
  l.setDate(l.getDate() - ((l.getDay() + 6) % 7));
  return l;
}

/** Primo giorno di scuola dopo `d`: i "compiti per domani" scadono quel giorno. */
export function prossimoGiornoDiScuola(d: Date): Date {
  const g = startOfDay(d);
  for (let i = 0; i < 30; i++) {
    g.setDate(g.getDate() + 1);
    if (giornoDiScuola(g)) return g;
  }
  return g;
}

/** Compito spuntato dopo il giorno di scadenza: nessun passo. */
export function compitoInTempo(scadenza: Date, fattoIl: Date): boolean {
  return startOfDay(fattoIl) <= startOfDay(scadenza);
}

/** Cartella: vale la sera prima di un giorno di scuola. */
export function cartellaConta(sera: Date): boolean {
  const dopo = startOfDay(sera);
  dopo.setDate(dopo.getDate() + 1);
  return giornoDiScuola(dopo);
}

/** Sessione di ripasso: vale se fatta prima del giorno della verifica. */
export function ripassoInTempo(dataVerifica: Date, fattaIl: Date): boolean {
  return startOfDay(fattaIl) < startOfDay(dataVerifica);
}

/** Giro di flash card valido solo se è durato almeno 7 secondi a carta. */
export function giroValido(iniziatoIl: Date, fattoIl: Date, carte: number): boolean {
  const minimo = carte * P.studio_facoltativo.flashcard_secondi_prima_di_girare * 1000;
  return carte > 0 && fattoIl.getTime() - iniziatoIl.getTime() >= minimo;
}

/** Video valido solo se arrivato in fondo e visto per almeno il 95% della durata (non basta `completo`). */
export function videoValido(completo: boolean, secondiVisti: number | null, durata: number | null): boolean {
  if (!completo || !durata || secondiVisti == null) return false;
  return secondiVisti >= P.studio_facoltativo.video_frazione_minima_vista * durata;
}

export type VoceGesto = keyof typeof P.gesti_casa.voci;

/**
 * Passi di un nuovo gesto di casa dati i passi dei gesti già registrati oggi, entro il tetto
 * giornaliero. Dai passi già dati, non dall'elenco dei gesti "di prima": due gesti nello stesso
 * istante non si vedevano e il tetto saltava (simulatore dell'anno, 9/11).
 * Un gesto per voce al giorno: "letto fatto" segnato da mamma e da papà vale una volta (signore, 10/11).
 */
export function passiNuovoGesto(passiGiaDatiOggi: number, voce: VoceGesto, vocePresaOggi = false): number {
  if (vocePresaOggi) return 0;
  return Math.min(passiGestiCasa([voce]), Math.max(0, P.gesti_casa.tetto_giornaliero - passiGiaDatiOggi));
}

export type TipoSgridata = 'bagno' | 'antisportivo' | 'balla';
const MALUS: Record<TipoSgridata, keyof typeof P.malus> = {
  bagno: 'bagno',
  antisportivo: 'antisportivo',
  balla: 'balla_o_imbroglio',
};

/** Passi tolti da una sgridata segnata da un genitore. */
export function passiSgridata(tipo: TipoSgridata): number {
  return P.malus[MALUS[tipo]];
}

// ---------------------------------------------------------------- studio: piano e ripetizione

export type TipoSessione = 'rilettura_flashcard' | 'flashcard_mappa' | 'quiz' | 'quiz_errori';

/**
 * Piano di ripasso di una verifica (docs/03): fino a 4 sessioni nei giorni prima, l'ultima la sera
 * prima. Con meno giorni si comprime tenendo l'inizio (rilettura) e la fine (quiz). I giorni
 * occupati (partite) si saltano. Nessuna sessione il giorno stesso della verifica.
 */
export function pianoRipasso(
  dataVerifica: Date,
  oggi: Date,
  occupati: string[] = [],
): { numero: number; data: string; tipo: TipoSessione }[] {
  const liberi: Date[] = [];
  const g = startOfDay(dataVerifica);
  for (let i = 1; i <= 7 && liberi.length < 4; i++) {
    const d = new Date(g);
    d.setDate(d.getDate() - i);
    if (d < startOfDay(oggi)) break;
    if (!occupati.includes(iso(d))) liberi.unshift(d);
  }
  const tipi: Record<number, TipoSessione[]> = {
    4: ['rilettura_flashcard', 'flashcard_mappa', 'quiz', 'quiz_errori'],
    3: ['rilettura_flashcard', 'quiz', 'quiz_errori'],
    2: ['rilettura_flashcard', 'quiz'],
    1: ['quiz'],
    0: [],
  };
  return tipi[liberi.length].map((tipo, i) => ({ numero: i + 1, data: iso(liberi[i]), tipo }));
}

export type Esito = 'sapevo' | 'quasi' | 'non_sapevo';

/**
 * Ripetizione a intervalli crescenti: "sapevo" raddoppia l'intervallo, "quasi" torna domani con lo
 * stesso intervallo ("le incerte tornano domani"), "non sapevo" riparte da 1.
 */
export function prossimaRevisione(intervallo: number, esito: Esito, oggi: Date): { intervallo: number; data: string } {
  const nuovo = esito === 'sapevo' ? Math.max(2, intervallo * 2) : esito === 'quasi' ? intervallo : 1;
  const d = startOfDay(oggi);
  d.setDate(d.getDate() + (esito === 'sapevo' ? nuovo : 1));
  return { intervallo: nuovo, data: iso(d) };
}

// ---------------------------------------------------------------- conteggio della settimana

/** Motivi dei movimenti che contano come cose obbligatorie (docs/02). */
const MOTIVI_OBBLIGATORI = ['compito', 'compito_rifatto', 'cartella', 'borsa', 'foglio', 'ripasso'] as const;

/**
 * Cose obbligatorie possibili e fatte in una settimana, per le chiavi della domenica.
 * Possibili: compiti in scadenza, sere con la cartella (domani c'è scuola), sere con la borsa,
 * fogli da consegnare, sessioni di ripasso previste. Fatte: i movimenti obbligatori della settimana.
 */
export function contaSettimana(s: {
  compiti: number;
  sereCartella: number;
  sereBorsa: number;
  fogli: number;
  sessioni: number;
  movimenti: { motivo: string; passi: number }[];
  note: number;
}): SettimanaObbligatori {
  const o = P.obbligatori;
  const fatti = s.movimenti.filter((m) => (MOTIVI_OBBLIGATORI as readonly string[]).includes(m.motivo) && m.passi > 0);
  // ponytail: i dieci minuti (sprint 2) entreranno qui come sereDieciMinuti × o.dieci_minuti
  return {
    passiPossibili: s.compiti * o.compiti + s.sereCartella * o.cartella + s.sereBorsa * o.borsa + s.fogli * o.fogli + s.sessioni * o.ripasso,
    passiFatti: fatti.reduce((a, m) => a + m.passi, 0),
    cosePossibili: s.compiti + s.sereCartella + s.sereBorsa + s.fogli + s.sessioni,
    coseFatte: fatti.length,
    note: s.note,
  };
}

/** Mondo del percorso (4 sfondi) dalla tappa in corso: 1-7, 8-14, 15-21, 22-27. */
export function mondo(tappeFatte: number): 0 | 1 | 2 | 3 {
  return Math.min(3, Math.floor(Math.min(tappeFatte, 26) / 7)) as 0 | 1 | 2 | 3;
}

/**
 * Caselle dello studio facoltativo di un giorno ("flashcard:2026-11-24:1" .. ":4"): ognuna è il
 * riferimento di un movimento, così la chiave unica di movimenti_passi rende impossibile la quinta
 * anche con due invii nello stesso istante (revisione di Jarvis, 8/11).
 */
export function caselleStudio(tipo: TipoStudio, giorno: string): string[] {
  return Array.from({ length: P.studio_facoltativo.max_al_giorno_per_tipo }, (_, i) => `${tipo}:${giorno}:${i + 1}`);
}
