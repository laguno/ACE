# HANDOFF

Storia delle sessioni, decisioni prese e scelte approvate: `docs/storico.md`.

## Tabellina dei passi (18/11, ramo `tabellina-prova`, worktree `C:\progetti\ace\app-tabellina`, non in produzione)

- Oggi di Lani e Oggi dei genitori: "Oggi hai preso Y passi su X disponibili", sotto "Guarda cosa manca" (da prendere, con il tocco che porta dove si fa; presi degli ultimi 7 giorni; ai genitori anche chi li ha dati). Edge Function nuova `tabellina` (sola lettura), regole in `src/lib/regole/tabellina.ts`. Fonti scelte dal signore: ogni giorno, studio in più, gesti di casa uno per uno, partita.
- Glossario (approvato il 18/11, docs/05): "Come si fanno i passi" con un'icona e una riga "cosa fare" per voce, gesti di casa uno per uno. La tabellina si legge con GET (la vetrina conta i POST come scritture). Per pubblicare: backup, `npx supabase functions deploy tabellina --use-api --yes`, poi unione su `main`.
- Ambiente di prova mai indietro rispetto a `main`: `npm run prova:allinea`, `rilascio:controlla`, controllo in `npm test` (runbook, "Ambiente di prova"). La riga in `scripts/prova-locale.ps1` c'è solo sul ramo `gioco-con-tabellina` (vedi sotto): `gioco` vero non l'ha ancora.
- Pubblicata il 18/11 alle 17:00: backup `ace-2026-11-18_16-59-49.sql` (fatto da `C:progettiaceapp`: il worktree non è collegato a Supabase), deploy `tabellina` con `--project-ref` (progetto ACE), `main` portato a `eca22c1` con avanzamento semplice. Vercel ha pubblicato `eca22c1`. **Non ancora controllati**: `sync_log`, Stato di ACE, il telefono di Lani (contatore, tocchi, layout 360-412 px).
- Due correzioni trovate provando in locale (la funzione non partiva in Deno, la tabella restava nascosta senza errori): `./index.ts` in `src/lib/regole/tabellina.ts` e `allowImportingTsExtensions` in `tsconfig.json`.
- Ambiente di prova: il ramo servito oggi è `gioco-con-tabellina` (worktree `C:progettiaceapp-tmp-merge`, non pushato): `gioco` (5d5645a) + `tabellina-prova` + `main`. `gioco` vero ha modifiche non salvate di un'altra sessione (App.tsx, stile.css, dati-finti-locale.sql): quando è pulito, `git merge --ff-only gioco-con-tabellina` lo porta avanti. Poi, dopo la prova, `gioco` riceve `main`.
- Worktree da togliere: `app-rilascio`, `app-tmp-merge` (dopo aver spento `npx supabase functions serve` e `prova:telefono`).

## Dove siamo (16/11 sera)

Il gioco è partito **lunedì 16/11/2026**: Lani usa ACE in produzione. `main` su `ace-passino.vercel.app`: sprint 1, sprint 2 (R-Evolution, **accesa dal 16/11**), **tema campo di R-Evolution** (16/11 alle 21:08, unione `49b087b`: granata della divisa, nastro "Ultim'ora", tabellone, emoji solo lì; bozza `design/REvolution.html`), assenze, "Come si fanno i passi", area genitori a quattro schede (Impeccable 34/40, obiettivo raggiunto), APK con FCM. Cron: `sync-nuvola` 14:30 e 19:30, `sync-calendario` ogni ora, `notifiche` ogni 15 minuti, `chiavi` domenica 21:30, `classifiche` 6:15, `partite` ogni mezz'ora il giorno della partita. Controlli del 16/11: partita spostata al 13/12 alle 9:00 letta dalla FIPAV; `sync-nuvola` delle 14:30 ok (4 s).

## Revisione dell'interfaccia (17/11 alle 9:50, unione `4650ef0`, in produzione)

- Ramo `revisione-ui-3`: testata compatta allo scorrere, "mancano N" accanto ai passi, un solo cerchio per spuntare, fatti in fondo in Pomeriggio, fucsia in Studio solo entro 2 giorni, "915 passi, 4 chiavi", vibrazione alla spunta, Sera scura, "Cambia sfondo" in Astra, "+N" solo dopo il primo gesto (`VALORE_DOPO_IL_GESTO` in `src/spunte.tsx`, si spegne lì), "Una cosa da dirle oggi" nell'Oggi dei genitori. Foto prima/dopo in `docs/confronto/` e `docs/confronto/prima/`.
- Prove sul ramo unito con `main`: `npm test` 323, `prova:schema` 298, Playwright 192 (axe compreso), build ok. Backup `ace-2026-11-17_09-44-44.sql`. `sync_log` dopo la pubblicazione: tutto ok.
- 17/11 alle 10:40 (`200025e`, backup `ace-2026-11-17_10-36-27.sql`): area genitori, "Una cosa da dirle oggi" e riga Serata leggono `cartella_il` come l'Oggi di Lani. `chiusa_il` non la scrive nessuno (0 serate su 2): prima la riga non compariva mai. Ramo `revisione-ui-3` chiuso.
- Da guardare sui telefoni veri: vibrazione, Sera scura a letto, testata compatta su Safari dell'iPad (senza supporto scorre via come prima).
- **Rifinitura (17/11 pomeriggio, ramo `rifinitura`, piano e esiti in `docs/11-piano-miglioramenti.md`)**: verifica axe 42/42, Lighthouse accessibilità 100; **avviso "Nuvola ferma"** ai genitori al secondo giro non ok di fila, una volta per serie (in produzione dalle 15:50, `1859ec8`, backup `ace-2026-11-17_15-46-36.sql`; `sync-nuvola` non avvisa più alla prima). **Sensi** (principio 4 di PRODUCT.md aggiornato e approvato): valori in `data/config-sensi.json`, codice in `src/sensi.ts`, suoni Kenney CC0 in `public/suoni/`, interruttore "Suoni su questo dispositivo" nelle Impostazioni. **Non ancora in produzione**: manca la prova sull'iPad vero e l'ok del signore. Prove: `npm test` 346, Playwright 205, build ok.
- Ramo `gioco` (`C:\progetti\ace\app-gioco`, anche su GitHub): motore a tempo, ACE Prova, schermata di prova (accesa nelle preview), plugin di orientamento e APK 1.3, ambiente di prova locale. `vercel.ts` tolto il 17/11 (Vercel rifiutava il deploy): resta `vercel.json`. Non unito a `main`; stato nel suo `HANDOFF.md`.

## R-Evolution rivista (17/11, ramo `revolution-fipav`, **in produzione alle 12:10**, unione `ef9fa29`)

- Richieste del signore dopo la prova sul telefono: barra (nome selezionato tagliato tra 380 e 409 px), partita doppia, coach, dieci minuti collegati a Oggi, risultato solo dalla FIPAV con popup in R-Evolution, niente approvazione dei genitori. Dettagli in `docs/08-sprint-2.md`, "Revisione del 17/11".
- Dati: tolta la riga doppia del 14/11 (backup `ace-2026-11-17_11-03-26.sql`, 0 passi coinvolti).
- Prove: `npm test` 333, `prova:schema` 298, Playwright 202 (31 saltate come sempre), `tsc` 0, build ok.
- 17/11 dopo: la FIPAV è l'unico calendario delle partite (righe `fipav:` in `impegni_famiglia`), pulsante "Assente" nel popup.
- Pubblicato il 17/11 alle 12:05-12:10 (backup `ace-2026-11-17_12-04-56.sql`): `classifiche` (lanciata a mano: ok, 9 partite `fipav:` negli impegni), `passi`, `sync-calendario` (ok, nessuna partita del calendario di casa rimasta), poi `main` su Vercel (stato success).
- Da guardare: la lettura delle 6:15 di domani (`sync_log` classifiche) e il primo "Com'è andata?" vero, sabato 21/11 (U14 alle 16:00).
- Testi del popup e del coach scelti dal signore il 17/11 (docs/05).
- 17/11 pomeriggio, dopo la prova su ACE Prova (Motorola edge 60, 412 px), commit `f389723`: barra sempre "R-Evo" (a 412 px il nome intero toccava la pillola); testata compatta che oltre 96 px tornava grande sopra le carte (il minificatore riscriveva `animation: linear both` in `animation: none`, rotta anche prima in produzione). Backup `ace-2026-11-17_14-33-34.sql`. Prove: `npm test` 333, Playwright 205, `tsc` 0. Il test e2e della testata gira sul server di sviluppo (non minificato): il CSS compilato va guardato a mano.
- ACE Prova: dati finti con la FIPAV (classifiche, gare, impegni `fipav:`, un "Com'è andata?" in attesa) in `scripts/dati-finti-locale.sql` del ramo `gioco`, non ancora nel commit. Dopo una build nuova, ACE Prova va chiusa del tutto e riaperta (sennò schermata bianca: la cache cerca file vecchi).

## APK di ACE (16/11, ramo `apk` in `C:\progetti\ace\app-apk`, unito a `main`)

- Guscio Capacitor (non TWA) con `server.url` di produzione, id `it.messori.ace`, solo verticale, barra di stato rosa dipinta da `MainActivity` (insets nativi: la pagina web non si tocca). Le modifiche web arrivano da sole; un APK nuovo serve solo per icone, permessi, plugin (versionCode più alto, stessa chiave, "Aggiorna").
- Notifiche: FCM HTTP v1 (JWT RS256 con WebCrypto, `supabase/functions/_shared/push.ts`) accanto a web-push; migrazione `0039_push_fcm` (tipo `web`/`fcm`). I limiti del copione restano in `manda()` di `notifiche`. FCM 404 cancella l'iscrizione, 400 no. Prova: `{"prova":"genitori"}` a `notifiche` (comando in `docs/runbook.md`).
- Nel guscio i genitori ricevono la richiesta del permesso all'accesso (App.tsx); Lani usa "Attiva i promemoria" in Oggi.
- **APK 1.2** (versionCode 3) firmato: `C:\progetti\ace\apk\ace-1.2.apk`. Icona piccola delle notifiche: due impronte (scelta del signore). Keystore `C:\progetti\ace\chiavi\ace-release.jks`, alias `ace`, password nel gestore del signore; backup e firma in `docs/runbook.md`.
- Motorola del genitore con la 1.2: sessione che resta, notifica FCM con ACE chiusa, tocco che apre ACE, icona delle impronte: ok.
- Prove: `npm test` 323 (2 saltate), `prova:schema` 298, `tsc` 0. Backup di oggi in `Documents\ACE-backup` (l'ultimo 15:56, 207 KB).

## Prossimo passo

0. **Sensi** (ramo `rifinitura`): il signore li prova sull'iPad e sul Samsung (suono dopo il rientro dal background, tasto silenzioso, vibrazione), poi backup, unione su `main` e pubblicazione fuori dalle finestre vietate. Restano da decidere: applauso (Kenney CC0 non ne ha), script `genitori-misure` da correggere (passo `04-partita` obsoleto), backup notturno (proposta nel documento 11).
1. **Stasera dopo le 21 o domani**: APK sul Samsung di Lani seguendo `docs/07-installazione.md` (Family Link, origini sconosciute acceso solo per installare, batteria senza restrizioni, ACE sempre consentita, Chrome limite normale) e la lista "Prova del guscio". Lì si prova anche il **flusso foto** (c'è solo nell'Oggi di Lani): permesso fotocamera, più scatti, galleria, "Ho finito". Poi notifica di prova: deve comparire una riga `fcm` di Lani in `push_iscrizioni`.
2. Tema campo: guardarlo sul Samsung e sull'iPad di Lani (emoji, nastro, sticker). Idee approvate dal signore, da fare: striscia delle ultime partite a pallini vinta/persa; sticker della testata che cambia posa dopo la partita (`lani-festeggia` se vinta, `lani-partita-persa` se persa).
3. Signore: spostare geografia e spagnolo; approvare la partita del 14/11 segnata da Lani (prima dell'inizio: 0 passi).
4. Signore: cancellare il JSON del service account FCM da Download (è già nel segreto `FCM_SERVICE_ACCOUNT`).
5. Area genitori a 34/40 (16/11, ramo `genitori-ux` unito): restano P3 di sola interfaccia in fondo a `docs/genitori-ux.md` (rosso su "mai sincronizzato", "0 su 0 serate", gergo); errore di `passi()` letto come "tetto pieno" in Dai passi (§8, punti 3-4: tocca la logica, chiedere).
6. Ambiente di prova `ace-prova` (secondo progetto Supabase, preview Vercel): lo crea il signore.
7. Domenica 22/11 alle 21:30 le prime chiavi (`sync_log` fonte chiavi). Debiti: assenze da Nuvola, protezione password trapelate, CSV passi a inizio dicembre (`npm run esporta:passi`).

## Attenzione

- Prova e2e "PNG enorme (6000×4000)" di `foto-file`: fallita una volta nel giro completo del 16/11 sera, da sola passa (carico della macchina). Se si ripete, guardarla.
- **Finestre senza pubblicazioni**: 14:20-14:45 e 19:45-21:00. Ogni pubblicazione: backup (`npm run backup`, serve Docker acceso), prove verdi, poi controllo di `sync_log` e Stato di ACE. Niente dati veri di Lani in chat, solo conteggi.
- Schema `0001`-`0039` e `20261115173113_libreria_risorse` applicati: la prossima migrazione è `0040`. `db push` vuole `--remote --yes --include-all`. Mai cambiare una migrazione applicata; quelle con "cron" non girano su PGlite.
- APK: `scripts\apk.ps1` (SDK `C:\progetti\ace\android-sdk`, JDK 21); la password del keystore la scrive il signore nel suo terminale, mai in chat. Dopo il pull di `main` serve `npm install`.
- Supabase rifiuta UPDATE e DELETE senza WHERE anche nelle funzioni (safeupdate). Avvisi su `forzieri_lani` e sulle RPC: voluti.
- `sync_log.esito`: `ok`, `errore`, `interrotta`. `richieste_foto.stato`: `aperta`, `fatta`, `scaduta`.
- Segreti: `NUVOLA_UTENTE`, `NUVOLA_PASSWORD`, `CRON_SEGRETO` (Vault `cron_segreto`), `GOOGLE_CALENDAR_ICS_URL`, `ANTHROPIC_API_KEY`, `VAPID_*`, `FCM_SERVICE_ACCOUNT`.
- I documenti con CRLF (`docs/05`, `docs/07`, ...): niente `sed -i` di Git Bash, usare script node o Edit.

## Come verificare

- `npm test`, `npm run prova:schema`, `npx playwright test`, `npx tsc -p .`, `npm run build`.
- Supabase: `sync_log` (righe senza `finito_il` = giro appeso), `cron.job`, `push_iscrizioni`, `net._http_response`, `schema_migrations` allineata.
