-- Materiale da mettere in cartella oltre ai libri, per giorno della settimana (0 = domenica).
-- Lo cambiano i genitori dalle impostazioni (tappa 7). Deciso dal signore l'8 novembre 2026:
-- il lunedì Lani va a scuola con la borsa di pallavolo (il pulmino Revolution la prende a scuola)
-- e con la cartellina di tecnologia; niente "diario e astuccio" come voce fissa.
insert into impostazioni (chiave, valore) values (
  'materiale_cartella',
  '{"1": ["Borsa di pallavolo: il pulmino ti prende a scuola", "Cartellina di tecnologia"]}'
) on conflict (chiave) do nothing;
