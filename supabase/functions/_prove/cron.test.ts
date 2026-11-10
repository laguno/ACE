// Edge Functions dei cron (notifiche, sync-calendario) ed enigma, vere, su PGlite.
process.env.TZ = 'Europe/Rome';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ia } from './anthropic-finto';
import { carica, creaBanco, LANI, PAPA, richiesta, stato, valore } from './banco';
import { inviate } from './web-push-finto';

vi.mock('../_shared/ambiente.ts', async (originale) => {
  const vero = await originale<typeof import('../_shared/ambiente.ts')>();
  const { stato: s } = await import('./banco');
  return { ...vero, dbServizio: () => s.banco!.s, ambiente: (n: string) => (s.banco!.env as Record<string, string>)[n] ?? 'finto' };
});

beforeAll(() => vi.useFakeTimers({ toFake: ['Date'] }));
afterAll(() => vi.useRealTimers());
afterEach(() => vi.unstubAllGlobals());
const alle = (iso: string) => vi.setSystemTime(new Date(iso));
const json = async (r: Response) => ({ stato: r.status, corpo: await r.json() });
const iscrivi = async (profilo: string, endpoint: string) =>
  stato.banco!.come(null, `insert into push_iscrizioni (profilo_id, endpoint, chiavi) values ('${profilo}', '${endpoint}', '{"p256dh":"x","auth":"y"}')`);

beforeEach(async () => {
  alle('2026-11-24T07:05:00+01:00');
  await creaBanco({ GOOGLE_CALENDAR_ICS_URL: 'https://calendar.google.test/segreto-123/basic.ics' });
  inviate.length = 0;
  ia.coda.length = 0;
  ia.chiamate.length = 0;
  ia.rifiuta = false;
  await iscrivi(LANI, 'https://push.test/lani');
  await iscrivi(PAPA, 'https://push.test/papa');
});

describe('notifiche', () => {
  it('solo il cron', async () => {
    const f = await carica('notifiche');
    expect((await f(richiesta({}, { gettone: 'gettone-papa' }))).status).toBe(401);
  });
  it('7:00 con una partita: una notifica a Lani, una volta sola anche se il cron gira due volte', async () => {
    await stato.banco!.come(null, `insert into impegni_famiglia (id, inizio, titolo) values ('p1', '2026-11-24T18:00:00+01:00', 'Partita Lani: FOXES')`);
    const f = await carica('notifiche');
    expect((await json(await f(richiesta({}, { cron: true })))).corpo.inviate).toEqual({ mattina: 1 });
    expect((await json(await f(richiesta({}, { cron: true })))).corpo.inviate).toEqual({ mattina: 0 });
    expect(inviate.map((i) => i.endpoint)).toEqual(['https://push.test/lani']);
    expect(JSON.stringify(inviate[0].corpo)).toContain('18:00');
  });
  it('7:00 con verifica e allenamento, o niente: testi diversi, mai oltre 60 caratteri', async () => {
    const c = stato.banco!.come;
    await c(null, `insert into materie (id, nome, abbreviazione) values ('mate', 'Matematica', 'Mate') on conflict do nothing`);
    await c(null, `insert into verifiche (data, tipo, argomento, materia_id) values ('2026-11-24', 'verifica', 'Frazioni', 'mate')`);
    await c(null, `insert into impegni_famiglia (id, inizio, titolo) values ('a1', '2026-11-24T17:30:00+01:00', 'Allenamento Pallavolo Leilani U-13')`);
    const f = await carica('notifiche');
    await f(richiesta({}, { cron: true }));
    const testo = (inviate[0].corpo as { testo: string }).testo;
    expect(testo).toMatch(/Mate/);
    expect(testo).toMatch(/17:30/);
    expect(testo.length).toBeLessThanOrEqual(60);
  });
  it('14:45 compiti nuovi per domani; chiusura alle 20:30; sollecito con compiti mancanti', async () => {
    const c = stato.banco!.come;
    await c(null, `insert into impostazioni (chiave, valore) values ('ora_chiusura', '{"2": "20:30"}') on conflict (chiave) do update set valore = excluded.valore`);
    await c(null, `insert into compiti (testo, scadenza, creato_il) values ('Es. lungo pag. 40-45', '2026-11-25', '2026-11-24T14:31:00+01:00')`);
    const f = await carica('notifiche');
    alle('2026-11-24T14:50:00+01:00');
    expect((await json(await f(richiesta({}, { cron: true })))).corpo.inviate).toEqual({ pomeriggio: 1 });
    alle('2026-11-24T20:31:00+01:00');
    expect((await json(await f(richiesta({}, { cron: true })))).corpo.inviate).toEqual({ chiusura: 1 });
    alle(`2026-11-24T${'21:16'}:00+01:00`);
    const s = (await json(await f(richiesta({}, { cron: true })))).corpo.inviate;
    expect(s).toEqual({ sollecito: 1 });
    expect(await valore(`select count(*)::int from notifiche_inviate`)).toBe(3);
  });
  it('domenica 21:45: riepilogo ai genitori; iscrizione scaduta cancellata', async () => {
    await iscrivi(PAPA, 'https://push.test/scaduto');
    await stato.banco!.come(null, `insert into settimane (inizio, chiavi) values ('2026-11-23', 2)`);
    alle('2026-11-29T21:50:00+01:00');
    const f = await carica('notifiche');
    expect((await json(await f(richiesta({}, { cron: true })))).corpo.inviate).toMatchObject({ genitori_riepilogo: 1 });
    expect(await valore(`select count(*)::int from push_iscrizioni where endpoint like '%scaduto%'`)).toBe(0);
  });
});

const ICS = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:all-1\r\nDTSTART:20261124T163000Z\r\nSUMMARY:Allenamento Lani\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:p\r\nDTSTART:20261125T100000Z\r\nSUMMARY:Visita privata\r\nEND:VEVENT\r\nEND:VCALENDAR`;

describe('sync-calendario', () => {
  it('copia gli impegni (non i privati) e registra il giro', async () => {
    vi.stubGlobal('fetch', async () => new Response(ICS));
    const f = await carica('sync-calendario');
    expect((await json(await f(richiesta({}, { cron: true })))).corpo).toMatchObject({ esito: 'ok', impegni: 1 });
    expect(await valore(`select titolo from impegni_famiglia`)).toBe('Allenamento Lani');
    expect(await valore(`select esito from sync_log where fonte = 'calendario'`)).toBe('ok');
  });
  it('calendario giù: esito errore senza l\'indirizzo segreto, avviso ai genitori una volta', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('connessione rifiutata a https://calendar.google.test/segreto-123/basic.ics');
    });
    const f = await carica('sync-calendario');
    const r = await json(await f(richiesta({}, { cron: true })));
    expect(r.stato).toBe(502);
    expect(JSON.stringify(r.corpo)).not.toContain('segreto-123');
    await f(richiesta({}, { cron: true }));
    expect(inviate.filter((i) => i.endpoint.includes('papa'))).toHaveLength(1); // solo alla prima di fila
    expect((await f(richiesta({}, { gettone: 'gettone-lani' }))).status).toBe(401);
  });
});

describe('enigma', () => {
  const USCITA = { enigma: 'Rotonda e calda, con il pomodoro sopra,\nla mangi a fette: è...', soluzione: 'pizza / pizza margherita', aiutino: 'Si cuoce nel forno.', parola: 'PIZZA' };
  beforeEach(() => stato.banco!.come(null, `update forzieri set premio = 'Pizza con le amiche' where n = 1`));
  it('il genitore genera: risolutore d\'accordo, enigma salvato', async () => {
    ia.coda.push(USCITA, { risposta: 'una pizza', dubbi: false }, { giusta: true });
    const f = await carica('enigma');
    const r = await json(await f(richiesta({ azione: 'genera', n: 1 }, { gettone: 'gettone-papa' })));
    expect(r).toMatchObject({ stato: 200, corpo: { parola: 'PIZZA', giri: 1 } });
    expect(await valore(`select soluzione from forzieri where n = 1`)).toBe('pizza / pizza margherita');
  });
  it('risolutore che sbaglia tre volte: niente salvato, avviso ai genitori, 422', async () => {
    for (let i = 0; i < 3; i++) ia.coda.push(USCITA, { risposta: 'un cerchio', dubbi: false }, { giusta: false });
    const f = await carica('enigma');
    expect((await f(richiesta({ azione: 'genera', n: 1 }, { gettone: 'gettone-papa' }))).status).toBe(422);
    expect(await valore(`select enigma from forzieri where n = 1`)).toBeNull();
    expect(inviate.some((i) => i.endpoint.includes('papa'))).toBe(true);
  });
  it('Lani non genera; forziere inesistente; enigma già comparso; cima senza le parole dei forzieri', async () => {
    const f = await carica('enigma');
    expect((await f(richiesta({ azione: 'genera', n: 1 }, { gettone: 'gettone-lani' }))).status).toBe(403);
    expect((await f(richiesta({ azione: 'genera', n: 12 }, { gettone: 'gettone-papa' }))).status).toBe(404);
    await stato.banco!.come(null, `update forzieri set premio = 'Gardaland' where n = 9`);
    expect((await f(richiesta({ azione: 'genera', n: 9 }, { gettone: 'gettone-papa' }))).status).toBe(409);
    await stato.banco!.come(null, `update forzieri set stato = 'enigma' where n = 1`);
    expect((await f(richiesta({ azione: 'genera', n: 1 }, { gettone: 'gettone-papa' }))).status).toBe(409);
    expect((await f(richiesta({ azione: 'boh', n: 1 }, { gettone: 'gettone-papa' }))).status).toBe(400);
  });
  it('Lani risponde: sbagliata con aiutino, poi giusta con +20; dopo 3 tentativi basta', async () => {
    await stato.banco!.come(null, `update forzieri set stato = 'enigma', enigma = 'E', soluzione = 'pizza', aiutino = 'Nel forno.' where n = 1`);
    const f = await carica('enigma');
    ia.coda.push({ giusta: false });
    expect((await json(await f(richiesta({ azione: 'rispondi', n: 1, risposta: 'torta' }, { gettone: 'gettone-lani' })))).corpo).toMatchObject({ giusta: false, rimasti: 2, aiutino: 'Nel forno.' });
    ia.coda.push({ giusta: true });
    expect((await json(await f(richiesta({ azione: 'rispondi', n: 1, risposta: 'pizza' }, { gettone: 'gettone-lani' })))).corpo).toMatchObject({ giusta: true, passi: 20 });
    expect((await json(await f(richiesta({ azione: 'rispondi', n: 1, risposta: 'pizza' }, { gettone: 'gettone-lani' })))).corpo).toMatchObject({ giusta: true, passi: 0 });
    await stato.banco!.come(null, `update forzieri set stato = 'enigma', enigma = 'E', soluzione = 's', tentativi_enigma = 3 where n = 2`);
    expect((await json(await f(richiesta({ azione: 'rispondi', n: 2, risposta: 'x' }, { gettone: 'gettone-lani' })))).corpo).toMatchObject({ giusta: false, rimasti: 0 });
    expect((await f(richiesta({ azione: 'rispondi', n: 3, risposta: 'x' }, { gettone: 'gettone-lani' }))).status).toBe(409);
    expect((await f(richiesta({ azione: 'rispondi', n: 1 }, { gettone: 'gettone-lani' }))).status).toBe(200); // già risolto
    expect(ia.chiamate).toHaveLength(2);
  });
});
