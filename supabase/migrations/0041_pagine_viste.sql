-- Pagine che una foto mostra davvero (lette dall'IA con foto-studio, o scritte da un genitore):
-- servono a dire "caricate / mancano" per ogni richiesta. Gli aggiornamenti dei genitori sono già
-- permessi dalla policy genitori_aggiornano (0026).
alter table foto_pagine add column pagine_viste text;
