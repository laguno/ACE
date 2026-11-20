// Edge Function "foto-studio": dopo "Ho finito" su una richiesta di foto (compito o verifica), legge
// le pagine fotografate e le aggiunge a flash card e quiz della prossima verifica della stessa
// materia; poi manda una notifica (a Lani se carica un genitore, ai genitori se carica Lani). Le foto sono dal libro di carta: l'IA ne ricava
// domande con parole sue, non ricopia il testo (CLAUDE.md, regole).
// Prima di salvare, ogni carta e ogni domanda passa il controllo di _shared/controllo-carte.ts
// contro le stesse foto (seconda chiamata a Claude): quelle che non passano non entrano.
// La chiamano l'app (con { richiesta_id }) o il cron ogni ora (foto ferme da più di un'ora); ripeterla non duplica niente.
import Anthropic from 'npm:@anthropic-ai/sdk';
import { dbServizio, registraErroreServer } from '../_shared/ambiente.ts';
import { chiChiama, CorpoNonValido, cors, leggiCorpo, risposte } from '../_shared/accesso.ts';
import { inviaPush } from '../_shared/push.ts';
import { controllaCarte, segnalate } from '../_shared/controllo-carte.ts';
import * as R from '../../../src/lib/regole/index.ts';

const db = dbServizio();
const claude = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
const MAX_FOTO = 8; // foto per chiamata: tempi e avanzamento dell’app

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['flashcard', 'quiz', 'foto'],
  properties: {
    foto: {
      type: 'array',
      description: 'Per ogni foto, in ordine, i numeri di pagina stampati che si leggono',
      items: { type: 'object', additionalProperties: false, required: ['numero', 'pagine'], properties: { numero: { type: 'integer', description: 'posizione della foto, da 1' }, pagine: { type: 'string', description: 'es. "110, 111"; stringa vuota se il numero di pagina non si legge' } } },
    },
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
Ti do le foto di alcune pagine del suo libro di carta e il contesto della prova.
Scrivi in italiano semplice, frasi brevi, dai del tu. Niente emoji.
Usa SOLO quello che si vede nelle pagine: niente fatti presi da fuori. Con parole tue, senza ricopiare frasi intere del libro.
Restituisci:
- da 8 a 12 flash card, mescolando tre tipi: "domanda" (domanda breve, risposta in una riga), "completa" (frase con ___ al posto della parola chiave; il retro è la parola), "vero_falso" (affermazione; il retro inizia con "Vero." o "Falso." e dice il perché in una frase);
- da 5 a 8 domande di quiz, 4 opzioni ciascuna, una sola giusta, con una spiegazione di una o due frasi;
- per ogni foto i numeri di pagina stampati che vedi (vale anche per gli appunti scritti a mano se riportano il numero di pagina); vuoto se non si leggono, mai indovinati.
Se una foto è illeggibile, saltala. Se nessuna foto è leggibile, restituisci liste vuote.`;

async function aggiungiDaFoto(richiestaId: string, avvisa: 'lani' | 'genitore') {
  const { data: r, error } = await db.from('richieste_foto').select('id, materia_id, pagine, verifica_id, materie(nome)').eq('id', richiestaId).maybeSingle();
  if (error) throw new Error(`richiesta: ${error.message}`);
  if (!r) throw new CorpoNonValido('richiesta sconosciuta');

  const oggi = R.iso(R.giornoRoma(new Date()));
  // la verifica della richiesta, se c'è e non è passata; se no la prossima della stessa materia
  let verificaQuery = db.from('verifiche').select('id, data, tipo, argomento, materia_id').gte('data', oggi).order('data').limit(1);
  verificaQuery = r.verifica_id ? verificaQuery.eq('id', r.verifica_id) : verificaQuery.eq('materia_id', r.materia_id ?? '');
  const { data: ver } = await verificaQuery;
  const verifica = ver?.[0];
  if (!verifica) return { carte: 0, domande: 0, motivo: 'nessuna verifica in arrivo per la materia' };

  const { data: foto } = await db.from('foto_pagine').select('id, percorso_storage').eq('richiesta_id', richiestaId).is('studio_il', null).order('caricata_il').limit(MAX_FOTO);
  const idFoto: string[] = [];
  const immagini: { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }[] = [];
  for (const f of foto ?? []) {
    const { data: blob } = await db.storage.from('foto-pagine').download(f.percorso_storage);
    if (!blob) continue;
    const dati = new Uint8Array(await blob.arrayBuffer());
    let bin = '';
    for (let i = 0; i < dati.length; i += 0x8000) bin += String.fromCharCode(...dati.subarray(i, i + 0x8000));
    idFoto.push(f.id);
    immagini.push({ type: 'image', source: { type: 'base64', media_type: blob.type || 'image/jpeg', data: btoa(bin) } });
  }
  if (!immagini.length) return { carte: 0, domande: 0, motivo: 'nessuna foto nuova' };

  const { data: quiz } = await db.from('quiz').select('id, domande').eq('verifica_id', verifica.id).limit(1);
  const esistenti = (quiz?.[0]?.domande ?? []) as unknown[];

  const materia = (r.materie as unknown as { nome: string } | null)?.nome ?? 'scuola';
  const giaSegnalate = await segnalate(db, verifica.materia_id);
  const contesto = { prova: { tipo: verifica.tipo, materia, data: verifica.data, argomento: verifica.argomento }, pagine_richieste: r.pagine, carte_segnalate_sbagliate: giaSegnalate };
  const ris = await claude.beta.messages.create({
    model: 'claude-sonnet-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    system: ISTRUZIONI,
    messages: [{ role: 'user', content: [...immagini, { type: 'text', text: JSON.stringify(contesto) }] }],
  } as never);
  if (ris.stop_reason === 'refusal') throw new Error('richiesta rifiutata');
  const testo = ris.content.find((b: { type: string }) => b.type === 'text') as { text: string } | undefined;
  if (!testo) throw new Error('risposta senza testo');
  const g = JSON.parse(testo.text) as { foto: { numero: number; pagine: string }[]; flashcard: { tipo: string; fronte: string; retro: string }[]; quiz: { testo: string; opzioni: string[]; giusta: number; spiegazione: string }[] };
  // controllo contro le stesse foto: se fallisce non entra niente e le foto restano da fare
  const controllo = await controllaCarte(claude, {
    materiale: [...immagini, { type: 'text', text: JSON.stringify(contesto) }],
    fonte: 'foto',
    flashcard: g.flashcard,
    quiz: g.quiz,
    segnalate: giaSegnalate,
  });
  if (controllo.motivi.length) console.log('foto-studio, scartate', richiestaId, controllo.motivi);

  // pagine viste: solo dove nessuno le ha scritte a mano
  for (const p of g.foto) {
    const id = idFoto[p.numero - 1];
    if (id && /\d/.test(p.pagine)) await db.from('foto_pagine').update({ pagine_viste: p.pagine }).eq('id', id).is('pagine_viste', null);
  }

  const carte = controllo.flashcard.map((f) => ({ materia_id: verifica.materia_id, argomento: verifica.argomento ?? '', tipo: f.tipo, fronte: f.fronte, retro: f.retro, fonte: 'foto', verifica_id: verifica.id }));
  if (carte.length) {
    const { error: e1 } = await db.from('flashcard').upsert(carte, { onConflict: 'materia_id,fronte', ignoreDuplicates: true });
    if (e1) throw new Error(`flashcard: ${e1.message}`);
  }
  const nuove = controllo.quiz.map((q) => ({ ...q, richiesta_foto: richiestaId }));
  if (nuove.length) {
    if (quiz?.[0]) {
      const { error: e2 } = await db.from('quiz').update({ domande: [...esistenti, ...nuove] }).eq('id', quiz[0].id);
      if (e2) throw new Error(`quiz: ${e2.message}`);
    } else {
      const { error: e2 } = await db.from('quiz').insert({ materia_id: verifica.materia_id, argomento: verifica.argomento ?? '', verifica_id: verifica.id, domande: nuove });
      if (e2) throw new Error(`quiz: ${e2.message}`);
    }
  }
  // queste foto sono passate: un nuovo lancio guarda solo quelle aggiunte dopo
  await db.from('foto_pagine').update({ studio_il: new Date().toISOString() }).in('id', idFoto);
  if (carte.length || nuove.length) {
    // niente rimproveri nelle notifiche, ≤ 60 caratteri
    const testo = avvisa === 'lani' ? `Nuove pagine di ${materia} da ripassare` : `Lani ha caricato pagine di ${materia}`;
    await inviaPush(db, avvisa, { titolo: 'ACE', testo: testo.slice(0, 60), tipo: 'studio' }).catch((e) => console.error('push studio', e));
  }
  const { count } = await db.from('foto_pagine').select('id', { count: 'exact', head: true }).eq('richiesta_id', richiestaId).is('studio_il', null);
  const scartate = controllo.scartate.flashcard + controllo.scartate.quiz;
  return { carte: carte.length, domande: nuove.length, scartate, verifica_id: verifica.id, restano: count ?? 0 };
}

Deno.serve(async (req) => {
  const rispondi = risposte(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  try {
    const chi = await chiChiama(db, req, Deno.env.get('CRON_SEGRETO'));
    if (!chi) return rispondi({ errore: 'accesso richiesto' }, 401);
    if (chi.tipo === 'cron') {
      // rete di sicurezza (ogni ora): foto ferme da più di un'ora perché nessuno ha premuto "Ho finito"
      const { data: ferme } = await db.from('foto_pagine').select('richiesta_id').is('studio_il', null).not('richiesta_id', 'is', null).lt('caricata_il', new Date(Date.now() - 36e5).toISOString()).order('caricata_il').limit(200);
      const richieste = [...new Set((ferme ?? []).map((f) => f.richiesta_id as string))].slice(0, 3);
      const esiti = [];
      for (const id of richieste) {
        try {
          esiti.push({ richiesta_id: id, ...(await aggiungiDaFoto(id, 'lani')) });
        } catch (e) {
          await registraErroreServer(db, 'foto-studio', e);
        }
      }
      return rispondi({ richieste: esiti });
    }
    const { richiesta_id } = await leggiCorpo<{ richiesta_id: string }>(req);
    if (typeof richiesta_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(richiesta_id)) throw new CorpoNonValido('richiesta_id non valido');
    // chi carica non riceve l'avviso: se è Lani lo ricevono i genitori, se è un genitore lo riceve Lani
    return rispondi(await aggiungiDaFoto(richiesta_id, chi.ruolo === 'lani' ? 'genitore' : 'lani'));
  } catch (e) {
    if (e instanceof CorpoNonValido) return rispondi({ errore: e.message }, 400);
    await registraErroreServer(db, 'foto-studio', e);
    return rispondi({ errore: 'errore del server' }, 500);
  }
});
