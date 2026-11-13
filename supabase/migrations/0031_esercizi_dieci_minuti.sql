-- Sprint 2: il menu dei dieci minuti passa dal config a una tabella, così i genitori lo cambiano
-- dall'app (Impostazioni). Lani lo legge e basta. Gli id delle righe di partenza sono quelli del
-- config, così le serate già salvate (serate.dieci_minuti_esercizio) ritrovano il nome.
-- Tipo: 'recupero' nei giorni di pallavolo, 'forza_riflessi' negli altri (regole: esercizioDelGiorno).

create table esercizi_dieci_minuti (
  id text primary key default gen_random_uuid()::text,
  nome text not null unique check (length(trim(nome)) between 1 and 60),
  tipo text not null check (tipo in ('forza_riflessi', 'recupero')),
  creato_il timestamptz not null default now()
);

insert into esercizi_dieci_minuti (id, nome, tipo) values
  ('plank', 'Plank e varianti', 'forza_riflessi'),
  ('corpo-libero', 'Squat e affondi a corpo libero', 'forza_riflessi'),
  ('visore', 'Riflessi con il visore', 'forza_riflessi'),
  ('mobilita', 'Mobilità e allungamento', 'recupero'),
  ('respiro', 'Respirazione guidata', 'recupero');

alter table esercizi_dieci_minuti enable row level security;
create policy famiglia_legge on esercizi_dieci_minuti for select to authenticated using (public.e_famiglia());
create policy genitori_inseriscono on esercizi_dieci_minuti for insert to authenticated with check (public.e_genitore());
create policy genitori_aggiornano on esercizi_dieci_minuti for update to authenticated using (public.e_genitore()) with check (public.e_genitore());
create policy genitori_cancellano on esercizi_dieci_minuti for delete to authenticated using (public.e_genitore());
