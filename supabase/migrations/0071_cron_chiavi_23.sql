-- Chiavi della domenica alle 23:00 ora italiana (decisione del signore del 23/11/2026; prima 21:30).
-- Il 22/11 la chiusura della sera di Lani è arrivata alle 21:30, nello stesso minuto del conteggio,
-- ed è rimasta fuori. pg_cron è in UTC: alle 21:00 e alle 22:00 UTC di domenica, cioè 23:00 d'estate
-- e 22:00/23:00 d'inverno. La funzione salta se a Roma non sono ancora le 23 (config
-- chiavi_settimana.ora_conteggio, con un quarto d'ora di margine) e non conta due volte la stessa
-- settimana; il giro d'estate delle 22:00 UTC cade a lunedì e si ferma da sé.

select cron.schedule('chiavi', '0 21,22 * * 0', 'select public.lancia_chiavi()');
