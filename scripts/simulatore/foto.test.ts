// Foto delle pagine sul database con le migrazioni vere e la funzione "passi" vera (come il
// simulatore): +2 a Lani una volta per richiesta e solo per una foto sua, anche con la stessa foto
// caricata due volte, la chiamata ripetuta, la foto cancellata da un genitore e rifatta.
import type { PGlite } from '@electric-sql/pglite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { expect, test } from 'vitest';
import * as R from '../../src/lib/regole';
import { creaGestori, eseguiPassi } from '../../supabase/functions/_shared/passi.ts';
import { creaDatabase, LANI, PAPA } from '../supabase-finto.mjs';
import { client } from './database.ts';

test('foto: +2 una volta per richiesta, solo se la foto è di Lani', { timeout: 60_000 }, async () => {
  const { db: pg, come } = (await creaDatabase()) as { db: PGlite; come: (uid: string | null, sql: string) => Promise<{ rows: Record<string, unknown>[] }> };
  const db = client(pg) as unknown as SupabaseClient;
  const gestori = creaGestori(db);
  const passi = async (id: string) => (await eseguiPassi(db, gestori, 'foto', id)).passi ?? 0;
  const v = async (sql: string) => (await pg.query<{ v: unknown }>(sql)).rows[0]?.v;
  const richiesta = async (pagine: string) => String(await v(`insert into richieste_foto (motivo, pagine) values ('compito', '${pagine}') returning id as v`));
  /** come l'app: prima il file nella cartella della richiesta, poi la riga a nome di chi carica */
  const carica = async (uid: string, rich: string, nome: string) => {
    await come(uid, `insert into storage.objects (bucket_id, name) values ('foto-pagine', '${rich}/${nome}')`);
    await come(uid, `insert into foto_pagine (richiesta_id, pagine, percorso_storage) values ('${rich}', '1', '${rich}/${nome}')`);
  };
  const movimenti = async (rich: string) => (await pg.query(`select passi from movimenti_passi where motivo = 'foto' and riferimento = '${rich}'`)).rows;
  const stato = (rich: string) => v(`select stato as v from richieste_foto where id = '${rich}'`);

  // Lani: niente foto, niente passi; poi la stessa foto due volte e la chiamata ripetuta
  const a = await richiesta('40');
  expect(await passi(a)).toBe(0);
  expect(await stato(a)).toBe('aperta');
  await carica(LANI, a, '1-0.jpg');
  await carica(LANI, a, '1-1.jpg');
  expect(await passi(a)).toBe(R.CONFIG.passi.foto_compito);
  expect(await passi(a)).toBe(0);
  expect(await stato(a)).toBe('fatta');
  expect(await movimenti(a)).toEqual([{ passi: R.CONFIG.passi.foto_compito }]);

  // a richiesta chiusa Lani non carica più: niente terza foto
  await expect(come(LANI, `insert into storage.objects (bucket_id, name) values ('foto-pagine', '${a}/2.jpg')`)).rejects.toThrow();
  // Lani non cancella foto (né riga né file): la RLS non trova righe
  await come(LANI, `delete from foto_pagine`);
  await come(LANI, `delete from storage.objects where bucket_id = 'foto-pagine'`);
  expect(await v(`select count(*)::int as v from foto_pagine where richiesta_id = '${a}'`)).toBe(2);
  expect(await v(`select count(*)::int as v from storage.objects where name like '${a}/%'`)).toBe(2);

  // un genitore cancella la foto sbagliata (riga e file, come l'area genitori); i passi restano
  await come(PAPA, `delete from foto_pagine where percorso_storage = '${a}/1-1.jpg'`);
  await come(PAPA, `delete from storage.objects where bucket_id = 'foto-pagine' and name = '${a}/1-1.jpg'`);
  expect(await v(`select count(*)::int as v from foto_pagine where richiesta_id = '${a}'`)).toBe(1);
  expect(await v(`select count(*)::int as v from storage.objects where name like '${a}/%'`)).toBe(1);
  // riaprire la richiesta non spetta ai genitori (0024: leggono soltanto): zero righe
  await come(PAPA, `update richieste_foto set stato = 'aperta' where id = '${a}'`);
  expect(await stato(a)).toBe('fatta');
  expect(await movimenti(a)).toHaveLength(1);
  // se il server la riaprisse e Lani la rifacesse, il +2 non arriverebbe una seconda volta
  await come(null, `update richieste_foto set stato = 'aperta' where id = '${a}'`);
  await carica(LANI, a, '3-0.jpg');
  expect(await passi(a)).toBe(0);
  expect(await stato(a)).toBe('fatta');
  expect(await movimenti(a)).toHaveLength(1);

  // foto del genitore: richiesta chiusa senza passi; se poi carica anche Lani, niente (è già chiusa)
  const b = await richiesta('41');
  await carica(PAPA, b, '1-0.jpg');
  expect(await passi(b)).toBe(0);
  expect(await stato(b)).toBe('fatta');
  expect(await movimenti(b)).toEqual([]);
});
