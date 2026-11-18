-- Tipo della prova scelto da un genitore ("verifica" o "interrogazione"). Nuvola dà il tipo dal nome
-- dell'evento ("Verifica di Geografia" per un recupero orale) e la sincronizzazione lo riscrive a
-- ogni giro: come per la data spostata (0036), un trigger riporta il tipo scelto.
alter table verifiche add column tipo_scelto tipo_verifica;

create or replace function tieni_data_spostata() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.data_spostata is not null then
    new.data := new.data_spostata;
  end if;
  if new.tipo_scelto is not null then
    new.tipo := new.tipo_scelto;
  end if;
  return new;
end $$;

-- Solo i genitori scelgono il tipo (null = torna a quello di Nuvola al prossimo giro).
create or replace function segna_tipo_verifica(p_id uuid, p_tipo tipo_verifica) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.e_genitore() then
    raise exception 'solo i genitori cambiano il tipo della prova';
  end if;
  update public.verifiche
     set tipo_scelto = p_tipo,
         tipo = coalesce(p_tipo, tipo)
   where id = p_id;
  if not found then
    raise exception 'verifica sconosciuta';
  end if;
end $$;
revoke execute on function public.segna_tipo_verifica(uuid, tipo_verifica) from public, anon;
grant execute on function public.segna_tipo_verifica(uuid, tipo_verifica) to authenticated;

-- Il recupero di Geografia (Unione Europea) del 19/11 è un'interrogazione, non una verifica scritta.
update verifiche set tipo_scelto = 'interrogazione' where nuvola_id = '603531';
