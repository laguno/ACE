// Edge Function "genera-studio": per le verifiche dei prossimi 14 giorni prepara il piano di
// ripasso (sessioni_ripasso, senza IA) e, se mancano, flash card e quiz generati da Claude
// dall'argomento della verifica, dai compiti che la citano, dalle lezioni recenti e dall'indice
// del libro (data/mappa-libri.json: titoli e pagine, mai il testo dei libri).
// La chiamano sync-nuvola dopo ogni sincronizzazione (segreto del cron) o un genitore.
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';
import mappa from '../../../data/mappa-libri.json' with { type: 'json' };
import * as C from '../../../src/lib/calendario/index.ts';
import * as R from '../../../src/lib/regole/index.ts';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const claude = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
const PER_GIRO = 3; // ponytail: al massimo 3 verifiche nuove per chiamata, per tempi e costi contenuti

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['flashcard', 'quiz', 'pagine_probabili'],
  properties: {
    pagine_probabili: { type: 'string', description: 'Pagine del libro da ripassare, es. "pag. 100-107, 110-117", o stringa vuota' },
    flashcard: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['tipo', 'fronte', 'retro'],
        properties: {
          tipo: { type: 'string', enum: ['domanda', 'completa', 'vero_falso'] },
          fronte: { type: 'string' },
          retro: { type: 'string' },
        },
      },
    },
    quiz: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['testo', 'opzioni', 'giusta', 'spiegazione'],
        properties: {
          testo: { type: 'string' },
          opzioni: { type: 'array', items: { type: 'string' } },
          giusta: { type: 'integer', description: 'indice (da 0) della risposta giusta in opzioni' },
          spiegazione: { type: 'string' },
        },
      },
    },
  },
} as const;

const ISTRUZIONI = `Prepari materiale di ripasso per una ragazza di 12 anni in seconda media (scuola italiana).
Scrivi in italiano semplice, frasi brevi, dai del tu. Niente emoji.
Ti do l'argomento di una verifica, i compiti assegnati, gli argomenti delle ultime lezioni e l'indice del libro.
Usa solo contenuti che si studiano davvero in seconda media su quell'argomento: niente di più difficile.
Restituisci:
- da 10 a 15 flash card, mescolando tre tipi: "domanda" (domanda breve, risposta in una riga), "completa" (frase con ___ al posto della parola chiave; il retro è la parola), "vero_falso" (affermazione; il retro inizia con "Vero." o "Falso." e dice il perché in una frase);
- da 8 a 10 domande di quiz nello stile di una verifica scritta, 4 opzioni ciascuna, una sola giusta, con una spiegazione di una o due frasi che insegna qualcosa anche a chi ha sbagliato;
- le pagine probabili da ripassare, prese dai compiti o dall'indice; stringa vuota se non si capiscono.
Se l'argomento è troppo vago, resta sulle basi dell'argomento più probabile secondo le lezioni e l'indice.`;

function libriDi(materia: string | null) {
  if (!materia) return [];
  const chiave = materia === 'arte_e_immagine' ? 'arte' : materia;
  return mappa.libri
    .filter((l) => l.materia.toLowerCase().replace(/[^a-z]+/g, '_').startsWith(chiave))
    .map((l) => ({ materia: l.materia, titolo: l.titolo, volumi: (l as { volumi?: unknown }).volumi ?? null }));
}

async function genera(v: { id: string; materia_id: string | null; data: string; argomento: string | null; tipo: string }) {
  const da = new Date(Date.now() - 21 * 864e5).toISOString().slice(0, 10);
  const [{ data: compiti }, { data: lezioni }, { data: materia }] = await Promise.all([
    db.from('compiti').select('testo').eq('materia_id', v.materia_id ?? '').gte('scadenza', da),
    db.from('lezioni').select('data, argomento').eq('materia_id', v.materia_id ?? '').gte('data', da).order('data'),
    db.from('materie').select('nome').eq('id', v.materia_id ?? '').maybeSingle(),
  ]);
  const contesto = {
    verifica: { tipo: v.tipo, materia: materia?.nome ?? 'non indicata', data: v.data, argomento: v.argomento },
    compiti: (compiti ?? []).map((c) => c.testo),
    lezioni: (lezioni ?? []).filter((l) => l.argomento).map((l) => `${l.data}: ${l.argomento}`),
    indice_libro: libriDi(v.materia_id),
  };

  const risposta = await claude.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    system: ISTRUZIONI,
    messages: [{ role: 'user', content: JSON.stringify(contesto) }],
  } as never);
  if (risposta.stop_reason === 'refusal') throw new Error('richiesta rifiutata');
  const testo = risposta.content.find((b: { type: string }) => b.type === 'text') as { text: string } | undefined;
  if (!testo) throw new Error('risposta senza testo');
  return JSON.parse(testo.text) as {
    pagine_probabili: string;
    flashcard: { tipo: string; fronte: string; retro: string }[];
    quiz: { testo: string; opzioni: string[]; giusta: number; spiegazione: string }[];
  };
}

async function prepara() {
  const oggi = R.giornoRoma(new Date());
  const fra14 = new Date(oggi);
  fra14.setDate(fra14.getDate() + 14);
  const { data: verifiche, error } = await db
    .from('verifiche')
    .select('id, materia_id, data, argomento, tipo, pagine_probabili, quiz(id)')
    .gt('data', R.iso(oggi))
    .lte('data', R.iso(fra14))
    .order('data');
  if (error) throw new Error(`verifiche: ${error.message}`);

  // giorni con una partita di Lani: niente sessioni di ripasso
  const { data: impegni } = await db.from('impegni_famiglia').select('titolo, inizio');
  const partite = (impegni ?? []).filter((i) => C.tipoImpegno(i.titolo) === 'partita').map((i) => R.iso(R.giornoRoma(i.inizio)));

  let sessioni = 0;
  let generate = 0;
  const errori: string[] = [];
  for (const v of verifiche ?? []) {
    const piano = R.pianoRipasso(R.giorno(v.data), oggi, partite).map((s) => ({
      verifica_id: v.id,
      numero: s.numero,
      data_prevista: s.data,
      tipo: s.tipo,
    }));
    if (piano.length) {
      const { error: e } = await db.from('sessioni_ripasso').upsert(piano, { onConflict: 'verifica_id,numero', ignoreDuplicates: true });
      if (e) throw new Error(`sessioni: ${e.message}`);
      sessioni += piano.length;
    }

    if ((v.quiz as unknown[]).length || generate >= PER_GIRO) continue;
    try {
      const g = await genera(v);
      const carte = g.flashcard.map((f) => ({
        materia_id: v.materia_id,
        argomento: v.argomento ?? '',
        tipo: f.tipo,
        fronte: f.fronte,
        retro: f.retro,
        fonte: 'nuvola',
        verifica_id: v.id,
      }));
      const { error: e1 } = await db.from('flashcard').upsert(carte, { onConflict: 'materia_id,fronte', ignoreDuplicates: true });
      if (e1) throw new Error(`flashcard: ${e1.message}`);
      const domande = g.quiz.filter((q) => q.opzioni.length >= 2 && q.giusta >= 0 && q.giusta < q.opzioni.length);
      const { error: e2 } = await db
        .from('quiz')
        .insert({ materia_id: v.materia_id, argomento: v.argomento ?? '', verifica_id: v.id, domande });
      if (e2) throw new Error(`quiz: ${e2.message}`);
      if (!v.pagine_probabili && g.pagine_probabili)
        await db.from('verifiche').update({ pagine_probabili: g.pagine_probabili }).eq('id', v.id);
      generate++;
    } catch (e) {
      errori.push(`${v.data}: ${e instanceof Error ? e.message : 'errore'}`);
    }
  }
  return { verifiche: verifiche?.length ?? 0, sessioni, generate, errori };
}

async function autorizzato(req: Request): Promise<boolean> {
  const segreto = Deno.env.get('CRON_SEGRETO');
  if (segreto && req.headers.get('x-cron-segreto') === segreto) return true;
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '');
  const { data } = await db.auth.getUser(token);
  if (!data.user) return false;
  const { count } = await db.from('profili').select('id', { count: 'exact', head: true }).eq('id', data.user.id).eq('ruolo', 'genitore');
  return !!count;
}

const risposta = (corpo: unknown, stato = 200) =>
  new Response(JSON.stringify(corpo), { status: stato, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (!(await autorizzato(req))) return risposta({ errore: 'solo il cron o un genitore' }, 401);
  try {
    return risposta(await prepara());
  } catch (e) {
    console.error(e);
    return risposta({ errore: e instanceof Error ? e.message : 'errore imprevisto' }, 500);
  }
});
