// Prova di sicurezza dello schema su PGlite (Postgres in memoria) con un finto ambiente Supabase:
// applica tutte le migrazioni e controlla cosa può e non può fare Lani. Uso: npm run prova:schema
import { creaDatabase, LANI, PAPA } from './supabase-finto.mjs';

const { db, come } = await creaDatabase();
console.log('migrazioni applicate');

const COMPITO = '11111111-1111-1111-1111-111111111111', QUIZ = '22222222-2222-2222-2222-222222222222';
await db.exec(`
  insert into compiti (id, testo, scadenza) values ('${COMPITO}', 'Es. 3 pag. 40', '2026-11-24');
  update forzieri set premio = 'Pizza', enigma = 'Rotonda e calda', soluzione = 'pizza', stato = 'enigma' where n = 1;
  insert into quiz (id, argomento, domande) values ('${QUIZ}', 'Frazioni', '[]');
`);

let ok = 0, ko = 0;
const verifica = (nome, cond) => {
  if (cond) ok++;
  else ko++;
  console.log(cond ? 'ok ' : 'NO ', nome);
};
const fallisce = async (nome, uid, sql, ruolo) => {
  try { await come(uid, sql, ruolo); verifica(nome, false); } catch { verifica(nome, true); }
};
const val = async (uid, sql) => Object.values((await come(uid, sql)).rows[0] ?? {})[0];

// Lani
verifica('Lani non legge la tabella forzieri', (await come(LANI, 'select * from forzieri')).rows.length === 0);
const f = (await come(LANI, 'select enigma, premio from forzieri_lani where n = 1')).rows[0];
verifica('Lani vede l\'enigma ma non il premio', f.enigma === 'Rotonda e calda' && f.premio === null);
verifica('Lani non legge il PIN', (await come(LANI, 'select * from pin_genitori')).rows.length === 0);
await come(LANI, `update compiti set fatto_il = now() where id = '${COMPITO}'`);
verifica('Lani spunta un compito', (await val(null, 'select fatto_il is not null from compiti')) === true);
await come(null, `update compiti set fatto_il = null`);
await come(LANI, `update compiti set fatto_il = '2026-11-01' where id = '${COMPITO}'`);
verifica('spunta retrodatata: il server mette l\'ora vera', (await val(null, `select fatto_il > now() - interval '1 minute' from compiti`)) === true);
const primaOra = await val(null, 'select fatto_il::text from compiti');
await come(LANI, `update compiti set fatto_il = '2026-11-01' where id = '${COMPITO}'`);
verifica('una spunta già data non si sposta', (await val(null, 'select fatto_il::text from compiti')) === primaOra);
await come(LANI, `insert into serate (data, cartella_il) values (oggi(), '2026-11-01')`);
verifica('serata: ora del server', (await val(null, `select cartella_il > now() - interval '1 minute' from serate`)) === true);
await come(LANI, `update serate set dieci_minuti_da = '2026-11-01', dieci_minuti_esercizio = 'plank' where data = oggi()`);
verifica('dieci minuti: avvio con l\'ora del server', (await val(null, `select dieci_minuti_da > now() - interval '1 minute' from serate`)) === true);
verifica('dieci minuti: Lani sceglie l\'esercizio', (await val(null, `select dieci_minuti_esercizio from serate`)) === 'plank');
// partite (sprint 2): le segna Lani da approvare, le approva e corregge un genitore
await fallisce('partita: Lani non se la segna già approvata', LANI, `insert into partite (avversaria, set_nostri, set_loro, approvata_il) values ('Foxes', 3, 0, now())`);
await fallisce('partita: Lani non la segna di un mese fa', LANI, `insert into partite (data, avversaria, set_nostri, set_loro) values (oggi() - 30, 'Foxes', 3, 0)`);
await fallisce('partita: Lani non la segna a nome di un genitore', LANI, `insert into partite (avversaria, set_nostri, set_loro, dato_da) values ('Foxes', 3, 0, '${PAPA}')`);
await fallisce('partita: niente pareggi', PAPA, `insert into partite (avversaria, set_nostri, set_loro) values ('Foxes', 2, 2)`);
await come(LANI, `insert into partite (avversaria, set_nostri, set_loro, in_campo) values ('Foxes', 3, 1, false)`);
verifica('partita: Lani la segna da approvare', (await val(null, `select count(*)::int from partite where approvata_il is null and not in_campo`)) === 1);
await come(LANI, `update partite set approvata_il = now(), set_loro = 0`);
verifica('partita: Lani non la approva né la corregge', (await val(null, `select approvata_il is null and set_loro = 1 from partite`)) === true);
await come(PAPA, `update partite set approvata_il = now(), approvata_da = '${LANI}'`);
verifica('partita: approvata dal genitore, la firma la mette il server', (await val(null, `select approvata_da::text from partite`)) === PAPA);
await come(LANI, `delete from partite`);
verifica('partita: Lani non la cancella', (await val(null, `select count(*)::int from partite`)) === 1);
await come(null, `delete from partite`);
// menu dei dieci minuti (sprint 2): lo legge Lani, lo cambiano i genitori
verifica('menu dei dieci minuti: Lani lo legge', (await come(LANI, 'select * from esercizi_dieci_minuti')).rows.length === 5);
await fallisce('menu dei dieci minuti: Lani non lo cambia', LANI, `insert into esercizi_dieci_minuti (nome, tipo) values ('Corda', 'recupero')`);
await come(PAPA, `insert into esercizi_dieci_minuti (nome, tipo) values ('Corda', 'recupero')`);
verifica('menu dei dieci minuti: il genitore aggiunge', (await val(null, `select count(*)::int from esercizi_dieci_minuti`)) === 6);
await fallisce('menu dei dieci minuti: tipo sconosciuto', PAPA, `insert into esercizi_dieci_minuti (nome, tipo) values ('Salti', 'salti')`);
await come(PAPA, `delete from esercizi_dieci_minuti where nome = 'Corda'`);
verifica('menu dei dieci minuti: il genitore toglie', (await val(null, `select count(*)::int from esercizi_dieci_minuti`)) === 5);

// dieci minuti a carte (0072): la ruota la fissa il server, una carta al giorno, mazzo della settimana
const carta1 = await val(LANI, 'select gira_ruota()');
verifica('ruota: dà una carta da 1 a 7', carta1 >= 1 && carta1 <= 7);
verifica('ruota: rigirata dà la stessa carta', (await val(LANI, 'select gira_ruota()')) === carta1);
verifica('ruota: una riga sola per oggi', (await val(null, 'select count(*)::int from carte_del_giorno')) === 1);
await come(LANI, `update carte_del_giorno set carta = case when carta = 1 then 2 else 1 end where data = oggi()`);
verifica('ruota: Lani non cambia la carta', (await val(null, 'select carta from carte_del_giorno')) === carta1);
await fallisce('ruota: Lani non scrive righe', LANI, `insert into carte_del_giorno (data, carta) values (oggi() + 1, 2)`);
await fallisce('ruota: anon no', null, 'select gira_ruota()', 'anon');
// sei giorni già girati da lunedì: resta una sola carta nel mazzo
await come(null, 'delete from carte_del_giorno');
await come(null, `insert into carte_del_giorno (data, carta) select oggi() - g, g from generate_series(1, extract(isodow from oggi())::int - 1) g`);
const giaUscite = (await come(null, 'select carta from carte_del_giorno')).rows.map((r) => r.carta);
const nuova = await val(LANI, 'select gira_ruota()');
verifica('ruota: non ripete una carta uscita da lunedì', !giaUscite.includes(nuova));
verifica('record: Lani lo segna', (await val(LANI, `select segna_record(12, 'Squat in 30 secondi')`)) === true);
verifica('record: salvato sulla riga di oggi', (await val(null, 'select record from carte_del_giorno where data = oggi()')) === 12);
await fallisce('record: fuori misura', LANI, `select segna_record(5000, 'Squat')`);
await come(null, 'delete from carte_del_giorno');
verifica('record: senza ruota girata non si segna', (await val(LANI, `select segna_record(3, 'Squat')`)) === false);
// giorni di allenamento o partita (0073): niente carte pesanti; la prova si fa "di domenica"
const oggiVero = await val(null, `select pg_get_functiondef('public.oggi()'::regprocedure)`);
await come(null, `create or replace function public.oggi() returns date language sql stable as $$ select date '2027-01-17' $$`);
const campo = async (titolo) => {
  await come(null, 'delete from impegni_famiglia');
  await come(null, `insert into impegni_famiglia (id, inizio, titolo) values ('x', '2027-01-17T18:30:00+01:00', '${titolo}')`);
};
const giri = async () => {
  const uscite = new Set();
  for (let i = 0; i < 40; i++) {
    await come(null, `delete from carte_del_giorno where data = oggi()`);
    uscite.add(await val(LANI, 'select gira_ruota()'));
  }
  return [...uscite].sort();
};
await come(null, 'delete from carte_del_giorno');
await campo('Allenamento Pallavolo Leilani U-13');
verifica('campo: con l\'allenamento solo carte leggere', (await giri()).every((c) => [3, 4, 6, 7].includes(c)));
await campo('Partita Lani: FOXES vs U14R-EVOLUTION');
verifica('campo: con la partita solo carte leggere', (await giri()).every((c) => [3, 4, 6, 7].includes(c)));
await campo('[LANI ASSENTE] Partita U13: X vs Y');
verifica('campo: se Lani è assente tornano le pesanti', (await giri()).some((c) => [1, 2, 5].includes(c)));
await campo('Tennis Leonardo');
verifica('campo: gli impegni di famiglia non contano', (await giri()).some((c) => [1, 2, 5].includes(c)));
await come(null, 'delete from carte_del_giorno');
await come(null, `insert into carte_del_giorno (data, carta) values ('2027-01-11', 3), ('2027-01-12', 4), ('2027-01-13', 6), ('2027-01-14', 7)`);
await campo('Allenamento Lani');
verifica('campo: restano solo pesanti, una Calma in più', (await val(LANI, 'select gira_ruota()')) === 7);
await come(null, 'delete from impegni_famiglia');
await come(null, 'delete from carte_del_giorno');
await come(null, oggiVero);
// annuncio di R-Evolution (0034): l'accensione del genitore accoda il popup, una volta per giorno
await come(PAPA, `insert into impostazioni (chiave, valore) values ('r_evolution_da', '"2026-11-23"')`);
await come(PAPA, `delete from impostazioni where chiave = 'r_evolution_da'`);
await come(PAPA, `insert into impostazioni (chiave, valore) values ('r_evolution_da', '"2026-11-23"')`);
verifica('R-Evolution accesa: un solo annuncio per Lani', (await val(LANI, `select count(*)::int from popup_coda where chiave = 'r_evolution:2026-11-23' and situazione = 'r_evolution_accesa'`)) === 1);
await fallisce('R-Evolution: Lani non chiama il trigger', LANI, `select annuncia_r_evolution()`);
await come(null, `delete from impostazioni where chiave = 'r_evolution_da'`);
await come(null, `delete from popup_coda where chiave = 'r_evolution:2026-11-23'`);

await come(LANI, `insert into flashcard_giri (iniziato_il, fatto_il, carte, sapevo, quasi, non_sapevo) values (now() - interval '2 minutes', '2020-01-01', 10, 5, 3, 2)`);
verifica('giro di flash card: fine con l\'ora del server', (await val(null, `select fatto_il > now() - interval '1 minute' from flashcard_giri`)) === true);
await fallisce('giro di flash card senza inizio rifiutato', LANI, `insert into flashcard_giri (carte, sapevo, quasi, non_sapevo) values (10, 5, 3, 2)`);
await come(null, `update compiti set fatto_il = '2026-11-20'`);
verifica('il server può scrivere una data qualsiasi', (await val(null, 'select fatto_il::date::text from compiti')) === '2026-11-20');
await fallisce('Lani non cambia la scadenza', LANI, `update compiti set scadenza = '2027-01-01'`);
await fallisce('Lani non scrive passi', LANI, `insert into movimenti_passi (motivo, riferimento, passi) values ('x', 'y', 100)`);
await fallisce('Lani non chiama registra_passi', LANI, `select registra_passi('x', 'y', 100)`);
await fallisce('Lani non scrive voti', LANI, `insert into voti (data, voto) values (now(), 10)`);
await fallisce('Lani non apre forzieri dalla vista', LANI, `update forzieri_lani set stato = 'aperto'`);
await come(LANI, `update forzieri set stato = 'aperto' where n = 1`).catch(() => {});
verifica('Lani non apre forzieri dalla tabella', (await val(null, 'select stato from forzieri where n = 1')) === 'enigma');
await fallisce('Lani non storna', LANI, `select storna_spunta('compito', 'x')`);
await come(LANI, `insert into quiz_tentativi (quiz_id, numero, giuste, totale) values ('${QUIZ}', 1, 9, 10)`);
await come(LANI, `insert into quiz_tentativi (quiz_id, numero, giuste, totale) values ('${QUIZ}', 1, 9, 10)`);
verifica('il numero del tentativo lo decide il server', (await val(null, 'select max(numero) from quiz_tentativi')) === 2);
await come(LANI, `insert into umore (faccia) values ('contenta')`);
await come(LANI, `update umore set faccia = 'broncio'`);
verifica('Lani cambia la faccia di oggi', (await val(null, 'select faccia from umore')) === 'broncio');
await fallisce('anon non legge il saldo', null, 'select * from saldo_passi', 'anon');
// saldo visto (passi che salgono)
await come(null, `insert into movimenti_passi (motivo, riferimento, passi) values ('prova_saldo', 'a', 40)`);
const visto = async () => (await come(LANI, 'select prima, adesso from vedi_saldo()')).rows[0];
const v1 = await visto();
verifica('saldo visto: la prima volta prima = adesso', v1.prima === v1.adesso);
await come(null, `insert into movimenti_passi (motivo, riferimento, passi) values ('prova_saldo', 'b', 12)`);
const v2 = await visto();
verifica('saldo visto: dal vecchio al nuovo', v2.prima === v1.adesso && v2.adesso === v1.adesso + 12);
const v3 = await visto();
verifica('saldo visto: la volta dopo è fermo', v3.prima === v3.adesso && v3.adesso === v2.adesso);
await fallisce('Lani non scrive il saldo visto', LANI, `update saldo_visto set passi = 0`);
await fallisce('Lani non inserisce il saldo visto', LANI, `insert into saldo_visto (profilo_id, passi) values ('${LANI}', 0)`);
verifica('il papà non vede il saldo visto di Lani', (await come(PAPA, 'select * from saldo_visto')).rows.length === 0);
await fallisce('anon non chiama vedi_saldo', null, 'select * from vedi_saldo()', 'anon');
await come(null, `delete from movimenti_passi where motivo = 'prova_saldo'`);
await fallisce('anon non legge i forzieri', null, 'select * from forzieri_lani', 'anon');
// frase del giorno: una al giorno, stessa frase per lo stesso momento, niente per un altro
const frase = async (m) => (await come(LANI, `select testo, autore from frase_del_giorno('${m}')`)).rows;
const f1 = await frase('apertura');
verifica('frase del giorno: una per l\'apertura', f1.length === 1 && f1[0].testo.length > 0);
verifica('frase del giorno: stessa frase se si riapre', (await frase('apertura'))[0]?.testo === f1[0].testo);
verifica('frase del giorno: niente in un altro momento dello stesso giorno', (await frase('chiusura')).length === 0);
await come(null, `update frasi set ultima_volta = oggi() - 1, ultimo_momento = 'apertura' where ultima_volta = oggi()`);
verifica('frase del giorno: il giorno dopo un\'altra frase', (await frase('apertura'))[0]?.testo !== f1[0].testo);
await come(null, `update frasi set ultima_volta = oggi() - 10 where ultima_volta = oggi()`);
await come(null, `update frasi set ultima_volta = oggi() - 5 where momento = 'apertura' and ultima_volta is null`);
verifica('frase del giorno: mai la stessa prima di 30 giorni', (await frase('apertura')).length === 0);
await come(PAPA, `insert into frasi (testo, autore, di_famiglia) values ('Ogni giorno un pezzetto.', 'papà', true)`);
await come(null, `update frasi set ultima_volta = oggi() - 1 where ultima_volta = oggi()`);
verifica('frase del giorno: quelle di famiglia prima', (await frase('chiusura'))[0]?.testo === 'Ogni giorno un pezzetto.');
await fallisce('anon non chiama frase_del_giorno', null, `select * from frase_del_giorno('apertura')`, 'anon');
await come(null, `delete from frasi where di_famiglia`);
await come(null, `update frasi set ultima_volta = null, ultimo_momento = null where ultima_volta is not null`);

// enigmi a tipi: aiutino dopo il primo errore, premio fermo quando l'enigma è comparso
// il genitore scrive il premio; enigma, soluzione e aiutino li scrive la funzione enigma (server)
await come(PAPA, `update forzieri set premio = 'Bici' where n = 3`);
verifica('premio di un forziere chiuso: si cambia', (await val(null, 'select premio from forzieri where n = 3')) === 'Bici');
await fallisce('il genitore non scrive l\'enigma a mano', PAPA, `update forzieri set enigma = 'Due ruote' where n = 3`);
await come(null, `update forzieri set enigma = 'Due ruote', soluzione = 'bici', aiutino = 'Ha i pedali.', parola = 'BICI' where n = 3`);
await come(null, `update forzieri set stato = 'enigma' where n = 3`);
verifica('aiutino nascosto prima del primo tentativo', (await val(LANI, 'select aiutino from forzieri_lani where n = 3')) === null);
await come(null, `update forzieri set tentativi_enigma = 1 where n = 3`);
verifica('aiutino visibile dopo il primo tentativo sbagliato', (await val(LANI, 'select aiutino from forzieri_lani where n = 3')) === 'Ha i pedali.');
await fallisce('premio fermo a enigma comparso (anche per il genitore)', PAPA, `update forzieri set premio = 'Altro' where n = 3`);
await fallisce('enigma fermo a enigma comparso (anche per il server)', null, `update forzieri set enigma = 'nuovo' where n = 3`);

// immagini dei premi: bucket privato senza regole per i client
await come(null, `insert into storage.objects (bucket_id, name) values ('premi', '1/premio-1.webp'), ('premi', '1/premio-1-sagoma.webp')`);
verifica('il bucket premi è privato', (await val(null, `select public from storage.buckets where id = 'premi'`)) === false);
verifica('Lani non vede nessun file dei premi, neanche la sagoma', (await come(LANI, `select name from storage.objects where bucket_id = 'premi'`)).rows.length === 0);
verifica('neanche un genitore li legge direttamente (passa dalla funzione)', (await come(PAPA, `select name from storage.objects where bucket_id = 'premi'`)).rows.length === 0);
verifica('anon non vede i file dei premi', await come(null, `select name from storage.objects where bucket_id = 'premi'`, 'anon').then((r) => r.rows.length === 0, () => true));
verifica('Lani non legge immagine_per né la tabella forzieri', (await come(LANI, 'select immagine_per from forzieri')).rows.length === 0);
await fallisce('Lani non carica file nel bucket premi', LANI, `insert into storage.objects (bucket_id, name) values ('premi', 'x.webp')`);

// richieste di foto: una per compito
await come(null, `insert into richieste_foto (motivo, pagine, compito_id) values ('compito', '40', '${COMPITO}')`);
await fallisce('una sola richiesta di foto per compito', null, `insert into richieste_foto (motivo, pagine, compito_id) values ('compito', '41', '${COMPITO}')`);
const RICH = await val(null, 'select id from richieste_foto limit 1');
// attacchi: la riga di una foto senza il file, con il file di un altro, fuori dalla cartella
await fallisce('Lani non registra una foto senza il file', LANI, `insert into foto_pagine (richiesta_id, pagine, percorso_storage) values ('${RICH}', '40', '${RICH}/finta.jpg')`);
await come(PAPA, `insert into storage.objects (bucket_id, name) values ('foto-pagine', '${RICH}/papa.jpg')`);
await fallisce('Lani non registra come sua la foto di un genitore', LANI, `insert into foto_pagine (richiesta_id, pagine, percorso_storage) values ('${RICH}', '40', '${RICH}/papa.jpg')`);
await fallisce('Lani non carica fuori dalla cartella di una richiesta', LANI, `insert into storage.objects (bucket_id, name) values ('foto-pagine', 'altro/1.jpg')`);
await fallisce('Lani non carica nella cartella di una richiesta inventata', LANI, `insert into storage.objects (bucket_id, name) values ('foto-pagine', '${COMPITO}/1.jpg')`);
await fallisce('Lani non mette in conto la foto a un altro', LANI, `insert into foto_pagine (richiesta_id, pagine, percorso_storage, caricata_da) values ('${RICH}', '40', '${RICH}/papa.jpg', '${PAPA}')`);
verifica('foto-pagine: solo immagini fino a 10 MB', (await val(null, `select file_size_limit = 10485760 and 'image/jpeg' = any(allowed_mime_types) and not 'text/html' = any(allowed_mime_types) from storage.buckets where id = 'foto-pagine'`)) === true);
// il flusso vero dell'app: prima il file nella cartella della richiesta, poi la riga
await come(LANI, `insert into storage.objects (bucket_id, name) values ('foto-pagine', '${RICH}/1.jpg')`);
await come(LANI, `insert into foto_pagine (richiesta_id, pagine, percorso_storage) values ('${RICH}', '40', '${RICH}/1.jpg')`);
verifica('Lani carica una foto a suo nome', (await val(null, 'select caricata_da from foto_pagine')) === LANI);
await come(null, `update richieste_foto set stato = 'fatta' where id = '${RICH}'`);
await fallisce('a richiesta chiusa non si carica più', LANI, `insert into storage.objects (bucket_id, name) values ('foto-pagine', '${RICH}/2.jpg')`);
await come(null, `update richieste_foto set stato = 'aperta' where id = '${RICH}'`);
await come(null, `delete from storage.objects where bucket_id = 'foto-pagine'`);
await come(LANI, `update richieste_foto set stato = 'fatta'`); // la RLS non lo lascia passare: zero righe
verifica('la richiesta resta aperta finché non la chiude il server', (await val(null, 'select stato from richieste_foto')) === 'aperta');
await come(null, `delete from foto_pagine`);
await come(null, `delete from richieste_foto where id = '${RICH}'`);

// Genitori, PIN
verifica('controlla_pin: nessun PIN impostato', (await val(PAPA, `select controlla_pin('2468')`)) === 'manca');
await come(PAPA, `select imposta_pin('2468')`);
verifica('controlla_pin: giusto', (await val(PAPA, `select controlla_pin('2468')`)) === 'ok');
verifica('controlla_pin: sbagliato', (await val(PAPA, `select controlla_pin('1111')`)) === 'sbagliato');
for (let i = 0; i < 3; i++) await come(PAPA, `select controlla_pin('0000')`);
verifica('controlla_pin: al quinto errore bloccato', (await val(PAPA, `select controlla_pin('0000')`)) === 'bloccato');
verifica('controlla_pin: bloccato anche col PIN giusto', (await val(PAPA, `select controlla_pin('2468')`)) === 'bloccato');
verifica('controlla_pin: Lani no', (await val(LANI, `select controlla_pin('2468')`)) === 'no');
await fallisce('anon non chiama controlla_pin', null, `select controlla_pin('2468')`, 'anon');
await come(null, `update pin_genitori set errori = 0, bloccato_fino = null where id`);
verifica('PIN giusto', (await val(PAPA, `select verifica_pin('2468')`)) === true);
verifica('PIN sbagliato', (await val(PAPA, `select verifica_pin('1111')`)) === false);
verifica('solo hash salvato', !(await val(null, 'select hash from pin_genitori')).includes('2468'));
for (let i = 0; i < 5; i++) await come(PAPA, `select verifica_pin('0000')`);
verifica('dopo 5 errori blocco anche col PIN giusto', (await val(PAPA, `select verifica_pin('2468')`)) === false);
verifica('Lani: verifica_pin sempre false', (await val(LANI, `select verifica_pin('2468')`)) === false);
verifica('il genitore legge il premio', (await val(PAPA, 'select premio from forzieri where n = 1')) === 'Pizza');

// Passi e storno (server)
await come(null, `select registra_passi('compito', '${COMPITO}', 13, 1.25)`);
verifica('idempotente', (await val(null, `select registra_passi('compito', '${COMPITO}', 13, 1.25)`)) === null);
verifica('saldo 16', (await val(null, 'select passi from saldo_passi')) === 16);
verifica('genitore storna', (await val(PAPA, `select storna_spunta('compito', '${COMPITO}')`)) === true);
verifica('storno esatto: saldo 0', (await val(null, 'select passi from saldo_passi')) === 0);
verifica('storno una volta sola', (await val(PAPA, `select storna_spunta('compito', '${COMPITO}')`)) === false);
verifica('storno firmato dal genitore', (await val(null, `select dato_da from movimenti_passi where motivo = 'storno'`)) === PAPA);
await come(null, `select registra_passi('cartella', 'serata:2026-11-23', 5, 1, '2026-11-23')`);
await come(null, `insert into settimane (inizio, chiavi) values ('2026-11-23', 2)`);
verifica('dopo le chiavi niente storno', (await val(PAPA, `select storna_spunta('cartella', 'serata:2026-11-23')`)) === false);
await come(null, `select registra_passi('bagno', 'sgridata:1', -20)`);
verifica('il saldo non scende sotto zero', (await val(null, 'select passi from saldo_passi')) === 0);

// ---------------------------------------------------------------- matrice di attacco (filone A)
// Per ogni tabella e vista: chi può inserire, chi cancella, cosa vede anon. Una tabella nuova
// senza regole entra da sola nella prova; un permesso nuovo va aggiunto qui, di proposito.
const tabelle = (await come(null, `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r', 'v') order by 1`)).rows.map((r) => r.relname);
// RLS: il controllo della riga viene prima dei vincoli, quindi "insert default values" dice se è permesso (42501 = no)
const inserisce = async (uid, t, ruolo) => {
  try {
    await come(uid, `insert into ${t} default values`, ruolo);
    return true;
  } catch (e) {
    return e.code !== '42501' && !/row-level security|permission denied|cannot insert into view|Lani non/.test(e.message);
  }
};
// foto_pagine e serate: Lani inserisce solo a condizioni (file vero, data vicina), provate sopra e sotto
// partite: Lani solo da approvare, provato sopra
const LANI_INSERISCE = ['errori_client', 'flashcard_giri', 'mate_tentativi', 'partite', 'piano_voci', 'push_iscrizioni', 'quiz_tentativi', 'ripassi_carte', 'umore', 'video_visti'];
const GENITORE_INSERISCE = [...LANI_INSERISCE, 'assenze', 'foto_pagine', 'serate', 'compiti', 'esercizi_dieci_minuti', 'fogli_firma', 'forzieri', 'frasi', 'gesti_casa', 'impostazioni', 'sgridate'];
for (const t of tabelle) {
  verifica(`anon non inserisce in ${t}`, !(await inserisce(null, t, 'anon')));
  verifica(`anon non legge ${t}`, await come(null, `select * from ${t}`, 'anon').then((r) => r.rows.length === 0, () => true));
  const lani = await inserisce(LANI, t);
  verifica(`Lani ${LANI_INSERISCE.includes(t) ? '' : 'non '}inserisce in ${t}`, lani === LANI_INSERISCE.includes(t));
  // le tabelle del server si leggono e basta, anche per un genitore
  if (!GENITORE_INSERISCE.includes(t)) verifica(`un genitore non inserisce in ${t}`, !(await inserisce(PAPA, t)));
}
// nessuna regola fa cancellare o aggiornare a tutti: o il genitore, o il proprio (push), o Lani con le colonne contate
const larghe = (await come(null, `select tablename || ' ' || cmd || ' ' || policyname p from pg_policies where schemaname = 'public' and cmd in ('DELETE', 'ALL') and coalesce(qual, '') not like '%e_genitore()%' and policyname <> 'proprie'`)).rows;
verifica('nessuna regola di cancellazione oltre ai genitori', larghe.length === 0 || (console.log(larghe), false));
// funzioni chiamabili da un utente: solo queste (registra_passi, tenta_enigma... solo dal server)
const FUNZIONI = ['controlla_pin', 'correggi_partita', 'e_famiglia', 'e_genitore', 'frase_del_giorno', 'gira_ruota', 'imposta_pin', 'oggi', 'rispondi_partita', 'segna_record', 'segna_tipo_verifica', 'sposta_verifica', 'storna_spunta', 'vedi_saldo', 'verifica_pin'];
const chiamabili = (await come(null, `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prorettype <> 'trigger'::regtype and has_function_privilege('authenticated', p.oid, 'execute') order by 1`)).rows.map((r) => r.proname);
verifica('funzioni chiamabili da Lani e genitori: solo quelle previste', JSON.stringify(chiamabili) === JSON.stringify(FUNZIONI) || (console.log(chiamabili), false));
const perAnon = (await come(null, `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prorettype <> 'trigger'::regtype and has_function_privilege('anon', p.oid, 'execute')`)).rows;
verifica('anon non chiama nessuna funzione', perAnon.length === 0 || (console.log(perAnon), false));

// attacchi mirati del piano
await fallisce('Lani non scrive chiavi', LANI, `insert into settimane (inizio, chiavi) values ('2026-11-30', 3)`);
await fallisce('Lani non scrive note', LANI, `insert into note (data, tipo, testo) values (now(), 'merito', 'x')`);
await fallisce('Lani non si regala figurine', LANI, `insert into figurine (posa) values ('lani-cima')`);
await fallisce('Lani non si mette popup', LANI, `insert into popup_coda (situazione, titolo, testo) values ('x', 'x', 'x')`);
verifica('Lani non legge le frasi di famiglia', (await come(LANI, 'select * from frasi')).rows.length === 0);
const colonneLani = (await come(null, `select column_name from information_schema.columns where table_name = 'forzieri_lani'`)).rows.map((r) => r.column_name);
verifica('la vista di Lani non ha soluzione, parola chiave né immagine', !colonneLani.some((c) => ['soluzione', 'parola', 'immagine_per'].includes(c)));
await fallisce('Lani non cambia lo stato del forziere da una funzione', LANI, `select tenta_enigma(1, 99)`);
for (const s of [`insert into fogli_firma (titolo) values ('Gita')`, `insert into popup_coda (situazione, priorita, posa, titolo, testo) values ('prova', 1, 'lani-saluta', 'Ciao', 'Ciao')`, `insert into flashcard (argomento, fronte, retro) values ('Somme', '2+2', '4')`]) await come(null, s);
await fallisce('Lani non cambia il testo di un compito', LANI, `update compiti set testo = 'niente'`);
await fallisce('Lani non si segna il foglio consegnato', LANI, `update fogli_firma set consegnato_il = now()`);
await fallisce('Lani non cambia il testo di un popup', LANI, `update popup_coda set testo = 'x'`);
await fallisce('Lani non cambia le domande di una flash card', LANI, `update flashcard set fronte = 'x'`);
// 0070: la carta segnalata sbagliata da Lani resta fuori dal giro
await come(LANI, `update flashcard set segnalata_sbagliata = true`);
await come(LANI, `update flashcard set segnalata_sbagliata = false, prossima_revisione = oggi(), intervallo_giorni = 1`);
verifica('Lani non rimette in giro una carta segnalata sbagliata', (await val(null, `select segnalata_sbagliata from flashcard where fronte = '2+2'`)) === true);
await come(PAPA, `update flashcard set segnalata_sbagliata = false`);
verifica('un genitore rimette in giro una carta segnalata', (await val(null, `select segnalata_sbagliata from flashcard where fronte = '2+2'`)) === false);
await come(LANI, `insert into serate (data) values (oggi() + 5)`).catch(() => {});
verifica('Lani non apre serate lontane da oggi', (await val(null, `select count(*)::int from serate where data = oggi() + 5`)) === 0);
await come(LANI, `insert into umore (data, faccia) values (oggi() - 1, 'contenta')`).catch(() => {});
verifica('Lani non cambia l\'umore di ieri', (await val(null, `select count(*)::int from umore where data = oggi() - 1`)) === 0);
await fallisce('Lani non si iscrive alle notifiche a nome del papà', LANI, `insert into push_iscrizioni (profilo_id, endpoint, chiavi) values ('${PAPA}', 'x', '{}')`);
// enigma: il server conta i tentativi in modo atomico; il quarto non passa anche se arriva insieme agli altri
await come(null, `update forzieri set stato = 'enigma', tentativi_enigma = 0 where n = 4`);
const tentativi = [];
for (let i = 0; i < 5; i++) tentativi.push(await val(null, `select tenta_enigma(4, 3)`));
verifica('enigma: al massimo 3 tentativi, poi niente', JSON.stringify(tentativi) === JSON.stringify([1, 2, 3, null, null]));
// casella di studio: la stessa casella due volte non dà passi due volte
await come(null, `select registra_passi('flashcard', 'flashcard:2026-11-24:1', 5)`);
verifica('una casella di studio vale una volta sola', (await val(null, `select registra_passi('flashcard', 'flashcard:2026-11-24:1', 5)`)) === null);
await come(null, `delete from movimenti_passi where motivo = 'flashcard'`);
// errori dell'app (filone H): ognuno registra i suoi, leggono i genitori
await come(LANI, `insert into errori_client (dove, messaggio) values ('Oggi', 'Cannot read properties of undefined')`);
verifica('Lani registra un errore a suo nome', (await val(null, 'select profilo_id from errori_client')) === LANI);
verifica('Lani non legge gli errori', (await come(LANI, 'select * from errori_client')).rows.length === 0);
verifica('il genitore legge gli errori', (await come(PAPA, 'select * from errori_client')).rows.length === 1);
await fallisce('Lani non registra errori a nome del papà', LANI, `insert into errori_client (profilo_id, messaggio) values ('${PAPA}', 'x')`);
await fallisce('Lani non si spaccia per una funzione del server', LANI, `insert into errori_client (origine, messaggio) values ('funzione', 'x')`);
await fallisce('messaggio di errore lungo: rifiutato', LANI, `insert into errori_client (messaggio) values (repeat('x', 501))`);
await come(LANI, 'delete from errori_client where true').catch(() => {});
verifica('Lani non cancella gli errori', (await val(null, 'select count(*)::int from errori_client')) === 1);
// notifiche: una per tipo e giorno, anche se il cron gira due volte
await come(null, `insert into notifiche_inviate (giorno, tipo, testo) values ('2026-11-24', 'mattina', 'x')`);
await fallisce('la stessa notifica non parte due volte nello stesso giorno', null, `insert into notifiche_inviate (giorno, tipo, testo) values ('2026-11-24', 'mattina', 'y')`);
// genitore: niente movimenti, chiavi, voti a mano; forzieri solo premio e consegna
await fallisce('un genitore non scrive passi a mano', PAPA, `insert into movimenti_passi (motivo, riferimento, passi) values ('x', 'y', 100)`);
await fallisce('un genitore non chiama registra_passi', PAPA, `select registra_passi('x', 'y', 100)`);
await fallisce('un genitore non scrive chiavi a mano', PAPA, `insert into settimane (inizio, chiavi) values ('2026-12-07', 3)`);
await fallisce('un genitore non scrive voti a mano', PAPA, `insert into voti (data, voto) values (now(), 10)`);
await fallisce('un genitore non apre un forziere', PAPA, `update forzieri set stato = 'aperto' where n = 2`);
await fallisce('un genitore non azzera i tentativi dell\'enigma', PAPA, `update forzieri set tentativi_enigma = 0 where n = 3`);
await come(null, `update forzieri set stato = 'aperto' where n = 2`);
await come(PAPA, `update forzieri set stato = 'consegnato', consegnato_il = now() where n = 2`);
verifica('un genitore segna consegnato un forziere aperto', (await val(null, 'select stato from forzieri where n = 2')) === 'consegnato');
verifica('un genitore non legge l\'hash del PIN', (await come(PAPA, 'select * from pin_genitori')).rows.length === 0);

// assenze (0036): le segnano i genitori; date spostate che la sincronizzazione non riscrive
await fallisce('Lani non segna un\'assenza', LANI, `insert into assenze (giorno) values ('2026-11-24')`);
await come(PAPA, `insert into assenze (giorno) values ('2026-11-24')`);
verifica('Lani legge le assenze', (await come(LANI, 'select * from assenze')).rows.length === 1);
await come(null, `insert into verifiche (nuvola_id, tipo, data) values ('v-assenza', 'verifica', '2026-11-24')`);
const VERIFICA = await val(null, `select id from verifiche where nuvola_id = 'v-assenza'`);
await come(null, `insert into sessioni_ripasso (verifica_id, numero, data_prevista, tipo) values ('${VERIFICA}', 1, '2026-11-23', 'quiz')`);
await fallisce('Lani non cambia il tipo di una prova', LANI, `select segna_tipo_verifica('${VERIFICA}', 'interrogazione')`);
await fallisce('Lani non sposta una verifica', LANI, `select sposta_verifica('${VERIFICA}', '2026-12-01')`);
await come(PAPA, `select sposta_verifica('${VERIFICA}', '2026-11-30', true)`);
await come(null, `update verifiche set data = '2026-11-24' where id = '${VERIFICA}'`);
verifica('la sincronizzazione non riporta indietro una verifica spostata', (await val(null, `select data::text from verifiche where id = '${VERIFICA}'`)) === '2026-11-30');
verifica('spostata: via le sessioni non fatte', (await val(null, `select count(*)::int from sessioni_ripasso where verifica_id = '${VERIFICA}'`)) === 0);
await come(null, `update compiti set scadenza_spostata = '2026-11-27' where id = '${COMPITO}'`);
await come(null, `update compiti set scadenza = '2026-11-24' where id = '${COMPITO}'`);
verifica('la sincronizzazione non riporta indietro un compito spostato', (await val(null, `select scadenza::text from compiti where id = '${COMPITO}'`)) === '2026-11-27');

// metacognizione (0050-0052): piano del giorno, voto previsto, micro-lezione
await come(LANI, `insert into piano_voci (voce, titolo, minuti_stimati, iniziata_il) values ('carte', 'Flash card', 10, '2020-01-01')`);
verifica('piano: inizio con l\'ora del server', (await val(null, `select iniziata_il > now() - interval '1 minute' from piano_voci`)) === true);
await fallisce('piano: la stima non cambia dopo l\'inizio', LANI, `update piano_voci set minuti_stimati = 30 where voce = 'carte'`);
await fallisce('piano: Lani non cambia il titolo', LANI, `update piano_voci set titolo = 'x' where voce = 'carte'`);
await fallisce('piano: niente voce già finita', LANI, `insert into piano_voci (voce, titolo, minuti_stimati, iniziata_il, finita_il) values ('ripasso:x', 'Ripasso', 10, now(), now())`);
await come(LANI, `insert into piano_voci (giorno, voce, titolo, minuti_stimati) values (oggi() - 1, 'compito:ieri', 'Ieri', 10)`).catch(() => {});
verifica('piano: niente stime per un altro giorno', (await val(null, `select count(*)::int from piano_voci where voce = 'compito:ieri'`)) === 0);
await fallisce('piano: stima fuori misura', LANI, `insert into piano_voci (voce, titolo, minuti_stimati) values ('compito:lungo', 'Lungo', 500)`);
await come(LANI, `update piano_voci set finita_il = '2020-01-01' where voce = 'carte'`);
verifica('piano: fine con l\'ora del server', (await val(null, `select finita_il >= iniziata_il and finita_il > now() - interval '1 minute' from piano_voci where voce = 'carte'`)) === true);
await come(LANI, `delete from piano_voci`);
verifica('piano: Lani non cancella', (await val(null, `select count(*)::int from piano_voci`)) === 1);
await come(null, `insert into verifiche (nuvola_id, tipo, data) values ('v-prevista', 'verifica', oggi() + 3), ('v-oggi', 'verifica', oggi())`);
const PREVISTA = await val(null, `select id from verifiche where nuvola_id = 'v-prevista'`);
const DI_OGGI = await val(null, `select id from verifiche where nuvola_id = 'v-oggi'`);
await come(LANI, `insert into voti_previsti (verifica_id, voto, creato_il) values ('${PREVISTA}', 7.5, '2020-01-01')`);
verifica('voto previsto: Lani lo dice prima della verifica, ora del server', (await val(null, `select voto::text || (creato_il > now() - interval '1 minute') from voti_previsti`)) === '7.5true');
await come(LANI, `update voti_previsti set voto = 8 where verifica_id = '${PREVISTA}'`);
verifica('voto previsto: si cambia fino al giorno prima', (await val(null, `select voto::text from voti_previsti`)) === '8.0');
await fallisce('voto previsto: non il giorno della verifica', LANI, `insert into voti_previsti (verifica_id, voto) values ('${DI_OGGI}', 7)`);
await fallisce('voto previsto: solo mezzi voti', LANI, `update voti_previsti set voto = 7.3 where verifica_id = '${PREVISTA}'`);
await fallisce('voto previsto: non sotto il minimo', LANI, `update voti_previsti set voto = 1 where verifica_id = '${PREVISTA}'`);
await come(null, `update verifiche set data = oggi() where id = '${PREVISTA}'`);
await come(LANI, `update voti_previsti set voto = 6 where verifica_id = '${PREVISTA}'`);
verifica('voto previsto: fermo dal giorno della verifica', (await val(null, `select voto::text from voti_previsti`)) === '8.0');
await fallisce('Lani non scrive un voto vero', LANI, `insert into voti (materia_id, data, voto) values (null, oggi(), 10)`);
await come(LANI, `insert into micro_lezioni_lette (settimana, lezione, letta_il) values (date_trunc('week', oggi())::date, 'richiamo', '2020-01-01')`);
verifica('micro-lezione: letta, ora del server', (await val(null, `select letta_il > now() - interval '1 minute' from micro_lezioni_lette`)) === true);
await fallisce('micro-lezione: non per un\'altra settimana', LANI, `insert into micro_lezioni_lette (settimana, lezione) values (date_trunc('week', oggi())::date + 7, 'richiamo')`);
for (const t of ['piano_voci', 'voti_previsti', 'micro_lezioni_lette']) await come(null, `delete from ${t} where true`);
await come(null, `delete from verifiche where nuvola_id in ('v-prevista', 'v-oggi')`);
// tutor (0055): Lani non legge né scrive risposte salvate e storico; i genitori leggono, non scrivono
await come(null, `insert into tutor_aiuti (compito_id, testo_compito, spiegazione, indizi, risultati) values ('${COMPITO}', 'Es. 3 pag. 40', 'Esempio', '["a"]', '["3/4"]')`);
await come(null, `insert into tutor_richieste (profilo_id, tipo, compito_id, testo) values ('${LANI}', 'tentativo', '${COMPITO}', 'ho provato')`);
verifica('tutor: Lani non legge indizi e risultati salvati', (await come(LANI, 'select * from tutor_aiuti')).rows.length === 0);
verifica('tutor: Lani non legge lo storico', (await come(LANI, 'select * from tutor_richieste')).rows.length === 0);
await fallisce('tutor: Lani non scrive un tentativo da sola', LANI, `insert into tutor_richieste (profilo_id, tipo, testo) values ('${LANI}', 'tentativo', 'x')`);
await fallisce('tutor: Lani non scrive indizi', LANI, `insert into tutor_aiuti (compito_id, testo_compito, spiegazione) values ('${COMPITO}', 'x', 'y') on conflict do nothing`);
verifica('tutor: un genitore legge lo storico', (await come(PAPA, 'select * from tutor_richieste')).rows.length === 1);
await fallisce('tutor: un genitore non scrive nello storico', PAPA, `insert into tutor_richieste (profilo_id, tipo) values ('${PAPA}', 'spiegamelo')`);
await fallisce('tutor: niente tipi inventati', null, `insert into tutor_richieste (profilo_id, tipo) values ('${LANI}', 'voto')`);
// matematica (blocco F, 0060-0062): serie scritte dal server, Lani salva solo i suoi tentativi
const SERIE = '33333333-3333-3333-3333-333333333333';
await come(null, `insert into mate_serie (id, argomento, problemi) values ('${SERIE}', 'Frazioni', '[{"metodo":"a"}]')`);
verifica('Lani legge le serie di matematica', (await come(LANI, 'select * from mate_serie')).rows.length === 1);
await fallisce('Lani non scrive serie di matematica', LANI, `insert into mate_serie (argomento, problemi) values ('x', '[]')`);
await come(LANI, `update mate_serie set problemi = '[]' where id = '${SERIE}'`).catch(() => {});
verifica('Lani non cambia i problemi di una serie', (await val(null, `select jsonb_array_length(problemi) from mate_serie where id = '${SERIE}'`)) === 1);
await come(LANI, `insert into mate_tentativi (serie_id, numero, iniziato_il, fatto_il, problemi, tentati) values ('${SERIE}', 9, now() - interval '10 minutes', '2020-01-01', 8, 8)`);
await come(LANI, `insert into mate_tentativi (serie_id, iniziato_il, problemi, tentati) values ('${SERIE}', now() - interval '10 minutes', 8, 8)`);
verifica('serie di matematica: numero e ora di fine li decide il server', (await val(null, `select string_agg(numero::text, ',' order by numero) || ':' || bool_and(fatto_il > now() - interval '1 minute') from mate_tentativi`)) === '1,2:true');
await fallisce('serie di matematica: non più tentati che problemi', LANI, `insert into mate_tentativi (serie_id, iniziato_il, problemi, tentati) values ('${SERIE}', now() - interval '1 minute', 8, 9)`);
await fallisce('serie di matematica: inizio nel futuro rifiutato', LANI, `insert into mate_tentativi (serie_id, iniziato_il, problemi, tentati) values ('${SERIE}', now() + interval '1 hour', 8, 8)`);
await come(LANI, `update mate_tentativi set tentati = 0`).catch(() => {});
verifica('Lani non cambia una serie già fatta', (await val(null, `select min(tentati) from mate_tentativi`)) === 8);
await come(null, `select registra_passi('compito', 'cm1', 4, 1, '2026-11-18'), registra_passi('matematica', 'matematica:2026-11-18:1', 5, 1, '2026-11-18'), registra_passi('matematica', 'matematica:2026-11-17:1', 5, 1, '2026-11-17')`);
await come(PAPA, `select storna_spunta('compito', 'cm1')`);
verifica('storno di un compito: via i passi di matematica di quel giorno, non degli altri', (await val(null, `select string_agg(riferimento || '=' || passi, ',' order by riferimento) from movimenti_passi where motivo = 'storno' and (riferimento like '%cm1' or riferimento like 'matematica:%')`)) === 'compito:cm1=-4,matematica:matematica:2026-11-18:1=-5');

console.log(`\n${ok} ok, ${ko} no`);
process.exit(ko ? 1 : 0);
