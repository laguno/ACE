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
  -- come su Supabase: i client hanno i diritti sulla tabella dei file, decide la RLS
  grant all on storage.objects, storage.buckets to anon, authenticated, service_role;
  grant usage, select on all sequences in schema storage to anon, authenticated, service_role;
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
// saldo visto (passi che salgono)
await come(null, `insert into movimenti_passi (motivo, riferimento, passi) values ('prova_saldo', 'a', 40)`);
const visto = async () => (await come(LANI, 'select prima, adesso from vedi_saldo()')).rows[0];
const v1 = await visto();
verifica('saldo visto: la prima volta prima = adesso', v1.prima === v1.adesso);
await come(null, `insert into movimenti_passi (motivo, riferimento, passi) values ('prova_saldo', 'b', 12)`);
const v2 = await visto();
verifica('saldo visto: dal vecchio al nuovo', v2.prima === v1.adesso && v2.adesso === v1.adesso + 12);
const v3 = await visto();
verifica('saldo visto: la volta dopo è fermo', v3.prima === v3.adesso && v3.adesso === v2.adesso);
await fallisce('Lani non scrive il saldo visto', LANI, `update saldo_visto set passi = 0`);
await fallisce('Lani non inserisce il saldo visto', LANI, `insert into saldo_visto (profilo_id, passi) values ('${LANI}', 0)`);
verifica('il papà non vede il saldo visto di Lani', (await come(PAPA, 'select * from saldo_visto')).rows.length === 0);
await fallisce('anon non chiama vedi_saldo', null, 'select * from vedi_saldo()', 'anon');
await come(null, `delete from movimenti_passi where motivo = 'prova_saldo'`);
await fallisce('anon non legge i forzieri', null, 'select * from forzieri_lani', 'anon');
// frase del giorno: una al giorno, stessa frase per lo stesso momento, niente per un altro
const frase = async (m) => (await come(LANI, `select testo, autore from frase_del_giorno('${m}')`)).rows;
const f1 = await frase('apertura');
verifica('frase del giorno: una per l\'apertura', f1.length === 1 && f1[0].testo.length > 0);
verifica('frase del giorno: stessa frase se si riapre', (await frase('apertura'))[0]?.testo === f1[0].testo);
verifica('frase del giorno: niente in un altro momento dello stesso giorno', (await frase('chiusura')).length === 0);
await come(null, `update frasi set ultima_volta = oggi() - 1, ultimo_momento = 'apertura' where ultima_volta = oggi()`);
verifica('frase del giorno: il giorno dopo un\'altra frase', (await frase('apertura'))[0]?.testo !== f1[0].testo);
await come(null, `update frasi set ultima_volta = oggi() - 10 where ultima_volta = oggi()`);
await come(null, `update frasi set ultima_volta = oggi() - 5 where momento = 'apertura' and ultima_volta is null`);
verifica('frase del giorno: mai la stessa prima di 30 giorni', (await frase('apertura')).length === 0);
await come(PAPA, `insert into frasi (testo, autore, di_famiglia) values ('Ogni giorno un pezzetto.', 'papà', true)`);
await come(null, `update frasi set ultima_volta = oggi() - 1 where ultima_volta = oggi()`);
verifica('frase del giorno: quelle di famiglia prima', (await frase('chiusura'))[0]?.testo === 'Ogni giorno un pezzetto.');
await fallisce('anon non chiama frase_del_giorno', null, `select * from frase_del_giorno('apertura')`, 'anon');
await come(null, `delete from frasi where di_famiglia`);
await come(null, `update frasi set ultima_volta = null, ultimo_momento = null where ultima_volta is not null`);

// enigmi a tipi: aiutino dopo il primo errore, premio fermo quando l'enigma è comparso
await come(PAPA, `update forzieri set premio = 'Bici', enigma = 'Due ruote', soluzione = 'bici', aiutino = 'Ha i pedali.', parola = 'BICI' where n = 3`);
verifica('premio di un forziere chiuso: si cambia', (await val(null, 'select premio from forzieri where n = 3')) === 'Bici');
await come(null, `update forzieri set stato = 'enigma' where n = 3`);
verifica('aiutino nascosto prima del primo tentativo', (await val(LANI, 'select aiutino from forzieri_lani where n = 3')) === null);
await come(null, `update forzieri set tentativi_enigma = 1 where n = 3`);
verifica('aiutino visibile dopo il primo tentativo sbagliato', (await val(LANI, 'select aiutino from forzieri_lani where n = 3')) === 'Ha i pedali.');
await fallisce('premio fermo a enigma comparso (anche per il genitore)', PAPA, `update forzieri set premio = 'Altro' where n = 3`);
await fallisce('enigma fermo a enigma comparso (anche per il server)', null, `update forzieri set enigma = 'nuovo' where n = 3`);

// immagini dei premi: bucket privato senza regole per i client
await come(null, `insert into storage.objects (bucket_id, name) values ('premi', '1/premio-1.webp'), ('premi', '1/premio-1-sagoma.webp')`);
verifica('il bucket premi è privato', (await val(null, `select public from storage.buckets where id = 'premi'`)) === false);
verifica('Lani non vede nessun file dei premi, neanche la sagoma', (await come(LANI, `select name from storage.objects where bucket_id = 'premi'`)).rows.length === 0);
verifica('neanche un genitore li legge direttamente (passa dalla funzione)', (await come(PAPA, `select name from storage.objects where bucket_id = 'premi'`)).rows.length === 0);
verifica('anon non vede i file dei premi', await come(null, `select name from storage.objects where bucket_id = 'premi'`, 'anon').then((r) => r.rows.length === 0, () => true));
verifica('Lani non legge immagine_per né la tabella forzieri', (await come(LANI, 'select immagine_per from forzieri')).rows.length === 0);
await fallisce('Lani non carica file nel bucket premi', LANI, `insert into storage.objects (bucket_id, name) values ('premi', 'x.webp')`);

// richieste di foto: una per compito
await come(null, `insert into richieste_foto (motivo, pagine, compito_id) values ('compito', '40', '${COMPITO}')`);
await fallisce('una sola richiesta di foto per compito', null, `insert into richieste_foto (motivo, pagine, compito_id) values ('compito', '41', '${COMPITO}')`);
const RICH = await val(null, 'select id from richieste_foto limit 1');
await come(LANI, `insert into foto_pagine (richiesta_id, pagine, percorso_storage) values ('${RICH}', '40', 'r/1.jpg')`);
verifica('Lani carica una foto a suo nome', (await val(null, 'select caricata_da from foto_pagine')) === LANI);
await come(LANI, `update richieste_foto set stato = 'fatta'`); // la RLS non lo lascia passare: zero righe
verifica('la richiesta resta aperta finché non la chiude il server', (await val(null, 'select stato from richieste_foto')) === 'aperta');
await come(null, `delete from foto_pagine`);
await come(null, `delete from richieste_foto where id = '${RICH}'`);

// Genitori, PIN
verifica('controlla_pin: nessun PIN impostato', (await val(PAPA, `select controlla_pin('2468')`)) === 'manca');
await come(PAPA, `select imposta_pin('2468')`);
verifica('controlla_pin: giusto', (await val(PAPA, `select controlla_pin('2468')`)) === 'ok');
verifica('controlla_pin: sbagliato', (await val(PAPA, `select controlla_pin('1111')`)) === 'sbagliato');
for (let i = 0; i < 3; i++) await come(PAPA, `select controlla_pin('0000')`);
verifica('controlla_pin: al quinto errore bloccato', (await val(PAPA, `select controlla_pin('0000')`)) === 'bloccato');
verifica('controlla_pin: bloccato anche col PIN giusto', (await val(PAPA, `select controlla_pin('2468')`)) === 'bloccato');
verifica('controlla_pin: Lani no', (await val(LANI, `select controlla_pin('2468')`)) === 'no');
await fallisce('anon non chiama controlla_pin', null, `select controlla_pin('2468')`, 'anon');
await come(null, `update pin_genitori set errori = 0, bloccato_fino = null where id`);
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
