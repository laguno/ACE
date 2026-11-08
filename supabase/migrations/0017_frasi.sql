-- Frasi e citazioni (data/frasi.json, PR 2, preparate da Jarvis l'8/11/2026): una al giorno al
-- massimo, mai la stessa prima di 30 giorni, mai nei rimproveri (docs/05). Il file resta la fonte:
-- le correzioni si fanno lì e si ricaricano con una nuova migrazione. Le frasi di famiglia
-- (di_famiglia = true) le aggiungono i genitori e hanno la precedenza.
alter table frasi add column fonte text;
create unique index frasi_testo on frasi (testo);

insert into frasi (testo, autore, fonte, momento) values
  ('Un viaggio di mille miglia comincia con un passo.', 'Lao Tzu', 'Tao Te Ching, cap. 64 (traduzione libera)', 'inizio_settimana'),
  ('Goccia a goccia si scava la pietra.', 'proverbio, dal latino', '«Gutta cavat lapidem»: Ovidio, Epistulae ex Ponto IV, 10, 5', 'ripasso'),
  ('Chi va piano va sano e va lontano.', 'proverbio', null, 'settimana_storta'),
  ('Roma non fu fatta in un giorno.', 'proverbio', null, 'rimonta'),
  ('Il successo è la somma di piccoli sforzi, ripetuti giorno dopo giorno.', 'anonimo', 'Spesso attribuita a Robert Collier, ma circola già nel 1932, prima di lui', 'tappa'),
  ('Se sembra impossibile, allora si può fare.', 'Bebe Vio', 'Titolo del suo libro, Rizzoli 2017', 'verifica'),
  ('Non è perché le cose sono difficili che non osiamo: è perché non osiamo che sono difficili.', 'Seneca', 'Lettere a Lucilio 104, 26', 'forziere_bloccato'),
  ('Per aspera ad astra.', 'motto latino', null, 'cima'),
  ('Nessun giorno senza una linea.', 'motto latino', '«Nulla dies sine linea»: l''abitudine del pittore Apelle, raccontata da Plinio il Vecchio, Naturalis historia XXXV, 84', 'chiusura'),
  ('Affrettati lentamente.', 'motto latino', '«Festina lente»: il motto di Augusto, in Svetonio, Vita di Augusto 25', 'apertura'),
  ('Ripetere giova.', 'motto latino', '«Repetita iuvant»', 'ripasso'),
  ('Il lavoro tenace vince ogni cosa.', 'Virgilio', 'Georgiche I, 145-146 («labor omnia vicit improbus»)', 'verifica'),
  ('La fortuna aiuta gli audaci.', 'Virgilio', 'Eneide X, 284 («audentes fortuna iuvat»)', 'partita'),
  ('Chi ben comincia è a metà dell''opera.', 'proverbio', 'Dal latino di Orazio, Epistole I, 2, 40 («dimidium facti qui coepit habet»)', 'inizio_settimana'),
  ('Fatti non foste a viver come bruti, ma per seguir virtute e canoscenza.', 'Dante Alighieri', 'Inferno XXVI, 119-120', 'verifica'),
  ('Siamo ciò che facciamo ogni giorno: l''eccellenza non è un atto, ma un''abitudine.', 'Will Durant', 'La storia della filosofia (1926), riassumendo Aristotele; spesso attribuita ad Aristotele stesso', 'tappa'),
  ('Sbagliando s''impara.', 'proverbio', null, 'ripasso'),
  ('L''unione fa la forza.', 'proverbio', null, 'partita'),
  ('Chi la dura la vince.', 'proverbio', null, 'rimonta'),
  ('Volere è potere.', 'proverbio', null, 'inizio_settimana'),
  ('Non rimandare a domani quello che puoi fare oggi.', 'proverbio', null, 'apertura'),
  ('Il buongiorno si vede dal mattino.', 'proverbio', null, 'apertura'),
  ('Non importa quanto vai piano: l''importante è non fermarsi.', 'proverbio', 'Spesso attribuito a Confucio, ma non si trova nei suoi testi', 'settimana_storta'),
  ('Impara l''arte e mettila da parte.', 'proverbio', null, 'chiusura'),
  ('Mente sana in corpo sano.', 'Giovenale', 'Satire X, 356 («mens sana in corpore sano»)', 'allenamento'),
  ('Più veloce, più in alto, più forte, insieme.', 'motto olimpico', '«Citius, altius, fortius – communiter», il motto dei Giochi olimpici dal 2021', 'partita'),
  ('La fatica non è mai sprecata: soffri, ma sogni.', 'Gianni Mura', 'Parlando di Pietro Mennea (citato da OA Sport, 2013)', 'allenamento'),
  ('Dove c''è una volontà, c''è una strada.', 'proverbio', null, 'verifica'),
  ('Chi semina raccoglie.', 'proverbio', null, 'tappa'),
  ('Non si impara per la scuola, ma per la vita.', 'motto latino', 'Rovescia una frase di Seneca, Lettere a Lucilio 106, 12, che criticava il contrario', 'verifica'),
  ('Con la pazienza si arriva a tutto.', 'proverbio', null, 'settimana_storta'),
  ('Un passo alla volta si fa tanta strada.', 'proverbio', null, 'chiusura')
on conflict (testo) do nothing;
