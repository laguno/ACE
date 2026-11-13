// Sprint 2, dieci minuti: sul database con le migrazioni vere e la funzione "passi" vera.
import type { PGlite } from '@electric-sql/pglite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { expect, test } from 'vitest';
import * as R from '../../src/lib/regole';
import { creaGestori, eseguiPassi } from '../../supabase/functions/_shared/passi.ts';
import { creaDatabase } from '../supabase-finto.mjs';
import { client } from './database.ts';

test('dieci minuti: passi solo da R-Evolution, col timer in fondo, una volta per sera', { timeout: 60_000 }, async () => {
  const { db: pg } = (await creaDatabase()) as { db: PGlite };
  const db = client(pg) as unknown as SupabaseClient;
  const gestori = creaGestori(db);
  const passi = async (id: string) => (await eseguiPassi(db, gestori, 'serata', id)).passi ?? 0;
  const sera = async (data: string, minuti: number) =>
    pg.query(`insert into serate (data, dieci_minuti_da, dieci_minuti_il) values ($1, $2, $3)`, [
      data,
      `${data}T20:00:00+01:00`,
      new Date(new Date(`${data}T20:00:00+01:00`).getTime() + minuti * 60_000).toISOString(),
    ]);
  const dieci = R.CONFIG.passi.obbligatori.dieci_minuti;
  const minuti = R.CONFIG.dieci_minuti.secondi / 60;

  await sera('2026-12-01', minuti); // prima di R-Evolution: niente
  expect(await passi('2026-12-01')).toBe(0);
  await sera('2027-01-11', minuti - 1); // timer interrotto: niente
  expect(await passi('2027-01-11')).toBe(0);
  await sera('2027-01-12', minuti);
  expect(await passi('2027-01-12')).toBe(dieci);
  expect(await passi('2027-01-12')).toBe(0); // già registrato
});
