-- ACE: schema iniziale (sprint 1). Progetto Supabase qonullxzhqvbfpiibqye.
-- Proposta da applicare con `supabase db push` dopo averla letta.
-- Una sola famiglia: niente multi-tenant. Ogni persona ha un profilo con un ruolo.
-- Principio di sicurezza: Lani spunta le cose fatte, ma non scrive mai i passi.
-- I passi li calcola il server (funzione registra_passi / Edge Functions) dalle regole
-- in data/config-gioco.json, così l'app non si può "truccare" dal telefono.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------ profili e ruoli

create type ruolo as enum ('lani', 'genitore');

create table profili (
  id uuid primary key references auth.users (id) on delete cascade,
  ruolo ruolo not null,
  nome text not null,             -- "Lani", "Papà", "Mamma"
  avatar text,                    -- id della posa, es. 'papa-pollice'
  creato_il timestamptz not null default now()
);

create or replace function e_genitore() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profili where id = auth.uid() and ruolo = 'genitore');
$$;

create or replace function e_famiglia() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profili where id = auth.uid());
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
  corretto_da uuid references profili (id),  -- un genitore può togliere la spunta
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
  numero int not null,            -- 1..4
  data_prevista date not null,
  tipo text not null,             -- 'rilettura_flashcard' | 'flashcard_mappa' | 'quiz' | 'quiz_errori'
  fatta_il timestamptz
);

create table voti (
  id uuid primary key default gen_random_uuid(),
  nuvola_id text unique,
  materia_id text references materie (id),
  data date not null,
  voto numeric(3, 1) not null,
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
  consegnato_il timestamptz,      -- lo segna un genitore
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
  prossima_revisione date not null default current_date,
  intervallo_giorni int not null default 1,
  creato_il timestamptz not null default now()
);

create table flashcard_giri (
  id uuid primary key default gen_random_uuid(),
  fatto_il timestamptz not null default now(),
  materia_id text references materie (id),
  carte int not null,
  sapevo int not null,
  quasi int not null,
  non_sapevo int not null
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
  numero int not null,                    -- 1, 2, 3, 4+: decide i passi (regole/passiQuiz)
  giuste int not null,
  totale int not null,
  fatto_il timestamptz not null default now()
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
  caricata_da uuid references profili (id),
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
  data date not null default current_date,
  voce text not null,                     -- 'scrivania' | 'lavastoviglie' | 'letto' | 'vestiti'
  dato_da uuid not null references profili (id),
  creato_il timestamptz not null default now()
);

create table sgridate (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  tipo text not null,                     -- 'bagno' | 'antisportivo' | 'balla'
  nota text,
  dato_da uuid not null references profili (id),
  creato_il timestamptz not null default now()
);

create table umore (
  data date primary key,
  faccia text not null                    -- 'contenta' | 'assonnata' | 'broncio' | 'frustrata'
);

-- ------------------------------------------------------------------ gioco: passi, chiavi, forzieri

create table movimenti_passi (
  id uuid primary key default gen_random_uuid(),
  creato_il timestamptz not null default now(),
  giorno date not null default current_date,
  motivo text not null,                   -- 'compito', 'cartella', 'quiz', 'bagno', ...
  riferimento uuid,                       -- id della riga che lo ha generato
  passi int not null,
  moltiplicatore numeric(3, 2) not null default 1,
  unique (motivo, riferimento)            -- la stessa cosa non dà passi due volte
);

create view saldo_passi as
  select coalesce(sum(round(passi * moltiplicatore)), 0)::int as passi from movimenti_passi;

create table settimane (
  inizio date primary key,                -- lunedì
  passi_obbligatori_possibili int not null default 0,
  passi_obbligatori_fatti int not null default 0,
  cose_possibili int not null default 0,
  cose_fatte int not null default 0,
  note int not null default 0,
  chiavi int,                             -- 0..3, scritte la domenica sera
  rimonta boolean not null default false
);

create view chiavi_totali as
  select coalesce(sum(chiavi), 0)::int as chiavi from settimane;

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
  profilo_id uuid not null references profili (id) on delete cascade,
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

-- ------------------------------------------------------------------ sicurezza (RLS)

do $$
declare t text;
begin
  foreach t in array array[
    'profili','materie','compiti','verifiche','sessioni_ripasso','voti','note','fogli_firma',
    'flashcard','flashcard_giri','quiz','quiz_tentativi','video','video_visti','richieste_foto',
    'foto_pagine','serate','gesti_casa','sgridate','umore','movimenti_passi','settimane',
    'forzieri','figurine','popup_coda','frasi','impegni_famiglia','impostazioni','push_iscrizioni','sync_log'
  ] loop
    execute format('alter table %I enable row level security', t);
    -- tutta la famiglia legge
    execute format('create policy famiglia_legge on %I for select using (e_famiglia())', t);
    -- i genitori scrivono tutto
    execute format('create policy genitori_scrivono on %I for all using (e_genitore()) with check (e_genitore())', t);
  end loop;
end $$;

-- Lani: solo le sue spunte e le sue attività di studio. Mai passi, chiavi, voti, note, premi.
create policy lani_spunta_compiti on compiti for update using (e_famiglia()) with check (e_famiglia());
create policy lani_sera on serate for all using (e_famiglia()) with check (e_famiglia());
create policy lani_flashcard_giri on flashcard_giri for insert with check (e_famiglia());
create policy lani_segnala_carta on flashcard for update using (e_famiglia()) with check (e_famiglia());
create policy lani_quiz on quiz_tentativi for insert with check (e_famiglia());
create policy lani_video on video_visti for insert with check (e_famiglia());
create policy lani_foto on foto_pagine for insert with check (e_famiglia());
create policy lani_umore on umore for insert with check (e_famiglia());
create policy lani_ripasso on sessioni_ripasso for update using (e_famiglia()) with check (e_famiglia());
create policy lani_popup_visto on popup_coda for update using (e_famiglia()) with check (e_famiglia());
create policy lani_enigma on forzieri for update using (e_famiglia()) with check (e_famiglia());
create policy push_proprie on push_iscrizioni for insert with check (profilo_id = auth.uid());
-- Nota per Claude Code: le policy di update di Lani vanno ristrette alle sole colonne previste
-- (es. compiti.fatto_il, forzieri.tentativi_enigma) con trigger o con funzioni RPC dedicate.
-- Il premio di un forziere non deve essere leggibile da Lani prima dell'apertura:
-- esporre a Lani una vista senza la colonna `premio` e `soluzione` finché stato <> 'aperto'.

-- Foto delle pagine: bucket privato.
insert into storage.buckets (id, name, public) values ('foto-pagine', 'foto-pagine', false)
  on conflict (id) do nothing;
