-- Enigmi a tipi (approvato dal signore il 9/11, data/enigmi.json): ogni forziere ha il suo tipo.
-- aiutino: una frase che Lani vede solo dopo il primo tentativo sbagliato.
-- parola: la parola chiave del premio (PIGIAMA, CINEMA...), serve all'enigma della cima.
alter table forzieri add column aiutino text, add column parola text;

-- Lani: l'aiutino compare dopo il primo tentativo sbagliato (colonna in fondo: la vista resta compatibile).
create or replace view forzieri_lani as
  select n, stato, tentativi_enigma, enigma_risolto_il, aperto_il, consegnato_il,
         case when stato <> 'chiuso' then enigma end as enigma,
         case when stato in ('aperto', 'consegnato') then premio end as premio,
         case when stato <> 'chiuso' and tentativi_enigma >= 1 and enigma_risolto_il is null then aiutino end as aiutino
  from public.forzieri
  where public.e_famiglia();

-- Il premio e il suo enigma si cambiano solo finché l'enigma non è comparso (controllo 6 di Jarvis):
-- anche scrivendo direttamente sulla tabella, non solo dall'app.
create or replace function premio_fermo() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.stato <> 'chiuso' and (
    new.premio is distinct from old.premio or new.enigma is distinct from old.enigma or
    new.soluzione is distinct from old.soluzione or new.aiutino is distinct from old.aiutino or
    new.parola is distinct from old.parola
  ) then
    raise exception 'l''enigma del forziere % è già comparso: premio ed enigma non si cambiano più', old.n;
  end if;
  return new;
end $$;
create trigger premio_fermo before update on forzieri for each row execute function premio_fermo();
