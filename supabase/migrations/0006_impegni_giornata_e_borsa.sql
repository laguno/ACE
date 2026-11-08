-- Impegni di un giorno intero (in Google senza orario): si mostrano senza ora.
alter table impegni_famiglia add column tutto_il_giorno boolean not null default false;

-- La borsa del lunedì ora sta nella sezione Borsa della sera (dal calendario, con la nota
-- "la porti a scuola"): dal materiale del lunedì resta la cartellina di tecnologia.
update impostazioni
set valore = '{"1": ["Cartellina di tecnologia"]}'
where chiave = 'materiale_cartella';
