// Edge Functions chiamate dall'app (passi, premi, spiega) e dal cron (chiavi), vere, su PGlite.
process.env.TZ = 'Europe/Rome';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ia } from './anthropic-finto';
import { carica, creaBanco, LANI, richiesta, stato, valore } from './banco';

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
  const SPIEGA = { spiegazione: 'Un esempio diverso.', indizi: ['uno', 'due', 'tre'] };
  beforeEach(() => stato.banco!.come(null, `insert into compiti (id, testo, scadenza) values ('${COMPITO}', 'Frazioni pag. 40', '2026-11-27')`));
  it('una chiamata all\'IA per compito: la seconda volta la risposta salvata', async () => {
    const f = await carica('spiega');
    ia.coda.push(SPIEGA);
    expect((await json(await f(richiesta({ compito_id: COMPITO }, { gettone: 'gettone-lani' })))).corpo).toEqual(SPIEGA);
    expect((await json(await f(richiesta({ compito_id: COMPITO }, { gettone: 'gettone-lani' })))).corpo).toEqual(SPIEGA);
    expect(ia.chiamate).toHaveLength(1);
  });
  it('testo del compito cambiato: si rifà', async () => {
    const f = await carica('spiega');
    ia.coda.push(SPIEGA, { ...SPIEGA, spiegazione: 'Nuova.' });
    await f(richiesta({ compito_id: COMPITO }, { gettone: 'gettone-lani' }));
    await stato.banco!.come(null, `update compiti set testo = 'Frazioni pag. 41'`);
    expect((await json(await f(richiesta({ compito_id: COMPITO }, { gettone: 'gettone-lani' })))).corpo.spiegazione).toBe('Nuova.');
    expect(ia.chiamate).toHaveLength(2);
  });
  it('compito che non c\'è 404, rifiuto dell\'IA 502, errore dell\'IA 500 registrato', async () => {
    const f = await carica('spiega');
    expect((await f(richiesta({ compito_id: '00000000-0000-0000-0000-000000000000' }, { gettone: 'gettone-lani' }))).status).toBe(404);
    expect((await f(richiesta({ compito_id: 3 }, { gettone: 'gettone-lani' }))).status).toBe(404);
    ia.rifiuta = true;
    expect((await f(richiesta({ compito_id: COMPITO }, { gettone: 'gettone-lani' }))).status).toBe(502);
    ia.rifiuta = false;
    ia.coda.push(new Error('rete'));
    expect((await f(richiesta({ compito_id: COMPITO }, { gettone: 'gettone-lani' }))).status).toBe(500);
    expect(await valore(`select count(*)::int from errori_client where dove = 'spiega'`)).toBe(1);
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
