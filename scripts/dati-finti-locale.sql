-- Dati FINTI per l'ambiente di prova LOCALE: una Lani a metà novembre 2026, con date relative a oggi().
-- Ripetibile: cancella e rifà. Non toccare mai il progetto vero (lo impedisce dati-finti-locale.mjs).
-- Numeri (passi, chiavi, tappe) da data/config-gioco.json: compito 10 (x1,3 con anticipo), cartella 5,
-- borsa 2, ripasso 10, gesto 2, flash card 3, quiz 10 (1º tentativo, >=90%), partita 10, vinta 15.
begin;
set local timezone = 'Europe/Rome';

delete from movimenti_passi; delete from quiz_tentativi; delete from quiz; delete from flashcard_giri;
delete from flashcard; delete from sessioni_ripasso; delete from verifiche; delete from compiti;
delete from lezioni; delete from serate; delete from gesti_casa; delete from partite;
delete from settimane; delete from umore; delete from impegni_famiglia;

insert into materie (id, nome, abbreviazione) values
  ('italiano','Italiano','ITA'), ('storia','Storia','STO'), ('geografia','Geografia','GEO'),
  ('matematica','Matematica','MAT'), ('scienze','Scienze','SCI'), ('inglese','Inglese','ING'),
  ('spagnolo','Spagnolo','SPA'), ('tecnologia','Tecnologia','TEC'), ('arte','Arte e immagine','ART'),
  ('musica','Musica','MUS'), ('motoria','Scienze motorie','MOT')
on conflict (id) do update set nome = excluded.nome, abbreviazione = excluded.abbreviazione;

-- R-Evolution accesa dall'inizio del periodo simulato (serve alle partite e ai dieci minuti)
insert into impostazioni (chiave, valore) values ('r_evolution_da', to_jsonb((oggi() - 27)::text))
on conflict (chiave) do update set valore = excluded.valore;

-- Giorni di scuola passati (ultime 4 settimane) e prossimi
create temp table gp on commit drop as
  select g::date as g, row_number() over (order by g) as n
  from generate_series(oggi() - 27, oggi() - 1, '1 day') g where extract(isodow from g) < 6;
create temp table gf on commit drop as
  select g::date as g, row_number() over (order by g) as n
  from generate_series(oggi() + 1, oggi() + 6, '1 day') g where extract(isodow from g) < 6;

-- Compiti passati: 2 al giorno, quasi tutti fatti il giorno di scuola prima (1 ogni 9 dimenticato)
insert into compiti (id, materia_id, testo, pagine, assegnato_il, scadenza, fatto_il)
select md5('compito' || gp.g || k)::uuid,
  (array['italiano','matematica','inglese','storia','scienze','geografia','spagnolo','tecnologia'])[1 + ((gp.n * 2 + k) % 8)],
  (array['Esercizi sul quaderno','Studiare e fare lo schema','Rileggere gli appunti','Completare la scheda'])[1 + ((gp.n + k) % 4)],
  'pag. ' || (20 + gp.n * 3 + k),
  gp.g - 3, gp.g,
  case when (gp.n * 2 + k) % 9 = 0 then null
       else ((gp.g - case when extract(isodow from gp.g) = 1 then 3 else 1 end) + time '17:00') at time zone 'Europe/Rome' end
from gp, generate_series(1, 2) k;

insert into movimenti_passi (giorno, motivo, riferimento, passi, moltiplicatore)
select (fatto_il at time zone 'Europe/Rome')::date, 'compito', id::text, 10, 1 from compiti where fatto_il is not null;

-- Serate: cartella e borsa spuntate in tempo
insert into serate (data, cartella_il, borsa_il, chiusa_il)
select g, (g + time '19:40') at time zone 'Europe/Rome', (g + time '19:45') at time zone 'Europe/Rome', (g + time '20:15') at time zone 'Europe/Rome' from gp;
insert into movimenti_passi (giorno, motivo, riferimento, passi, moltiplicatore)
select g, 'cartella', 'serata:' || g, 5, 1 from gp union all select g, 'borsa', 'serata:' || g, 2, 1 from gp;

-- Oggi e prossimi giorni: compiti da fare, uno di oggi già fatto, uno fatto in anticipo (x1,3)
insert into compiti (id, materia_id, testo, pagine, assegnato_il, scadenza, fatto_il) values
  (md5('oggi1')::uuid, 'matematica', 'Esercizi su proporzioni e percentuali', 'pag. 142-143', oggi() - 2, oggi(), now() - interval '2 hours'),
  (md5('oggi2')::uuid, 'italiano', 'Riassunto del capitolo 5 dei Promessi Sposi', 'pag. 98-101', oggi() - 1, oggi(), null),
  (md5('f1')::uuid, 'inglese', 'Present perfect: scheda di grammatica', 'pag. 57', oggi(), (select g from gf where n = 1), null),
  (md5('f2')::uuid, 'storia', 'Leggere e fare lo schema sulla scoperta dell''America', 'pag. 112-115', oggi(), (select g from gf where n = 2), null),
  (md5('f3')::uuid, 'scienze', 'Completare la tabella sugli stati della materia', 'pag. 66', oggi(), (select g from gf where n = 2), null),
  (md5('f4')::uuid, 'spagnolo', 'Verbi regolari in -ar: esercizi 3 e 4', 'pag. 41', oggi(), (select g from gf where n = 3), now() - interval '1 hour'),
  (md5('f5')::uuid, 'geografia', 'Preparare la cartina muta dell''Europa', 'pag. 88', oggi(), (select g from gf where n = 4), null);
insert into movimenti_passi (giorno, motivo, riferimento, passi, moltiplicatore) values
  (oggi(), 'compito', md5('oggi1')::uuid::text, 10, 1),
  (oggi(), 'compito', md5('f4')::uuid::text, 10, 1.3);

-- Verifiche: una tra 2 giorni (matematica), un'interrogazione tra 6, una storia tra 13
insert into verifiche (id, materia_id, tipo, data, argomento, pagine_probabili) values
  (md5('v1')::uuid, 'matematica', 'verifica', oggi() + 2, 'Proporzioni e percentuali', 'pag. 130-145'),
  (md5('v2')::uuid, 'inglese', 'interrogazione', oggi() + 6, 'Present perfect e vocabolario unit 4', 'pag. 50-58'),
  (md5('v3')::uuid, 'storia', 'verifica', oggi() + 13, 'Il Medioevo: dal feudalesimo ai Comuni', 'pag. 90-118');
insert into sessioni_ripasso (id, verifica_id, numero, data_prevista, tipo, fatta_il) values
  (md5('s1')::uuid, md5('v1')::uuid, 1, oggi() - 1, 'rilettura_flashcard', (oggi() - 1 + time '17:30') at time zone 'Europe/Rome'),
  (md5('s2')::uuid, md5('v1')::uuid, 2, oggi(), 'flashcard_mappa', null),
  (md5('s3')::uuid, md5('v1')::uuid, 3, oggi() + 1, 'quiz', null);
insert into movimenti_passi (giorno, motivo, riferimento, passi, moltiplicatore) values
  (oggi() - 1, 'ripasso', md5('s1')::uuid::text, 10, 1);

-- Studio: flash card, un giro, un quiz con un tentativo (5 su 5)
insert into flashcard (id, materia_id, argomento, tipo, fronte, retro, fonte, prossima_revisione, intervallo_giorni, verifica_id)
select md5('fc' || n)::uuid, 'matematica', 'Proporzioni e percentuali', 'domanda', f, r, 'prova', oggi(), 1, md5('v1')::uuid
from (values (1,'Che cos''è una proporzione?','Un''uguaglianza tra due rapporti: a:b = c:d.'),
  (2,'Come si calcola il termine incognito x in a:b = c:x?','x = (b · c) : a'),
  (3,'Qual è la proprietà fondamentale delle proporzioni?','Il prodotto dei medi è uguale al prodotto degli estremi.'),
  (4,'Come si calcola il 20% di 150?','150 · 20 : 100 = 30'),
  (5,'Che cosa vuol dire "sconto del 15%"?','Si paga l''85% del prezzo.'),
  (6,'Come si trasforma 3/5 in percentuale?','3 : 5 = 0,6 e quindi 60%.')) t(n, f, r);
insert into flashcard_giri (id, iniziato_il, fatto_il, materia_id, carte, sapevo, quasi, non_sapevo) values
  (md5('giro1')::uuid, (oggi() - 1 + time '16:40') at time zone 'Europe/Rome', (oggi() - 1 + time '16:48') at time zone 'Europe/Rome', 'matematica', 6, 4, 1, 1);
insert into movimenti_passi (giorno, motivo, riferimento, passi, moltiplicatore) values
  (oggi() - 1, 'flashcard', 'flashcard:' || (oggi() - 1) || ':1', 3, 1);
insert into quiz (id, materia_id, argomento, verifica_id, domande) values
  (md5('quiz1')::uuid, 'matematica', 'Proporzioni e percentuali', md5('v1')::uuid, jsonb_build_array(
    jsonb_build_object('testo','Quale proporzione è corretta?','opzioni',jsonb_build_array('2:3 = 4:6','2:3 = 4:5','2:3 = 3:2'),'giusta',0,'spiegazione','Il prodotto dei medi (3·4) è uguale a quello degli estremi (2·6).'),
    jsonb_build_object('testo','Il 10% di 80 è','opzioni',jsonb_build_array('8','10','80'),'giusta',0,'spiegazione','80 · 10 : 100 = 8.'),
    jsonb_build_object('testo','In 5:x = 10:4, x vale','opzioni',jsonb_build_array('2','8','20'),'giusta',0,'spiegazione','x = 5 · 4 : 10 = 2.'),
    jsonb_build_object('testo','Un prezzo di 40 euro scontato del 25% costa','opzioni',jsonb_build_array('30','35','10'),'giusta',0,'spiegazione','25% di 40 è 10; 40 - 10 = 30.'),
    jsonb_build_object('testo','1/4 in percentuale è','opzioni',jsonb_build_array('25%','14%','40%'),'giusta',0,'spiegazione','1 : 4 = 0,25.')));
insert into quiz_tentativi (id, quiz_id, numero, giuste, totale, fatto_il, sbagliate) values
  (md5('t1')::uuid, md5('quiz1')::uuid, 1, 5, 5, (oggi() - 1 + time '17:00') at time zone 'Europe/Rome', '{}');
insert into movimenti_passi (giorno, motivo, riferimento, passi, moltiplicatore) values
  (oggi() - 1, 'quiz', 'quiz:' || (oggi() - 1) || ':1', 10, 1);

-- Gesti di casa (dati dal genitore) e partite (approvate dal genitore, Lani in campo)
insert into gesti_casa (id, data, voce, dato_da, creato_il)
select md5('gesto' || g || voce)::uuid, g, voce, '00000000-0000-4000-8000-0000000000a1', (g + time '20:00') at time zone 'Europe/Rome'
from (select g, (array['scrivania','letto','vestiti','lavastoviglie'])[1 + (n % 4)] voce from gp where n % 3 = 0) x;
insert into movimenti_passi (giorno, motivo, riferimento, passi, moltiplicatore, dato_da)
select data, 'gesto', id::text, 2, 1, dato_da from gesti_casa;

insert into partite (id, data, avversaria, set_nostri, set_loro, in_campo, dato_da, approvata_il, approvata_da) values
  (md5('p1')::uuid, oggi() - 9, 'Volley Reggio', 3, 1, true, '00000000-0000-4000-8000-0000000000a1', now() - interval '8 days', '00000000-0000-4000-8000-0000000000a1'),
  (md5('p2')::uuid, oggi() - 3, 'Sant''Ilario', 1, 3, true, '00000000-0000-4000-8000-0000000000a1', now() - interval '2 days', '00000000-0000-4000-8000-0000000000a1');
insert into movimenti_passi (giorno, motivo, riferimento, passi, moltiplicatore, dato_da) values
  (oggi() - 9, 'partita', md5('p1')::uuid::text, 10, 1, '00000000-0000-4000-8000-0000000000a1'),
  (oggi() - 9, 'partita_vinta', md5('p1')::uuid::text, 15, 1, '00000000-0000-4000-8000-0000000000a1'),
  (oggi() - 3, 'partita', md5('p2')::uuid::text, 10, 1, '00000000-0000-4000-8000-0000000000a1');

-- Chiavi: le 4 settimane concluse (da lunedì), ciascuna con le sue chiavi
insert into settimane (inizio, passi_obbligatori_possibili, passi_obbligatori_fatti, cose_possibili, cose_fatte, note, chiavi, rimonta)
select (date_trunc('week', oggi()) - make_interval(weeks => k))::date, 135, 135 - 8 * (k % 2), 15, 15 - (k % 2), 0, 3 - (k % 2), false
from generate_series(1, 4) k;

-- Forzieri: 1 aperto (premio visibile), 2 chiuso con premio nascosto
-- i trigger dei forzieri vietano di riscrivere premio ed enigma: qui è un reset di prova
set local session_replication_role = replica;
update forzieri set stato = 'chiuso', enigma = null, soluzione = null, tentativi_enigma = 0,
  enigma_risolto_il = null, aperto_il = null, consegnato_il = null;
update forzieri set stato = 'aperto', enigma = 'Ha le chiavi ma non apre porte. Che cos''è?', soluzione = 'tastiera',
  tentativi_enigma = 1, enigma_risolto_il = now() - interval '9 days', aperto_il = now() - interval '8 days' where n = 1;
update forzieri set premio = coalesce(premio, 'Una serata pizza con la squadra') where n = 2;
set local session_replication_role = origin;
insert into movimenti_passi (giorno, motivo, riferimento, passi, moltiplicatore) values (oggi() - 9, 'enigma', 'forziere:1', 20, 1);

-- Un po' di vita attorno
insert into umore (data, faccia) values (oggi(), 'contenta');
insert into lezioni (nuvola_id, data, ora, materia_id, argomento)
select 'prova-' || oggi() || '-' || o, oggi(), o, m, a from (values
  (1,'matematica','Percentuali e sconti'),(2,'italiano','Promessi Sposi: la monaca di Monza'),
  (3,'inglese','Present perfect'),(4,'scienze','Gli stati della materia')) t(o, m, a);
insert into impegni_famiglia (id, inizio, fine, titolo, chi, tutto_il_giorno) values
  ('prova-allenamento-1', (oggi() + time '17:30') at time zone 'Europe/Rome', (oggi() + time '19:00') at time zone 'Europe/Rome', 'Allenamento pallavolo', 'lani', false),
  ('prova-allenamento-2', ((oggi() + 2) + time '17:30') at time zone 'Europe/Rome', ((oggi() + 2) + time '19:00') at time zone 'Europe/Rome', 'Allenamento pallavolo', 'lani', false);
commit;
