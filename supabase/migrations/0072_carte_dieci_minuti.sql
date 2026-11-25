-- Dieci minuti a carte (progetto del signore con Jarvis, 25/11/2026, docs/dieci-minuti.md).
-- Ogni giorno una ruota assegna una delle sette carte; la ruota pesca solo fra le carte non ancora
-- uscite nella settimana (lunedì-domenica, ora di Roma) e l'esito lo fissa il server: riaprire l'app
-- mostra la stessa carta. Il "mazzo" non ha tabella propria: si ricava da questa, una riga per giorno.
-- In fondo ai dieci minuti Lani scrive il suo record; il migliore per carta (e per trick, carta 4) si
-- calcola dalle righe.
--
-- ADDITIVA: nessuna tabella esistente cambia e nessuna riga si riscrive. esercizi_dieci_minuti e i
-- valori vecchi di serate.dieci_minuti_esercizio ("plank", "mobilita", ...) restano validi; i giorni
-- nuovi lì scrivono "carta-1" ... "carta-7". Le chiavi non cambiano: un giorno conta quando i dieci
-- minuti arrivano in fondo (funzione "passi", tipo dieci_minuti), 6 giorni su 7.
-- Per tornare indietro: drop function segna_record(int, text); drop function gira_ruota();
-- drop table carte_del_giorno;

create table carte_del_giorno (
  data date primary key default oggi(),
  carta smallint not null check (carta between 1 and 7),
  girata_il timestamptz not null default now(),
  record int check (record between 0 and 999),
  record_su text check (length(record_su) between 1 and 40), -- l'esercizio del record (carta 4: il trick)
  record_il timestamptz
);

alter table carte_del_giorno enable row level security;
create policy famiglia_legge on carte_del_giorno for select to authenticated using (public.e_famiglia());
-- nessuna scrittura diretta: solo dalle due funzioni qui sotto

-- La carta di oggi: se la ruota non è ancora girata la gira, pescando fra le carte non uscite da lunedì.
create or replace function gira_ruota() returns smallint
language plpgsql security definer set search_path = '' as $$
declare
  v_oggi date := public.oggi();
  v_lunedi date := v_oggi - (extract(isodow from v_oggi)::int - 1);
  v_carta smallint;
begin
  if not public.e_famiglia() then
    raise exception 'non autorizzato';
  end if;
  select carta into v_carta from public.carte_del_giorno where data = v_oggi;
  if found then
    return v_carta;
  end if;
  select c into v_carta
  from generate_series(1, 7) as c
  where c not in (select carta from public.carte_del_giorno where data >= v_lunedi and data < v_oggi)
  order by random()
  limit 1;
  if v_carta is null then -- non succede (sette carte, sette giorni), ma la ruota non si blocca
    v_carta := 1 + floor(random() * 7)::smallint;
  end if;
  insert into public.carte_del_giorno (data, carta) values (v_oggi, v_carta)
  on conflict (data) do nothing;
  -- due giri nello stesso istante: vale quello arrivato primo
  select carta into v_carta from public.carte_del_giorno where data = v_oggi;
  return v_carta;
end;
$$;
revoke execute on function gira_ruota() from public, anon;
grant execute on function gira_ruota() to authenticated;

-- Il record di oggi, scritto da Lani nel minuto finale (solo dopo aver girato la ruota). Si può
-- correggere nella giornata; il migliore lo calcola l'app sulle righe dei giorni.
create or replace function segna_record(p_valore int, p_su text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not public.e_famiglia() then
    raise exception 'non autorizzato';
  end if;
  update public.carte_del_giorno
  set record = p_valore, record_su = p_su, record_il = now()
  where data = public.oggi();
  return found;
end;
$$;
revoke execute on function segna_record(int, text) from public, anon;
grant execute on function segna_record(int, text) to authenticated;
