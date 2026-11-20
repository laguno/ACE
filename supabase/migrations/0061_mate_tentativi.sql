-- Blocco F: una serie di esercizi di matematica fatta da Lani. Come i giri di flash card:
-- l'ora di fine la mette il server (timbra_ora), il numero del tentativo lo conta il server.
-- dettaglio: un esito per problema [{metodo, livello, giusto, metodo_giusto}] (tipo Esito in
-- src/lib/mate): da qui l'app ricava quanto svuotare gli esempi la volta dopo.
-- I passi (funzione "passi", tipo "matematica") guardano solo problemi, tentati e durata.

create table mate_tentativi (
  id uuid primary key default gen_random_uuid(),
  serie_id uuid not null references mate_serie (id) on delete cascade,
  numero int not null default 0,
  iniziato_il timestamptz not null,
  fatto_il timestamptz not null default now(),
  problemi int not null check (problemi between 1 and 20),
  tentati int not null,
  dettaglio jsonb not null default '[]' check (jsonb_typeof(dettaglio) = 'array' and jsonb_array_length(dettaglio) <= 20),
  check (tentati between 0 and problemi),
  check (iniziato_il <= fatto_il)
);

create index mate_tentativi_serie on mate_tentativi (serie_id, fatto_il);

create trigger lani_timbra before insert on mate_tentativi
  for each row execute function timbra_ora('fatto_il');

create or replace function numera_mate() returns trigger
language plpgsql set search_path = '' as $$
begin
  select count(*) + 1 into new.numero from public.mate_tentativi where serie_id = new.serie_id;
  return new;
end $$;
revoke execute on function numera_mate() from public, anon, authenticated;

create trigger numera before insert on mate_tentativi
  for each row execute function numera_mate();

alter table mate_tentativi enable row level security;
create policy famiglia_legge on mate_tentativi for select to authenticated using (public.e_famiglia());
create policy lani_inserisce on mate_tentativi for insert to authenticated with check (public.e_famiglia());
