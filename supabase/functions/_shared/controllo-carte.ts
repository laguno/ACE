// Controllo automatico delle carte generate dall'IA, prima di salvarle (blocco H, 19/11/2026).
// I genitori non hanno tempo per una coda di approvazione: una seconda chiamata a Claude, separata
// da quella che ha scritto le carte, le riguarda contro lo stesso materiale di partenza.
// - Flash card: risposta corretta, retro che è l'unica risposta possibile, adatta alla seconda media.
// - Quiz: il controllore risolve la domanda SENZA vedere la risposta segnata; passa solo se trova
//   una sola opzione giusta ed è quella segnata (così si scartano anche le domande con due giuste).
// Le carte che non passano non entrano. Se il controllo stesso fallisce non entra niente: la
// funzione che chiama lascia l'errore e ci riprova al giro dopo.
// Modello: Sonnet, come la generazione (decisione del signore dell'8/11: Sonnet per lo studio,
// Opus solo per spiega).
import type Anthropic from 'npm:@anthropic-ai/sdk';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export type Carta = { tipo: string; fronte: string; retro: string };
export type Domanda = { testo: string; opzioni: string[]; giusta: number; spiegazione: string };
/** 'foto': pagine del libro, vale solo quello che si vede; 'argomento': argomento, compiti, lezioni, indice. */
export type Fonte = 'foto' | 'argomento';
type Blocco = Record<string, unknown>;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['flashcard', 'quiz'],
  properties: {
    flashcard: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['numero', 'corretta', 'chiara', 'adatta', 'motivo'],
        properties: {
          numero: { type: 'integer' },
          corretta: { type: 'boolean', description: 'il retro è giusto secondo il materiale' },
          chiara: { type: 'boolean', description: 'il retro è l’unica risposta possibile al fronte, senza ambiguità' },
          adatta: { type: 'boolean', description: 'adatta a una ragazza di seconda media, né troppo difficile né fuori argomento' },
          motivo: { type: 'string', description: 'una frase, solo se qualcosa non va; altrimenti vuota' },
        },
      },
    },
    quiz: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['numero', 'giuste', 'adatta', 'motivo'],
        properties: {
          numero: { type: 'integer' },
          giuste: { type: 'array', items: { type: 'integer' }, description: 'indici (da 0) di TUTTE le opzioni giuste secondo il materiale; vuoto se nessuna lo è' },
          adatta: { type: 'boolean', description: 'domanda chiara e adatta alla seconda media' },
          motivo: { type: 'string', description: 'una frase, solo se qualcosa non va; altrimenti vuota' },
        },
      },
    },
  },
} as const;

const ISTRUZIONI = `Controlli il materiale di ripasso scritto per una ragazza di 12 anni in seconda media (scuola italiana), prima che lo veda.
Sei severo: una carta sbagliata insegna una cosa sbagliata. Nel dubbio, boccia.
Ti do il materiale di partenza, poi flash card e domande di quiz numerate.
Flash card: "corretta" se il retro è giusto; "chiara" se il retro è l'unica risposta possibile al fronte (per "completa", una sola parola va bene al posto di ___; per "vero_falso", il retro dice Vero o Falso giusto e il perché); "adatta" se è roba di seconda media sull'argomento.
Quiz: le domande arrivano senza la risposta. Risolvile tu e scrivi in "giuste" gli indici di tutte le opzioni giuste, anche se sono più di una. "adatta" se la domanda è chiara e da seconda media.
Rispondi per ogni carta e per ogni domanda, con lo stesso numero.`;

const FONTE: Record<Fonte, string> = {
  foto: 'Il materiale di partenza sono le foto delle pagine: vale solo quello che si vede. Una carta con fatti che nelle pagine non ci sono non è corretta.',
  argomento: 'Il materiale di partenza è argomento, compiti, lezioni e indice del libro: giudica con quello che si studia davvero in seconda media su quell’argomento.',
};

const pulita = (s: unknown) => (typeof s === 'string' ? s.trim() : '');

/** Controlli senza IA: forma della carta e della domanda. */
export function benFormata(c: Carta) {
  const fronte = pulita(c.fronte);
  const retro = pulita(c.retro);
  if (!fronte || !retro) return false;
  if (c.tipo === 'completa') return fronte.includes('___');
  if (c.tipo === 'vero_falso') return /^(Vero|Falso)\b/.test(retro);
  return c.tipo === 'domanda';
}

export function benFormataDomanda(q: Domanda) {
  if (!pulita(q.testo) || !Array.isArray(q.opzioni) || q.opzioni.length < 2) return false;
  if (!Number.isInteger(q.giusta) || q.giusta < 0 || q.giusta >= q.opzioni.length) return false;
  const opzioni = q.opzioni.map((o) => pulita(o).toLowerCase());
  return opzioni.every(Boolean) && new Set(opzioni).size === opzioni.length;
}

/** Carte segnalate sbagliate da Lani nella stessa materia: il controllore boccia quelle uguali o simili. */
export async function segnalate(db: SupabaseClient, materiaId: string | null) {
  if (!materiaId) return [];
  const { data } = await db.from('flashcard').select('fronte, retro').eq('materia_id', materiaId).eq('segnalata_sbagliata', true).limit(30);
  return (data ?? []) as { fronte: string; retro: string }[];
}

export async function controllaCarte(
  claude: Anthropic,
  o: { materiale: Blocco[]; fonte: Fonte; flashcard: Carta[]; quiz: Domanda[]; segnalate?: { fronte: string; retro: string }[] },
) {
  const carte = o.flashcard.filter(benFormata);
  const domande = o.quiz.filter(benFormataDomanda);
  const scartate = { flashcard: o.flashcard.length - carte.length, quiz: o.quiz.length - domande.length };
  if (!carte.length && !domande.length) return { flashcard: [], quiz: [], scartate, motivi: [] as string[] };

  const da = {
    flashcard: carte.map((c, i) => ({ numero: i + 1, tipo: c.tipo, fronte: c.fronte, retro: c.retro })),
    // senza risposta segnata né spiegazione: il controllore deve risolverle da solo
    quiz: domande.map((q, i) => ({ numero: i + 1, testo: q.testo, opzioni: q.opzioni })),
    ...(o.segnalate?.length ? { segnalate_sbagliate_da_lani: o.segnalate } : {}),
  };
  const testo = `${FONTE[o.fonte]}${o.segnalate?.length ? '\nBoccia anche le flash card uguali o molto simili a quelle in "segnalate_sbagliate_da_lani": Lani le ha già trovate sbagliate.' : ''}\nDa controllare:\n${JSON.stringify(da)}`;
  const ris = await claude.beta.messages.create({
    model: 'claude-sonnet-5-5', // come la generazione: decisione del signore (8/11), Sonnet per lo studio
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    system: ISTRUZIONI,
    messages: [{ role: 'user', content: [...o.materiale, { type: 'text', text: testo }] }],
  } as never);
  if (ris.stop_reason === 'refusal') throw new Error('controllo delle carte rifiutato');
  const blocco = ris.content.find((b: { type: string }) => b.type === 'text') as { text: string } | undefined;
  if (!blocco) throw new Error('controllo delle carte senza testo');
  const esito = JSON.parse(blocco.text) as {
    flashcard: { numero: number; corretta: boolean; chiara: boolean; adatta: boolean; motivo: string }[];
    quiz: { numero: number; giuste: number[]; adatta: boolean; motivo: string }[];
  };

  const motivi: string[] = [];
  const giudizioCarta = new Map(esito.flashcard.map((e) => [e.numero, e]));
  const buoneCarte = carte.filter((c, i) => {
    const e = giudizioCarta.get(i + 1);
    const ok = !!e && e.corretta && e.chiara && e.adatta;
    if (!ok) motivi.push(`carta "${c.fronte.slice(0, 40)}": ${e?.motivo || 'senza giudizio'}`);
    return ok;
  });
  const giudizioDomanda = new Map(esito.quiz.map((e) => [e.numero, e]));
  const buoneDomande = domande.filter((q, i) => {
    const e = giudizioDomanda.get(i + 1);
    const giuste = [...new Set(e?.giuste ?? [])];
    const ok = !!e && e.adatta && giuste.length === 1 && giuste[0] === q.giusta;
    if (!ok) motivi.push(`domanda "${q.testo.slice(0, 40)}": ${e?.motivo || (e ? `giuste ${JSON.stringify(giuste)}, segnata ${q.giusta}` : 'senza giudizio')}`);
    return ok;
  });
  scartate.flashcard += carte.length - buoneCarte.length;
  scartate.quiz += domande.length - buoneDomande.length;
  return { flashcard: buoneCarte, quiz: buoneDomande, scartate, motivi };
}
