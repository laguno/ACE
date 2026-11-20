// Edge Function "spiega": il tutor di Lani (blocco E del piano di studio, 19/11/2026).
// - Lampadina "Non ho capito" di un compito: Claude spiega l'argomento con un esempio diverso da
//   quello del compito e prepara tre indizi graduali, mai la soluzione. Gli indizi arrivano uno alla
//   volta e solo dopo il tentativo di Lani (scritto breve: "Ci ho provato così"), che si salva.
// - "Spiegamelo tu": Lani spiega un argomento con parole sue, Claude dice cosa c'è, cosa manca e
//   cosa è da sistemare. Nessun voto.
// - Ogni richiesta finisce nello storico (tutor_richieste), che leggono i genitori.
// - Tetto giornaliero di chiamate a Claude per persona: config-gioco.json, tutor.chiamate_al_giorno.
// - Secondo controllo, oltre al prompt: Claude scrive a parte i risultati del compito (non arrivano
//   mai all'app) e il server li cerca nella spiegazione e negli indizi (src/lib/tutor).
// - Il tutor non dà passi.
// Corpo: { compito_id, azione?: 'apri' | 'tentativo' | 'indizio', testo? } oppure
//        { azione: 'spiegamelo', argomento, testo }.
import Anthropic from 'npm:@anthropic-ai/sdk';
import { dbServizio, registraErroreServer } from '../_shared/ambiente.ts';
import mappa from '../../../data/mappa-libri.json' with { type: 'json' };
import { chiChiama, CorpoNonValido, cors, leggiCorpo, risposte } from '../_shared/accesso.ts';
import * as R from '../../../src/lib/regole/index.ts';
import { controllaAiuto, testoDiLani, tettoRaggiunto, TUTOR, type Aiuto } from '../../../src/lib/tutor/index.ts';

const db = dbServizio();
const claude = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

const SCHEMA_AIUTO = {
  type: 'object',
  additionalProperties: false,
  required: ['spiegazione', 'indizi', 'risultati'],
  properties: {
    spiegazione: { type: 'string' },
    indizi: { type: 'array', items: { type: 'string' } },
    risultati: { type: 'array', items: { type: 'string' } },
  },
} as const;

const SCHEMA_SPIEGAMELO = {
  type: 'object',
  additionalProperties: false,
  required: ['cosa_va', 'cosa_manca', 'da_sistemare', 'domanda'],
  properties: {
    cosa_va: { type: 'array', items: { type: 'string' } },
    cosa_manca: { type: 'array', items: { type: 'string' } },
    da_sistemare: { type: 'array', items: { type: 'string' } },
    domanda: { type: 'string' },
  },
} as const;

const TONO = `Scrivi in italiano semplice, dai del tu, frasi brevi, niente emoji, tono calmo e incoraggiante senza complimenti generici.`;

const ISTRUZIONI_AIUTO = `Aiuti una ragazza di 12 anni, seconda media, che è bloccata su un compito.
${TONO}
Regola più importante: non risolvere mai l'esercizio del compito e non dare il suo risultato.
- "spiegazione": spiega l'argomento in 4-6 frasi con un esempio diverso da quello del compito (numeri o parole diverse), risolto passo passo.
- "indizi": esattamente 3 indizi sul compito vero, dal più leggero al più concreto; anche il terzo lascia a lei l'ultimo passo.
- "risultati": i risultati del compito, se si possono sapere dal testo, in tutte le forme in cui si scrivono (per esempio "3/4", "0,75", "x = 5"), brevi; lista vuota se il compito non ha un risultato o non lo conosci. Questo campo non lo vede lei: serve a un controllo automatico.
Se il compito è solo "leggere" o "studiare", gli indizi sono su come studiarlo (cosa sottolineare, quali domande farsi).`;

const ISTRUZIONI_SPIEGAMELO = `Una ragazza di 12 anni, seconda media, ti spiega con parole sue un argomento di scuola per vedere se l'ha capito.
${TONO}
Non dare voti, punteggi né giudizi su di lei: parla solo della spiegazione.
- "cosa_va": 1-3 cose giuste e precise che ha detto, con le sue parole.
- "cosa_manca": i punti importanti dell'argomento che non ha detto (al massimo 3).
- "da_sistemare": le cose sbagliate o confuse, ognuna con la versione giusta in una frase (lista vuota se non ce ne sono).
- "domanda": una sola domanda per farla ragionare sul punto che manca di più.
Se il testo non parla dell'argomento, dillo con gentilezza in "cosa_manca".`;

type Chiamata = { stop_reason: string; content: { type: string; text?: string }[] };
async function chiedi(system: string, schema: unknown, contenuto: unknown): Promise<unknown | 'rifiuto'> {
  const r = (await claude.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema } },
    system,
    messages: [{ role: 'user', content: JSON.stringify(contenuto) }],
  } as never)) as Chiamata;
  if (r.stop_reason === 'refusal') return 'rifiuto';
  const testo = r.content.find((b) => b.type === 'text')?.text;
  if (!testo) throw new Error('risposta vuota');
  return JSON.parse(testo);
}

Deno.serve(async (req) => {
  const risposta = risposte(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  const chi = await chiChiama(db, req, undefined);
  if (chi?.tipo !== 'utente') return risposta({ errore: 'accesso richiesto' }, 401);
  const io = chi.id;
  const giorno = R.iso(R.giornoRoma(new Date()));

  const scrivi = async (r: Record<string, unknown>) => {
    const { error } = await db.from('tutor_richieste').insert({ profilo_id: io, giorno, ...r });
    if (error) throw new Error(`storico: ${error.message}`);
  };
  async function chiamateDiOggi() {
    const { count } = await db.from('tutor_richieste').select('id', { count: 'exact', head: true }).eq('profilo_id', io).eq('giorno', giorno).eq('ia', true);
    return count ?? 0;
  }

  try {
    const corpo = await leggiCorpo<{ azione: string; compito_id: string; testo: string; argomento: string }>(req);
    const azione = corpo.azione ?? 'apri';

    if (azione === 'spiegamelo') {
      const argomento = testoDiLani(corpo.argomento, 2, TUTOR.argomento_max_caratteri);
      const testo = testoDiLani(corpo.testo, TUTOR.spiegamelo_min_caratteri, TUTOR.spiegamelo_max_caratteri);
      if (!argomento || !testo) return risposta({ errore: 'testo troppo corto', minimo: TUTOR.spiegamelo_min_caratteri }, 400);
      if (tettoRaggiunto(await chiamateDiOggi())) {
        await scrivi({ tipo: 'spiegamelo', argomento, testo, esito: 'tetto' });
        return risposta({ errore: 'tetto' }, 429);
      }
      let uscita: unknown;
      try {
        uscita = await chiedi(ISTRUZIONI_SPIEGAMELO, SCHEMA_SPIEGAMELO, { argomento, spiegazione_di_lei: testo });
      } catch (e) {
        await scrivi({ tipo: 'spiegamelo', argomento, testo, ia: true, esito: 'errore' });
        throw e;
      }
      if (uscita === 'rifiuto') {
        await scrivi({ tipo: 'spiegamelo', argomento, testo, ia: true, esito: 'errore' });
        return risposta({ errore: 'non disponibile' }, 502);
      }
      await scrivi({ tipo: 'spiegamelo', argomento, testo, ia: true, risposta: uscita });
      return risposta(uscita);
    }

    const { compito_id } = corpo;
    if (typeof compito_id !== 'string') return risposta({ errore: 'compito non trovato' }, 404);
    const { data: c } = await db.from('compiti').select('testo, materia_id, materie(nome)').eq('id', compito_id).maybeSingle();
    if (!c) return risposta({ errore: 'compito non trovato' }, 404);

    const { data: salvato } = await db.from('tutor_aiuti').select('testo_compito, spiegazione, indizi').eq('compito_id', compito_id).maybeSingle();
    const aiuto = salvato && salvato.testo_compito === c.testo ? (salvato as { spiegazione: string; indizi: string[] }) : null;
    // tentativo e indizi già visti: di questa persona, su questo compito (gli indizi della risposta per il testo di adesso)
    const { data: fatte } = await db
      .from('tutor_richieste')
      .select('tipo, testo, risposta, creato_il')
      .eq('compito_id', compito_id)
      .eq('profilo_id', io)
      .in('tipo', ['tentativo', 'indizio'])
      .order('creato_il', { ascending: false });
    const tentativo = (fatte ?? []).find((f) => f.tipo === 'tentativo')?.testo ?? null;
    const visti = aiuto ? (fatte ?? []).filter((f) => f.tipo === 'indizio' && (f.risposta as { testo_compito?: string } | null)?.testo_compito === c.testo).length : 0;
    const stato = (a: { spiegazione: string; indizi: string[] }, n: number) => ({
      spiegazione: a.spiegazione,
      tentativo,
      indizi: a.indizi.slice(0, n),
      totale_indizi: a.indizi.length,
    });

    if (azione === 'tentativo') {
      const testo = testoDiLani(corpo.testo, TUTOR.tentativo_min_caratteri, TUTOR.tentativo_max_caratteri);
      if (!testo) return risposta({ errore: 'testo troppo corto', minimo: TUTOR.tentativo_min_caratteri }, 400);
      await scrivi({ tipo: 'tentativo', compito_id, testo });
      return risposta({ tentativo: testo });
    }

    if (azione === 'indizio') {
      if (!aiuto) return risposta({ errore: 'prima la spiegazione' }, 409);
      if (!tentativo) return risposta({ errore: 'prima il tentativo' }, 409);
      if (visti >= aiuto.indizi.length) return risposta(stato(aiuto, visti));
      await scrivi({ tipo: 'indizio', compito_id, risposta: { n: visti + 1, indizio: aiuto.indizi[visti], testo_compito: c.testo } });
      return risposta(stato(aiuto, visti + 1));
    }

    if (azione !== 'apri') return risposta({ errore: 'azione sconosciuta' }, 400);
    // una risposta dell'IA per compito: resta finché il testo del compito non cambia
    if (aiuto) {
      await scrivi({ tipo: 'spiegazione', compito_id });
      return risposta(stato(aiuto, visti));
    }

    const da = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
    const { data: lezioni } = await db.from('lezioni').select('argomento').eq('materia_id', c.materia_id ?? '').gte('data', da);
    const chiave = c.materia_id === 'arte_e_immagine' ? 'arte' : (c.materia_id ?? '');
    const libri = mappa.libri
      .filter((l) => chiave && l.materia.toLowerCase().replace(/[^a-z]+/g, '_').startsWith(chiave))
      .map((l) => ({ titolo: l.titolo, volumi: (l as { volumi?: unknown }).volumi ?? null }));
    const domanda = {
      materia: (c.materie as { nome?: string } | null)?.nome ?? null,
      compito: c.testo,
      argomenti_delle_ultime_lezioni: (lezioni ?? []).map((l) => l.argomento).filter(Boolean),
      indice_libro: libri,
    };

    // al massimo due chiamate: se la prima contiene il risultato, si rifà una volta con l'avviso
    for (let giro = 0; giro < 2; giro++) {
      if (tettoRaggiunto(await chiamateDiOggi())) {
        await scrivi({ tipo: 'spiegazione', compito_id, esito: 'tetto' });
        return risposta({ errore: 'tetto' }, 429);
      }
      let uscita: Aiuto | 'rifiuto';
      try {
        const extra = giro ? { attenzione: 'La risposta di prima conteneva il risultato del compito. Rifalla senza.' } : {};
        uscita = (await chiedi(ISTRUZIONI_AIUTO, SCHEMA_AIUTO, { ...domanda, ...extra })) as Aiuto | 'rifiuto';
      } catch (e) {
        await scrivi({ tipo: 'spiegazione', compito_id, ia: true, esito: 'errore' });
        throw e;
      }
      if (uscita === 'rifiuto') {
        await scrivi({ tipo: 'spiegazione', compito_id, ia: true, esito: 'errore' });
        return risposta({ errore: 'non disponibile' }, 502);
      }
      const controllo = controllaAiuto(uscita);
      if (!controllo.va) {
        await scrivi({ tipo: 'spiegazione', compito_id, ia: true, esito: 'bloccata', risposta: uscita });
        continue;
      }
      const nuovo = { spiegazione: uscita.spiegazione, indizi: controllo.indizi };
      const { error } = await db
        .from('tutor_aiuti')
        .upsert({ compito_id, testo_compito: c.testo, ...nuovo, risultati: uscita.risultati ?? [] }, { onConflict: 'compito_id' });
      if (error) throw new Error(`tutor_aiuti: ${error.message}`);
      await scrivi({ tipo: 'spiegazione', compito_id, ia: true, risposta: { ...nuovo, scartati: controllo.scartati } });
      return risposta(stato(nuovo, 0));
    }
    return risposta({ errore: 'non disponibile' }, 502);
  } catch (e) {
    if (e instanceof CorpoNonValido) return risposta({ errore: e.message }, 400);
    await registraErroreServer(db, 'spiega', e);
    return risposta({ errore: 'errore del server' }, 500);
  }
});
