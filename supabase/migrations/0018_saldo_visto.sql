-- Passi che salgono (decisione del signore, 9/11): quando Lani apre Oggi o Astra e il saldo è cambiato
-- dall'ultima volta che l'ha visto, il numero sale dal vecchio al nuovo. L'ultimo saldo visto sta qui,
-- così vale su telefono e iPad. Il client non scrive numeri: vedi_saldo() legge il saldo vero,
-- restituisce quello visto prima e lo aggiorna, tutto sul server.
create table saldo_visto (
  profilo_id uuid primary key references profili (id) on delete cascade,
  passi int not null,
  visto_il timestamptz not null default now()
);
alter table saldo_visto enable row level security;
create policy proprio on saldo_visto for select to authenticated using (profilo_id = auth.uid());
revoke insert, update, delete, truncate on saldo_visto from anon, authenticated;

-- Restituisce (prima, adesso). La prima volta prima = adesso: niente da far salire.
create or replace function vedi_saldo() returns table (prima int, adesso int)
language plpgsql security definer set search_path = '' as $$
declare
  v_prima int;
  v_adesso int;
begin
  if not public.e_famiglia() then
    raise exception 'non autorizzato';
  end if;
  select coalesce(sum(round(m.passi * m.moltiplicatore)), 0)::int into v_adesso from public.movimenti_passi m;
  select s.passi into v_prima from public.saldo_visto s where s.profilo_id = auth.uid() for update;
  if v_prima is null then
    insert into public.saldo_visto (profilo_id, passi) values (auth.uid(), v_adesso)
    on conflict (profilo_id) do nothing;
  elsif v_prima <> v_adesso then
    update public.saldo_visto set passi = v_adesso, visto_il = now() where profilo_id = auth.uid();
  end if;
  return query select coalesce(v_prima, v_adesso), v_adesso;
end;
$$;
revoke execute on function vedi_saldo() from public, anon;
grant execute on function vedi_saldo() to authenticated;
