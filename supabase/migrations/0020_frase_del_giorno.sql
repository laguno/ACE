-- Frasi nei momenti (docs/05, debito prima dell'avvio): una al giorno al massimo, mai la stessa prima
-- di 30 giorni, mai nei rimproveri (i rimproveri non la chiedono). Le frasi di famiglia hanno la
-- precedenza; quelle senza momento valgono per qualsiasi momento.
-- La prima richiesta del giorno sceglie la frase e il momento: richiamata per lo stesso momento
-- (riapertura, secondo dispositivo) restituisce la stessa frase; per un altro momento, niente.
alter table frasi add column ultimo_momento text;

create or replace function frase_del_giorno(p_momento text) returns table (testo text, autore text)
language plpgsql security definer set search_path = '' as $$
declare
  v_oggi date := public.oggi();
  v_id uuid;
begin
  if not public.e_famiglia() then
    raise exception 'non autorizzato';
  end if;
  -- due richieste insieme non devono scegliere due frasi
  perform pg_advisory_xact_lock(hashtext('frase_del_giorno'));
  select f.id into v_id from public.frasi f where f.ultima_volta = v_oggi limit 1;
  if v_id is not null then
    return query select f.testo, f.autore from public.frasi f where f.id = v_id and f.ultimo_momento = p_momento;
    return;
  end if;
  select f.id into v_id from public.frasi f
  where (f.momento = p_momento or (f.di_famiglia and f.momento is null))
    and (f.ultima_volta is null or f.ultima_volta <= v_oggi - 30)
  order by f.di_famiglia desc, f.ultima_volta nulls first, random()
  limit 1;
  if v_id is null then
    return;
  end if;
  update public.frasi set ultima_volta = v_oggi, ultimo_momento = p_momento where id = v_id;
  return query select f.testo, f.autore from public.frasi f where f.id = v_id;
end;
$$;
revoke execute on function frase_del_giorno(text) from public, anon;
grant execute on function frase_del_giorno(text) to authenticated;
