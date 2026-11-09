-- PIN dell'area genitori: "PIN non giusto" solo quando il PIN è sbagliato (debito prima dell'avvio).
-- Come verifica_pin, ma dice perché non si apre: 'ok', 'sbagliato', 'bloccato' (dopo 5 errori, per
-- 15 minuti), 'manca' (nessun PIN impostato), 'no' (non è un genitore). verifica_pin resta per
-- compatibilità con le versioni dell'app già installate.
create or replace function controlla_pin(p_pin text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  r public.pin_genitori;
begin
  if not public.e_genitore() then return 'no'; end if;
  select * into r from public.pin_genitori where id for update;
  if not found then return 'manca'; end if;
  if r.bloccato_fino > now() then return 'bloccato'; end if;
  if r.hash = extensions.crypt(p_pin, r.hash) then
    update public.pin_genitori set errori = 0, bloccato_fino = null where id;
    return 'ok';
  end if;
  update public.pin_genitori
  set errori = case when r.errori + 1 >= 5 then 0 else r.errori + 1 end,
      bloccato_fino = case when r.errori + 1 >= 5 then now() + interval '15 minutes' end
  where id;
  return case when r.errori + 1 >= 5 then 'bloccato' else 'sbagliato' end;
end $$;
revoke execute on function controlla_pin(text) from public, anon;
grant execute on function controlla_pin(text) to authenticated;
