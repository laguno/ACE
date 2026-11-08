# HANDOFF

## Dove siamo

**Sprint 1 costruito**: tutte le 8 tappe unite a `main` (produzione su `ace-passino.vercel.app`). Manca solo la prova completa in famiglia sui dispositivi veri. Il gioco parte il 23/11/2026 (`periodo.inizio`): prima di allora niente passi di voti e note, popup, figurine né chiavi.

- Nuvola: `sync-nuvola` alle 14:30 e 19:30 (cron `0003`): compiti, verifiche, voti, note, lezioni; passi di voti e note dal 23/11.
- Calendario di famiglia: `sync-calendario` ogni ora (cron `0007`), 14 giorni, ricorrenze espanse, "privato" escluso.
- Oggi: mattina (tre cose, passi di ieri, In famiglia) e pomeriggio (compiti in ordine, il più lungo prima). Sera: compiti, cartella dall'orario + materiale del giorno, borsa dal calendario, fogli, Domani in famiglia. L'app si apre su Sera da un'ora prima della chiusura.
- Studio: `genera-studio` (lanciata da sync-nuvola) fa il piano di ripasso e, con Claude, 10-15 flash card e 8-10 domande per verifica (max 3 nuove a giro); Studio con sessioni, carte del giorno, quiz; lampadina "Non ho capito" (`spiega`). Video rimandati (manca l'elenco dei video).
- Astra: percorso con Sei qui, forzieri (stato aggiornato dal server dopo ogni passo: `_shared/forzieri.ts`), enigma (`enigma`: genera per i genitori, rispondi per Lani), chiavi della domenica 21:30 (`chiavi`, cron `0010`, con rimonta), Figurina e Album.
- Copione: popup accodati dal server (`_shared/popup.ts`, uno per evento) per voti, note, tappe, forzieri, chiavi, verifiche nuove; un popup per apertura; figurine sbloccate dalla prima comparsa; notifiche push ogni 15 minuti (`notifiche`, cron `0014`). Prima del 23/11 niente popup né figurine.
- Prima accensione: benvenuta di Lani (3 schermate, una volta per dispositivo) e avvio dei genitori (4 cose con lo stato vero).
- Genitori: settimana, gesti e sgridate (con popup del copione), premi ed enigmi, correzioni delle spunte, fogli, impostazioni e PIN.
- Prove: `npm test` (95), `npm run prova:schema` (35), `npm run prova:schermate` (Playwright, 24, Supabase finto).

## Ultima sessione (8 novembre 2026)

Tappe 1-8 in una giornata: Nuvola e calendario provati dal vivo, IA provata dal vivo (carte e quiz di grammatica, aritmetica, spagnolo); il resto con le prove automatiche (Playwright a 390 px con Supabase finto).

## Decisioni prese

| Data | Chi | Decisione |
|---|---|---|
| 7/11 | signore | Storno delle spunte corrette: movimento opposto esatto, non malus, solo prima delle chiavi della domenica; l'imbroglio voluto è la sgridata "balla −10" |
| 7/11 | signore | Compito rifatto dopo uno storno: 10 passi base senza anticipo, motivo `compito_rifatto`, una volta sola, prima delle chiavi |
| 7/11 | signore | Lani entra con la sua Gmail (`leilani.messori4@gmail.com`) e password lunga, sessione persistente, niente PIN |
| 7/11 | signore | Ogni genitore ha il suo account; un PIN condiviso (hash bcrypt) protegge l'area genitori sui dispositivi di Lani |
| 7/11 | signore | R-Evolution nascosta nello sprint 1 (barra a 4 voci); arriverà con un popup di annuncio |
| 7/11 | signore | Icona provvisoria: pallone su fucsia; alternative Lani che saluta e il passo, sceglie Lani alla prima prova |
| 7/11 | signore | Vercel: progetto `ace`, indirizzo `ace-passino.vercel.app`, `noindex`, anteprime sui push e produzione dal merge su `main`; protezione delle anteprime tolta (8/11) |
| 7/11 | signore | Fogli da firmare: Lani segna "L'ho dato" (`dato_il`), i passi arrivano con la conferma del genitore |
| 7/11 | signore | Config: `video_frazione_minima_vista` 0.95 (regola del 95% di Jarvis) |
| 7/11 | Jarvis | Schema `0001` approvato con correzione: ore delle spunte di Lani messe dal server (`timbra_ora`), `flashcard_giri.iniziato_il` |
| 8/11 | signore | Lani non prova l'app prima: sorpresa ad app finita. Le prove sui dispositivi le fanno i genitori |
| 8/11 | signore | Il lunedì Lani va a scuola con la borsa di pallavolo (pulmino Revolution da scuola) e la cartellina di tecnologia; niente "diario e astuccio" fisso |
| 8/11 | signore | Claude lavora da solo con prove automatiche; può pubblicare funzioni e applicare migrazioni (permesso aggiunto) |

## Scelte di Claude approvate (revisione di Jarvis, 8/11, approvata dal signore)

- Voti e note danno passi solo dal 23/11 (`periodo.inizio`); i voti di prima contano solo come "precedente".
- Verifica = evento di tipo VERIFICA/Compito in classe o con "verifica/interrogazione/prova" nel nome; materia dal nome o dal docente con una materia sola (2 su 16 restano senza materia). Voti: "7½" = 7,5, "+" e "−" = ±0,25; giudizi saltati.
- Borsa: la sera prima di un allenamento o partita di Lani (titolo con Lani/Leilani, senza "assente"); "la porti a scuola" se inizia prima delle 16 in un giorno di scuola. Voci fisse: divisa, ginocchiere, scarpe, borraccia.
- Chiusura: base dom 20:00, lun-gio 20:30 (`impostazioni.ora_chiusura`); venerdì e sabato niente, salvo partita il giorno dopo: chiusura breve con la sola borsa alle 20:30 (`ora_chiusura_breve`); con sport dopo le 17 si chiude mezz'ora prima. App su Sera da un'ora prima.
- Compiti in ordine di "peso" stimato dal testo (pagine ed esercizi negli intervalli).
- Spunte di Lani: "Annulla" per 5 secondi dopo ogni spunta (compiti, cartella, borsa, fogli), prima dell'invio; dopo, la correzione è dei genitori.
- Piano di ripasso: con 4+ giorni rilettura, flash card e mappa, quiz, quiz sugli errori; con 3 si toglie la mappa, con 2 rilettura e quiz, con 1 solo quiz; niente sessioni nei giorni di partita. Quiz breve della sera prima = domande sbagliate dell'ultimo tentativo (max 5).
- Astra: mondo dalla tappa (1-7 colline, 8-14 montagne, 15-21 nuvole, 22-27 spazio), non dal mese. Note che tolgono la seconda chiave: disciplinari e didattiche (non merito né altro). Obiettivo liceo 7,35 (`impostazioni.obiettivo_media`). Figurine dei forzieri: prima leo-tennis, leo-copertina, leo-dispiaciuto, leo-partita-persa, poi le altre non ancora sbloccate (no serie nera; detective, sorpresa, leo-gamer e bart-festeggia arrivano nel loro momento); la cima dà lani-cima. Serie nera = pose arrabbiate e dispettose. Tentativi dell'enigma (3) aggiunti a `config.enigma`.
- Copione: popup più vecchi di 3 giorni non si mostrano; variante "voto_7_senza_ripasso" e "verifica_nuova_una" (il copione ha solo la forma con {n}); nota di merito: "Nota di merito in {materia}: +50. Questa va sul frigo." (mamma-festeggia). Notifiche: 7:00, 14:45 se ci sono compiti nuovi per domani, all'ora della chiusura, sollecito 45 minuti dopo se mancano compiti o cartella, riepilogo ai genitori domenica 21:45.
- Revisione di Jarvis, fatto: studio facoltativo a caselle (`flashcard:AAAA-MM-GG:1..4`, niente quinta neanche con invii simultanei); enigma con tentativo atomico (`tenta_enigma`); voto corretto dal docente = movimento `voto_corretto` con la differenza (riferimento id del voto + nuovo valore); avviso push ai genitori alla prima sincronizzazione fallita di fila (Nuvola e calendario, `_shared/push.ts`); modelli: Sonnet 5.5 per genera-studio ed enigma, Opus 5.5 per spiega; pg_net nello schema extensions (0015). Obiettivo liceo 7,35. Protezione delle password trapelate: la accende il signore.
- Flash card: sapevo raddoppia l'intervallo, quasi torna domani, non sapevo riparte da 1; 12 carte del giorno a giro.

## Prossimo passo

1. Genitori: scegliere i 9 premi (area Genitori, Premi: ogni premio crea l'enigma), controllare orari e materiale nelle Impostazioni.
2. Prova completa in famiglia sui dispositivi veri, prima della sorpresa a Lani: installazione su iPhone/iPad, promemoria, spunte, studio, lampadina, enigma.
3. Dal 23/11: controllare i primi passi, popup e figurine; il 29/11 alle 21:30 le prime chiavi (`sync_log` fonte chiavi). Dopo due settimane: taratura (serve Python per `npm run simula`).

Debiti: "Da fotografare" (richieste di foto e Storage); riscatto della serie nera; frasi e citazioni da mostrare (32 caricate nella tabella `frasi` dalla migrazione 0017, fonte `data/frasi.json`; manca la scelta nei momenti: apertura, tappa, verifica, chiusura, una al giorno, mai la stessa prima di 30 giorni, mai nei rimproveri); "PIN non giusto" anche per errori del server; video; umore del giorno; `spiega`, borsa, enigma e push provati solo con le prove (serve un accesso di Lani); protezione delle password trapelate da accendere (Auth, dashboard: la accende il signore).

## In attesa di

- Signore: sull'iPad rifare l'accesso su `ace-passino.vercel.app` quando vorrà provare (le anteprime hanno un'altra origine).

## Attenzione

- Iscrizioni chiuse in Supabase Auth: i nuovi utenti si creano dalla dashboard, con "Auto Confirm User" attivo.
- Gli avvisi di Supabase su `forzieri_lani` (vista security definer) e sulle 5 funzioni RPC sono voluti: vedi i commenti nello schema.
- `db push` sempre con `--remote --yes`; funzioni con `npx supabase functions deploy <nome> --use-api --yes`. Comandi composti (con `&&` o `|`) passano dal controllo automatico: `git push` e i deploy vanno lanciati da soli.
- Schema `0001`-`0017` applicati: le modifiche vanno in `0018` e successive. Cron attivi: sync-nuvola, sync-calendario, chiavi, notifiche. Le migrazioni con "cron" nel nome non girano su PGlite.
- Segreti: `NUVOLA_UTENTE`, `NUVOLA_PASSWORD`, `CRON_SEGRETO` (anche nel Vault come `cron_segreto`), `GOOGLE_CALENDAR_ICS_URL`, `ANTHROPIC_API_KEY`, `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`. La chiave VAPID pubblica serve anche al client.
- Nuvola: `/alunni` dà più schede; si usa anno più recente e id più alto (10928). Compiti, voti e lezioni non hanno id: chiavi costruite in `src/lib/nuvola`.
- Supabase rifiuta UPDATE e DELETE senza WHERE anche dentro le funzioni (safeupdate); PGlite no.
- Dati di prova sul database vero: ripulirli sempre (oggi `movimenti_passi`, spunte e `serate` sono a zero).
- Python non è installato su questo PC: `npm run simula` non parte.

## Come verificare

- `npm test`, `npm run prova:schema`, `npm run prova:schermate`, `npx tsc -p .`, `npm run build`.
- Supabase: `sync_log` (esiti delle sincronizzazioni), `cron.job`, avvisi di sicurezza, `schema_migrations` allineata.
