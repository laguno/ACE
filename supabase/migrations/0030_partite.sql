-- Sprint 2: partite di Lani con il risultato in set. Le segna Lani; un genitore corregge il
-- punteggio se serve e approva (approvata_il), oppure rifiuta (cancella la riga).
-- Passi dalla funzione "passi" (tipo 'partita') solo dopo l'approvazione e solo da quando i
-- genitori hanno acceso R-Evolution: in campo +10 e +15 se vinta, tutta in panchina +5 e +5
-- se vinta (config passi.partite).

create table partite (
  id uuid primary key default gen_random_uuid(),
  data date not null default oggi(),
  avversaria text not null check (length(trim(avversaria)) between 1 and 60),
  set_nostri smallint not null check (set_nostri between 0 and 5),
  set_loro smallint not null check (set_loro between 0 and 5),
  in_campo boolean not null default true,
  dato_da uuid not null default auth.uid() references profili (id),
  creato_il timestamptz not null default now(),
  approvata_il timestamptz,
  approvata_da uuid references profili (id)
);

-- chi approva lo mette il server: il genitore che rende approvata la riga (insert o update)
create or replace function firma_approvazione() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.approvata_il is not null and (tg_op = 'INSERT' or old.approvata_il is null) and auth.uid() is not null then
    new.approvata_da := auth.uid();
  end if;
  return new;
end $$;
create trigger firma_approvazione before insert or update on partite
  for each row execute function firma_approvazione();

alter table partite enable row level security;
create policy famiglia_legge on partite for select to authenticated using (public.e_famiglia());
-- Lani inserisce solo partite da approvare, delle ultime due settimane; i genitori tutto
create policy famiglia_inserisce on partite for insert to authenticated with check (
  public.e_genitore()
  or (public.e_famiglia() and approvata_il is null and approvata_da is null and data between oggi() - 14 and oggi())
);
create policy genitori_aggiornano on partite for update to authenticated using (public.e_genitore()) with check (public.e_genitore());
create policy genitori_cancellano on partite for delete to authenticated using (public.e_genitore());
