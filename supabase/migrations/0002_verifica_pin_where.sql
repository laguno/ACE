-- verifica_pin: Supabase (estensione safeupdate) rifiuta gli UPDATE senza WHERE anche dentro
-- le funzioni chiamate dall'API ("UPDATE requires a WHERE clause"). La riga è una sola (id = true).
create or replace function verifica_pin(p_pin text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  r public.pin_genitori;
begin
  if not public.e_genitore() then return false; end if;
  select * into r from public.pin_genitori where id for update;
  if not found or r.bloccato_fino > now() then return false; end if;
  if r.hash = extensions.crypt(p_pin, r.hash) then
    update public.pin_genitori set errori = 0, bloccato_fino = null where id;
    return true;
  end if;
  update public.pin_genitori
  set errori = case when r.errori + 1 >= 5 then 0 else r.errori + 1 end,
      bloccato_fino = case when r.errori + 1 >= 5 then now() + interval '15 minutes' end
  where id;
  return false;
end $$;
