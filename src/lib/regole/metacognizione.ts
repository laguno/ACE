// Blocco D del piano di studio (approvato il 19/11/2026): Lani impara a guardare come studia.
// Piano del giorno con i minuti stimati e quelli veri, voto previsto prima della verifica
// confrontato col voto vero di Nuvola, micro-lezione della settimana, riepilogo della domenica.
// Funzioni pure: i numeri vengono da data/config-gioco.json (sezione metacognizione).
import { CONFIG, giorno, iso, lunedi } from './index';

const M = CONFIG.metacognizione;
const GIORNO_MS = 864e5;

// ---------------------------------------------------------------- piano del giorno

export interface VocePiano {
  minuti_stimati: number;
  iniziata_il: string | null;
  finita_il: string | null;
  giorno?: string;
}

/** Stima accettata: minuti interi tra 1 e il massimo della config. */
export function stimaValida(minuti: number): boolean {
  return Number.isInteger(minuti) && minuti >= 1 && minuti <= M.piano.minuti_max;
}

/** Minuti veri di una voce finita (almeno 1); null se non è iniziata o non è finita. */
export function minutiVeri(v: Pick<VocePiano, 'iniziata_il' | 'finita_il'>): number | null {
  if (!v.iniziata_il || !v.finita_il) return null;
  const ms = new Date(v.finita_il).getTime() - new Date(v.iniziata_il).getTime();
  if (!(ms >= 0)) return null;
  return Math.max(1, Math.round(ms / 60000));
}

/** Minuti stimati in tutto per le voci del giorno. */
export function totaleStimato(voci: Pick<VocePiano, 'minuti_stimati'>[]): number {
  return voci.reduce((s, v) => s + v.minuti_stimati, 0);
}

export type VersoTempo = 'giusto' | 'di_piu' | 'di_meno';
export interface TendenzaTempo {
  voci: number;
  stimati: number;
  veri: number;
  /** minuti veri / minuti stimati */
  rapporto: number;
  verso: VersoTempo;
}

/**
 * Come va la stima del tempo nelle ultime settimane: somma dei minuti veri sulla somma degli stimati,
 * solo voci finite. Sotto il minimo di voci non si dice niente (una giornata storta non è una tendenza).
 */
export function tendenzaTempo(voci: VocePiano[], oggi: Date): TendenzaTempo | null {
  const da = iso(new Date(oggi.getTime() - M.piano.tendenza_giorni * GIORNO_MS));
  const finite = voci
    .filter((v) => !v.giorno || v.giorno > da)
    .map((v) => ({ stima: v.minuti_stimati, vero: minutiVeri(v) }))
    .filter((v): v is { stima: number; vero: number } => v.vero !== null && v.stima > 0);
  if (finite.length < M.piano.tendenza_voci_min) return null;
  const stimati = finite.reduce((s, v) => s + v.stima, 0);
  const veri = finite.reduce((s, v) => s + v.vero, 0);
  const rapporto = veri / stimati;
  const soglia = M.piano.tendenza_soglia;
  const verso: VersoTempo = rapporto > 1 + soglia ? 'di_piu' : rapporto < 1 - soglia ? 'di_meno' : 'giusto';
  return { voci: finite.length, stimati, veri, rapporto, verso };
}

// ---------------------------------------------------------------- voto previsto

/** Voto previsto accettato: tra il minimo e il massimo della config, a mezzi voti. */
export function votoPrevistoValido(v: number): boolean {
  return Number.isFinite(v) && v >= M.voto_previsto.voto_min && v <= M.voto_previsto.voto_max && Number.isInteger(v * 2);
}

/** Mezzi voti che Lani può scegliere, dal più basso al più alto. */
export function votiPossibili(): number[] {
  const out: number[] = [];
  for (let v = M.voto_previsto.voto_min; v <= M.voto_previsto.voto_max; v += 0.5) out.push(v);
  return out;
}

const giorniTra = (da: Date, a: Date) => Math.round((a.getTime() - da.getTime()) / GIORNO_MS);

/** La previsione si fa (e si cambia) fino al giorno prima della verifica. */
export function siPuoPrevedere(dataVerifica: string, oggi: Date): boolean {
  return iso(oggi) < dataVerifica;
}

/** ACE chiede la previsione negli ultimi giorni prima della verifica (prima è presto per saperlo). */
export function chiediPrevisione(dataVerifica: string, oggi: Date): boolean {
  const g = giorniTra(giorno(iso(oggi)), giorno(dataVerifica));
  return g >= 1 && g <= M.voto_previsto.chiedi_da_giorni_prima;
}

export interface VerificaDaAbbinare {
  id: string;
  materia_id: string | null;
  data: string;
  tipo?: 'verifica' | 'interrogazione' | string | null;
}
export interface VotoNuvola {
  id: string;
  materia_id: string | null;
  data: string;
  voto: number;
  tipo?: string | null;
}

// si escludono solo i casi chiari: orale per una verifica scritta, scritto per un'interrogazione.
// Il tipo arriva da Nuvola in minuscolo ("orale", "scritto", ...); se manca va bene tutto.
function tipiCompatibili(verifica: VerificaDaAbbinare['tipo'], voto: VotoNuvola['tipo']): boolean {
  if (!verifica || !voto) return true;
  if (verifica === 'verifica') return !/orale/i.test(voto);
  if (verifica === 'interrogazione') return !/scritt/i.test(voto);
  return true;
}

/**
 * Lega i voti di Nuvola alle verifiche: stessa materia, voto dato dal giorno della verifica a
 * voto_entro_giorni dopo. Se due verifiche della stessa materia sono vicine, il voto va alla più
 * recente prima del voto. Ogni verifica prende un solo voto (il primo) e ogni voto una sola verifica.
 */
export function abbinaVoti(verifiche: VerificaDaAbbinare[], voti: VotoNuvola[]): Map<string, VotoNuvola> {
  const out = new Map<string, VotoNuvola>();
  const ordinati = [...voti].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.id < b.id ? -1 : 1));
  for (const v of ordinati) {
    const candidate = verifiche
      .filter((x) => !out.has(x.id) && x.materia_id && x.materia_id === v.materia_id && tipiCompatibili(x.tipo, v.tipo))
      .filter((x) => x.data <= v.data && giorniTra(giorno(x.data), giorno(v.data)) <= M.voto_previsto.voto_entro_giorni)
      .sort((a, b) => (a.data < b.data ? 1 : -1));
    if (candidate[0]) out.set(candidate[0].id, v);
  }
  return out;
}

/** Passi per una previsione vicina al voto vero (importo provvisorio, da confermare: config). */
export function passiPrevisione(previsto: number, vero: number): number {
  return Math.abs(previsto - vero) <= M.voto_previsto.scarto_max ? M.voto_previsto.passi : 0;
}

export type VersoPrevisioni = 'giusta' | 'alta' | 'bassa';
export interface TendenzaPrevisioni {
  verifiche: number;
  /** media di |previsto − vero| */
  scartoMedio: number;
  /** media di (previsto − vero): sopra zero prevede più alto del voto vero */
  differenzaMedia: number;
  verso: VersoPrevisioni;
}

/** Tendenza su più verifiche; sotto il minimo della config niente tendenza (una verifica non dice niente). */
export function tendenzaPrevisioni(coppie: { previsto: number; vero: number }[]): TendenzaPrevisioni | null {
  if (coppie.length < M.voto_previsto.tendenza_verifiche_min) return null;
  const n = coppie.length;
  const differenzaMedia = coppie.reduce((s, c) => s + (c.previsto - c.vero), 0) / n;
  const scartoMedio = coppie.reduce((s, c) => s + Math.abs(c.previsto - c.vero), 0) / n;
  const soglia = M.voto_previsto.tendenza_soglia;
  const verso: VersoPrevisioni = differenzaMedia > soglia ? 'alta' : differenzaMedia < -soglia ? 'bassa' : 'giusta';
  return { verifiche: n, scartoMedio, differenzaMedia, verso };
}

// ---------------------------------------------------------------- micro-lezione della settimana

/** Indice della lezione della settimana di `oggi`: una a settimana dall'inizio del gioco, poi si ricomincia. */
export function lezioneDellaSettimana(oggi: Date, quante: number): number {
  if (quante <= 0) return 0;
  const settimane = Math.floor(giorniTra(lunedi(giorno(CONFIG.periodo.inizio)), lunedi(oggi)) / 7);
  return ((settimane % quante) + quante) % quante;
}

// ---------------------------------------------------------------- riepilogo della domenica (genitori)

export interface DatiRiepilogo {
  ripassi: { fatti: number; previsti: number };
  giriCarte: number;
  /** pillole del blocco C: null finché non ci sono */
  pillole: { fatte: number; previste: number } | null;
  /** carte date per sicure e poi sbagliate (blocco B): null finché non ci sono */
  sicure: { sicure: number; sbagliate: number } | null;
  /** previsioni con il voto vero arrivato in settimana */
  previsioni: { previsto: number; vero: number }[];
  /** voci del piano della settimana */
  piano: VocePiano[];
  lezioneLetta: boolean;
}

export interface RigaRiepilogo {
  chiave: 'ripassi' | 'carte' | 'pillole' | 'sicure' | 'previsioni' | 'piano' | 'lezione';
  valore: string;
  testo: string;
}

const numero = (x: number) => x.toLocaleString('it-IT', { maximumFractionDigits: 1 });
const voto = (x: number) => numero(x).replace(',5', '½');

/** Righe del riepilogo per i genitori: numeri veri, nessun giudizio. */
export function riepilogoSettimana(d: DatiRiepilogo): RigaRiepilogo[] {
  const righe: RigaRiepilogo[] = [];
  righe.push({ chiave: 'ripassi', valore: `${d.ripassi.fatti} su ${d.ripassi.previsti}`, testo: 'sessioni di ripasso fatte' });
  if (d.pillole) righe.push({ chiave: 'pillole', valore: `${d.pillole.fatte} su ${d.pillole.previste}`, testo: 'pillole fatte nel giorno previsto' });
  righe.push({ chiave: 'carte', valore: String(d.giriCarte), testo: d.giriCarte === 1 ? 'giro di flash card' : 'giri di flash card' });
  if (d.sicure) {
    const q = quotaSicureSbagliate(d.sicure.sicure, d.sicure.sbagliate);
    righe.push({
      chiave: 'sicure',
      valore: q === null ? '–' : `${Math.round(q * 100)}%`,
      testo: q === null ? 'nessuna carta data per sicura' : `delle carte date per sicure erano sbagliate (${d.sicure.sbagliate} su ${d.sicure.sicure})`,
    });
  }
  if (d.previsioni.length) {
    const testo = d.previsioni.map((p) => `previsto ${voto(p.previsto)}, preso ${voto(p.vero)}`).join('; ');
    const scarto = d.previsioni.reduce((s, p) => s + Math.abs(p.previsto - p.vero), 0) / d.previsioni.length;
    righe.push({ chiave: 'previsioni', valore: `${numero(scarto)}`, testo: `scarto medio tra voto previsto e vero (${testo})` });
  }
  const finite = d.piano.filter((v) => minutiVeri(v) !== null);
  if (finite.length) {
    const stimati = totaleStimato(finite);
    const veri = finite.reduce((s, v) => s + (minutiVeri(v) ?? 0), 0);
    righe.push({ chiave: 'piano', valore: `${veri} min`, testo: `veri contro ${stimati} stimati, su ${finite.length} ${finite.length === 1 ? 'cosa' : 'cose'} del piano` });
  }
  righe.push({ chiave: 'lezione', valore: d.lezioneLetta ? 'Letta' : 'Non ancora', testo: 'la lezione della settimana su come si studia' });
  return righe;
}

/** Quota delle carte date per sicure che erano sbagliate; null se nessuna carta data per sicura. */
export function quotaSicureSbagliate(sicure: number, sbagliate: number): number | null {
  if (sicure <= 0) return null;
  return Math.min(1, Math.max(0, sbagliate / sicure));
}
