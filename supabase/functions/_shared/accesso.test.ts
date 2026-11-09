import { describe, expect, it } from 'vitest';
import { chiChiama, cors, CorpoNonValido, cronOGenitore, leggiCorpo, origineAmmessa, risposte, stessoSegreto } from './accesso';

const richiesta = (corpo?: string, intestazioni: Record<string, string> = {}) => new Request('https://x.test/f', { method: 'POST', body: corpo, headers: intestazioni });

describe('CORS', () => {
  it('solo le origini di ACE', () => {
    expect(origineAmmessa('https://ace-passino.vercel.app')).toBe(true);
    expect(origineAmmessa('https://ace-pujquqief-lagunos-projects.vercel.app')).toBe(true);
    expect(origineAmmessa('http://localhost:5173')).toBe(true);
    for (const o of ['https://evil.example', 'https://ace-passino.vercel.app.evil.example', 'https://ace-x-altri-projects.vercel.app', 'http://ace-passino.vercel.app', null, ''])
      expect(origineAmmessa(o)).toBe(false);
  });
  it('a un sito estraneo risponde con la produzione, non con la sua origine', () => {
    expect(cors(richiesta(undefined, { Origin: 'https://evil.example' }))['Access-Control-Allow-Origin']).toBe('https://ace-passino.vercel.app');
    expect(cors(richiesta(undefined, { Origin: 'http://localhost:5179' }))['Access-Control-Allow-Origin']).toBe('http://localhost:5179');
  });
  it('le risposte hanno JSON, stato e CORS', async () => {
    const r = risposte(richiesta())({ ok: 1 }, 201);
    expect(r.status).toBe(201);
    expect(r.headers.get('Vary')).toBe('Origin');
    expect(await r.json()).toEqual({ ok: 1 });
  });
});

describe('corpo della richiesta', () => {
  it('legge un oggetto JSON', async () => expect(await leggiCorpo(richiesta('{"tipo":"compito","id":"x"}'))).toEqual({ tipo: 'compito', id: 'x' }));
  it('vuoto, array o valore semplice = oggetto vuoto', async () => {
    for (const c of ['', '[1,2]', '42', 'null']) expect(await leggiCorpo(richiesta(c))).toEqual({});
  });
  it('rifiuta JSON rotto e corpi troppo grandi', async () => {
    await expect(leggiCorpo(richiesta('{rotto'))).rejects.toThrow(CorpoNonValido);
    await expect(leggiCorpo(richiesta(JSON.stringify({ x: 'a'.repeat(5000) })))).rejects.toThrow('troppo grande');
    await expect(leggiCorpo(richiesta('{}', { 'content-length': '999999' }))).rejects.toThrow('troppo grande');
    expect(await leggiCorpo(richiesta(JSON.stringify({ x: 'a'.repeat(5000) })), 8192)).toHaveProperty('x');
  });
});

describe('segreto del cron', () => {
  it('uguale solo se identico', () => {
    expect(stessoSegreto('abc123', 'abc123')).toBe(true);
    for (const d of ['abc124', 'abc12', 'abc1234', '', null]) expect(stessoSegreto(d, 'abc123')).toBe(false);
    expect(stessoSegreto('x', undefined)).toBe(false);
    expect(stessoSegreto('x', '')).toBe(false);
  });
});

describe('chi chiama', () => {
  // client finto: solo le due chiamate che servono
  const db = (utente: string | null, ruolo: string | null) =>
    ({
      auth: { getUser: async (t: string) => ({ data: { user: t === 'buono' && utente ? { id: utente } : null } }) },
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: ruolo ? { ruolo } : null }) }) }) }),
    }) as never;
  it('il cron con il segreto giusto', async () => {
    expect(await chiChiama(db(null, null), richiesta(undefined, { 'x-cron-segreto': 's3greto' }), 's3greto')).toEqual({ tipo: 'cron' });
    expect(await chiChiama(db(null, null), richiesta(undefined, { 'x-cron-segreto': 'sbagliato' }), 's3greto')).toBeNull();
  });
  it('un utente con il token e il profilo', async () => {
    expect(await chiChiama(db('u1', 'lani'), richiesta(undefined, { Authorization: 'Bearer buono' }), 's')).toEqual({ tipo: 'utente', id: 'u1', ruolo: 'lani' });
    expect(await chiChiama(db('u1', null), richiesta(undefined, { Authorization: 'Bearer buono' }), 's')).toBeNull();
    expect(await chiChiama(db('u1', 'lani'), richiesta(undefined, { Authorization: 'Bearer falso' }), 's')).toBeNull();
    expect(await chiChiama(db('u1', 'lani'), richiesta(), 's')).toBeNull();
  });
  it('cron o genitore', () => {
    expect(cronOGenitore({ tipo: 'cron' })).toBe(true);
    expect(cronOGenitore({ tipo: 'utente', id: 'x', ruolo: 'genitore' })).toBe(true);
    expect(cronOGenitore({ tipo: 'utente', id: 'x', ruolo: 'lani' })).toBe(false);
    expect(cronOGenitore(null)).toBe(false);
  });
});
