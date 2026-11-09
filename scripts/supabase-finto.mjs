// Finto ambiente Supabase su PGlite (Postgres in memoria) con tutte le migrazioni vere: lo usano
// la prova di sicurezza dello schema (prova-schema.mjs) e il simulatore dell'anno (scripts/simulatore).
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readdirSync, readFileSync } from 'node:fs';

export const PAPA = '00000000-0000-0000-0000-00000000000a';
export const LANI = '00000000-0000-0000-0000-00000000000b';

/** Database nuovo con auth e storage finti, ruoli di Supabase e le migrazioni (senza quelle del cron). */
export async function creaDatabase() {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`
    create schema extensions; create schema auth; create schema storage;
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    -- owner_id lo mette lo Storage dal token di chi carica, come su Supabase
    create table storage.objects (id serial, bucket_id text, name text, owner_id text default nullif(current_setting('test.uid', true), ''));
    create function storage.foldername(name text) returns text[] language sql immutable as $f$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $f$;
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
  await db.exec(`
    insert into auth.users values ('${PAPA}'), ('${LANI}');
    insert into profili values ('${PAPA}', 'genitore', 'Papà'), ('${LANI}', 'lani', 'Lani');
  `);
  /** Una query come un utente (uid) o come il server (uid null, superutente = service role). */
  const come = async (uid, sql, ruolo = 'authenticated') => {
    await db.exec(`reset role; select set_config('test.uid', '${uid ?? ''}', false);`);
    if (uid || ruolo === 'anon') await db.exec(`set role ${ruolo}`);
    try {
      return await db.query(sql);
    } finally {
      // dopo, di nuovo il server: l'utente non resta attaccato alle query successive
      await db.exec(`reset role; select set_config('test.uid', '', false);`);
    }
  };
  return { db, come };
}
