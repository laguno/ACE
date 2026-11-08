-- Ora base della chiusura serale per giorno della settimana (0 = domenica), da docs/01:
-- domenica 20:00 (chiusura lunga), lunedì-giovedì 20:30; venerdì e sabato niente.
-- Se Lani ha allenamento o partita dopo le 17, l'app chiude mezz'ora prima (oraChiusura).
-- La cambiano i genitori dalle impostazioni (tappa 7).
insert into impostazioni (chiave, valore) values (
  'ora_chiusura',
  '{"0": "20:00", "1": "20:30", "2": "20:30", "3": "20:30", "4": "20:30"}'
) on conflict (chiave) do nothing;
