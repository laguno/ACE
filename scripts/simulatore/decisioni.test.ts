// Decisioni del signore del 10/11, sul database con le migrazioni vere e la funzione "passi" vera:
// un gesto per voce al giorno; lo storno di un compito toglie anche lo studio di quel giorno.
import type { PGlite } from '@electric-sql/pglite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { expect, test } from 'vitest';
import * as R from '../../src/lib/regole';
import { creaGestori, eseguiPassi } from '../../supabase/functions/_shared/passi.ts';
import { creaDatabase, PAPA } from '../supabase-finto.mjs';
import { client } from './database.ts';

async function banco() {
  const { db: pg, come } = (await creaDatabase()) as { db: PGlite; come: (uid: string | null, sql: string) => Promise<{ rows: Record<string, unknown>[] }> };
  const db = client(pg) as unknown as SupabaseClient;
  const gestori = creaGestori(db);
  const v = async (sql: string) => (await pg.query<{ v: unknown }>(sql)).rows[0]?.v;
  return { come, v, passi: async (tipo: string, id: string) => (await eseguiPassi(db, gestori, tipo, id)).passi ?? 0, saldo: () => v(`select passi as v from saldo_passi`) };
}

test('gesti: la stessa voce segnata due volte nello stesso giorno vale una volta', { timeout: 60_000 }, async () => {
  const { v, passi, saldo } = await banco();
  const gesto = async (voce: string, data = '2026-11-24') => String(await v(`insert into gesti_casa (data, voce, dato_da) values ('${data}', '${voce}', '${PAPA}') returning id as v`));
  const letto = R.CONFIG.passi.gesti_casa.voci.letto;
  expect(await passi('gesto', await gesto('letto'))).toBe(letto);
  expect(await passi('gesto', await gesto('letto'))).toBe(0);
  // un'altra voce lo stesso giorno, e la stessa voce il giorno dopo, valgono
  expect(await passi('gesto', await gesto('scrivania'))).toBe(R.CONFIG.passi.gesti_casa.voci.scrivania);
  expect(await passi('gesto', await gesto('letto', '2026-11-25'))).toBe(letto);
  expect(await saldo()).toBe(2 * letto + R.CONFIG.passi.gesti_casa.voci.scrivania);
});

test('storno di un compito: via anche i passi di studio di quel giorno', { timeout: 60_000 }, async () => {
  const { come, v, saldo } = await banco();
  const registra = (motivo: string, rif: string, passi: number, giorno: string) => come(null, `select registra_passi('${motivo}', '${rif}', ${passi}, 1, '${giorno}')`);
  await registra('compito', 'c1', 5, '2026-11-24');
  await registra('flashcard', 'flashcard:2026-11-24:1', 3, '2026-11-24');
  await registra('quiz', 'quiz:2026-11-24:1', 4, '2026-11-24');
  await registra('flashcard', 'flashcard:2026-11-25:1', 3, '2026-11-25'); // altro giorno: resta
  expect(await saldo()).toBe(15);
  expect((await come(PAPA, `select storna_spunta('compito', 'c1') as v`)).rows[0].v).toBe(true);
  expect(await saldo()).toBe(3);
  // rifatto lo storno: niente di doppio
  expect((await come(PAPA, `select storna_spunta('compito', 'c1') as v`)).rows[0].v).toBe(false);
  expect(await saldo()).toBe(3);
  expect(await v(`select count(*)::int as v from movimenti_passi where motivo = 'storno'`)).toBe(3);
});

test('riscatto: sette giorni di scuola fatti bene dopo il rimprovero sbloccano la figurina nera', { timeout: 60_000 }, async () => {
  const { riscatti } = await import('../../supabase/functions/_shared/riscatto.ts');
  const { db: pg } = (await creaDatabase()) as { db: PGlite };
  const db = client(pg) as unknown as SupabaseClient;
  const q = (sql: string) => pg.query(sql);
  await q(`insert into figurine (posa, serie_nera, in_attesa_di_riscatto_dal) values ('lady-dispettosa', true, '2026-11-24')`);
  const sere = ['2026-11-24', '2026-11-25', '2026-11-26', '2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02'];
  for (const sera of sere) await q(`insert into serate (data, cartella_il) values ('${sera}', '${sera}T20:00:00+01:00')`);
  await q(`insert into compiti (testo, scadenza, fatto_il) values ('Es.', '2026-11-25', '2026-11-24T16:00:00+01:00')`);
  // a metà strada non basta; il sabato e la domenica non contano
  expect(await riscatti(db, new Date('2026-12-02T10:00:00+01:00'))).toEqual([]);
  expect(await riscatti(db, new Date('2026-12-04T10:00:00+01:00'))).toEqual(['lady-dispettosa']);
  expect((await q(`select sbloccata_il from figurine where posa = 'lady-dispettosa'`)).rows[0]).toMatchObject({ sbloccata_il: expect.anything() });
  expect((await q(`select testo, posa from popup_coda where chiave = 'riscatto:lady-dispettosa'`)).rows).toEqual([{ testo: 'Sette giorni fatti bene: figurina nera sbloccata, Lady dispettosa.', posa: 'lady-dispettosa' }]);
  // già sbloccata: il giro dopo non rifà niente
  expect(await riscatti(db, new Date('2026-12-05T10:00:00+01:00'))).toEqual([]);

  // un giorno storto (sgridata, compito non fatto) fa ripartire il conto
  await q(`insert into figurine (posa, serie_nera, in_attesa_di_riscatto_dal) values ('leo-marameo', true, '2026-11-24')`);
  await q(`insert into sgridate (data, tipo, dato_da) values ('2026-11-26', 'bagno', '${PAPA}')`);
  expect(await riscatti(db, new Date('2026-12-04T10:00:00+01:00'))).toEqual([]);
});
