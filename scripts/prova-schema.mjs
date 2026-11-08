// Prova di sicurezza dello schema su PGlite (Postgres in memoria) con un finto ambiente Supabase:
// applica tutte le migrazioni e controlla cosa può e non può fare Lani. Uso: npm run prova:schema
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readdirSync, readFileSync } from 'node:fs';

const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(`
  create schema extensions; create schema auth; create schema storage;
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id serial, bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema public, auth, extensions, storage to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`);
// le migrazioni del cron usano pg_cron e pg_net, che PGlite non ha
for (const m of readdirSync('supabase/migrations').sort().filter((f) => !f.includes('cron'))) await db.exec(readFileSync(`supabase/migrations/${m}`, 'utf8'));
console.log('migrazioni applicate');

const PAPA = '00000000-0000-0000-0000-00000000000a', LANI = '00000000-0000-0000-0000-00000000000b';
const COMPITO = '11111111-1111-1111-1111-111111111111', QUIZ = '22222222-2222-2222-2222-222222222222';
await db.exec(`
  insert into auth.users values ('${PAPA}'), ('${LANI}');
  insert into profili values ('${PAPA}', 'genitore', 'Papà'), ('${LANI}', 'lani', 'Lani');
  insert into compiti (id, testo, scadenza) values ('${COMPITO}', 'Es. 3 pag. 40', '2026-11-24');
  update forzieri set premio = 'Pizza', enigma = 'Rotonda e calda', soluzione = 'pizza', stato = 'enigma' where n = 1;
  insert into quiz (id, argomento, domande) values ('${QUIZ}', 'Frazioni', '[]');
`);

let ok = 0, ko = 0;
const come = async (uid, sql, ruolo = 'authenticated') => {
  await db.exec(`reset role; select set_config('test.uid', '${uid ?? ''}', false);`);
  if (uid || ruolo === 'anon') await db.exec(`set role ${ruolo}`);
  try { return await db.query(sql); } finally { await db.exec('reset role'); }
};
const verifica = (nome, cond) => { cond ? ok++ : ko++; console.log(cond ? 'ok ' : 'NO ', nome); };
const fallisce = async (nome, uid, sql, ruolo) => {
  try { await come(uid, sql, ruolo); verifica(nome, false); } catch { verifica(nome, true); }
};
const val = async (uid, sql) => Object.values((await come(uid, sql)).rows[0] ?? {})[0];

// Lani
verifica('Lani non legge la tabella forzieri', (await come(LANI, 'select * from forzieri')).rows.length === 0);
const f = (await come(LANI, 'select enigma, premio from forzieri_lani where n = 1')).rows[0];
verifica('Lani vede l\'enigma ma non il premio', f.enigma === 'Rotonda e calda' && f.premio === null);
verifica('Lani non legge il PIN', (await come(LANI, 'select * from pin_genitori')).rows.length === 0);
await come(LANI, `update compiti set fatto_il = now() where id = '${COMPITO}'`);
verifica('Lani spunta un compito', (await val(null, 'select fatto_il is not null from compiti')) === true);
await come(null, `update compiti set fatto_il = null`);
await come(LANI, `update compiti set fatto_il = '2026-11-01' where id = '${COMPITO}'`);
verifica('spunta retrodatata: il server mette l\'ora vera', (await val(null, `select fatto_il > now() - interval '1 minute' from compiti`)) === true);
const primaOra = await val(null, 'select fatto_il::text from compiti');
await come(LANI, `update compiti set fatto_il = '2026-11-01' where id = '${COMPITO}'`);
verifica('una spunta già data non si sposta', (await val(null, 'select fatto_il::text from compiti')) === primaOra);
await come(LANI, `insert into serate (data, cartella_il) values (oggi(), '2026-11-01')`);
verifica('serata: ora del server', (await val(null, `select cartella_il > now() - interval '1 minute' from serate`)) === true);
await come(LANI, `insert into flashcard_giri (iniziato_il, fatto_il, carte, sapevo, quasi, non_sapevo) values (now() - interval '2 minutes', '2020-01-01', 10, 5, 3, 2)`);
verifica('giro di flash card: fine con l\'ora del server', (await val(null, `select fatto_il > now() - interval '1 minute' from flashcard_giri`)) === true);
await fallisce('giro di flash card senza inizio rifiutato', LANI, `insert into flashcard_giri (carte, sapevo, quasi, non_sapevo) values (10, 5, 3, 2)`);
await come(null, `update compiti set fatto_il = '2026-11-20'`);
verifica('il server può scrivere una data qualsiasi', (await val(null, 'select fatto_il::date::text from compiti')) === '2026-11-20');
await fallisce('Lani non cambia la scadenza', LANI, `update compiti set scadenza = '2027-01-01'`);
await fallisce('Lani non scrive passi', LANI, `insert into movimenti_passi (motivo, riferimento, passi) values ('x', 'y', 100)`);
await fallisce('Lani non chiama registra_passi', LANI, `select registra_passi('x', 'y', 100)`);
await fallisce('Lani non scrive voti', LANI, `insert into voti (data, voto) values (now(), 10)`);
await fallisce('Lani non apre forzieri dalla vista', LANI, `update forzieri_lani set stato = 'aperto'`);
await come(LANI, `update forzieri set stato = 'aperto' where n = 1`).catch(() => {});
verifica('Lani non apre forzieri dalla tabella', (await val(null, 'select stato from forzieri where n = 1')) === 'enigma');
await fallisce('Lani non storna', LANI, `select storna_spunta('compito', 'x')`);
await come(LANI, `insert into quiz_tentativi (quiz_id, numero, giuste, totale) values ('${QUIZ}', 1, 9, 10)`);
await come(LANI, `insert into quiz_tentativi (quiz_id, numero, giuste, totale) values ('${QUIZ}', 1, 9, 10)`);
verifica('il numero del tentativo lo decide il server', (await val(null, 'select max(numero) from quiz_tentativi')) === 2);
await come(LANI, `insert into umore (faccia) values ('contenta')`);
await come(LANI, `update umore set faccia = 'broncio'`);
verifica('Lani cambia la faccia di oggi', (await val(null, 'select faccia from umore')) === 'broncio');
await fallisce('anon non legge il saldo', null, 'select * from saldo_passi', 'anon');
await fallisce('anon non legge i forzieri', null, 'select * from forzieri_lani', 'anon');

// Genitori, PIN
await come(PAPA, `select imposta_pin('2468')`);
verifica('PIN giusto', (await val(PAPA, `select verifica_pin('2468')`)) === true);
verifica('PIN sbagliato', (await val(PAPA, `select verifica_pin('1111')`)) === false);
verifica('solo hash salvato', !(await val(null, 'select hash from pin_genitori')).includes('2468'));
for (let i = 0; i < 5; i++) await come(PAPA, `select verifica_pin('0000')`);
verifica('dopo 5 errori blocco anche col PIN giusto', (await val(PAPA, `select verifica_pin('2468')`)) === false);
verifica('Lani: verifica_pin sempre false', (await val(LANI, `select verifica_pin('2468')`)) === false);
verifica('il genitore legge il premio', (await val(PAPA, 'select premio from forzieri where n = 1')) === 'Pizza');

// Passi e storno (server)
await come(null, `select registra_passi('compito', '${COMPITO}', 13, 1.25)`);
verifica('idempotente', (await val(null, `select registra_passi('compito', '${COMPITO}', 13, 1.25)`)) === null);
verifica('saldo 16', (await val(null, 'select passi from saldo_passi')) === 16);
verifica('genitore storna', (await val(PAPA, `select storna_spunta('compito', '${COMPITO}')`)) === true);
verifica('storno esatto: saldo 0', (await val(null, 'select passi from saldo_passi')) === 0);
verifica('storno una volta sola', (await val(PAPA, `select storna_spunta('compito', '${COMPITO}')`)) === false);
verifica('storno firmato dal genitore', (await val(null, `select dato_da from movimenti_passi where motivo = 'storno'`)) === PAPA);
await come(null, `select registra_passi('cartella', 'serata:2026-11-23', 5, 1, '2026-11-23')`);
await come(null, `insert into settimane (inizio, chiavi) values ('2026-11-23', 2)`);
verifica('dopo le chiavi niente storno', (await val(PAPA, `select storna_spunta('cartella', 'serata:2026-11-23')`)) === false);
await come(null, `select registra_passi('bagno', 'sgridata:1', -20)`);
verifica('il saldo non scende sotto zero', (await val(null, 'select passi from saldo_passi')) === 0);

console.log(`\n${ok} ok, ${ko} no`);
process.exit(ko ? 1 : 0);
