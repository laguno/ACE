-- Blocco F: come flash card, quiz e video (0027), anche i passi delle serie di matematica di un
-- giorno si tolgono quando un genitore storna un compito di quel giorno (una spunta falsa
-- sbloccava lo studio). Trigger a parte invece di riscrivere storna_spunta: così non si tocca
-- una funzione che altri rami possono cambiare.

create or replace function storna_mate_con_compito() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  g date;
  s public.movimenti_passi;
begin
  select giorno into g from public.movimenti_passi
   where motivo = 'compito' and riferimento = substr(new.riferimento, length('compito:') + 1);
  if g is null then
    return new;
  end if;
  for s in select * from public.movimenti_passi x
           where x.motivo = 'matematica' and x.giorno = g and x.passi > 0
             and not exists (select 1 from public.movimenti_passi y where y.motivo = 'storno' and y.riferimento = 'matematica:' || x.riferimento) loop
    perform public.registra_passi('storno', 'matematica:' || s.riferimento, -s.passi, s.moltiplicatore, public.oggi(), new.dato_da);
  end loop;
  return new;
end $$;
revoke execute on function storna_mate_con_compito() from public, anon, authenticated;

create trigger storna_mate after insert on movimenti_passi
  for each row when (new.motivo = 'storno' and new.riferimento like 'compito:%')
  execute function storna_mate_con_compito();
