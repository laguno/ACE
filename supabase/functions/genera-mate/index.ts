// Edge Function "genera-mate" (blocco F del piano di studio, 19/11): per le verifiche di
// matematica dei prossimi 14 giorni senza serie prepara una serie di esercizi mescolati con Claude,
// come genera-studio: argomento della verifica, compiti che la citano, lezioni recenti e indice del
// libro (titoli e pagine, mai il testo). Ogni problema ha i passaggi (per gli esempi svolti che si
// svuotano) e, se è a parole, il modello a barre. Quello che scrive l'IA si controlla con
// src/lib/mate (serieValida): i problemi storti si scartano, una serie troppo povera non si salva.
// La chiamano il cron (0063, segreto del cron) o un genitore.
import Anthropic from 'npm:@anthropic-ai/sdk';
import { dbServizio, registraErroreServer } from '../_shared/ambiente.ts';
import mappa from '../../../data/mappa-libri.json' with { type: 'json' };
import * as R from '../../../src/lib/regole/index.ts';
import * as M from '../../../src/lib/mate/index.ts';
import { chiChiama, cronOGenitore } from '../_shared/accesso.ts';

const db = dbServizio();
const claude = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
const PER_GIRO = 2; // ponytail: al massimo 2 serie nuove per chiamata, per tempi e costi contenuti

const SEGMENTO = {
  type: 'object',
  additionalProperties: false,
  required: ['testo', 'parti', 'incognita'],
  properties: {
    testo: { type: 'string', description: 'quello che si scrive nel pezzo: un numero noto, "?" per quello che si cerca, o vuoto' },
    parti: { type: 'integer', description: 'lunghezza del pezzo in parti uguali (da 1 a 12), proporzionata ai valori' },
    incognita: { type: 'boolean' },
  },
} as const;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['problemi'],
  properties: {
    problemi: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['metodo', 'perche_metodo', 'testo', 'passaggi', 'risposta', 'unita', 'barre'],
        properties: {
          metodo: { type: 'string', description: 'nome breve del metodo, due o tre parole, uguale per tutti i problemi che si risolvono così' },
          perche_metodo: { type: 'string', description: 'una frase: quale indizio del testo fa scegliere questo metodo' },
          testo: { type: 'string' },
          passaggi: {
            type: 'array',
            description: 'da 2 a 4 passaggi; il risultato dell\'ultimo è la risposta',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['cosa', 'calcolo', 'risultato'],
              properties: {
                cosa: { type: 'string', description: 'cosa si fa, in parole, senza il risultato' },
                calcolo: { type: 'string', description: 'il conto, es. "48 : 4"' },
                risultato: { type: 'string', description: 'solo il numero (o la frazione), senza unità' },
              },
            },
          },
          risposta: { type: 'string', description: 'solo il numero o la frazione, scritta all\'italiana (virgola per i decimali)' },
          unita: { type: 'string', description: 'unità della risposta (cm, €, kg...) o vuoto' },
          barre: {
            type: 'object',
            additionalProperties: false,
            required: ['barre', 'totale'],
            description: 'modello a barre di Singapore per i problemi a parole; barre vuote per gli altri',
            properties: {
              barre: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['nome', 'segmenti'],
                  properties: { nome: { type: 'string' }, segmenti: { type: 'array', items: SEGMENTO } },
                },
              },
              totale: { type: 'string', description: 'il totale di tutte le barre se il testo lo dà (es. "48"), "?" se si cerca, vuoto se non serve' },
            },
          },
        },
      },
    },
  },
} as const;

const ISTRUZIONI = `Prepari esercizi di matematica per una ragazza di 12 anni in seconda media (scuola italiana).
Scrivi in italiano semplice, frasi brevi, dai del tu. Niente emoji.
Ti do l'argomento di una verifica di matematica, i compiti assegnati, gli argomenti delle ultime lezioni e l'indice del libro.
Prepara da 8 a 10 problemi su quell'argomento, del livello di una verifica di seconda media: niente di più difficile.
Regole:
- usa da 3 a 4 metodi diversi (per esempio, sulle frazioni: "frazione di un numero", "dalla parte all'intero", "confronto di frazioni"), almeno 2 problemi per metodo; il nome del metodo è identico in tutti i problemi che lo usano;
- i problemi di metodi diversi devono assomigliarsi in superficie: chi li fa deve leggere bene per capire quale metodo serve;
- ogni problema ha da 2 a 4 passaggi brevi, ognuno con un solo conto; il risultato dell'ultimo passaggio è la risposta;
- numeri piccoli e risultati interi o decimali semplici; decimali con la virgola;
- per i problemi a parole con quantità da confrontare o da dividere, aggiungi il modello a barre: una barra per ogni persona o quantità, pezzi in parti uguali proporzionati ai valori, "?" nel pezzo che si cerca; il modello a barre non deve mai contenere la risposta. Per gli altri problemi barre vuote e totale vuoto.
Se l'argomento è vago, resta sulle basi dell'argomento più probabile secondo le lezioni e l'indice.`;

const libri = () => mappa.libri.filter((l) => l.materia.toLowerCase().startsWith('matematic')).map((l) => ({ titolo: l.titolo, volumi: (l as { volumi?: unknown }).volumi ?? null }));

async function genera(v: { materia_id: string | null; data: string; argomento: string | null; tipo: string }) {
  const da = new Date(Date.now() - 21 * 864e5).toISOString().slice(0, 10);
  const [{ data: compiti }, { data: lezioni }] = await Promise.all([
    db.from('compiti').select('testo').eq('materia_id', 'matematica').gte('scadenza', da),
    db.from('lezioni').select('data, argomento').eq('materia_id', 'matematica').gte('data', da).order('data'),
  ]);
  const contesto = {
    verifica: { tipo: v.tipo, data: v.data, argomento: v.argomento },
    compiti: (compiti ?? []).map((c) => c.testo),
    lezioni: (lezioni ?? []).filter((l) => l.argomento).map((l) => `${l.data}: ${l.argomento}`),
    indice_libro: libri(),
  };
  const risposta = await claude.beta.messages.create({
    model: 'claude-sonnet-5-5', // come genera-studio (decisione del signore, 8/11)
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
  return (JSON.parse(testo.text) as { problemi: M.Problema[] }).problemi;
}

async function prepara() {
  const oggi = R.giornoRoma(new Date());
  const fra14 = new Date(oggi);
  fra14.setDate(fra14.getDate() + 14);
  const { data: verifiche, error } = await db
    .from('verifiche')
    .select('id, materia_id, data, argomento, tipo, mate_serie(id)')
    .eq('materia_id', 'matematica')
    .gt('data', R.iso(oggi))
    .lte('data', R.iso(fra14))
    .order('data');
  if (error) throw new Error(`verifiche: ${error.message}`);

  let generate = 0;
  const errori: string[] = [];
  for (const v of verifiche ?? []) {
    if ((v.mate_serie as unknown[]).length || generate >= PER_GIRO) continue;
    try {
      const problemi = M.serieValida(await genera(v));
      if (!problemi) throw new Error('serie troppo povera dopo il controllo');
      const { error: e } = await db
        .from('mate_serie')
        .upsert({ verifica_id: v.id, materia_id: v.materia_id, argomento: v.argomento ?? '', problemi }, { onConflict: 'verifica_id', ignoreDuplicates: true });
      if (e) throw new Error(`mate_serie: ${e.message}`);
      generate++;
    } catch (e) {
      errori.push(`${v.data}: ${e instanceof Error ? e.message : 'errore'}`);
    }
  }
  return { verifiche: verifiche?.length ?? 0, generate, errori };
}

const autorizzato = async (req: Request) => cronOGenitore(await chiChiama(db, req, Deno.env.get('CRON_SEGRETO')));

const risposta = (corpo: unknown, stato = 200) =>
  new Response(JSON.stringify(corpo), { status: stato, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (!(await autorizzato(req))) return risposta({ errore: 'solo il cron o un genitore' }, 401);
  try {
    return risposta(await prepara());
  } catch (e) {
    await registraErroreServer(db, 'genera-mate', e);
    return risposta({ errore: e instanceof Error ? e.message : 'errore imprevisto' }, 500);
  }
});
