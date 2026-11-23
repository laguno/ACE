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
  it('14:45 compiti nuovi per domani; chiusura alle 20:30; sollecito con compiti mancanti anticipato a prima delle 21', async () => {
    const c = stato.banco!.come;
    await c(null, `insert into impostazioni (chiave, valore) values ('ora_chiusura', '{"2": "20:30"}') on conflict (chiave) do update set valore = excluded.valore`);
    await c(null, `insert into compiti (testo, scadenza, creato_il) values ('Es. lungo pag. 40-45', '2026-11-25', '2026-11-24T14:31:00+01:00')`);
    const f = await carica('notifiche');
    alle('2026-11-24T14:50:00+01:00');
    expect((await json(await f(richiesta({}, { cron: true })))).corpo.inviate).toEqual({ pomeriggio: 1 });
    alle('2026-11-24T20:31:00+01:00');
    expect((await json(await f(richiesta({}, { cron: true })))).corpo.inviate).toEqual({ chiusura: 1 });
    // 20:30 + 45 minuti cadrebbe dopo le 21:00: il sollecito va all'ultimo giro prima (blocco G)
    alle('2026-11-24T20:46:00+01:00');
    const s = (await json(await f(richiesta({}, { cron: true })))).corpo.inviate;
    expect(s).toEqual({ sollecito: 1 });
    alle('2026-11-24T21:16:00+01:00');
    expect((await json(await f(richiesta({}, { cron: true })))).corpo.inviate).toEqual({});
    expect(await valore(`select count(*)::int from notifiche_inviate`)).toBe(3);
  });
  it('mai durante l\'allenamento: i compiti nuovi delle 14:45 aspettano il rientro', async () => {
    const c = stato.banco!.come;
    await c(null, `insert into compiti (testo, scadenza, creato_il) values ('Es. pag. 40', '2026-11-25', '2026-11-24T14:31:00+01:00')`);
    await c(null, `insert into impegni_famiglia (id, inizio, fine, titolo) values ('a1', '2026-11-24T14:30:00+01:00', '2026-11-24T16:00:00+01:00', 'Allenamento Pallavolo Leilani U-13')`);
    const f = await carica('notifiche');
    const turno = async (quando: string) => {
      alle(`2026-11-24T${quando}:00+01:00`);
      return (await json(await f(richiesta({}, { cron: true })))).corpo.inviate;
    };
    expect(await turno('14:46')).toEqual({});
    // margine del rientro 60 minuti (signore, 20/11): fino alle 17:00 si tace
    expect(await turno('16:01')).toEqual({});
    expect(await turno('16:46')).toEqual({});
    expect(await turno('17:01')).toEqual({ pomeriggio: 1 });
    expect(await turno('17:16')).toEqual({});
  });
  it('martedì con allenamento alle 18:30: la chiusura delle 18:00 si anticipa prima del silenzio, niente sollecito', async () => {
    const c = stato.banco!.come;
    await c(null, `insert into impostazioni (chiave, valore) values ('ora_chiusura', '{"2": "20:30"}') on conflict (chiave) do update set valore = excluded.valore`);
    await c(null, `insert into compiti (testo, scadenza) values ('Es. pag. 40', '2026-11-25')`);
    await c(null, `insert into impegni_famiglia (id, inizio, fine, titolo) values ('a1', '2026-11-24T18:30:00+01:00', '2026-11-24T20:00:00+01:00', 'Allenamento Pallavolo Leilani U-13')`);
    const f = await carica('notifiche');
    const turno = async (quando: string) => {
      alle(`2026-11-24T${quando}:00+01:00`);
      return (await json(await f(richiesta({}, { cron: true })))).corpo.inviate;
    };
    // silenzio dalle 18:00 (30 prima) alle 21:00 (60 dopo): la chiusura va all'ultimo giro prima, 17:45 (signore, 20/11)
    expect(await turno('17:46')).toEqual({ chiusura: 1 });
    for (const q of ['18:01', '18:46', '20:31', '20:46']) expect(await turno(q)).toEqual({});
    expect(await valore(`select count(*)::int from notifiche_inviate where tipo = 'sollecito'`)).toBe(0);
  });
  it('partita FIPAV la sera: niente sollecito, né in campo né dopo le 21', async () => {
    const c = stato.banco!.come;
    await c(null, `insert into impostazioni (chiave, valore) values ('ora_chiusura', '{"2": "20:30"}') on conflict (chiave) do update set valore = excluded.valore`);
    await c(null, `insert into compiti (testo, scadenza) values ('Es. pag. 40', '2026-11-25')`);
    await c(null, `insert into impegni_famiglia (id, inizio, titolo) values ('fipav:93399:9', '2026-11-24T19:00:00+01:00', 'Partita Lani U14: FOXES vs U14R-EVOLUTION')`);
    const f = await carica('notifiche');
    const turno = async (quando: string) => {
      alle(`2026-11-24T${quando}:00+01:00`);
      return (await json(await f(richiesta({}, { cron: true })))).corpo.inviate;
    };
    // partita alle 19:00: silenzio dalle 18:30, la chiusura delle 18:30 si anticipa alle 18:15 (signore, 20/11)
    expect(await turno('18:16')).toEqual({ chiusura: 1 });
    for (const q of ['18:31', '19:16', '20:46', '21:16', '21:46', '22:01']) expect(await turno(q)).toEqual({});
    expect(await valore(`select count(*)::int from notifiche_inviate where tipo = 'sollecito'`)).toBe(0);
  });
  it('domenica 23:15: riepilogo ai genitori; iscrizione scaduta cancellata', async () => {
    await iscrivi(PAPA, 'https://push.test/scaduto');
    await stato.banco!.come(null, `insert into settimane (inizio, chiavi) values ('2026-11-23', 2)`);
    alle('2026-11-29T23:20:00+01:00');
    const f = await carica('notifiche');
    expect((await json(await f(richiesta({}, { cron: true })))).corpo.inviate).toMatchObject({ genitori_riepilogo: 1 });
    expect(await valore(`select count(*)::int from push_iscrizioni where endpoint like '%scaduto%'`)).toBe(0);
  });
  it('Nuvola ferma: avviso ai soli genitori al secondo giro non ok di fila, una volta per serie', async () => {
    const c = stato.banco!.come;
    const giro = (quando: string, esito: string) =>
      c(null, `insert into sync_log (fonte, iniziato_il, finito_il, esito) values ('nuvola', '${quando}', '${quando}', '${esito}')`);
    const f = await carica('notifiche');
    const turno = async () => (await json(await f(richiesta({}, { cron: true })))).corpo.inviate;
    alle('2026-11-24T10:00:00+01:00');
    await giro('2026-11-23T19:30:00+01:00', 'ok');
    await giro('2026-11-24T08:00:00+01:00', 'errore');
    expect(await turno()).toEqual({}); // un giro solo: niente
    await giro('2026-11-24T09:00:00+01:00', 'interrotta');
    expect(await turno()).toEqual({ genitori_nuvola: 1 });
    expect(inviate.map((i) => i.endpoint)).toEqual(['https://push.test/papa']); // niente a Lani
    const testo = (inviate[0].corpo as { testo: string }).testo;
    expect(testo.length).toBeLessThanOrEqual(60);
    expect(testo).not.toMatch(/\n/);
    // la serie continua, anche nei giorni dopo: nessun altro avviso
    await giro('2026-11-24T14:30:00+01:00', 'errore');
    alle('2026-11-25T10:00:00+01:00');
    await giro('2026-11-25T08:00:00+01:00', 'errore');
    expect(await turno()).toEqual({});
    // torna un ok, poi una serie nuova in un altro giorno: un avviso nuovo
    await giro('2026-11-25T14:30:00+01:00', 'ok');
    alle('2026-11-26T10:00:00+01:00');
    await giro('2026-11-26T08:00:00+01:00', 'errore');
    expect(await turno()).toEqual({});
    await giro('2026-11-26T09:00:00+01:00', 'errore');
    expect(await turno()).toEqual({ genitori_nuvola: 1 });
    expect(await turno()).toEqual({}); // il cron ripassa dopo 15 minuti: niente doppioni
    expect(inviate).toHaveLength(2);
  });
  it('Nuvola ferma con Lani a casa: l\'avviso ai genitori parte lo stesso', async () => {
    const c = stato.banco!.come;
    await c(null, `insert into assenze (giorno) values ('2026-11-24')`);
    await c(null, `insert into sync_log (fonte, iniziato_il, finito_il, esito) values ('nuvola', '2026-11-24T08:00:00+01:00', '2026-11-24T08:01:00+01:00', 'errore'), ('nuvola', '2026-11-24T09:00:00+01:00', '2026-11-24T09:01:00+01:00', 'errore')`);
    alle('2026-11-24T10:00:00+01:00');
    const f = await carica('notifiche');
    expect((await json(await f(richiesta({}, { cron: true })))).corpo).toMatchObject({ a_casa: true, inviate: { genitori_nuvola: 1 } });
  });
  it('altre fonti ferme (calendario): nessun avviso da questo controllo', async () => {
    await stato.banco!.come(null, `insert into sync_log (fonte, iniziato_il, finito_il, esito) values ('calendario', '2026-11-24T08:00:00+01:00', '2026-11-24T08:01:00+01:00', 'errore'), ('calendario', '2026-11-24T09:00:00+01:00', '2026-11-24T09:01:00+01:00', 'errore')`);
    alle('2026-11-24T10:00:00+01:00');
    const f = await carica('notifiche');
    expect((await json(await f(richiesta({}, { cron: true })))).corpo.inviate).toEqual({});
  });
  it('prova di consegna: solo ai genitori, senza segnare niente in notifiche_inviate', async () => {
    const f = await carica('notifiche');
    expect((await json(await f(richiesta({ prova: 'genitori' }, { cron: true })))).corpo).toEqual({ prova: 1 });
    expect(inviate.map((i) => i.endpoint)).toEqual(['https://push.test/papa']);
    expect(await valore(`select count(*)::int from notifiche_inviate`)).toBe(0);
  });
  it('guscio Android: la stessa notifica via FCM con il gettone Google firmato; gettone morto (404) cancellato', async () => {
    const { generateKeyPairSync, createVerify } = await import('node:crypto');
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    stato.banco!.env = { ...stato.banco!.env, FCM_SERVICE_ACCOUNT: JSON.stringify({ project_id: 'ace-prova', client_email: 'sa@ace-prova.test', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) }) };
    const c = stato.banco!.come;
    await c(null, `insert into push_iscrizioni (profilo_id, endpoint, tipo) values ('${LANI}', 'gettone-telefono', 'fcm'), ('${LANI}', 'gettone-morto', 'fcm')`);
    await c(null, `insert into impegni_famiglia (id, inizio, titolo) values ('p1', '2026-11-24T18:00:00+01:00', 'Partita Lani: FOXES')`);
    const fcm: { token: string; title: string }[] = [];
    let firmaBuona = false;
    vi.stubGlobal('fetch', async (u: string, o: RequestInit) => {
      if (String(u) === 'https://oauth2.googleapis.com/token') {
        const [h, p, s] = new URLSearchParams(String(o.body)).get('assertion')!.split('.');
        firmaBuona = createVerify('RSA-SHA256').update(`${h}.${p}`).verify(publicKey, Buffer.from(s, 'base64url'));
        return Response.json({ access_token: 'accesso-google' });
      }
      expect(String(u)).toBe('https://fcm.googleapis.com/v1/projects/ace-prova/messages:send');
      expect((o.headers as Record<string, string>).authorization).toBe('Bearer accesso-google');
      const m = JSON.parse(String(o.body)).message;
      if (m.token === 'gettone-morto') return new Response('{}', { status: 404 });
      fcm.push({ token: m.token, title: m.notification.title });
      return Response.json({ name: 'ok' });
    });
    const f = await carica('notifiche');
    expect((await json(await f(richiesta({}, { cron: true })))).corpo.inviate).toEqual({ mattina: 2 });
    expect(firmaBuona).toBe(true);
    expect(fcm.map((x) => x.token)).toEqual(['gettone-telefono']);
    expect(inviate.map((i) => i.endpoint)).toEqual(['https://push.test/lani']);
    expect(await valore(`select count(*)::int from push_iscrizioni where tipo = 'fcm'`)).toBe(1);
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
  it('17/11: le partite del calendario si saltano, quelle FIPAV restano, il giorno assente le toglie', async () => {
    alle('2026-11-23T10:00:00+01:00');
    const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:pa\r\nDTSTART:20261125T190000Z\r\nSUMMARY:Partita Lani U14: FOXES vs U14R-EVOLUTION\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:as\r\nDTSTART:20261128T150000Z\r\nSUMMARY:[LANI ASSENTE] Partita U14: U14R-EVOLUTION vs GAZZE\r\nEND:VEVENT\r\nEND:VCALENDAR`;
    vi.stubGlobal('fetch', async () => new Response(ics));
    const c = stato.banco!.come;
    await c(null, `insert into impegni_famiglia (id, inizio, titolo) values ('fipav:93399:870', '2026-11-25T20:00:00+01:00', 'Partita Lani U14: FOXES vs U14R-EVOLUTION'), ('fipav:93399:869', '2026-11-28T16:00:00+01:00', 'Partita Lani U14: U14R-EVOLUTION vs GAZZE')`);
    const f = await carica('sync-calendario');
    expect((await json(await f(richiesta({}, { cron: true })))).corpo).toMatchObject({ esito: 'ok', impegni: 1 });
    expect(await valore(`select string_agg(id, ',' order by id) from impegni_famiglia`)).toBe('as,fipav:93399:870');
    vi.useRealTimers();
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

describe('classifiche', () => {
  const pagina = (squadra: string) =>
    `<table class="tbl tbl-classifica"><tr><th>Pos.</th></tr><tr><td>1</td><td><img alt="">${squadra}</td><td>12</td><td>4</td><td>4</td><td>0</td><td>12</td><td>0</td><td>---</td></tr><tr><td>2</td><td>ALTRE</td><td>8</td><td>4</td><td>3</td><td>1</td><td>9</td><td>6</td><td>1,50</td></tr></table>`;
  // gare come le scrive risultati-classifiche.aspx (le pagine vere sono in src/lib/classifiche/pagine)
  type RigaGara = [numero: number, quando: string, casa: string, ospite: string, risultato: string, stato: string];
  const gare = (righe: RigaGara[]) =>
    `<table class="tbl tbl-risultati"><tbody>${righe
      .map(
        ([n, q, casa, ospite, r, st]) =>
          `<tr><td>${n}</td><td>1</td><td>${q}</td><td><img alt="">${casa}</td><td>${ospite}</td><td class="risultato">${r}</td><td></td><td><span><img src="/img/statogara/stato1.png" alt="statogara" title="${st}" /></span></td></tr>`,
      )
      .join('')}</tbody></table>`;
  const U13 = '13R-EVOLUT. POLO DIGITALE';
  const U14 = 'U14R-EVOLUTION';
  const chiesti: string[] = [];
  beforeEach(() => {
    chiesti.length = 0;
    const pagineGare: Record<string, string> = {
      '93436': gare([
        [1232, '14/11/26 18:30', 'VOLLEY SCANDIANO ROSSA', U13, '0 - 3', 'risultato ufficioso'],
        [1239, '29/11/26 16:00', 'RUBIERESE U13', U13, '1 - 3', 'risultato ufficioso'],
        [1243, '06/12/26 10:00', U13, 'DENTI ALBINETANA PANTHERS', '-', 'da disputare'],
      ]),
      '93399': gare([[869, '28/11/26 16:00', U14, 'A.S.D. GAZZE CANOSSA', '-', 'da disputare']]),
    };
    vi.stubGlobal('fetch', async (u: string) => {
      chiesti.push(String(u));
      const cid = String(u).split('CId=')[1];
      return new Response(String(u).includes('risultati-classifiche') ? pagineGare[cid] : pagina(cid === '93436' ? U13 : U14));
    });
  });
  const lancia = async (corpo = {}) => json(await (await carica('classifiche'))(richiesta(corpo, { cron: true })));
  const convocata = (titolo = `Partita Lani U13: RUBIERESE U13 vs ${U13}`) =>
    stato.banco!.come(null, `insert into impegni_famiglia (id, inizio, titolo) values ('g1', '2026-11-29T16:00:00+01:00', '${titolo}')`);

  it('copia classifiche e gare dei due campionati e registra il giro', async () => {
    alle('2026-11-24T06:15:00+01:00');
    expect((await lancia()).corpo).toMatchObject({ esito: 'ok', 'Under 13': { classifica: 2, gare: 3 }, 'Under 14': { classifica: 2, gare: 1 } });
    expect(chiesti.filter((u) => u.includes('classifica.aspx'))).toEqual([
      'https://reggioemilia.portalefipav.net/classifica.aspx?CId=93436',
      'https://reggioemilia.portalefipav.net/classifica.aspx?CId=93399',
    ]);
    expect(chiesti.some((u) => u.includes('esporta'))).toBe(false);
    expect(await valore(`select righe->0->>'squadra' from classifiche where cid = 93436`)).toBe(U13);
    expect(new Date(String(await valore(`select inizio from gare_fipav where numero = 869`))).toISOString()).toBe('2026-11-28T15:00:00.000Z');
    expect(await valore(`select esito from sync_log where fonte = 'classifiche'`)).toBe('ok');
  });

  it('risultato ufficiale con Lani convocata: partita e popup, la risposta fa i passi, il genitore corregge', async () => {
    const c = stato.banco!.come;
    await c(null, `insert into impostazioni (chiave, valore) values ('r_evolution_da', '"2026-11-16"') on conflict (chiave) do update set valore = excluded.valore`);
    await convocata();
    alle('2026-11-29T06:15:00+01:00');
    await lancia(); // la mattina della partita: gare lette, nessun risultato ancora da prendere per oggi
    await c(null, `update gare_fipav set set_casa = null, set_ospite = null where numero = 1239`);
    await c(null, `delete from partite`);
    alle('2026-11-29T20:00:00+01:00');
    expect((await lancia({ solo: 'partite' })).corpo).toMatchObject({ esito: 'ok', 'Under 13': { risultati: ['1239 popup'] } });
    expect(await valore(`select set_nostri || '-' || set_loro || ' ' || coalesce(in_campo::text, 'senza risposta') from partite where gara = 1239`)).toBe('3-1 senza risposta');
    const id = String(await valore(`select id from partite where gara = 1239`));
    expect(await valore(`select titolo || ' ' || testo from popup_coda where chiave = 'partita_fipav:${id}'`)).toBe('Com’è andata? R-Evolution 3, RUBIERESE U13 1: vinta! Siete prime nel girone, continuate così. Sei entrata in campo?');
    // il giro dopo non la rifà
    alle('2026-11-29T20:30:00+01:00');
    await lancia();
    expect(await valore(`select count(*)::int from partite`)).toBe(1);

    const passi = await carica('passi');
    const somma = async () => valore(`select coalesce(sum(passi), 0)::int from movimenti_passi where riferimento like '%${id}%'`);
    await passi(richiesta({ tipo: 'partita', id }, { gettone: 'gettone-lani' }));
    expect(await somma()).toBe(0); // senza risposta niente passi
    await c(LANI, `select rispondi_partita('${id}', false)`);
    await passi(richiesta({ tipo: 'partita', id }, { gettone: 'gettone-lani' }));
    expect(await somma()).toBe(10); // panchina 5 + vinta 5, senza genitori
    await c(LANI, `select rispondi_partita('${id}', true)`); // una risposta sola
    expect(await valore(`select in_campo from partite where id = '${id}'`)).toBe(false);

    await c(PAPA, `select correggi_partita('${id}', true)`);
    await passi(richiesta({ tipo: 'partita', id }, { gettone: 'gettone-papa' }));
    expect(await somma()).toBe(25); // in campo 10 + vinta 15
    await c(PAPA, `select correggi_partita('${id}', false)`);
    await passi(richiesta({ tipo: 'partita', id }, { gettone: 'gettone-papa' }));
    expect(await somma()).toBe(10);
  });

  // 17/11: la FIPAV è l'unico calendario delle partite; il calendario di casa conta solo per "[LANI ASSENTE]"
  it('"[LANI ASSENTE]": nessuna partita; senza niente nel calendario: convocata, partita e popup', async () => {
    await convocata(`[LANI ASSENTE] Partita U13: RUBIERESE U13 vs ${U13}`);
    alle('2026-11-29T20:00:00+01:00');
    await lancia();
    expect(await valore(`select count(*)::int from partite`)).toBe(0);
    expect(await valore(`select count(*)::int from impegni_famiglia where id = 'fipav:93436:1239'`)).toBe(0);

    await stato.banco!.come(null, `delete from impegni_famiglia`);
    await lancia();
    expect(await valore(`select count(*)::int || ' ' || max(gara) from partite`)).toBe('1 1239');
    expect(await valore(`select count(*)::int from popup_coda where situazione = 'partita_com_e_andata'`)).toBe(1);
  });

  it('le gare diventano impegni di famiglia; spostata dalla FIPAV, la riga si sposta', async () => {
    alle('2026-11-24T06:15:00+01:00');
    await lancia();
    expect(await valore(`select string_agg(id || ' ' || titolo, ' | ' order by id) from impegni_famiglia`)).toBe(
      `fipav:93399:869 Partita Lani U14: ${U14} vs A.S.D. GAZZE CANOSSA | fipav:93436:1239 Partita Lani U13: RUBIERESE U13 vs ${U13} | fipav:93436:1243 Partita Lani U13: ${U13} vs DENTI ALBINETANA PANTHERS`,
    );
    vi.stubGlobal('fetch', async (u: string) =>
      new Response(String(u).includes('risultati-classifiche') ? (String(u).endsWith('93436') ? gare([[1243, '13/12/26 09:00', U13, 'DENTI ALBINETANA PANTHERS', '-', 'da disputare']]) : gare([])) : pagina(String(u).endsWith('93436') ? U13 : U14)),
    );
    alle('2026-11-25T06:15:00+01:00');
    await lancia();
    expect(new Date(String(await valore(`select inizio from impegni_famiglia where id = 'fipav:93436:1243'`))).toISOString()).toBe('2026-12-13T08:00:00.000Z');
  });

  it('risposta "Assente": approvata senza in_campo, niente passi, non si risponde due volte', async () => {
    alle('2026-11-29T20:00:00+01:00');
    await lancia();
    const id = String(await valore(`select id from partite where gara = 1239`));
    await stato.banco!.come(LANI, `select rispondi_partita('${id}', null)`);
    expect(await valore(`select (approvata_il is not null)::text || ' ' || coalesce(in_campo::text, 'assente') from partite where id = '${id}'`)).toBe('true assente');
    const passi = await carica('passi');
    await passi(richiesta({ tipo: 'partita', id }, { gettone: 'gettone-lani' }));
    expect(await valore(`select count(*)::int from movimenti_passi where riferimento like '%${id}%'`)).toBe(0);
    await stato.banco!.come(LANI, `select rispondi_partita('${id}', true)`);
    expect(await valore(`select in_campo from partite where id = '${id}'`)).toBeNull();
  });

  it('partita prima dell’inizio del gioco: niente partita né popup', async () => {
    await stato.banco!.come(null, `insert into impegni_famiglia (id, inizio, titolo) values ('g0', '2026-11-14T18:30:00+01:00', 'Partita Lani U13: VOLLEY SCANDIANO ROSSA vs ${U13}')`);
    alle('2026-11-15T20:00:00+01:00');
    await lancia();
    expect(await valore(`select count(*)::int from partite`)).toBe(0);
  });

  // dal 17/11 nessuno la segna a mano: un risultato in ritardo si prende per risultato_entro_giorni (7)
  it('risultato in ritardo: entro 7 giorni partita e popup, dopo no', async () => {
    await convocata();
    alle('2026-12-07T06:15:00+01:00');
    await lancia();
    expect(await valore(`select count(*)::int from partite`)).toBe(0);
    alle('2026-12-01T06:15:00+01:00');
    await lancia();
    expect(await valore(`select count(*)::int from partite`)).toBe(1);
  });

  it('ogni mezz’ora legge il portale solo da inizio + 2 ore, il giorno della partita', async () => {
    alle('2026-11-24T06:15:00+01:00');
    await lancia();
    alle('2026-11-28T17:30:00+01:00'); // U14 alle 16:00: troppo presto
    chiesti.length = 0;
    expect((await lancia({ solo: 'partite' })).corpo).toEqual({ esito: 'niente da leggere' });
    expect(chiesti).toEqual([]);
    alle('2026-11-28T18:00:00+01:00');
    await lancia({ solo: 'partite' });
    expect(chiesti.map((u) => u.split('CId=')[1])).toEqual(['93399', '93399']); // solo l'U14: classifica e gare
    alle('2026-11-29T00:10:00+01:00'); // dopo mezzanotte aspetta le 6:15
    chiesti.length = 0;
    await lancia({ solo: 'partite' });
    expect(chiesti).toEqual([]);
  });

  it('pagina cambiata: errore, la classifica di prima resta, Lani non la lancia', async () => {
    vi.stubGlobal('fetch', async () => new Response('<html>manutenzione</html>'));
    const f = await carica('classifiche');
    expect((await f(richiesta({}, { cron: true }))).status).toBe(502);
    expect(await valore(`select count(*)::int from classifiche`)).toBe(0);
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
    const prima = await valore(`select enigma from forzieri where n = 1`); // quello della 0028
    for (let i = 0; i < 3; i++) ia.coda.push(USCITA, { risposta: 'un cerchio', dubbi: false }, { giusta: false });
    const f = await carica('enigma');
    expect((await f(richiesta({ azione: 'genera', n: 1 }, { gettone: 'gettone-papa' }))).status).toBe(422);
    expect(await valore(`select enigma from forzieri where n = 1`)).toBe(prima);
    expect(inviate.some((i) => i.endpoint.includes('papa'))).toBe(true);
  });
  it('Lani non genera; forziere inesistente; enigma già comparso; cima senza le parole dei forzieri', async () => {
    const f = await carica('enigma');
    expect((await f(richiesta({ azione: 'genera', n: 1 }, { gettone: 'gettone-lani' }))).status).toBe(403);
    expect((await f(richiesta({ azione: 'genera', n: 12 }, { gettone: 'gettone-papa' }))).status).toBe(404);
    await stato.banco!.come(null, `update forzieri set premio = 'Gardaland' where n = 9`);
    await stato.banco!.come(null, `update forzieri set parola = null where n = 2`); // una parola dei forzieri 1-8 manca
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
