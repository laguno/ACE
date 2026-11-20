// Blocco H: controllo automatico delle carte generate dall'IA prima di salvarle (genera-studio vera,
// su PGlite, con Claude finto: prima risposta = generazione, seconda = controllo).
process.env.TZ = 'Europe/Rome';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ia, RIFIUTO } from './anthropic-finto';
import { carica, creaBanco, LANI, richiesta, stato, valore } from './banco';
import { benFormata, benFormataDomanda, controllaCarte } from '../_shared/controllo-carte.ts';
import Anthropic from './anthropic-finto';

vi.mock('../_shared/ambiente.ts', async (originale) => {
  const vero = await originale<typeof import('../_shared/ambiente.ts')>();
  const { stato: s } = await import('./banco');
  return { ...vero, dbServizio: () => s.banco!.s, ambiente: (n: string) => (s.banco!.env as Record<string, string>)[n] ?? 'finto' };
});

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-24T17:00:00+01:00'));
});
afterAll(() => vi.useRealTimers());
beforeEach(async () => {
  await creaBanco();
  ia.coda.length = 0;
  ia.chiamate.length = 0;
  ia.rifiuta = false;
  await stato.banco!.come(null, `insert into materie values ('scienze', 'Scienze', 'Sci')`);
  await stato.banco!.come(null, `insert into verifiche (id, materia_id, data, argomento) values ('${VERIFICA}', 'scienze', '2026-11-30', 'La cellula')`);
});
const VERIFICA = '00000000-0000-0000-0000-0000000000f1';
const json = async (r: Response) => ({ stato: r.status, corpo: await r.json() });

const GENERATE = {
  pagine_probabili: 'pag. 40-45',
  flashcard: [
    { tipo: 'domanda', fronte: 'Che cosa contiene il DNA?', retro: 'Il nucleo.' }, // 1: il controllore la boccia (risposta sbagliata)
    { tipo: 'completa', fronte: 'La cellula è l’unità di base dei viventi.', retro: 'cellula' }, // manca ___: scartata senza IA
    { tipo: 'vero_falso', fronte: 'Le cellule vegetali hanno la parete.', retro: 'Vero. La parete le sostiene.' }, // 2: passa
    { tipo: 'completa', fronte: 'Il ___ fa la fotosintesi.', retro: 'cloroplasto' }, // 3: passa
  ],
  quiz: [
    { testo: 'Dove sta il DNA?', opzioni: ['Nucleo', 'Membrana', 'Parete', 'Vacuolo'], giusta: 0, spiegazione: 'Nel nucleo.' }, // 1: passa
    { testo: 'Quale ha la parete?', opzioni: ['Vegetale', 'Batterica', 'Animale', 'Nessuna'], giusta: 0, spiegazione: '...' }, // 2: due giuste
    { testo: 'Chi fa la fotosintesi?', opzioni: ['Mitocondrio', 'Cloroplasto', 'Nucleo', 'Ribosoma'], giusta: 0, spiegazione: '...' }, // 3: segnata sbagliata
    { testo: 'Doppia?', opzioni: ['Sì', 'sì', 'No', 'Forse'], giusta: 2, spiegazione: '...' }, // opzioni uguali: scartata senza IA
  ],
};
const CONTROLLO = {
  flashcard: [
    { numero: 1, corretta: false, chiara: true, adatta: true, motivo: 'Il DNA sta nel nucleo, non lo contiene.' },
    { numero: 2, corretta: true, chiara: true, adatta: true, motivo: '' },
    { numero: 3, corretta: true, chiara: true, adatta: true, motivo: '' },
  ],
  quiz: [
    { numero: 1, giuste: [0], adatta: true, motivo: '' },
    { numero: 2, giuste: [0, 1], adatta: true, motivo: 'Anche i batteri hanno la parete.' },
    { numero: 3, giuste: [1], adatta: true, motivo: '' },
  ],
};
const lancia = async () => json(await (await carica('genera-studio'))(richiesta({}, { cron: true })));
const testoControllo = () => {
  const c = ia.chiamate[1] as { messages: { content: { type: string; text?: string }[] }[] };
  return c.messages[0].content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
};

describe('genera-studio: controllo delle carte', () => {
  it('entrano solo le carte e le domande che passano; il controllore non vede la risposta segnata', async () => {
    ia.coda.push(GENERATE, CONTROLLO);
    const { stato: s, corpo } = await lancia();
    expect(s).toBe(200);
    expect(corpo).toMatchObject({ generate: 1, scartate: 5, errori: [] });
    expect(ia.chiamate).toHaveLength(2);
    expect((ia.chiamate[1] as { model: string }).model).toBe('claude-sonnet-5-5');

    const fronti = (await stato.banco!.come(null, `select fronte from flashcard order by fronte`)).rows.map((r) => r.fronte);
    expect(fronti).toEqual(['Il ___ fa la fotosintesi.', 'Le cellule vegetali hanno la parete.']);
    const domande = (await valore(`select domande from quiz where verifica_id = '${VERIFICA}'`)) as { testo: string }[];
    expect(domande.map((d) => d.testo)).toEqual(['Dove sta il DNA?']);

    // al controllore arrivano le domande senza "giusta" né spiegazione, e il materiale di partenza
    const t = testoControllo();
    expect(t).toContain('La cellula');
    expect(t).not.toContain('"giusta"');
    expect(t).not.toContain('Nel nucleo.');
    expect(t).not.toContain('Doppia?');
  });

  it('controllo fallito: non entra niente, errore nel giro, si riprova dopo', async () => {
    ia.coda.push(GENERATE, new Error('rete'));
    const { corpo } = await lancia();
    expect(corpo.generate).toBe(0);
    expect(corpo.errori).toHaveLength(1);
    expect(await valore(`select count(*)::int from flashcard`)).toBe(0);
    expect(await valore(`select count(*)::int from quiz`)).toBe(0);

    ia.coda.push(GENERATE, CONTROLLO);
    expect((await lancia()).corpo.generate).toBe(1);
    expect(await valore(`select count(*)::int from quiz`)).toBe(1);
  });

  it('rifiuto del controllo: niente salvato', async () => {
    ia.coda.push(GENERATE, RIFIUTO); // la generazione risponde, il controllo rifiuta
    const { corpo } = await lancia();
    expect(corpo.errori[0]).toContain('controllo delle carte rifiutato');
    expect(await valore(`select count(*)::int from flashcard`)).toBe(0);
  });

  it('nessuna domanda passa: le carte buone entrano, il quiz no (si rifà al giro dopo)', async () => {
    ia.coda.push(GENERATE, { ...CONTROLLO, quiz: CONTROLLO.quiz.map((q) => ({ ...q, giuste: [] })) });
    const { corpo } = await lancia();
    expect(corpo.errori[0]).toContain('nessuna domanda ha passato il controllo');
    expect(await valore(`select count(*)::int from flashcard`)).toBe(2);
    expect(await valore(`select count(*)::int from quiz`)).toBe(0);
  });

  it('carta segnalata da Lani: va al generatore e al controllore, resta fuori dal giro e non si riaccende', async () => {
    await stato.banco!.come(null, `insert into flashcard (materia_id, argomento, fronte, retro, verifica_id) values ('scienze', 'La cellula', 'Il ___ fa la fotosintesi.', 'mitocondrio', '${VERIFICA}')`);
    await stato.banco!.come(LANI, `update flashcard set segnalata_sbagliata = true`);
    ia.coda.push(GENERATE, CONTROLLO);
    await lancia();
    expect(JSON.stringify((ia.chiamate[0] as { messages: unknown }).messages)).toContain('mitocondrio');
    expect(testoControllo()).toContain('segnalate_sbagliate_da_lani');
    // la carta rigenerata con lo stesso fronte non riaccende quella segnalata
    expect(await valore(`select segnalata_sbagliata from flashcard where fronte = 'Il ___ fa la fotosintesi.'`)).toBe(true);
    // e Lani non la rimette in giro
    await stato.banco!.come(LANI, `update flashcard set segnalata_sbagliata = false, prossima_revisione = oggi() where fronte = 'Il ___ fa la fotosintesi.'`);
    expect(await valore(`select segnalata_sbagliata from flashcard where fronte = 'Il ___ fa la fotosintesi.'`)).toBe(true);
  });
});

describe('foto-studio: controllo delle carte', () => {
  const RICHIESTA = '00000000-0000-0000-0000-0000000000e1';
  const FOTO = { foto: [{ numero: 1, pagine: '40' }], ...GENERATE };
  beforeEach(async () => {
    await stato.banco!.db.exec(`
      insert into richieste_foto (id, motivo, materia_id, pagine, verifica_id) values ('${RICHIESTA}', 'verifica', 'scienze', 'pag. 40', '${VERIFICA}');
      insert into storage.objects (bucket_id, name) values ('foto-pagine', 'scienze/1.jpg');
      insert into foto_pagine (richiesta_id, materia_id, percorso_storage, caricata_da) values ('${RICHIESTA}', 'scienze', 'scienze/1.jpg', '${LANI}');`);
  });
  const lanciaFoto = async () => json(await (await carica('foto-studio'))(richiesta({ richiesta_id: RICHIESTA }, { gettone: 'gettone-lani' })));

  it('il controllore vede le stesse foto; entrano solo carte e domande che passano', async () => {
    ia.coda.push(FOTO, CONTROLLO);
    const { stato: s, corpo } = await lanciaFoto();
    expect(s).toBe(200);
    expect(corpo).toMatchObject({ carte: 2, domande: 1, scartate: 5, restano: 0 });
    const c = ia.chiamate[1] as { model: string; messages: { content: { type: string }[] }[] };
    expect(c.model).toBe('claude-sonnet-5-5');
    expect(c.messages[0].content.filter((b) => b.type === 'image')).toHaveLength(1);
    expect(testoControllo()).toContain('solo quello che si vede');
    expect(await valore(`select count(*)::int from flashcard where fonte = 'foto'`)).toBe(2);
    expect(((await valore(`select domande from quiz`)) as unknown[]).length).toBe(1);
  });

  it('controllo fallito: niente salvato, le foto restano da fare e si riprovano', async () => {
    ia.coda.push(FOTO, new Error('rete'));
    expect((await lanciaFoto()).stato).toBe(500);
    expect(await valore(`select count(*)::int from flashcard`)).toBe(0);
    expect(await valore(`select count(*)::int from foto_pagine where studio_il is null`)).toBe(1);
    ia.coda.push(FOTO, CONTROLLO);
    expect((await lanciaFoto()).corpo).toMatchObject({ carte: 2, domande: 1 });
  });
});

describe('controllaCarte', () => {
  it('forma: completa con ___, vero/falso che inizia con Vero o Falso, opzioni diverse e indice valido', () => {
    expect(benFormata({ tipo: 'completa', fronte: 'Il ___ batte.', retro: 'cuore' })).toBe(true);
    expect(benFormata({ tipo: 'vero_falso', fronte: 'X', retro: 'Forse.' })).toBe(false);
    expect(benFormata({ tipo: 'domanda', fronte: ' ', retro: 'x' })).toBe(false);
    expect(benFormata({ tipo: 'altro', fronte: 'x', retro: 'y' })).toBe(false);
    expect(benFormataDomanda({ testo: 'x', opzioni: ['a', 'b'], giusta: 2, spiegazione: '' })).toBe(false);
    expect(benFormataDomanda({ testo: 'x', opzioni: ['a', 'b'], giusta: 1, spiegazione: '' })).toBe(true);
  });

  it('giudizio mancante = bocciata; niente da controllare = nessuna chiamata', async () => {
    const claude = new Anthropic() as never;
    ia.coda.push({ flashcard: [], quiz: [{ numero: 1, giuste: [1], adatta: true, motivo: '' }] });
    const r = await controllaCarte(claude, {
      materiale: [],
      fonte: 'foto',
      flashcard: [{ tipo: 'domanda', fronte: 'a', retro: 'b' }],
      quiz: [{ testo: 'q', opzioni: ['x', 'y'], giusta: 1, spiegazione: '' }],
    });
    expect(r.flashcard).toHaveLength(0);
    expect(r.quiz).toHaveLength(1);
    expect(r.motivi[0]).toContain('senza giudizio');
    const prima = ia.chiamate.length;
    expect((await controllaCarte(claude, { materiale: [], fonte: 'foto', flashcard: [], quiz: [] })).quiz).toEqual([]);
    expect(ia.chiamate.length).toBe(prima);
    expect(String((ia.chiamate[0] as { messages: { content: { text?: string }[] }[] }).messages[0].content.at(-1)?.text)).toContain('solo quello che si vede');
  });
});
