-- R-Evolution, regole del 15/11 approvate dal signore (docs/08, Risultato automatico).
-- 1. gare_fipav: calendario e risultati dei gironi di Lani dal portale FIPAV (funzione classifiche).
-- 2. partite.gara: la partita creata dal server col risultato ufficiale. in_campo resta vuoto finché
--    Lani non risponde al popup "Com'è andata?" (rispondi_partita): la risposta è l'approvazione,
--    niente genitori. I passi li calcola la funzione "passi" (tipo 'partita') come prima.
-- 3. correggi_partita: un genitore cambia in campo / panchina dopo; come per le spunte, storno dei
--    passi dati e movimenti nuovi (riferimento id:1, id:2, ...). Non dopo le chiavi della settimana.
-- 4. cron (0038): ogni mezz'ora la funzione classifiche guarda se c'è una partita da leggere (da inizio + 2
--    ore a mezzanotte); legge il portale solo allora. Alle 6:15 resta la lettura di tutto (0033).

create table gare_fipav (
  cid int not null,
  numero int not null,
  giornata smallint not null default 0,
  inizio timestamptz not null,
  casa text not null,
  ospite text not null,
  set_casa smallint check (set_casa between 0 and 5),
  set_ospite smallint check (set_ospite between 0 and 5),
  stato text not null default '',
  letta_il timestamptz not null default now(),
  primary key (cid, numero)
);
alter table gare_fipav enable row level security;
create policy famiglia_legge on gare_fipav for select to authenticated using (public.e_famiglia());
-- scrive solo la funzione classifiche (service role)

alter table partite
  add column gara_cid int,
  add column gara int,
  add constraint partite_gara_fk foreign key (gara_cid, gara) references gare_fipav (cid, numero),
  add constraint partite_gara_unica unique (gara_cid, gara),
  alter column in_campo drop not null;

-- Lani risponde al popup: solo per le partite del server ancora senza risposta.
create or replace function rispondi_partita(p_id uuid, p_in_campo boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not public.e_famiglia() then
    raise exception 'Solo la famiglia';
  end if;
  update public.partite set in_campo = p_in_campo, approvata_il = now()
   where id = p_id and gara is not null and in_campo is null and approvata_il is null;
  return found;
end $$;
revoke execute on function rispondi_partita(uuid, boolean) from public, anon;
grant execute on function rispondi_partita(uuid, boolean) to authenticated;

-- Correzione di un genitore: storna i passi dell'ultimo giro e cambia in_campo; poi l'app chiama
-- "passi" che registra il giro nuovo. false se non c'è niente da cambiare o le chiavi sono già date.
create or replace function correggi_partita(p_id uuid, p_in_campo boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  p public.partite;
  n int;
  rif text;
  m public.movimenti_passi;
begin
  if not public.e_genitore() then
    raise exception 'Solo un genitore può correggere una partita';
  end if;
  select * into p from public.partite where id = p_id;
  if not found or p.approvata_il is null or p.in_campo is not distinct from p_in_campo then
    return false;
  end if;
  select count(*) into n from public.movimenti_passi where motivo = 'storno' and riferimento like 'partita:' || p_id || '%';
  rif := case when n = 0 then p_id::text else p_id || ':' || n end;
  select * into m from public.movimenti_passi where motivo = 'partita' and riferimento = rif;
  if found and exists (
    select 1 from public.settimane
    where inizio = m.giorno - (extract(isodow from m.giorno)::int - 1) and chiavi is not null
  ) then
    return false;
  end if;
  perform public.storna_spunta('partita', rif);
  perform public.storna_spunta('partita_vinta', rif);
  update public.partite set in_campo = p_in_campo where id = p_id;
  return true;
end $$;
revoke execute on function correggi_partita(uuid, boolean) from public, anon;
grant execute on function correggi_partita(uuid, boolean) to authenticated;

