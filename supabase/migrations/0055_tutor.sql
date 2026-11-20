-- Tutor (blocco E del piano di studio, approvato dal signore il 19/11): la lampadina "Non ho capito"
-- e "Spiegamelo tu". Scrive solo la Edge Function `spiega` (service role); Lani non legge né scrive
-- queste tabelle: gli indizi li riceve uno alla volta, dopo il suo tentativo. I genitori leggono lo
-- storico. Il tutor non dà mai passi.

-- La risposta dell'IA per un compito: spiegazione, indizi e, a parte, il risultato del compito che
-- serve solo al controllo lato server (non arriva mai all'app). Si rifà se il testo del compito cambia.
create table tutor_aiuti (
  compito_id uuid primary key references compiti (id) on delete cascade,
  testo_compito text not null,
  spiegazione text not null,
  indizi jsonb not null default '[]',
  risultati jsonb not null default '[]',
  creato_il timestamptz not null default now()
);
alter table tutor_aiuti enable row level security;
create policy genitori_leggono on tutor_aiuti for select to authenticated using (public.e_genitore());

-- Storico di ogni richiesta al tutor. `ia` = c'è stata una chiamata a Claude (conta nel tetto
-- giornaliero di config-gioco.json, tutor.chiamate_al_giorno). `giorno` lo mette la funzione (Roma).
create table tutor_richieste (
  id uuid primary key default gen_random_uuid(),
  profilo_id uuid not null references profili (id) on delete cascade,
  tipo text not null check (tipo in ('spiegazione', 'tentativo', 'indizio', 'spiegamelo')),
  compito_id uuid references compiti (id) on delete set null,
  argomento text,
  testo text,
  risposta jsonb,
  ia boolean not null default false,
  esito text not null default 'ok' check (esito in ('ok', 'tetto', 'bloccata', 'errore')),
  giorno date not null default oggi(),
  creato_il timestamptz not null default now()
);
create index tutor_richieste_tetto on tutor_richieste (profilo_id, giorno) where ia;
create index tutor_richieste_compito on tutor_richieste (compito_id, profilo_id, tipo);
create index tutor_richieste_recenti on tutor_richieste (creato_il desc);
alter table tutor_richieste enable row level security;
create policy genitori_leggono on tutor_richieste for select to authenticated using (public.e_genitore());
revoke all on tutor_aiuti, tutor_richieste from anon;
