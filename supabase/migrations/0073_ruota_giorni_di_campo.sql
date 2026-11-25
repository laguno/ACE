-- Dieci minuti, tappa 2 (progetto del 25/11/2026, docs/dieci-minuti.md): nei giorni di allenamento o
-- partita la ruota non dà le carte pesanti (1, 2, 5). Se nel mazzo della settimana restano solo
-- pesanti, esce una Calma (7) in più. Quali sono le pesanti sta anche in data/config-dieci-minuti.json.
-- Allenamenti e partite si riconoscono come in src/lib/calendario (tipoImpegno): titolo con Lani o
-- Leilani, con "allenament" o "partita", senza "assente", nel giorno di Roma in cui l'impegno inizia.
-- Una carta già assegnata oggi resta quella.
-- Per tornare indietro: rieseguire la funzione gira_ruota() della 0072.
create or replace function gira_ruota() returns smallint
language plpgsql security definer set search_path = '' as $$
declare
  v_oggi date := public.oggi();
  v_lunedi date := v_oggi - (extract(isodow from v_oggi)::int - 1);
  v_campo boolean;
  v_carta smallint;
begin
  if not public.e_famiglia() then
    raise exception 'non autorizzato';
  end if;
  select carta into v_carta from public.carte_del_giorno where data = v_oggi;
  if found then
    return v_carta;
  end if;
  select exists (
    select 1 from public.impegni_famiglia
    where (inizio at time zone 'Europe/Rome')::date = v_oggi
      and titolo ~* '\m(lani|leilani)\M'
      and titolo ~* '(allenament|partita)'
      and titolo !~* 'assente'
  ) into v_campo;
  select c into v_carta
  from generate_series(1, 7) as c
  where c not in (select carta from public.carte_del_giorno where data >= v_lunedi and data < v_oggi)
    and not (v_campo and c in (1, 2, 5))
  order by random()
  limit 1;
  if v_carta is null then
    v_carta := case when v_campo then 7 else 1 + floor(random() * 7)::smallint end;
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
