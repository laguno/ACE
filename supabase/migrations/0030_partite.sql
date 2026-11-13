-- Sprint 2: partite di Lani con il risultato in set, segnate da un genitore.
-- Passi dalla funzione "passi" (tipo 'partita'): giocata +10, vinta +15 in più (config passi.partite),
-- solo da R-Evolution (periodo.r_evolution_da). Lani le legge e basta.

create table partite (
  id uuid primary key default gen_random_uuid(),
  data date not null default oggi(),
  avversaria text not null,
  set_nostri smallint not null check (set_nostri between 0 and 5),
  set_loro smallint not null check (set_loro between 0 and 5),
  dato_da uuid not null default auth.uid() references profili (id),
  creato_il timestamptz not null default now()
);

alter table partite enable row level security;
create policy famiglia_legge on partite for select to authenticated using (public.e_famiglia());
create policy genitori_inseriscono on partite for insert to authenticated with check (public.e_genitore());
create policy genitori_aggiornano on partite for update to authenticated using (public.e_genitore()) with check (public.e_genitore());
create policy genitori_cancellano on partite for delete to authenticated using (public.e_genitore());
