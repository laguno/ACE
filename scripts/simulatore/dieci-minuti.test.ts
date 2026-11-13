// Sprint 2, dieci minuti e partite: sul database con le migrazioni vere e la funzione "passi" vera.
import type { PGlite } from '@electric-sql/pglite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { expect, test, vi } from 'vitest';
import * as R from '../../src/lib/regole';
import { creaGestori, eseguiPassi } from '../../supabase/functions/_shared/passi.ts';
import { creaDatabase } from '../supabase-finto.mjs';
import { client } from './database.ts';

const accendi = (pg: PGlite, da: string) =>
  pg.query(`insert into impostazioni (chiave, valore) values ($1, to_jsonb($2::text))`, [R.CHIAVE_R_EVOLUTION, da]);

test('dieci minuti: passi solo con R-Evolution accesa, al mattino, col timer in fondo, una volta al giorno', { timeout: 60_000 }, async () => {
  const { db: pg } = (await creaDatabase()) as { db: PGlite };
  const db = client(pg) as unknown as SupabaseClient;
  const gestori = creaGestori(db);
  const passi = async (id: string) => (await eseguiPassi(db, gestori, 'dieci_minuti', id)).passi ?? 0;
  const giorno = async (data: string, ora: string, minuti: number) => {
    const da = new Date(`${data}T${ora}:00+01:00`);
    await pg.query(`insert into serate (data, dieci_minuti_da, dieci_minuti_il) values ($1, $2, $3)`, [
      data,
      da.toISOString(),
      new Date(da.getTime() + minuti * 60_000).toISOString(),
    ]);
  };
  const dieci = R.CONFIG.passi.obbligatori.dieci_minuti;
  const minuti = R.CONFIG.dieci_minuti.secondi / 60;

  await giorno('2026-11-30', '07:00', minuti); // R-Evolution spenta: niente
  expect(await passi('2026-11-30')).toBe(0);
  await accendi(pg, '2026-12-01');
  expect(await passi('2026-11-30')).toBe(0); // prima del giorno di accensione
  await giorno('2026-12-01', '07:00', minuti - 1); // timer interrotto: niente
  expect(await passi('2026-12-01')).toBe(0);
  await giorno('2026-12-02', '20:00', minuti); // la sera: fuori dalla finestra
  expect(await passi('2026-12-02')).toBe(0);
  await giorno('2026-12-03', '12:55', minuti); // avviati alle 12:55: valgono
  expect(await passi('2026-12-03')).toBe(dieci);
  expect(await passi('2026-12-03')).toBe(0); // già registrato
  // la serata (cartella e borsa) non li conta più
  expect((await eseguiPassi(db, gestori, 'serata', '2026-12-03')).passi ?? 0).toBe(0);
});

test('partite: solo dopo l\'approvazione, in campo o in panchina, popup, correzione da persa a vinta', { timeout: 60_000 }, async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2027-01-24T12:00:00+01:00')); // i popup partono solo dopo periodo.inizio
  const { LANI, PAPA } = await import('../supabase-finto.mjs');
  const { db: pg } = (await creaDatabase()) as { db: PGlite };
  const db = client(pg) as unknown as SupabaseClient;
  const gestori = creaGestori(db);
  const passi = async (id: string) => (await eseguiPassi(db, gestori, 'partita', id)).passi ?? 0;
  const partita = async (data: string, nostri: number, loro: number, inCampo = true) =>
    String(
      (
        await pg.query<{ id: string }>(
          `insert into partite (data, avversaria, set_nostri, set_loro, in_campo, dato_da) values ($1, 'Volley Bibbiano', $2, $3, $4, $5) returning id`,
          [data, nostri, loro, inCampo, LANI],
        )
      ).rows[0].id,
    );
  const approva = (id: string) => pg.query(`update partite set approvata_il = now(), approvata_da = $2 where id = $1`, [id, PAPA]);
  const { giocata, vinta_in_piu, panchina, panchina_vinta_in_piu } = R.CONFIG.passi.partite;

  const spenta = await partita('2027-01-09', 3, 0);
  await approva(spenta);
  expect(await passi(spenta)).toBe(0); // R-Evolution spenta
  await accendi(pg, '2027-01-10');
  expect(await passi(spenta)).toBe(0); // giocata prima dell'accensione

  const persa = await partita('2027-01-16', 1, 3);
  expect(await passi(persa)).toBe(0); // da approvare
  await approva(persa);
  expect(await passi(persa)).toBe(giocata);
  expect(await passi(persa)).toBe(0);
  expect((await pg.query<{ dato_da: string }>(`select dato_da from movimenti_passi where riferimento = $1`, [persa])).rows[0].dato_da).toBe(PAPA);
  await pg.query(`update partite set set_nostri = 3, set_loro = 2 where id = $1`, [persa]);
  expect(await passi(persa)).toBe(vinta_in_piu); // corretta: solo la parte che mancava

  const vinta = await partita('2027-01-23', 3, 1);
  await approva(vinta);
  expect(await passi(vinta)).toBe(giocata + vinta_in_piu);
  const panchinaVinta = await partita('2027-01-23', 3, 0, false);
  await approva(panchinaVinta);
  expect(await passi(panchinaVinta)).toBe(panchina + panchina_vinta_in_piu);
  const panchinaPersa = await partita('2027-01-24', 0, 3, false);
  await approva(panchinaPersa);
  expect(await passi(panchinaPersa)).toBe(panchina);

  const testi = (await pg.query<{ testo: string }>(`select testo from popup_coda where chiave like 'partita:%' order by creato_il`)).rows.map((r) => r.testo);
  expect(testi).toContain(`Persa 1-3. +${giocata} per averla giocata. Si riparte al prossimo allenamento.`);
  expect(testi).toContain(`Vinta 3-1! +${giocata + vinta_in_piu}. Papà ha già la felpa viola addosso.`);
  vi.useRealTimers();
});
