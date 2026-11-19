-- Blocco H (19/11/2026): una flash card che Lani segnala sbagliata esce dal giro e ci resta.
-- Il ripasso (Studio, Oggi) legge già solo le carte con segnalata_sbagliata = false; qui il
-- database impedisce che dal telefono di Lani la segnalazione torni indietro e che la carta
-- rientri nel ripasso con una nuova data. Solo un genitore (o il server) può rimetterla in giro.
-- Un'IA che rigenera la stessa carta non la riaccende: l'upsert su (materia_id, fronte) ignora
-- i doppioni, e genera-studio passa le carte segnalate al controllo perché bocci quelle simili.
create or replace function segnalata_resta_fuori() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null or public.e_genitore() then
    return new;
  end if;
  if old.segnalata_sbagliata then
    new.segnalata_sbagliata := true;
    new.prossima_revisione := old.prossima_revisione;
    new.intervallo_giorni := old.intervallo_giorni;
  end if;
  return new;
end $$;

create trigger lani_segnalata_resta_fuori before update on flashcard
  for each row execute function segnalata_resta_fuori();
