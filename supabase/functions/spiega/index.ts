// Edge Function "spiega": la lampadina "Non ho capito" di un compito. Claude spiega l'argomento con
// un esempio diverso da quello del compito e prepara tre indizi graduali; mai la soluzione
// dell'esercizio. La chiama l'app di Lani (o di un genitore) con { compito_id }.
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';
import mappa from '../../../data/mappa-libri.json' with { type: 'json' };

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const claude = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['spiegazione', 'indizi'],
  properties: {
    spiegazione: { type: 'string' },
    indizi: { type: 'array', items: { type: 'string' } },
  },
} as const;

const ISTRUZIONI = `Aiuti una ragazza di 12 anni, seconda media, che è bloccata su un compito.
Scrivi in italiano semplice, dai del tu, frasi brevi, niente emoji, tono calmo e incoraggiante senza complimenti generici.
Regola più importante: non risolvere mai l'esercizio del compito e non dare il suo risultato.
- "spiegazione": spiega l'argomento in 4-6 frasi con un esempio diverso da quello del compito (numeri o parole diverse), risolto passo passo.
- "indizi": esattamente 3 indizi sul compito vero, dal più leggero al più concreto; anche il terzo lascia a lei l'ultimo passo.
Se il compito è solo "leggere" o "studiare", gli indizi sono su come studiarlo (cosa sottolineare, quali domande farsi).`;

const risposta = (corpo: unknown, stato = 200) =>
  new Response(JSON.stringify(corpo), { status: stato, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '');
  const { data: utente } = await db.auth.getUser(token);
  if (!utente.user) return risposta({ errore: 'accesso richiesto' }, 401);
  const { count } = await db.from('profili').select('id', { count: 'exact', head: true }).eq('id', utente.user.id);
  if (!count) return risposta({ errore: 'profilo mancante' }, 403);

  try {
    const { compito_id } = await req.json();
    const { data: c } = await db.from('compiti').select('testo, materia_id, materie(nome)').eq('id', compito_id).maybeSingle();
    if (!c) return risposta({ errore: 'compito non trovato' }, 404);
    const da = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
    const { data: lezioni } = await db.from('lezioni').select('argomento').eq('materia_id', c.materia_id ?? '').gte('data', da);
    const chiave = c.materia_id === 'arte_e_immagine' ? 'arte' : (c.materia_id ?? '');
    const libri = mappa.libri
      .filter((l) => chiave && l.materia.toLowerCase().replace(/[^a-z]+/g, '_').startsWith(chiave))
      .map((l) => ({ titolo: l.titolo, volumi: (l as { volumi?: unknown }).volumi ?? null }));

    const r = await claude.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      system: ISTRUZIONI,
      messages: [
        {
          role: 'user',
          content: JSON.stringify({
            materia: (c.materie as { nome?: string } | null)?.nome ?? null,
            compito: c.testo,
            argomenti_delle_ultime_lezioni: (lezioni ?? []).map((l) => l.argomento).filter(Boolean),
            indice_libro: libri,
          }),
        },
      ],
    } as never);
    if (r.stop_reason === 'refusal') return risposta({ errore: 'non disponibile' }, 502);
    const testo = r.content.find((b: { type: string }) => b.type === 'text') as { text: string } | undefined;
    return risposta(JSON.parse(testo?.text ?? '{}'));
  } catch (e) {
    console.error(e);
    return risposta({ errore: 'errore del server' }, 500);
  }
});
