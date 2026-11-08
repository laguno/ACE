# HANDOFF

## Dove siamo

Sprint 1. Tappe **1 (fondamenta)**, **2 (Nuvola)** e **3 (Oggi e Sera)** chiuse e unite a `main`. Il signore ha chiesto di andare avanti da solo fino a fine sprint (tappe 4-8), un branch e un merge per tappa.

- Nuvola: `sync-nuvola` alle 14:30 e 19:30 (cron `0003`): compiti, verifiche, voti, note, lezioni; passi di voti e note dal 23/11.
- Calendario di famiglia: `sync-calendario` ogni ora (cron `0007`), 14 giorni, ricorrenze espanse, "privato" escluso.
- Oggi: mattina (tre cose, passi di ieri, In famiglia) e pomeriggio (compiti in ordine, il più lungo prima). Sera: compiti, cartella dall'orario + materiale del giorno, borsa dal calendario, fogli, Domani in famiglia. L'app si apre su Sera da un'ora prima della chiusura.
- Prove: `npm test` (50), `npm run prova:schema` (35), `npm run prova:schermate` (Playwright, 9, Supabase finto).

## Ultima sessione (8 novembre 2026)

Tappa 1 provata sull'iPad e unita; tappa 2 (accesso Keycloak automatico, normalizzazione, cron, passi di voti e note); tappa 3 completa con prove Playwright a 390 px.

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

## Da confermare (scelte fatte da Claude, il signore può cambiarle)

- Voti e note danno passi solo dal 23/11 (`periodo.inizio`); i voti di prima contano solo come "precedente".
- Verifica = evento di tipo VERIFICA/Compito in classe o con "verifica/interrogazione/prova" nel nome; materia dal nome o dal docente con una materia sola (2 su 16 restano senza materia). Voti: "7½" = 7,5, "+" e "−" = ±0,25; giudizi saltati.
- Borsa: la sera prima di un allenamento o partita di Lani (titolo con Lani/Leilani, senza "assente"); "la porti a scuola" se inizia prima delle 16 in un giorno di scuola. Voci fisse: divisa, ginocchiere, scarpe, borraccia.
- Chiusura: base dom 20:00, lun-gio 20:30, ven-sab niente (`impostazioni.ora_chiusura`); con sport dopo le 17 si chiude mezz'ora prima. App su Sera da un'ora prima.
- Compiti in ordine di "peso" stimato dal testo (pagine ed esercizi negli intervalli).
- Spunte di Lani non si tolgono dall'app: la correzione è dei genitori.

## Prossimo passo

Tappa 4 (Studio): piano di ripasso per ogni verifica, flash card con 7 secondi, quiz, generazione IA (`ANTHROPIC_API_KEY` già nei segreti), video. Dal 23/11 controllare i primi passi di voti e note in `movimenti_passi`. Debiti: avviso ai genitori se una sincronizzazione fallisce (push, tappa 6); "PIN non giusto" anche per errori del server; passi della borsa provati solo con le prove, non dal vivo.

## In attesa di

- Signore: sull'iPad rifare l'accesso su `ace-passino.vercel.app` quando vorrà provare (le anteprime hanno un'altra origine).

## Attenzione

- Iscrizioni chiuse in Supabase Auth: i nuovi utenti si creano dalla dashboard, con "Auto Confirm User" attivo.
- Gli avvisi di Supabase su `forzieri_lani` (vista security definer) e sulle 5 funzioni RPC sono voluti: vedi i commenti nello schema.
- `db push` sempre con `--remote --yes`; funzioni con `npx supabase functions deploy <nome> --use-api --yes`. Comandi composti (con `&&` o `|`) passano dal controllo automatico: `git push` e i deploy vanno lanciati da soli.
- Schema `0001`-`0008` applicati: le modifiche vanno in `0009` e successive. Le migrazioni con "cron" nel nome non girano su PGlite.
- Segreti: `NUVOLA_UTENTE`, `NUVOLA_PASSWORD`, `CRON_SEGRETO` (anche nel Vault come `cron_segreto`), `GOOGLE_CALENDAR_ICS_URL`, `ANTHROPIC_API_KEY`, `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`. La chiave VAPID pubblica serve anche al client.
- Nuvola: `/alunni` dà più schede; si usa anno più recente e id più alto (10928). Compiti, voti e lezioni non hanno id: chiavi costruite in `src/lib/nuvola`.
- Supabase rifiuta UPDATE e DELETE senza WHERE anche dentro le funzioni (safeupdate); PGlite no.
- Dati di prova sul database vero: ripulirli sempre (oggi `movimenti_passi`, spunte e `serate` sono a zero).
- Python non è installato su questo PC: `npm run simula` non parte.

## Come verificare

- `npm test`, `npm run prova:schema`, `npm run prova:schermate`, `npx tsc -p .`, `npm run build`.
- Supabase: `sync_log` (esiti delle sincronizzazioni), `cron.job`, avvisi di sicurezza, `schema_migrations` allineata.
