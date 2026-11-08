-- Enigma: tentativo contato in modo atomico (revisione di Jarvis). Restituisce il nuovo numero di
-- tentativi, o nessuna riga se i tentativi sono finiti o l'enigma è già risolto: due invii
-- simultanei non possono superare il massimo. Solo il server (Edge Function enigma).
create or replace function tenta_enigma(p_n int, p_massimo int) returns int
language sql security definer set search_path = '' as $$
  update public.forzieri
  set tentativi_enigma = tentativi_enigma + 1
  where n = p_n and tentativi_enigma < p_massimo and enigma_risolto_il is null
  returning tentativi_enigma;
$$;
revoke execute on function tenta_enigma(int, int) from public, anon, authenticated;
grant execute on function tenta_enigma(int, int) to service_role;

-- Venerdì e sabato: se il giorno dopo c'è una partita di Lani, chiusura breve con la sola borsa,
-- a quest'ora o mezz'ora prima dello sport (decisione del signore, 8/11).
insert into impostazioni (chiave, valore) values ('ora_chiusura_breve', '"20:30"') on conflict (chiave) do nothing;
