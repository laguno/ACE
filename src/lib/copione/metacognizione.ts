// Testi del blocco D (metacognizione, 19/11/2026): stessa fonte di docs/05-copione.md, sezione
// "Come studio". Regole del copione: titoli <= 4 parole, testi <= 25 parole, niente emoji, "tu",
// lodare il gesto, mai rimproveri. Le frasi sulla tendenza dicono come va, non come è Lani.
import type { VersoPrevisioni, VersoTempo } from '../regole/metacognizione.ts';

export interface MicroLezione {
  id: string;
  posa: string;
  titolo: string;
  testo: string;
  /** cosa provare questa settimana, una riga */
  prova: string;
}

/** Una a settimana, in quest'ordine (lezioneDellaSettimana), poi si ricomincia. */
export const MICRO_LEZIONI: readonly MicroLezione[] = [
  {
    id: 'richiamo',
    posa: 'lani-pensierosa',
    titolo: 'Prima prova a ricordare',
    testo: 'Rileggere sembra studiare, ma il cervello impara quando cerca la risposta da solo. Chiudi il libro e prova a dirla.',
    prova: 'Prima di girare una carta, di’ la risposta ad alta voce.',
  },
  {
    id: 'spaziatura',
    posa: 'bart-pallone',
    titolo: 'Poco ma spesso',
    testo: 'Quindici minuti per tre giorni valgono più di un’ora la sera prima. Per questo il ripasso è già diviso nei pomeriggi.',
    prova: 'Fai la sessione di ripasso nel giorno previsto.',
  },
  {
    id: 'mescolare',
    posa: 'lani-concentrata',
    titolo: 'Mescola gli esercizi',
    testo: 'Esercizi tutti uguali di fila sembrano facili. Mescolati ti obbligano a capire quale regola serve: è quello che chiede la verifica.',
    prova: 'Negli esercizi, salta tra tipi diversi invece di farli in fila.',
  },
  {
    id: 'spiegare',
    posa: 'lady-compiti',
    titolo: 'Spiegalo a Lady',
    testo: 'Se sai spiegarlo con parole tue, lo hai capito. Dove ti blocchi, lì c’è da ripassare.',
    prova: 'Spiega un argomento a voce, anche al gatto, in due minuti.',
  },
  {
    id: 'sicura',
    posa: 'lani-pensierosa',
    titolo: 'Sicura o quasi?',
    testo: 'Sentirsi sicuri non vuol dire sapere. Prima di girare la carta chiediti quanto ne sei sicura: poi controlla.',
    prova: 'Quando dici "sapevo", controlla di aver detto proprio la risposta giusta.',
  },
  {
    id: 'tempo',
    posa: 'lani-determinata',
    titolo: 'Quanto ci metti',
    testo: 'Tutti sbagliano a stimare il tempo. Segnare stima e tempo vero ti aiuta a organizzare il pomeriggio senza corse.',
    prova: 'Nel piano del giorno, scrivi i minuti prima di cominciare.',
  },
  {
    id: 'errori',
    posa: 'leo-cinque',
    titolo: 'Gli errori servono',
    testo: 'Una risposta sbagliata, corretta subito, si ricorda meglio di una giusta per caso. Gli errori del quiz diventano carte apposta.',
    prova: 'Rileggi la spiegazione di ogni domanda sbagliata del quiz.',
  },
  {
    id: 'sonno',
    posa: 'bart-sonnecchia',
    titolo: 'Il sonno studia',
    testo: 'Mentre dormi il cervello sistema quello che hai studiato. La sera prima della verifica: ripasso breve, poi a letto.',
    prova: 'La sera prima di una verifica, chiudi lo studio entro le 21.',
  },
];

/** Frasi del piano del giorno. */
export const PIANO = {
  titolo: 'Il piano di oggi',
  domanda: 'Quanti minuti ti servono?',
  totale: (min: number) => `In tutto ${min} minuti stimati.`,
  vuoto: 'Niente da stimare oggi.',
  confronto: (stima: number, vero: number) => `Stima ${stima} min, vero ${vero} min.`,
  tendenza: {
    giusto: 'Le tue stime ci prendono: il pomeriggio si organizza bene.',
    di_piu: 'Di solito ci metti un po’ di più di quanto stimi. Aggiungi qualche minuto.',
    di_meno: 'Di solito ci metti meno di quanto stimi. Ti resta tempo libero.',
  } satisfies Record<VersoTempo, string>,
} as const;

/** Frasi del voto previsto. */
export const PREVISIONE = {
  domanda: 'Che voto pensi di prendere?',
  aiuto: 'Non è una promessa: serve a capire quanto ti conosci.',
  detta: (voto: string) => `Hai previsto ${voto}. Puoi cambiarlo fino a domani.`,
  confronto: (previsto: string, vero: string) => `Previsto ${previsto}, preso ${vero}.`,
  vicina: 'Ci hai preso: ti conosci bene.',
  tendenza: {
    giusta: 'Le tue previsioni sono vicine ai voti veri.',
    alta: 'Di solito prevedi un po’ più alto del voto vero: un ripasso in più aiuta.',
    bassa: 'Di solito prendi più di quanto pensi: sai più di quello che credi.',
  } satisfies Record<VersoPrevisioni, string>,
} as const;
