-- Filone H del piano (affidabilità, 10/11): gli errori dell'app e delle Edge Functions si registrano
-- nel nostro Supabase (niente servizi esterni). Scrive chiunque abbia fatto l'accesso, a suo nome;
-- leggono solo i genitori (scheda "Stato"). Niente dati personali: messaggio, punto del codice,
-- pagina; testo tagliato a misura.

create table errori_client (
  id bigint generated always as identity primary key,
  creato_il timestamptz not null default now(),
  profilo_id uuid default auth.uid() references profili (id) on delete set null,
  origine text not null default 'app' check (origine in ('app', 'funzione')),
  dove text check (length(dove) <= 200),            -- schermata o funzione
  messaggio text not null check (length(messaggio) <= 500),
  dettagli text check (length(dettagli) <= 2000)    -- pila delle chiamate, versione dell'app
);
create index errori_client_creato on errori_client (creato_il desc);
alter table errori_client enable row level security;

create policy registra_propri on errori_client for insert to authenticated
  with check (profilo_id = auth.uid() and origine = 'app');
create policy genitori_leggono on errori_client for select to authenticated using (public.e_genitore());
