-- Assenze da scuola (regole approvate dal signore il 15/11, docs/02 "Assenze"): i genitori segnano
-- "Lani a casa" per uno o più giorni; Lani le legge e non le scrive. In quei giorni le cose
-- obbligatorie escono dal calcolo delle chiavi, la bandierina non avanza, niente notifiche né
-- rimproveri; al rientro il popup "Bentornata".

create table assenze (
  giorno date primary key,
  segnata_da uuid default auth.uid() references profili (id),
  creata_il timestamptz not null default now()
);
alter table assenze enable row level security;
create policy famiglia_legge on assenze for select to authenticated using (public.e_famiglia());
create policy genitori_inseriscono on assenze for insert to authenticated with check (public.e_genitore());
create policy genitori_cancellano on assenze for delete to authenticated using (public.e_genitore());

-- Compiti in scadenza in un giorno di assenza: passano alla lezione successiva della materia
-- (la data la calcola l'app dei genitori dall'orario). La sincronizzazione di Nuvola riscrive
-- scadenza a ogni giro: il trigger la riporta alla data spostata.
alter table compiti add column scadenza_spostata date;

-- Verifiche: nuova data messa da un genitore ("Sposta verifica", con o senza assenza; "settimana
-- prossima" = lunedì della settimana dopo, segnato come vago). Stesso trigger contro la sincronizzazione.
alter table verifiche add column data_spostata date;
alter table verifiche add column recupero_vago boolean not null default false;

create or replace function tieni_scadenza_spostata() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.scadenza_spostata is not null then
    new.scadenza := new.scadenza_spostata;
  end if;
  return new;
end $$;

create or replace function tieni_data_spostata() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.data_spostata is not null then
    new.data := new.data_spostata;
  end if;
  return new;
end $$;

create trigger tieni_data_spostata before insert or update on compiti
  for each row execute function tieni_scadenza_spostata();
create trigger tieni_data_spostata before insert or update on verifiche
  for each row execute function tieni_data_spostata();

-- "Sposta verifica" (solo genitori): nuova data e via le sessioni di ripasso non ancora fatte;
-- il piano lo rifà genera-studio, che l'app chiama subito dopo.
create or replace function sposta_verifica(p_id uuid, p_data date, p_vago boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.e_genitore() then
    raise exception 'solo i genitori spostano le verifiche';
  end if;
  update public.verifiche set data_spostata = p_data, recupero_vago = p_vago where id = p_id;
  if not found then
    raise exception 'verifica sconosciuta';
  end if;
  delete from public.sessioni_ripasso where verifica_id = p_id and fatta_il is null;
end $$;
revoke execute on function public.sposta_verifica(uuid, date, boolean) from public, anon;
grant execute on function public.sposta_verifica(uuid, date, boolean) to authenticated;
