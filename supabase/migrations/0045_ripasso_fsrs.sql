-- Piano studio del 19/11/2026, blocco A: ripasso distanziato con FSRS (src/lib/regole/fsrs.ts).
-- Ogni carta tiene il suo stato FSRS; ogni ripasso si registra (risposta, sicurezza detta prima
-- di girare, voto per l'algoritmo). Le colonne vecchie (intervallo_giorni) restano per le carte
-- non ancora ripassate col sistema nuovo.

alter table flashcard
  add column stabilita real,
  add column difficolta real,
  add column ripetizioni int not null default 0,
  add column cadute int not null default 0,
  add column ultimo_ripasso date,
  add column da_riprendere boolean not null default false;  -- troppe cadute: si riprende con i genitori

-- Lani aggiorna anche lo stato FSRS della carta (lo calcola la regola pura nell'app).
drop trigger lani_solo_ripetizione on flashcard;
create trigger lani_solo_ripetizione before update on flashcard
  for each row execute function solo_colonne(
    'segnalata_sbagliata', 'prossima_revisione', 'intervallo_giorni',
    'stabilita', 'difficolta', 'ripetizioni', 'cadute', 'ultimo_ripasso', 'da_riprendere'
  );

create table ripassi_carte (
  id uuid primary key default gen_random_uuid(),
  flashcard_id uuid not null references flashcard (id) on delete cascade,
  -- chiave scelta dall'app prima di salvare: con la coda senza rete lo stesso ripasso
  -- può arrivare due volte, la seconda si ignora
  chiave text not null unique,
  giorno date not null,
  fatto_il timestamptz not null default now(),
  giusta boolean not null,
  sicurezza text check (sicurezza in ('sicura', 'forse', 'non_lo_so')),
  voto int not null check (voto between 1 and 4),
  sovrastima boolean not null default false,
  pillola_id uuid,
  check (giorno between oggi() - 7 and oggi() + 1)
);
create index ripassi_carte_carta on ripassi_carte (flashcard_id, giorno);

alter table ripassi_carte enable row level security;
create policy genitori_leggono on ripassi_carte for select to authenticated using (e_genitore());
create policy famiglia_legge on ripassi_carte for select to authenticated using (e_famiglia());
create policy lani_inserisce on ripassi_carte for insert to authenticated with check (e_famiglia());
