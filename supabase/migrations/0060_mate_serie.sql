-- Blocco F del piano di studio (19/11): esercizi di matematica mescolati, generati dall'IA
-- (funzione genera-mate) dall'argomento delle verifiche di matematica. Una serie per verifica.
-- problemi: [{metodo, perche_metodo, testo, passaggi: [{cosa, calcolo, risultato}], risposta,
-- unita, barre: {barre: [{nome, segmenti: [{testo, parti, incognita}]}], totale}}]
-- (tipo Problema in src/lib/mate). Lani e i genitori leggono; scrive solo il server.

create table mate_serie (
  id uuid primary key default gen_random_uuid(),
  verifica_id uuid references verifiche (id) on delete cascade,
  materia_id text references materie (id),
  argomento text not null,
  problemi jsonb not null check (jsonb_typeof(problemi) = 'array' and jsonb_array_length(problemi) between 1 and 20),
  creato_il timestamptz not null default now()
);

create unique index mate_serie_per_verifica on mate_serie (verifica_id) where verifica_id is not null;

alter table mate_serie enable row level security;
create policy famiglia_legge on mate_serie for select to authenticated using (public.e_famiglia());
