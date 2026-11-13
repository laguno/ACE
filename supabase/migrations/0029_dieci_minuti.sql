-- Sprint 2: dieci minuti di allenamento nella Sera.
-- Lani avvia il timer (dieci_minuti_da) e spunta in fondo (dieci_minuti_il); le ore le mette il
-- server (timbra_ora), così la funzione "passi" può controllare che tra le due ci siano almeno i
-- secondi di config (dieci_minuti.secondi). L'esercizio scelto resta per lo storico.
-- ponytail: l'avvio resta il primo della sera; chi riapre l'app più tardi trova il timer già finito.

alter table serate
  add column dieci_minuti_da timestamptz,
  add column dieci_minuti_esercizio text;

drop trigger lani_solo_spunte on serate;
create trigger lani_solo_spunte before update on serate
  for each row execute function solo_colonne('cartella_il', 'borsa_il', 'dieci_minuti_da', 'dieci_minuti_esercizio', 'dieci_minuti_il', 'chiusa_il');

drop trigger lani_timbra on serate;
create trigger lani_timbra before insert or update on serate
  for each row execute function timbra_ora('cartella_il', 'borsa_il', 'dieci_minuti_da', 'dieci_minuti_il', 'chiusa_il');
