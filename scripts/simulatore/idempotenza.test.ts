// Idempotenza dei cron (filone H del piano): rilanciare chiavi della domenica, passi di voti e note
// (sync-nuvola) e passi delle spunte due volte di fila non cambia niente. Codice vero delle
// funzioni (_shared/) su PGlite con le migrazioni vere; dati finti.
process.env.TZ = 'Europe/Rome';
import { afterAll, beforeAll, expect, test, vi } from 'vitest';
import { contaChiavi } from '../../supabase/functions/_shared/chiavi.ts';
import { creaGestori, eseguiPassi } from '../../supabase/functions/_shared/passi.ts';
import { passiEForzieri } from '../../supabase/functions/_shared/voti.ts';
import * as R from '../../src/lib/regole/index.ts';
// @ts-expect-error modulo JavaScript senza tipi
import { creaDatabase, LANI } from '../supabase-finto.mjs';
import { client } from './database.ts';

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-29T21:30:00+01:00')); // domenica sera della prima settimana
});
afterAll(() => {
  vi.useRealTimers();
});

const SETTIMANA = R.giorno('2026-11-23');

test('due giri di fila dei cron: il database resta identico', { timeout: 60_000 }, async () => {
  const { db, come } = await creaDatabase();
  const s = client(db) as never;
  // una settimana finta: compiti fatti (uno no), un voto, una nota di merito
  await come(null, `insert into materie (id, nome, abbreviazione) values ('matematica', 'Matematica', 'Mate') on conflict do nothing`);
  for (const [i, giorno] of ['2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27'].entries())
    await come(null, `insert into compiti (id, testo, scadenza, fatto_il) values ('00000000-0000-0000-0000-00000000010${i}', 'Es. ${i}', '${giorno}', ${i === 3 ? 'null' : `'${giorno}T07:00:00+01:00'`})`);
  await come(null, `insert into voti (nuvola_id, materia_id, data, voto) values ('v1', 'matematica', '2026-11-25', 8)`);
  await come(null, `insert into note (nuvola_id, materia_id, data, tipo, testo) values ('n1', 'matematica', '2026-11-26', 'merito', 'Brava')`);

  const foto = async () =>
    (
      await come(
        null,
        `select (select count(*) from movimenti_passi) movimenti, (select coalesce(sum(passi * moltiplicatore), 0) from movimenti_passi) saldo,
                (select count(*) from settimane) settimane, (select string_agg(chiavi::text, ',') from settimane) chiavi,
                (select count(*) from popup_coda) popup, (select count(*) from figurine where sbloccata_il is not null) figurine,
                (select string_agg(n::text || stato::text, ',' order by n) from forzieri) forzieri`,
      )
    ).rows[0];

  const giro = async () => {
    const gestori = creaGestori(s);
    for (let i = 0; i < 4; i++) await eseguiPassi(s, gestori, 'compito', `00000000-0000-0000-0000-00000000010${i}`);
    await passiEForzieri(s);
    await contaChiavi(s, SETTIMANA);
  };

  await giro();
  const primo = await foto();
  expect(Number(primo.movimenti)).toBeGreaterThan(3); // compiti, voto, nota
  expect(primo.chiavi).not.toBeNull();
  await giro();
  expect(await foto()).toEqual(primo);
  // e la settimana già contata risponde "già fatto" senza riscrivere
  expect(await contaChiavi(s, SETTIMANA)).toMatchObject({ gia: true });
  expect(LANI).toBeTruthy();
});
