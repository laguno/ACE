-- Piano del giorno (blocco D del piano di studio, approvato dal signore il 19/11/2026).
-- Nel pomeriggio Lani stima quanti minuti le serve per ogni cosa (compito, ripasso, carte), poi
-- tocca "Inizio" e "Finito": le ore le mette il server (timbra_ora), così il confronto tra stima
-- e tempo vero è onesto. Nessun passo: serve a lei per imparare a stimare (regole pure in
-- src/lib/regole/metacognizione.ts). La stima non si cambia dopo l'inizio.

create table piano_voci (
  giorno date not null default oggi(),
  voce text not null check (length(voce) between 1 and 80),       -- 'compito:<id>', 'ripasso:<id>', 'carte'
  titolo text not null check (length(titolo) between 1 and 200),
  -- 180 = metacognizione.piano.minuti_max di config-gioco.json (qui solo come argine)
  minuti_stimati int not null check (minuti_stimati between 1 and 180),
  iniziata_il timestamptz,
  finita_il timestamptz,
  creata_il timestamptz not null default now(),
  primary key (giorno, voce),
  check (finita_il is null or (iniziata_il is not null and finita_il >= iniziata_il))
);
alter table piano_voci enable row level security;
create policy famiglia_legge on piano_voci for select to authenticated using (public.e_famiglia());
-- solo il piano di oggi: niente stime per ieri o per la settimana dopo
create policy lani_inserisce on piano_voci for insert to authenticated with check (public.e_famiglia() and giorno = public.oggi());
create policy lani_aggiorna on piano_voci for update to authenticated
  using (public.e_famiglia() and giorno = public.oggi()) with check (giorno = public.oggi());
create policy genitori_cancellano on piano_voci for delete to authenticated using (public.e_genitore());

create trigger lani_solo_piano before update on piano_voci
  for each row execute function solo_colonne('minuti_stimati', 'iniziata_il', 'finita_il');
create trigger lani_timbra before insert or update on piano_voci
  for each row execute function timbra_ora('iniziata_il', 'finita_il');

-- Lani: la stima resta quella di prima dell'inizio, e una voce non nasce già finita
create or replace function stima_ferma() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null or public.e_genitore() then
    return new;
  end if;
  if tg_op = 'INSERT' and new.finita_il is not null then
    raise exception 'Lani non può cambiare questi dati: prima Inizio, poi Finito';
  end if;
  if tg_op = 'UPDATE' and old.iniziata_il is not null and new.minuti_stimati is distinct from old.minuti_stimati then
    raise exception 'Lani non può cambiare questi dati: la stima resta quella di prima';
  end if;
  return new;
end $$;
create trigger lani_stima_ferma before insert or update on piano_voci
  for each row execute function stima_ferma();
