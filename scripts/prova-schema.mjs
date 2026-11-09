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
const verifica = (nome, cond) => { cond ? ok++ : ko++; console.log(cond ? 'ok ' : 'NO ', nome); };
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
const LANI_INSERISCE = ['flashcard_giri', 'push_iscrizioni', 'quiz_tentativi', 'umore', 'video_visti'];
const GENITORE_INSERISCE = [...LANI_INSERISCE, 'foto_pagine', 'serate', 'compiti', 'fogli_firma', 'forzieri', 'frasi', 'gesti_casa', 'impostazioni', 'sgridate'];
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
const FUNZIONI = ['controlla_pin', 'e_famiglia', 'e_genitore', 'frase_del_giorno', 'imposta_pin', 'oggi', 'storna_spunta', 'vedi_saldo', 'verifica_pin'];
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

console.log(`\n${ok} ok, ${ko} no`);
process.exit(ko ? 1 : 0);
