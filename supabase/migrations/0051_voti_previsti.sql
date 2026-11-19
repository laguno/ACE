-- Voto previsto (blocco D, 19/11/2026): prima di una verifica Lani dice che voto pensa di prendere.
-- Non è un voto: il voto vero arriva solo da Nuvola (tabella voti). Il confronto, la tendenza su
-- più verifiche e i passi per una previsione vicina (importo provvisorio in config-gioco.json,
-- metacognizione.voto_previsto, da confermare) li calcola il server in sync-nuvola.
-- La previsione si fa e si cambia fino al giorno prima della verifica, poi resta ferma.

create table voti_previsti (
  verifica_id uuid primary key references verifiche (id) on delete cascade,
  -- mezzi voti da 3 a 10 (metacognizione.voto_previsto.voto_min / voto_max)
  voto numeric(3, 1) not null check (voto between 3 and 10 and voto * 2 = trunc(voto * 2)),
  creato_il timestamptz not null default now(),
  cambiato_il timestamptz not null default now()
);
alter table voti_previsti enable row level security;
create policy famiglia_legge on voti_previsti for select to authenticated using (public.e_famiglia());
create policy lani_inserisce on voti_previsti for insert to authenticated with check (
  public.e_famiglia() and exists (select 1 from public.verifiche v where v.id = verifica_id and v.data > public.oggi())
);
create policy lani_aggiorna on voti_previsti for update to authenticated
  using (public.e_famiglia() and exists (select 1 from public.verifiche v where v.id = verifica_id and v.data > public.oggi()))
  with check (exists (select 1 from public.verifiche v where v.id = verifica_id and v.data > public.oggi()));
create policy genitori_cancellano on voti_previsti for delete to authenticated using (public.e_genitore());

create trigger lani_solo_voto before update on voti_previsti
  for each row execute function solo_colonne('voto', 'cambiato_il');

-- le ore le mette il server
create or replace function ora_previsione() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.creato_il := now();
  else
    new.creato_il := old.creato_il;
  end if;
  new.cambiato_il := now();
  return new;
end $$;
create trigger ora before insert or update on voti_previsti
  for each row execute function ora_previsione();
