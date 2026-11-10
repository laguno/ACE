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
