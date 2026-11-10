// Edge Functions sync-nuvola e genera-studio, vere, su PGlite; Nuvola e l'IA finti (niente rete).
process.env.TZ = 'Europe/Rome';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ia } from './anthropic-finto';
import { carica, creaBanco, PAPA, richiesta, stato, valore } from './banco';
import { inviate } from './web-push-finto';

vi.mock('../_shared/ambiente.ts', async (originale) => {
  const vero = await originale<typeof import('../_shared/ambiente.ts')>();
  const { stato: s } = await import('./banco');
  return { ...vero, dbServizio: () => s.banco!.s, ambiente: (n: string) => (s.banco!.env as Record<string, string>)[n] ?? 'finto' };
});

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-24T14:30:00+01:00'));
});
afterAll(() => vi.useRealTimers());
afterEach(() => vi.unstubAllGlobals());
const json = async (r: Response) => ({ stato: r.status, corpo: await r.json() });

/** dd-mm-aaaa/dd-mm-aaaa dell'indirizzo comprende la data? (Nuvola risponde a settimane) */
const comprende = (url: string, data: string) => {
  const m = url.match(/(\d{2})-(\d{2})-(\d{4})\/(\d{2})-(\d{2})-(\d{4})/);
  if (!m) return false;
  const da = `${m[3]}-${m[2]}-${m[1]}`;
  const a = `${m[6]}-${m[5]}-${m[4]}`;
  return data >= da && data <= a;
};

/** Nuvola finto: accesso Keycloak con cookie e rimandi, poi le API dello studente. */
function nuvolaFinta(o: { password?: string; giu?: boolean } = {}) {
  const chiamate: string[] = [];
  vi.stubGlobal('fetch', async (u: string | URL, init: RequestInit = {}) => {
    const url = String(u);
    chiamate.push(url);
    const j = (v: unknown, h: Record<string, string> = {}) => new Response(JSON.stringify(v), { headers: { 'Content-Type': 'application/json', ...h } });
    if (url.includes('/functions/v1/genera-studio')) return new Response('{}');
    if (o.giu) return new Response('giù', { status: 503 });
    if (url.endsWith('/connect/authentication-service'))
      return new Response('<script>{"loginAction": "https:\\/\\/auth.test\\/login?tab=1&amp;x=2"}</script>', { headers: { 'Set-Cookie': 'KC=1; Domain=.auth.test; Path=/' } });
    if (url.startsWith('https://auth.test/login')) {
      const ok = String(init.body).includes(`password=${encodeURIComponent('giusta')}`) && o.password !== 'sbagliata';
      return new Response(null, { status: 302, headers: { Location: ok ? 'https://nuvola.madisoft.it/ok' : 'https://auth.test/errore', 'Set-Cookie': 'S=2; Path=/' } });
    }
    if (url === 'https://nuvola.madisoft.it/ok') return new Response('ok');
    if (url === 'https://auth.test/errore') return new Response('no');
    const api = url.replace('https://nuvola.madisoft.it/api-studente/v1', '').split('?')[0];
    if (api === '/login-from-web') return j({ token: 'gettone-nuvola' });
    if (api === '/alunni') return j({ valori: [{ id: 10928, apiAttive: true, annoScolastico: 2026 }, { id: 9000, apiAttive: false, annoScolastico: 2025 }] });
    if (api.includes('/compito/elenco/'))
      return j({ valori: comprende(api, '2026-11-25') ? [{ materia: 'MATEMATICA', idArgomento: 77, dataAssegnazione: '2026-11-24T00:00:00+01:00', dataConsegna: '2026-11-25T00:00:00+01:00', descrizioneCompito: ['Es. 3 pag. 40-42'] }] : [] });
    if (api.includes('/argomento-lezione/elenco/'))
      return j({ valori: comprende(api, '2026-11-24') ? [{ ore: [{ numeroOra: 2, giorno: '2026-11-24T00:00:00+01:00', argomenti: [{ id: 5, materia: 'MATEMATICA', nomeArgomento: 'Frazioni' }] }] }] : [] });
    if (api.includes('/eventi-classe'))
      return j({ valori: [{ id: 1, tipo: 'Avviso', nome: 'Verifica di matematica', descrizione: 'Frazioni pag. 50-55', dataInizio: '2026-11-30T09:00:00+01:00', docente: null }] });
    if (api.endsWith('/frazioni-temporali')) return j({ valori: [{ id: 1, corrente: true }] });
    if (api.includes('/voti/materie')) return j({ valori: [{ materia: 'MATEMATICA', voti: [{ data: '2026-11-24T00:00:00+01:00', valutazione: '8' }] }] });
    if (api.endsWith('/note')) return j({ valori: [{ id: 9, data: '2026-11-24T10:00:00+01:00', tipologia: 'Nota di merito', descrizione: 'Brava', materia: 'MATEMATICA' }] });
    return new Response('?', { status: 404 });
  });
  return chiamate;
}

beforeEach(async () => {
  await creaBanco({ NUVOLA_UTENTE: 'lani.scuola', NUVOLA_PASSWORD: 'giusta' });
  inviate.length = 0;
  ia.coda.length = 0;
  ia.chiamate.length = 0;
  await stato.banco!.come(null, `insert into push_iscrizioni (profilo_id, endpoint, chiavi) values ('${PAPA}', 'https://push.test/papa', '{}')`);
});

describe('sync-nuvola', () => {
  it('un giro: compiti, lezioni, verifiche, voti, note, passi, richieste di foto e studio avviato', async () => {
    const chiamate = nuvolaFinta();
    const f = await carica('sync-nuvola');
    const r = await json(await f(richiesta({}, { cron: true })));
    expect(r.stato).toBe(200);
    expect(r.corpo).toMatchObject({ esito: 'ok', compiti: 1, verifiche: 1, voti: 1, note: 1, lezioni: 1, foto: 2, studio: 'avviato' });
    expect(r.corpo.passi).toBeGreaterThan(0); // voto 8 e nota di merito, dal 23/11
    expect(await valore(`select testo from compiti`)).toBe('Es. 3 pag. 40-42');
    expect(await valore(`select count(*)::int from richieste_foto`)).toBe(2);
    expect(inviate.filter((i) => i.endpoint.includes('papa'))).toHaveLength(1); // un push per giro
    expect(chiamate.some((u) => u.includes('/functions/v1/genera-studio'))).toBe(true);
    expect(chiamate.some((u) => u.includes('/alunno/9000'))).toBe(false); // la scheda vecchia no
  });
  it('due giri di fila: niente doppioni né passi doppi', async () => {
    nuvolaFinta();
    const f = await carica('sync-nuvola');
    await f(richiesta({}, { cron: true }));
    const passi = await valore(`select coalesce(sum(passi), 0)::int from movimenti_passi`);
    const secondo = await json(await f(richiesta({}, { gettone: 'gettone-papa' })));
    expect(secondo.corpo).toMatchObject({ esito: 'ok', passi: 0, foto: 0 });
    expect(await valore(`select coalesce(sum(passi), 0)::int from movimenti_passi`)).toBe(passi);
    expect(await valore(`select count(*)::int from compiti`)).toBe(1);
  });
  it('password sbagliata o Nuvola giù: esito errore con il passo, avviso ai genitori alla prima', async () => {
    nuvolaFinta({ password: 'sbagliata' });
    const f = await carica('sync-nuvola');
    const r = await json(await f(richiesta({}, { cron: true })));
    expect(r).toMatchObject({ stato: 502, corpo: { esito: 'errore', errore: expect.stringContaining('utente o password') } });
    nuvolaFinta({ giu: true });
    expect((await json(await f(richiesta({}, { cron: true })))).corpo.errore).toMatch(/modulo di accesso/);
    expect(inviate.filter((i) => i.endpoint.includes('papa'))).toHaveLength(1);
    expect(await valore(`select count(*)::int from sync_log where fonte = 'nuvola' and esito = 'errore'`)).toBe(2);
    expect((await f(richiesta({}, { gettone: 'gettone-lani' }))).status).toBe(401);
  });
});

describe('genera-studio', () => {
  const CARTE = {
    pagine_probabili: 'pag. 50-55',
    flashcard: Array.from({ length: 10 }, (_, i) => ({ tipo: 'domanda', fronte: `Domanda ${i}`, retro: `Risposta ${i}` })),
    quiz: Array.from({ length: 8 }, (_, i) => ({ testo: `Quiz ${i}`, opzioni: ['a', 'b', 'c', 'd'], giusta: 1, spiegazione: 'Perché.' })),
  };
  beforeEach(async () => {
    const c = stato.banco!.come;
    await c(null, `insert into materie (id, nome, abbreviazione) values ('matematica', 'Matematica', 'Mate') on conflict do nothing`);
    await c(null, `insert into verifiche (nuvola_id, data, tipo, argomento, materia_id) values ('v1', '2026-11-30', 'verifica', 'Frazioni', 'matematica')`);
  });
  it('piano di ripasso, carte e quiz per una verifica nuova; il secondo giro non rifà', async () => {
    ia.coda.push(CARTE);
    const f = await carica('genera-studio');
    const r = await json(await f(richiesta({}, { cron: true })));
    expect(r.corpo).toMatchObject({ verifiche: 1, sessioni: 4, generate: 1, errori: [] });
    expect(await valore(`select count(*)::int from flashcard`)).toBe(10);
    expect(await valore(`select count(*)::int from quiz`)).toBe(1);
    expect(await valore(`select pagine_probabili from verifiche`)).toBe('pag. 50-55');
    const secondo = await json(await f(richiesta({}, { gettone: 'gettone-papa' })));
    expect(secondo.corpo.generate).toBe(0);
    expect(ia.chiamate).toHaveLength(1);
  });
  it('l\'IA sbaglia: l\'errore resta nel risultato, il piano c\'è lo stesso; Lani non può chiamarla', async () => {
    ia.coda.push(new Error('sovraccarico'));
    const f = await carica('genera-studio');
    const r = await json(await f(richiesta({}, { cron: true })));
    expect(r.corpo.errori).toHaveLength(1);
    expect(await valore(`select count(*)::int from sessioni_ripasso`)).toBe(4);
    expect((await f(richiesta({}, { gettone: 'gettone-lani' }))).status).toBe(401);
  });
});
