// Sprint 2, dieci minuti: sul database con le migrazioni vere e la funzione "passi" vera.
import type { PGlite } from '@electric-sql/pglite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { expect, test, vi } from 'vitest';
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

test('partite: +giocata, +vinta in più, popup, correzione da persa a vinta', { timeout: 60_000 }, async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2027-01-24T12:00:00+01:00')); // i popup partono solo dopo periodo.inizio
  const { PAPA } = await import('../supabase-finto.mjs');
  const { db: pg } = (await creaDatabase()) as { db: PGlite };
  const db = client(pg) as unknown as SupabaseClient;
  const gestori = creaGestori(db);
  const passi = async (id: string) => (await eseguiPassi(db, gestori, 'partita', id)).passi ?? 0;
  const partita = async (data: string, nostri: number, loro: number) =>
    String((await pg.query<{ id: string }>(`insert into partite (data, avversaria, set_nostri, set_loro, dato_da) values ($1, 'Volley Bibbiano', $2, $3, $4) returning id`, [data, nostri, loro, PAPA])).rows[0].id);
  const { giocata, vinta_in_piu } = R.CONFIG.passi.partite;

  expect(await passi(await partita('2026-12-05', 3, 0))).toBe(0); // prima di R-Evolution
  const persa = await partita('2027-01-16', 1, 3);
  expect(await passi(persa)).toBe(giocata);
  expect(await passi(persa)).toBe(0);
  await pg.query(`update partite set set_nostri = 3, set_loro = 2 where id = $1`, [persa]);
  expect(await passi(persa)).toBe(vinta_in_piu); // corretta: solo la parte che mancava
  expect(await passi(await partita('2027-01-23', 3, 1))).toBe(giocata + vinta_in_piu);
  const testi = (await pg.query<{ testo: string }>(`select testo from popup_coda where chiave like 'partita:%' order by creato_il`)).rows.map((r) => r.testo);
  expect(testi).toContain(`Persa 1-3. +${giocata} per averla giocata. Si riparte al prossimo allenamento.`);
  expect(testi).toContain(`Vinta 3-1! +${giocata + vinta_in_piu}. Papà ha già la felpa viola addosso.`);
  vi.useRealTimers();
});
