-- Copia della migrazione applicata direttamente in produzione il 15/11 alle 18:31 (Jarvis, fuori dal repo).
-- Qui solo perché la storia locale combaci con quella remota e `db push` funzioni. Non riguarda l'app.
create table public.libreria_risorse (
  id uuid primary key default gen_random_uuid(),
  titolo text not null,
  url text not null unique,
  fonte text not null check (fonte in ('youtube','reel','github','articolo','altro')),
  sezione text not null check (sezione in ('sapere','skills','mod','procedure')),
  riassunto text,
  utile_per text[] not null default '{}',
  punteggio_jarvis smallint check (punteggio_jarvis between 1 and 10),
  voto_signore smallint check (voto_signore between 1 and 5),
  usi integer not null default 0,
  stato text not null default 'da_provare' check (stato in ('da_provare','in_uso','archiviata')),
  creata_il timestamptz not null default now()
);

comment on table public.libreria_risorse is 'Libreria di risorse del signore (Jarvis): video, reel, repo GitHub classificati in quattro sezioni';

create index libreria_risorse_sezione_idx on public.libreria_risorse (sezione);
create index libreria_risorse_stato_idx on public.libreria_risorse (stato);

create view public.libreria_classifica with (security_invoker = true) as
select r.*,
  round(
    coalesce(r.punteggio_jarvis, 5) * 0.5
    + coalesce(r.voto_signore * 2, coalesce(r.punteggio_jarvis, 5)) * 0.4
    + least(r.usi, 10) * 0.1
  , 1) as punteggio_finale
from public.libreria_risorse r;

alter table public.libreria_risorse enable row level security;
