// Edge Functions chiamate dall'app (passi, premi, spiega) e dal cron (chiavi), vere, su PGlite.
process.env.TZ = 'Europe/Rome';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ia } from './anthropic-finto';
import config from '../../../data/config-gioco.json';
import { carica, creaBanco, LANI, PAPA, richiesta, stato, valore } from './banco';

vi.mock('../_shared/ambiente.ts', async (originale) => {
  const vero = await originale<typeof import('../_shared/ambiente.ts')>();
  const { stato: s } = await import('./banco');
  return { ...vero, dbServizio: () => s.banco!.s, ambiente: (n: string) => (s.banco!.env as Record<string, string>)[n] ?? 'finto' };
});

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-24T17:00:00+01:00')); // martedì, gioco già partito
});
afterAll(() => vi.useRealTimers());
beforeEach(async () => {
  await creaBanco();
  ia.coda.length = 0;
  ia.chiamate.length = 0;
  ia.rifiuta = false;
});
const json = async (r: Response) => ({ stato: r.status, corpo: await r.json() });
const COMPITO = '00000000-0000-0000-0000-0000000000c1';

describe('passi', () => {
  it('senza accesso 401; CORS solo per ACE; preflight', async () => {
    const f = await carica('passi');
    expect((await f(richiesta({ tipo: 'compito', id: COMPITO }))).status).toBe(401);
    const pre = await f(richiesta({}, { metodo: 'OPTIONS', origine: 'https://evil.example' }));
    expect(pre.headers.get('Access-Control-Allow-Origin')).toBe('https://ace-passino.vercel.app');
  });
  it('compito spuntato in anticipo: 13 passi, una volta sola', async () => {
    await stato.banco!.come(null, `insert into compiti (id, testo, scadenza, fatto_il) values ('${COMPITO}', 'Es. 1', '2026-11-27', '2026-11-24T16:00:00+01:00')`);
    const f = await carica('passi');
    const primo = await json(await f(richiesta({ tipo: 'compito', id: COMPITO }, { gettone: 'gettone-lani' })));
    expect(primo).toMatchObject({ stato: 200, corpo: { passi: 13, motivo: 'compito' } });
    const secondo = await json(await f(richiesta({ tipo: 'compito', id: COMPITO }, { gettone: 'gettone-lani' })));
    expect(secondo.corpo).toMatchObject({ passi: 0, perche: 'già registrato' });
    expect(await valore(`select sum(passi)::int from movimenti_passi`)).toBe(13);
  });
  it('richieste sbagliate: 400, mai 500', async () => {
    const f = await carica('passi');
    for (const corpo of [{ tipo: 'constructor', id: 'x' }, { tipo: 'compito' }, { tipo: 'compito', id: 'x'.repeat(101) }, { tipo: 'compito', id: COMPITO }])
      expect((await f(richiesta(corpo, { gettone: 'gettone-lani' }))).status).toBe(400);
    const grande = new Request('https://finto/x', { method: 'POST', headers: { Authorization: 'Bearer gettone-lani' }, body: 'x'.repeat(5000) });
    expect((await f(grande)).status).toBe(400);
  });
  it('piano studio: pillola una volta al giorno; ripasso della vigilia vale in più', async () => {
    const b = stato.banco!;
    const f = await carica('passi');
    const giro = (id: string) =>
      b.come(null, `insert into flashcard_giri (id, iniziato_il, fatto_il, carte, sapevo, quasi, non_sapevo) values ('${id}', '2026-11-24T16:00:00+01:00', '2026-11-24T16:05:00+01:00', 8, 2, 3, 3)`);
    await giro('00000000-0000-0000-0000-0000000000a1');
    await giro('00000000-0000-0000-0000-0000000000a2');
    const p1 = await json(await f(richiesta({ tipo: 'pillola', id: '00000000-0000-0000-0000-0000000000a1' }, { gettone: 'gettone-lani' })));
    const p2 = await json(await f(richiesta({ tipo: 'pillola', id: '00000000-0000-0000-0000-0000000000a2' }, { gettone: 'gettone-lani' })));
    expect(p1.corpo).toMatchObject({ passi: 3, motivo: 'pillola' }); // anche con poche giuste
    expect(p2.corpo).toMatchObject({ passi: 0, perche: 'già registrato' });

    await b.come(null, `insert into materie (id, nome, abbreviazione) values ('storia', 'Storia', 'STO') on conflict do nothing`);
    await b.come(null, `insert into verifiche (id, materia_id, data, argomento) values ('00000000-0000-0000-0000-0000000000e1', 'storia', '2026-11-25', 'Romani')`);
    await b.come(null, `insert into verifiche (id, materia_id, data, argomento) values ('00000000-0000-0000-0000-0000000000e2', 'storia', '2026-11-27', 'Greci')`);
    await b.come(null, `insert into sessioni_ripasso (id, verifica_id, numero, data_prevista, tipo, fatta_il) values
      ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000e1', 2, '2026-11-24', 'quiz', '2026-11-24T16:30:00+01:00'),
      ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000e2', 1, '2026-11-24', 'quiz', '2026-11-24T16:40:00+01:00')`);
    const vigilia = await json(await f(richiesta({ tipo: 'ripasso', id: '00000000-0000-0000-0000-0000000000d1' }, { gettone: 'gettone-lani' })));
    const prima = await json(await f(richiesta({ tipo: 'ripasso', id: '00000000-0000-0000-0000-0000000000d2' }, { gettone: 'gettone-lani' })));
    expect(vigilia.corpo).toMatchObject({ passi: 15 }); // 10 + 5
    expect(prima.corpo).toMatchObject({ passi: 10, motivo: 'ripasso' });
    const di = await json(await f(richiesta({ tipo: 'ripasso', id: '00000000-0000-0000-0000-0000000000d1' }, { gettone: 'gettone-lani' })));
    expect(di.corpo.passi).toBe(0);
  });
  it('un errore del database diventa 500 e finisce nel registro', async () => {
    const f = await carica('passi');
    await stato.banco!.come(null, `alter table compiti rename to compiti_rotti`);
    const r = await f(richiesta({ tipo: 'compito', id: COMPITO }, { gettone: 'gettone-lani' }));
    expect(r.status).toBe(500);
    expect(await valore(`select count(*)::int from errori_client where origine = 'funzione' and dove = 'passi'`)).toBe(1);
  });
});

describe('premi', () => {
  beforeEach(async () => {
    const c = stato.banco!.come;
    await c(null, `update forzieri set premio = 'Bici', immagine_per = 'Bici' where n in (1, 2)`);
    await c(null, `update forzieri set premio = 'Cambiato', immagine_per = 'Vecchio' where n = 3`);
    await c(null, `update forzieri set stato = 'aperto' where n = 2`);
    for (const n of [1, 2, 3]) await c(null, `insert into storage.objects (bucket_id, name) values ('premi', 'premio-${n}.webp'), ('premi', 'premio-${n}-sagoma.webp')`);
  });
  it('Lani: la sagoma; la vera solo a forziere aperto; premio cambiato = pacco', async () => {
    const f = await carica('premi');
    const { corpo } = await json(await f(richiesta({}, { gettone: 'gettone-lani' })));
    const per = (n: number) => corpo.immagini.find((i: { n: number }) => i.n === n);
    expect(per(1)).toMatchObject({ sbloccato: false, manca: false, vera: null });
    expect(per(1).sagoma).toContain('premio-1-sagoma.webp');
    expect(per(2).vera).toContain('premio-2.webp');
    expect(per(3)).toMatchObject({ manca: true, sagoma: null, vera: null });
    expect(JSON.stringify(corpo)).not.toContain('Bici'); // mai il testo del premio
  });
  it('genitore: anche la vera; un forziere solo; senza accesso 401', async () => {
    const f = await carica('premi');
    const { corpo } = await json(await f(richiesta({ n: 1 }, { gettone: 'gettone-papa' })));
    expect(corpo.immagini).toHaveLength(1);
    expect(corpo.immagini[0].vera).toContain('premio-1.webp');
    expect((await f(richiesta({}))).status).toBe(401);
  });
});

describe('spiega', () => {
  const SPIEGA = { spiegazione: 'Un esempio diverso.', indizi: ['uno', 'due', 'tre'], risultati: ['3/4'] };
  const lani = (corpo: unknown) => richiesta(corpo, { gettone: 'gettone-lani' });
  beforeEach(() => stato.banco!.come(null, `insert into compiti (id, testo, scadenza) values ('${COMPITO}', 'Frazioni pag. 40', '2026-11-27')`));
  it("una chiamata all'IA per compito: la seconda volta la risposta salvata; indizi nascosti all'apertura", async () => {
    const f = await carica('spiega');
    ia.coda.push(SPIEGA);
    const primo = (await json(await f(lani({ compito_id: COMPITO })))).corpo;
    expect(primo).toEqual({ spiegazione: 'Un esempio diverso.', tentativo: null, indizi: [], totale_indizi: 3 });
    expect(JSON.stringify(primo)).not.toContain('3/4');
    expect((await json(await f(lani({ compito_id: COMPITO })))).corpo).toEqual(primo);
    expect(ia.chiamate).toHaveLength(1);
    // Lani non legge le risposte salvate né lo storico; il vecchio posto in compiti resta vuoto
    expect((await stato.banco!.come(LANI, 'select * from tutor_aiuti')).rows).toHaveLength(0);
    expect((await stato.banco!.come(LANI, 'select * from tutor_richieste')).rows).toHaveLength(0);
    expect(await valore(`select spiegazione from compiti`)).toBeNull();
  });
  it('testo del compito cambiato: si rifà, e gli indizi ripartono da zero', async () => {
    const f = await carica('spiega');
    ia.coda.push(SPIEGA, { ...SPIEGA, spiegazione: 'Nuova.' });
    await f(lani({ compito_id: COMPITO }));
    await f(lani({ compito_id: COMPITO, azione: 'tentativo', testo: 'ho diviso per 2' }));
    await f(lani({ compito_id: COMPITO, azione: 'indizio' }));
    await stato.banco!.come(null, `update compiti set testo = 'Frazioni pag. 41'`);
    const r = (await json(await f(lani({ compito_id: COMPITO })))).corpo;
    expect(r.spiegazione).toBe('Nuova.');
    expect(r.indizi).toEqual([]);
    expect(r.tentativo).toBe('ho diviso per 2');
    expect(ia.chiamate).toHaveLength(2);
  });
  it('prima il tentativo, poi un indizio alla volta; tutto nello storico, nessun passo', async () => {
    const f = await carica('spiega');
    ia.coda.push(SPIEGA);
    await f(lani({ compito_id: COMPITO }));
    expect(await json(await f(lani({ compito_id: COMPITO, azione: 'indizio' })))).toEqual({ stato: 409, corpo: { errore: 'prima il tentativo' } });
    expect((await f(lani({ compito_id: COMPITO, azione: 'tentativo', testo: ' no ' }))).status).toBe(400);
    expect((await json(await f(lani({ compito_id: COMPITO, azione: 'tentativo', testo: '  ho  sommato i denominatori ' })))).corpo).toEqual({ tentativo: 'ho sommato i denominatori' });
    expect((await json(await f(lani({ compito_id: COMPITO, azione: 'indizio' })))).corpo.indizi).toEqual(['uno']);
    expect((await json(await f(lani({ compito_id: COMPITO, azione: 'indizio' })))).corpo.indizi).toEqual(['uno', 'due']);
    expect((await json(await f(lani({ compito_id: COMPITO, azione: 'indizio' })))).corpo.indizi).toEqual(['uno', 'due', 'tre']);
    expect((await json(await f(lani({ compito_id: COMPITO, azione: 'indizio' })))).corpo.indizi).toEqual(['uno', 'due', 'tre']);
    // riaperta: tentativo e indizi già visti restano
    expect((await json(await f(lani({ compito_id: COMPITO })))).corpo).toMatchObject({ tentativo: 'ho sommato i denominatori', indizi: ['uno', 'due', 'tre'] });
    expect(ia.chiamate).toHaveLength(1);
    expect(await valore(`select string_agg(tipo, ',' order by tipo) from tutor_richieste`)).toBe('indizio,indizio,indizio,spiegazione,spiegazione,tentativo');
    expect((await stato.banco!.come(PAPA, 'select * from tutor_richieste')).rows).toHaveLength(6);
    expect(await valore(`select count(*)::int from movimenti_passi`)).toBe(0);
  });
  it('secondo controllo: indizio col risultato scartato; spiegazione col risultato rifatta, poi 502', async () => {
    const f = await carica('spiega');
    ia.coda.push({ spiegazione: 'Viene 0,75.', indizi: ['a'], risultati: ['0.75'] }, { ...SPIEGA, indizi: ['uno', 'quindi fa 3 / 4', 'tre'] });
    const r = (await json(await f(lani({ compito_id: COMPITO })))).corpo;
    expect(r).toMatchObject({ spiegazione: 'Un esempio diverso.', totale_indizi: 2 });
    expect(ia.chiamate).toHaveLength(2);
    expect((ia.chiamate[1].messages as { content: string }[])[0].content).toContain('conteneva il risultato');
    expect(await valore(`select string_agg(esito, ',' order by esito) from tutor_richieste`)).toBe('bloccata,ok');
    expect(await valore(`select indizi::text from tutor_aiuti`)).toBe('["uno", "tre"]');
    await stato.banco!.come(null, `update compiti set testo = 'Frazioni pag. 41'`);
    ia.coda.push({ spiegazione: '3/4', indizi: ['a'], risultati: ['3/4'] }, { spiegazione: 'ok', indizi: ['3/4'], risultati: ['3/4'] });
    expect((await f(lani({ compito_id: COMPITO }))).status).toBe(502);
  });
  it('tetto giornaliero da config-gioco.json: poi 429, segnato nello storico', async () => {
    const tetto = config.tutor.chiamate_al_giorno;
    await stato.banco!.come(null, `insert into tutor_richieste (profilo_id, tipo, ia, giorno) select '${LANI}', 'spiegamelo', true, '2026-11-24' from generate_series(1, ${tetto})`);
    await stato.banco!.come(null, `insert into tutor_richieste (profilo_id, tipo, ia, giorno) values ('${LANI}', 'spiegamelo', true, '2026-11-23')`);
    const f = await carica('spiega');
    expect(await json(await f(lani({ compito_id: COMPITO })))).toEqual({ stato: 429, corpo: { errore: 'tetto' } });
    expect((await f(lani({ azione: 'spiegamelo', argomento: 'Frazioni', testo: 'Una frazione è un numero che dice quante parti prendo di un intero diviso.' }))).status).toBe(429);
    expect(ia.chiamate).toHaveLength(0);
    expect(await valore(`select count(*)::int from tutor_richieste where esito = 'tetto'`)).toBe(2);
    // il tetto è di ognuno: papà può ancora
    ia.coda.push(SPIEGA);
    expect((await f(richiesta({ compito_id: COMPITO }, { gettone: 'gettone-papa' }))).status).toBe(200);
  });
  it('spiegamelo tu: cosa va, cosa manca, nessun voto; testo corto 400', async () => {
    const f = await carica('spiega');
    const RITORNO = { cosa_va: ['Le parti uguali.'], cosa_manca: ['Il denominatore.'], da_sistemare: [], domanda: 'Cosa dice il numero sotto?' };
    ia.coda.push(RITORNO);
    expect((await f(lani({ azione: 'spiegamelo', argomento: 'Frazioni', testo: 'corto' }))).status).toBe(400);
    const testo = 'Una frazione è quando divido una torta in parti uguali e ne prendo alcune.';
    expect((await json(await f(lani({ azione: 'spiegamelo', argomento: 'Frazioni', testo })))).corpo).toEqual(RITORNO);
    expect(JSON.parse((ia.chiamate[0].messages as { content: string }[])[0].content)).toEqual({ argomento: 'Frazioni', spiegazione_di_lei: testo });
    expect(await valore(`select testo from tutor_richieste where tipo = 'spiegamelo' and ia`)).toBe(testo);
    expect(await valore(`select count(*)::int from movimenti_passi`)).toBe(0);
  });
  it("compito che non c'è 404, rifiuto dell'IA 502, errore dell'IA 500 registrato", async () => {
    const f = await carica('spiega');
    expect((await f(lani({ compito_id: '00000000-0000-0000-0000-000000000000' }))).status).toBe(404);
    expect((await f(lani({ compito_id: 3 }))).status).toBe(404);
    expect((await f(lani({ compito_id: COMPITO, azione: 'boh' }))).status).toBe(400);
    expect(await json(await f(lani({ compito_id: COMPITO, azione: 'indizio' })))).toEqual({ stato: 409, corpo: { errore: 'prima la spiegazione' } });
    ia.rifiuta = true;
    expect((await f(lani({ compito_id: COMPITO }))).status).toBe(502);
    ia.rifiuta = false;
    ia.coda.push(new Error('rete'));
    expect((await f(lani({ compito_id: COMPITO }))).status).toBe(500);
    expect(await valore(`select count(*)::int from errori_client where dove = 'spiega'`)).toBe(1);
    expect(await valore(`select count(*)::int from tutor_richieste where esito = 'errore' and ia`)).toBe(2);
    expect((await f(richiesta({ compito_id: COMPITO }))).status).toBe(401);
  });
});

describe('chiavi', () => {
  it('solo il cron o un genitore; fuori dalla domenica sera salta', async () => {
    const f = await carica('chiavi');
    expect((await f(richiesta({}, { gettone: 'gettone-lani' }))).status).toBe(401);
    expect((await json(await f(richiesta({}, { cron: true })))).corpo).toMatchObject({ saltato: 'non è domenica sera' });
  });
  it('una settimana chiesta da un genitore: chiavi scritte, la seconda volta "già"', async () => {
    const f = await carica('chiavi');
    const r = await json(await f(richiesta({ lunedi: '2026-11-23' }, { gettone: 'gettone-papa' })));
    expect(r.stato).toBe(200);
    expect(await valore(`select count(*)::int from settimane where inizio = '2026-11-23'`)).toBe(1);
    expect((await json(await f(richiesta({ lunedi: '2026-11-23' }, { cron: true })))).corpo).toMatchObject({ gia: true });
    expect(await valore(`select count(*)::int from sync_log where fonte = 'chiavi' and esito = 'ok'`)).toBe(2);
  });
  it('settimana prima dell\'inizio del gioco: niente chiavi', async () => {
    const f = await carica('chiavi');
    expect((await json(await f(richiesta({ lunedi: '2026-11-09' }, { cron: true })))).corpo).toMatchObject({ saltato: expect.stringContaining('prima') });
    expect(LANI).toBeTruthy();
  });
});

describe('tabellina', () => {
  const GESTO = '00000000-0000-0000-0000-0000000000e1';
  it('passi di oggi: disponibili, presi e storico; "chi" solo per i genitori', async () => {
    // martedì 24/11: compito per mercoledì fatto, un gesto di papà, un movimento di ieri
    await stato.banco!.come(null, `insert into compiti (id, testo, scadenza, fatto_il) values ('${COMPITO}', 'Es. 1', '2026-11-25', '2026-11-24T16:00:00+01:00')`);
    await stato.banco!.come(null, `insert into gesti_casa (id, voce, data, dato_da) values ('${GESTO}', 'letto', '2026-11-24', '${PAPA}')`);
    await stato.banco!.come(
      null,
      `insert into movimenti_passi (giorno, motivo, riferimento, passi, dato_da) values
        ('2026-11-24', 'compito', '${COMPITO}', 10, null),
        ('2026-11-24', 'gesto', '${GESTO}', 2, '${PAPA}'),
        ('2026-11-23', 'cartella', 'serata:2026-11-23', 5, null),
        ('2026-11-10', 'cartella', 'serata:2026-11-10', 5, null)`,
    );
    const f = await carica('tabellina');
    expect((await f(richiesta({}))).status).toBe(401);
    const lani = await json(await f(richiesta({}, { gettone: 'gettone-lani' })));
    expect(lani.stato).toBe(200);
    expect(lani.corpo.giorno).toBe('2026-11-24');
    expect(lani.corpo.voci.find((v: { id: string }) => v.id === `compito:${COMPITO}`)).toMatchObject({ presi: 10, dove: { schermata: 'Oggi' } });
    expect(lani.corpo.voci.find((v: { id: string }) => v.id === 'gesto:letto')).toMatchObject({ presi: 2, dove: { schermata: 'Regole' } });
    expect(lani.corpo.presi).toBe(12);
    expect(lani.corpo.disponibili).toBeGreaterThan(12);
    // storico di sette giorni: il 10/11 resta fuori
    expect(lani.corpo.storico.map((p: { giorno: string }) => p.giorno).sort()).toEqual(['2026-11-23', '2026-11-24', '2026-11-24']);
    expect(lani.corpo.storico.some((p: { chi?: string }) => p.chi)).toBe(false);
    const papa = await json(await f(richiesta({}, { gettone: 'gettone-papa' })));
    expect(papa.corpo.storico.find((p: { testo: string }) => p.testo.startsWith('Gesto'))).toMatchObject({ testo: 'Gesto di casa: letto', chi: 'Papà', passi: 2 });
  });
});
