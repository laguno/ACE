-- ACE: schema iniziale (sprint 1). Progetto Supabase qonullxzhqvbfpiibqye.
-- Si applica con `npx supabase db push` (lo fa il signore dopo averla letta).
-- Una sola famiglia: niente multi-tenant. Ogni persona ha un profilo con un ruolo.
--
-- Sicurezza, in breve:
-- - Tutta la famiglia legge quasi tutto; i genitori scrivono tutto.
-- - Lani scrive solo spunte e attività di studio, e su ogni tabella solo le colonne
--   previste (trigger `solo_colonne`). Mai passi, chiavi, voti, note o premi.
-- - I passi li scrive solo il server con `registra_passi` (idempotente: chiave unica
--   motivo + riferimento). I numeri arrivano da data/config-gioco.json tramite
--   src/lib/regole, mai scritti a mano qui.
-- - Il premio e la soluzione dei forzieri Lani non li legge: vede la vista
--   `forzieri_lani`, che li mostra solo a forziere aperto.
-- - Le date "di oggi" sono quelle di Roma (`oggi()`), non UTC.

create extension if not exists pgcrypto with schema extensions;

create or replace function oggi() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'Europe/Rome')::date;
$$;

-- ------------------------------------------------------------------ profili e ruoli

create type ruolo as enum ('lani', 'genitore');

create table profili (
  id uuid primary key references auth.users (id) on delete cascade,
  ruolo ruolo not null,
  nome text not null,             -- "Lani", "Papà", "Mamma"
  avatar text,                    -- id della posa, es. 'papa-pollice'
  creato_il timestamptz not null default now()
);
-- Una sola Lani.
create unique index una_sola_lani on profili (ruolo) where ruolo = 'lani';

create or replace function e_genitore() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profili where id = auth.uid() and ruolo = 'genitore');
$$;

create or replace function e_famiglia() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profili where id = auth.uid());
$$;

-- ------------------------------------------------------------------ scuola (da Nuvola)

create table materie (
  id text primary key,            -- 'matematica', 'grammatica', ...
  nome text not null,
  abbreviazione text not null     -- per le notifiche: 'Mate', 'Ita', 'Tecno'
);

create table compiti (
  id uuid primary key default gen_random_uuid(),
  nuvola_id text unique,
  materia_id text references materie (id),
  testo text not null,
  pagine text,
  assegnato_il date,
  scadenza date not null,
  fatto_il timestamptz,           -- spunta di Lani
  corretto_da uuid references profili (id),  -- genitore che ha tolto la spunta (storno)
  corretto_il timestamptz,
  creato_il timestamptz not null default now()
);

create type tipo_verifica as enum ('verifica', 'interrogazione');

create table verifiche (
  id uuid primary key default gen_random_uuid(),
  nuvola_id text unique,
  materia_id text references materie (id),
  tipo tipo_verifica not null default 'verifica',
  data date not null,
  argomento text,
  pagine_probabili text,          -- ricavate dalla mappa dei libri se Nuvola dà solo l'argomento
  creato_il timestamptz not null default now()
);

create table sessioni_ripasso (
  id uuid primary key default gen_random_uuid(),
  verifica_id uuid not null references verifiche (id) on delete cascade,
  numero int not null check (numero between 1 and 4),
  data_prevista date not null,
  tipo text not null,             -- 'rilettura_flashcard' | 'flashcard_mappa' | 'quiz' | 'quiz_errori'
  fatta_il timestamptz,
  unique (verifica_id, numero)
);

create table voti (
  id uuid primary key default gen_random_uuid(),
  nuvola_id text unique,
  materia_id text references materie (id),
  data date not null,
  voto numeric(3, 1) not null check (voto between 0 and 10),
  tipo text,                      -- scritto, orale, pratico
  creato_il timestamptz not null default now()
);

create type tipo_nota as enum ('disciplinare', 'didattica', 'merito', 'altro');

create table note (
  id uuid primary key default gen_random_uuid(),
  nuvola_id text unique,
  data date not null,
  tipo tipo_nota not null,
  testo text,
  creato_il timestamptz not null default now()
);

create table fogli_firma (
  id uuid primary key default gen_random_uuid(),
  titolo text not null,
  scadenza date,
  dato_il timestamptz,            -- Lani: "L'ho dato"
  consegnato_il timestamptz,      -- lo conferma un genitore (dà i passi)
  creato_il timestamptz not null default now()
);

-- ------------------------------------------------------------------ studio

create table flashcard (
  id uuid primary key default gen_random_uuid(),
  materia_id text references materie (id),
  argomento text not null,
  tipo text not null default 'domanda',   -- 'domanda' | 'completa' | 'vero_falso'
  fronte text not null,
  retro text not null,
  fonte text,                             -- 'nuvola' | 'foto' | 'mappa_libri' | 'quiz_sbagliato'
  segnalata_sbagliata boolean not null default false,
  prossima_revisione date not null default oggi(),
  intervallo_giorni int not null default 1,
  creato_il timestamptz not null default now()
);

create table flashcard_giri (
  id uuid primary key default gen_random_uuid(),
  iniziato_il timestamptz not null,       -- per il controllo dei 7 secondi a carta (Edge Function dei passi)
  fatto_il timestamptz not null default now(),
  materia_id text references materie (id),
  carte int not null,
  sapevo int not null,
  quasi int not null,
  non_sapevo int not null,
  check (sapevo + quasi + non_sapevo = carte),
  check (iniziato_il <= fatto_il)
);

create table quiz (
  id uuid primary key default gen_random_uuid(),
  materia_id text references materie (id),
  argomento text not null,
  verifica_id uuid references verifiche (id),
  domande jsonb not null,                 -- [{testo, opzioni[], giusta, spiegazione}]
  creato_il timestamptz not null default now()
);

create table quiz_tentativi (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quiz (id) on delete cascade,
  numero int not null,                    -- lo calcola il trigger, non il client
  giuste int not null,
  totale int not null,
  fatto_il timestamptz not null default now(),
  check (giuste between 0 and totale)
);

create table video (
  id uuid primary key default gen_random_uuid(),
  materia_id text references materie (id),
  argomento text not null,
  youtube_id text not null,
  durata_secondi int,
  scelto_da uuid references profili (id),
  creato_il timestamptz not null default now()
);

create table video_visti (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references video (id) on delete cascade,
  visto_il timestamptz not null default now(),
  completo boolean not null,              -- false se ha mandato avanti o cambiato schermata
  secondi_visti int
);

create table richieste_foto (
  id uuid primary key default gen_random_uuid(),
  motivo text not null,                   -- 'verifica' | 'compito'
  materia_id text references materie (id),
  pagine text not null,
  verifica_id uuid references verifiche (id),
  compito_id uuid references compiti (id),
  stato text not null default 'aperta',   -- 'aperta' | 'fatta'
  creato_il timestamptz not null default now()
);

create table foto_pagine (
  id uuid primary key default gen_random_uuid(),
  richiesta_id uuid references richieste_foto (id),
  materia_id text references materie (id),
  pagine text,
  percorso_storage text not null,         -- bucket privato 'foto-pagine'
  caricata_da uuid not null default auth.uid() references profili (id),
  caricata_il timestamptz not null default now()
);

-- ------------------------------------------------------------------ sera e casa

create table serate (
  data date primary key,
  cartella_il timestamptz,
  borsa_il timestamptz,
  dieci_minuti_il timestamptz,            -- sprint 2: vale solo se il timer è arrivato in fondo
  chiusa_il timestamptz
);

create table gesti_casa (
  id uuid primary key default gen_random_uuid(),
  data date not null default oggi(),
  voce text not null,                     -- 'scrivania' | 'lavastoviglie' | 'letto' | 'vestiti'
  dato_da uuid not null default auth.uid() references profili (id),
  creato_il timestamptz not null default now()
);

create table sgridate (
  id uuid primary key default gen_random_uuid(),
  data date not null default oggi(),
  tipo text not null,                     -- 'bagno' | 'antisportivo' | 'balla'
  nota text,
  dato_da uuid not null default auth.uid() references profili (id),
  creato_il timestamptz not null default now()
);

create table umore (
  data date primary key default oggi(),
  faccia text not null check (faccia in ('contenta', 'assonnata', 'broncio', 'frustrata'))
);

-- ------------------------------------------------------------------ gioco: passi, chiavi, forzieri

create table movimenti_passi (
  id uuid primary key default gen_random_uuid(),
  creato_il timestamptz not null default now(),
  giorno date not null default oggi(),
  motivo text not null,                   -- 'compito', 'cartella', 'quiz', 'bagno', 'storno', ...
  riferimento text not null,              -- id della riga che lo ha generato, o chiave tipo 'pagella:1q'
  passi int not null,
  moltiplicatore numeric(3, 2) not null default 1,
  dato_da uuid references profili (id),   -- genitore, per gesti, sgridate e storni ("Mamma: +2")
  unique (motivo, riferimento)            -- la stessa cosa non dà passi due volte
);

create view saldo_passi with (security_invoker = true) as
  select coalesce(sum(round(passi * moltiplicatore)), 0)::int as passi from movimenti_passi;

create table settimane (
  inizio date primary key check (extract(isodow from inizio) = 1),  -- lunedì
  passi_obbligatori_possibili int not null default 0,
  passi_obbligatori_fatti int not null default 0,
  cose_possibili int not null default 0,
  cose_fatte int not null default 0,
  note int not null default 0,
  chiavi int check (chiavi between 0 and 3),  -- scritte la domenica sera: da lì niente storni
  rimonta boolean not null default false
);

create view chiavi_totali with (security_invoker = true) as
  select coalesce(sum(chiavi), 0)::int as chiavi from settimane;

-- Unico punto in cui si scrivono passi. Solo server (Edge Functions con service role
-- e altre funzioni security definer): niente execute per i client.
-- Idempotente: se il movimento esiste già restituisce null e non fa nulla.
-- Il saldo non scende sotto zero: un movimento negativo si ferma a zero.
create or replace function registra_passi(
  p_motivo text, p_riferimento text, p_passi int,
  p_moltiplicatore numeric default 1, p_giorno date default null, p_dato_da uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_saldo int;
  v_id uuid;
begin
  if round(p_passi * p_moltiplicatore) < 0 then
    perform pg_advisory_xact_lock(hashtext('movimenti_passi'));
    select passi into v_saldo from public.saldo_passi;
    if round(p_passi * p_moltiplicatore) < -v_saldo then
      p_passi := -v_saldo;
      p_moltiplicatore := 1;
    end if;
  end if;
  insert into public.movimenti_passi (motivo, riferimento, passi, moltiplicatore, giorno, dato_da)
  values (p_motivo, p_riferimento, p_passi, p_moltiplicatore, coalesce(p_giorno, public.oggi()), p_dato_da)
  on conflict (motivo, riferimento) do nothing
  returning id into v_id;
  return v_id;
end $$;

-- Storno di una spunta corretta da un genitore (regola in docs/02, storno() in src/lib/regole):
-- annulla esattamente quei passi, solo se le chiavi di quella settimana non sono ancora date.
-- Restituisce true se ha stornato.
create or replace function storna_spunta(p_motivo text, p_riferimento text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  m public.movimenti_passi;
begin
  if not public.e_genitore() then
    raise exception 'Solo un genitore può correggere una spunta';
  end if;
  select * into m from public.movimenti_passi where motivo = p_motivo and riferimento = p_riferimento;
  if not found or m.passi = 0 then
    return false;
  end if;
  if exists (
    select 1 from public.settimane
    where inizio = m.giorno - (extract(isodow from m.giorno)::int - 1) and chiavi is not null
  ) then
    return false;
  end if;
  return public.registra_passi('storno', p_motivo || ':' || p_riferimento, -m.passi,
                               m.moltiplicatore, public.oggi(), auth.uid()) is not null;
end $$;

create type stato_forziere as enum ('chiuso', 'enigma', 'aperto', 'consegnato');

create table forzieri (
  n int primary key check (n between 1 and 9),
  premio text,                            -- lo scelgono i genitori; Lani non lo vede finché non si apre
  enigma text,                            -- generato dall'IA quando il premio viene inserito
  soluzione text,
  stato stato_forziere not null default 'chiuso',
  tentativi_enigma int not null default 0,
  enigma_risolto_il timestamptz,
  aperto_il timestamptz,
  consegnato_il timestamptz
);
insert into forzieri (n) select generate_series(1, 9);

-- Quello che vede Lani. Vista con i diritti del proprietario (scavalca la RLS di forzieri,
-- che Lani non può leggere), filtrata con e_famiglia().
create view forzieri_lani as
  select n, stato, tentativi_enigma, enigma_risolto_il, aperto_il, consegnato_il,
         case when stato <> 'chiuso' then enigma end as enigma,
         case when stato in ('aperto', 'consegnato') then premio end as premio
  from public.forzieri
  where public.e_famiglia();

create table figurine (
  posa text primary key,                  -- id della posa nel manifest
  sbloccata_il timestamptz,
  serie_nera boolean not null default false,
  in_attesa_di_riscatto_dal date,         -- serie nera: si sblocca dopo 7 giorni fatti bene
  pagina text not null default 'casa'     -- 'casa' (64) | 'squadra' (sprint 2)
);

create table popup_coda (
  id uuid primary key default gen_random_uuid(),
  creato_il timestamptz not null default now(),
  priorita int not null,                  -- 1 bastone, 2 voto, 3 forziere/tappa, 4 altro
  situazione text not null,               -- chiave del copione
  posa text not null,
  titolo text not null,
  testo text not null,
  figurina text,                          -- riga "Nuova figurina" in fondo, se c'è
  mostrato_il timestamptz
);

create table frasi (
  id uuid primary key default gen_random_uuid(),
  testo text not null,
  autore text,                            -- 'proverbio' se l'attribuzione non è certa
  momento text,                           -- 'apertura' | 'tappa' | 'verifica' | 'chiusura' | ...
  di_famiglia boolean not null default false,
  ultima_volta date
);

-- ------------------------------------------------------------------ famiglia, impostazioni, servizi

create table impegni_famiglia (
  id text primary key,                    -- uid dell'evento Google
  inizio timestamptz not null,
  fine timestamptz,
  titolo text not null,
  chi text,                               -- 'papa' | 'mamma' | 'nonno' | ...
  aggiornato_il timestamptz not null default now()
);

create table impostazioni (
  chiave text primary key,
  valore jsonb not null
);

create table push_iscrizioni (
  id uuid primary key default gen_random_uuid(),
  profilo_id uuid not null default auth.uid() references profili (id) on delete cascade,
  endpoint text not null unique,
  chiavi jsonb not null,
  creato_il timestamptz not null default now()
);

create table sync_log (
  id uuid primary key default gen_random_uuid(),
  fonte text not null,                    -- 'nuvola' | 'classroom' | 'calendario'
  iniziato_il timestamptz not null default now(),
  finito_il timestamptz,
  esito text,                             -- 'ok' | 'errore'
  dettagli jsonb
);

-- PIN dell'area genitori sui dispositivi condivisi (iPad). Uno solo, condiviso.
-- Solo hash (crypt di pgcrypto); Lani non legge la tabella. Dopo 5 errori, blocco di 15 minuti.
create table pin_genitori (
  id boolean primary key default true check (id),
  hash text not null,
  errori int not null default 0,
  bloccato_fino timestamptz
);

create or replace function imposta_pin(p_pin text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.e_genitore() then raise exception 'Solo un genitore'; end if;
  if p_pin !~ '^\d{4,8}$' then raise exception 'Il PIN è di 4-8 cifre'; end if;
  insert into public.pin_genitori (id, hash) values (true, extensions.crypt(p_pin, extensions.gen_salt('bf')))
  on conflict (id) do update set hash = excluded.hash, errori = 0, bloccato_fino = null;
end $$;

create or replace function verifica_pin(p_pin text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  r public.pin_genitori;
begin
  if not public.e_genitore() then return false; end if;
  select * into r from public.pin_genitori for update;
  if not found or r.bloccato_fino > now() then return false; end if;
  if r.hash = extensions.crypt(p_pin, r.hash) then
    update public.pin_genitori set errori = 0, bloccato_fino = null;
    return true;
  end if;
  update public.pin_genitori
  set errori = case when r.errori + 1 >= 5 then 0 else r.errori + 1 end,
      bloccato_fino = case when r.errori + 1 >= 5 then now() + interval '15 minutes' end;
  return false;
end $$;

-- ------------------------------------------------------------------ trigger

-- Lani può cambiare solo le colonne passate come argomenti; genitori e server tutto.
create or replace function solo_colonne() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null or public.e_genitore() then
    return new;
  end if;
  if tg_op = 'UPDATE' and (to_jsonb(new) - tg_argv::text[]) is distinct from (to_jsonb(old) - tg_argv::text[]) then
    raise exception 'Lani non può cambiare questi dati';
  end if;
  return new;
end $$;

create trigger lani_solo_spunta before update on compiti
  for each row execute function solo_colonne('fatto_il');
create trigger lani_solo_spunta before update on sessioni_ripasso
  for each row execute function solo_colonne('fatta_il');
create trigger lani_solo_dato before update on fogli_firma
  for each row execute function solo_colonne('dato_il');
create trigger lani_solo_ripetizione before update on flashcard
  for each row execute function solo_colonne('segnalata_sbagliata', 'prossima_revisione', 'intervallo_giorni');
create trigger lani_solo_visto before update on popup_coda
  for each row execute function solo_colonne('mostrato_il');
create trigger lani_solo_spunte before update on serate
  for each row execute function solo_colonne('cartella_il', 'borsa_il', 'dieci_minuti_il', 'chiusa_il');
create trigger lani_solo_faccia before update on umore
  for each row execute function solo_colonne('faccia');

-- Le ore delle spunte di Lani le mette il server, non il telefono: da null a valore
-- diventa now(), e una spunta già data non si sposta. Così non si retrodata un compito
-- per prendere il bonus anticipo. Genitori e server scrivono quello che vogliono.
create or replace function timbra_ora() returns trigger
language plpgsql set search_path = '' as $$
declare
  c text;
  n jsonb := to_jsonb(new);
  o jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
begin
  if auth.uid() is null or public.e_genitore() then
    return new;
  end if;
  foreach c in array tg_argv loop
    if n ->> c is not null then
      n := jsonb_set(n, array[c], coalesce(nullif(o -> c, 'null'::jsonb), to_jsonb(now())));
    end if;
  end loop;
  return jsonb_populate_record(new, n);
end $$;

create trigger lani_timbra before insert or update on compiti
  for each row execute function timbra_ora('fatto_il');
create trigger lani_timbra before insert or update on sessioni_ripasso
  for each row execute function timbra_ora('fatta_il');
create trigger lani_timbra before insert or update on fogli_firma
  for each row execute function timbra_ora('dato_il');
create trigger lani_timbra before insert or update on serate
  for each row execute function timbra_ora('cartella_il', 'borsa_il', 'dieci_minuti_il', 'chiusa_il');
create trigger lani_timbra before insert on flashcard_giri
  for each row execute function timbra_ora('fatto_il');
create trigger lani_timbra before insert on video_visti
  for each row execute function timbra_ora('visto_il');

-- Il numero del tentativo lo decide il server: è quello che fissa i passi del quiz.
create or replace function numera_tentativo() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('quiz:' || new.quiz_id::text));
  select count(*) + 1 into new.numero from public.quiz_tentativi where quiz_id = new.quiz_id;
  new.fatto_il := now();
  return new;
end $$;
create trigger numera before insert on quiz_tentativi
  for each row execute function numera_tentativo();

-- ------------------------------------------------------------------ sicurezza (RLS)

do $$
declare t text;
begin
  foreach t in array array[
    'profili','materie','compiti','verifiche','sessioni_ripasso','voti','note','fogli_firma',
    'flashcard','flashcard_giri','quiz','quiz_tentativi','video','video_visti','richieste_foto',
    'foto_pagine','serate','gesti_casa','sgridate','umore','movimenti_passi','settimane',
    'forzieri','figurine','popup_coda','frasi','impegni_famiglia','impostazioni','push_iscrizioni',
    'sync_log','pin_genitori'
  ] loop
    execute format('alter table %I enable row level security', t);
    -- i genitori leggono e scrivono tutto
    execute format('create policy genitori_tutto on %I for all to authenticated using (e_genitore()) with check (e_genitore())', t);
    -- tutta la famiglia legge, tranne forzieri (vista forzieri_lani), PIN, push e log
    if t not in ('forzieri', 'pin_genitori', 'push_iscrizioni', 'sync_log') then
      execute format('create policy famiglia_legge on %I for select to authenticated using (e_famiglia())', t);
    end if;
  end loop;
end $$;

-- Lani: spunte e attività di studio. Le colonne che può toccare le limita solo_colonne().
create policy lani_aggiorna on compiti          for update to authenticated using (e_famiglia()) with check (e_famiglia());
create policy lani_aggiorna on sessioni_ripasso for update to authenticated using (e_famiglia()) with check (e_famiglia());
create policy lani_aggiorna on fogli_firma      for update to authenticated using (e_famiglia()) with check (e_famiglia());
create policy lani_aggiorna on flashcard        for update to authenticated using (e_famiglia()) with check (e_famiglia());
create policy lani_aggiorna on popup_coda       for update to authenticated using (e_famiglia()) with check (e_famiglia());
create policy lani_aggiorna on serate           for update to authenticated using (e_famiglia()) with check (e_famiglia());
create policy lani_inserisce on serate          for insert to authenticated with check (e_famiglia() and data between oggi() - 1 and oggi() + 1);
create policy lani_aggiorna on umore            for update to authenticated using (e_famiglia() and data = oggi()) with check (data = oggi());
create policy lani_inserisce on umore           for insert to authenticated with check (e_famiglia() and data = oggi());
create policy lani_inserisce on flashcard_giri  for insert to authenticated with check (e_famiglia());
create policy lani_inserisce on quiz_tentativi  for insert to authenticated with check (e_famiglia());
create policy lani_inserisce on video_visti     for insert to authenticated with check (e_famiglia());
create policy lani_inserisce on foto_pagine     for insert to authenticated with check (e_famiglia() and caricata_da = auth.uid());
create policy proprie on push_iscrizioni        for all to authenticated using (profilo_id = auth.uid()) with check (profilo_id = auth.uid());

-- Funzioni: per default Postgres le rende eseguibili da tutti. Si restringe.
revoke execute on all functions in schema public from public, anon;
revoke execute on function registra_passi(text, text, int, numeric, date, uuid) from authenticated;
revoke execute on function numera_tentativo() from authenticated;
grant execute on function registra_passi(text, text, int, numeric, date, uuid) to service_role;
revoke all on forzieri_lani, saldo_passi, chiavi_totali from anon;
-- forzieri_lani è una vista semplice, quindi aggiornabile, e gira con i diritti del
-- proprietario: senza questa riga Lani potrebbe aprire un forziere scrivendo sulla vista.
revoke insert, update, delete, truncate on forzieri_lani from authenticated;

-- ------------------------------------------------------------------ foto delle pagine: bucket privato

insert into storage.buckets (id, name, public) values ('foto-pagine', 'foto-pagine', false)
  on conflict (id) do nothing;

create policy foto_famiglia_legge on storage.objects for select to authenticated
  using (bucket_id = 'foto-pagine' and public.e_famiglia());
create policy foto_famiglia_carica on storage.objects for insert to authenticated
  with check (bucket_id = 'foto-pagine' and public.e_famiglia());
create policy foto_genitori_cancellano on storage.objects for delete to authenticated
  using (bucket_id = 'foto-pagine' and public.e_genitore());
