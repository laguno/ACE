-- Lezioni dal registro di Nuvola (argomento-lezione): ora per ora, con la materia e l'argomento.
-- Servono per l'orario (materie della cartella di domani) e, più avanti, per gli argomenti dello Studio.
-- Le scrive solo sync-nuvola (service role); la famiglia legge.
create table lezioni (
  id uuid primary key default gen_random_uuid(),
  nuvola_id text unique not null,         -- id dell'argomento di Nuvola + ora
  data date not null,
  ora int not null,                       -- numeroOra: 1 = 8:00
  materia_id text references materie (id),
  argomento text,
  creato_il timestamptz not null default now()
);
create index on lezioni (data);

alter table lezioni enable row level security;
create policy genitori_tutto on lezioni for all to authenticated using (e_genitore()) with check (e_genitore());
create policy famiglia_legge on lezioni for select to authenticated using (e_famiglia());
