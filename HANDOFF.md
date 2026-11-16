# HANDOFF

Storia delle sessioni, decisioni prese e scelte approvate: `docs/storico.md`.

## Dove siamo (16/11 pomeriggio)

Il gioco è partito **lunedì 16/11/2026**: Lani usa ACE in produzione. `main` `831e037` su `ace-passino.vercel.app`: sprint 1, sprint 2 (R-Evolution), assenze, "Come si fanno i passi", area genitori a quattro schede (Impeccable 34/40, obiettivo raggiunto), APK con FCM. Cron: `sync-nuvola` 14:30 e 19:30, `sync-calendario` ogni ora, `notifiche` ogni 15 minuti, `chiavi` domenica 21:30, `classifiche` 6:15, `partite` ogni mezz'ora il giorno della partita. Controlli del 16/11: partita spostata al 13/12 alle 9:00 letta dalla FIPAV; `sync-nuvola` delle 14:30 ok (4 s).

## APK di ACE (16/11, ramo `apk` in `C:\progetti\ace\app-apk`, unito a `main`)

- Guscio Capacitor (non TWA) con `server.url` di produzione, id `it.messori.ace`, solo verticale, barra di stato rosa dipinta da `MainActivity` (insets nativi: la pagina web non si tocca). Le modifiche web arrivano da sole; un APK nuovo serve solo per icone, permessi, plugin (versionCode più alto, stessa chiave, "Aggiorna").
- Notifiche: FCM HTTP v1 (JWT RS256 con WebCrypto, `supabase/functions/_shared/push.ts`) accanto a web-push; migrazione `0039_push_fcm` (tipo `web`/`fcm`). I limiti del copione restano in `manda()` di `notifiche`. FCM 404 cancella l'iscrizione, 400 no. Prova: `{"prova":"genitori"}` a `notifiche` (comando in `docs/runbook.md`).
- Nel guscio i genitori ricevono la richiesta del permesso all'accesso (App.tsx); Lani usa "Attiva i promemoria" in Oggi.
- **APK 1.2** (versionCode 3) firmato: `C:\progetti\ace\apk\ace-1.2.apk`. Icona piccola delle notifiche: due impronte (scelta del signore). Keystore `C:\progetti\ace\chiavi\ace-release.jks`, alias `ace`, password nel gestore del signore; backup e firma in `docs/runbook.md`.
- Motorola del genitore con la 1.2: sessione che resta, notifica FCM con ACE chiusa, tocco che apre ACE, icona delle impronte: ok.
- Prove: `npm test` 323 (2 saltate), `prova:schema` 298, `tsc` 0. Backup di oggi in `Documents\ACE-backup` (l'ultimo 15:56, 207 KB).

## Ramo `gioco` (16/11 sera, `C:\progetti\ace\app-gioco`, non unito, non pubblicato)

- **Motore di pallavolo** `src/gioco/motore/index.ts` (`docs/09`): puro, 60 Hz, seme, rally point con due di scarto, 3 tocchi, CPU (`ia`, con `errore`). 29 test. Solo + - * / e `Math.sqrt`: stessa partita su ogni dispositivo. Misure in `M`, da tarare con la grafica. `puntiSet` arriva da fuori: metterlo in `data/config-gioco.json` quando nasce la schermata.
- **CSP per ambiente**: `vercel.ts` al posto di `vercel.json` (Supabase da `VITE_SUPABASE_URL`, senza variabile la produzione). **Prima di unire a `main`**: una preview e `curl -I` per vedere che le intestazioni arrivano; se mancano non unire.
- **ACE Prova**: `scripts\apk.ps1 -Ambiente prova -UrlProva https://...` (`docs/runbook.md`). Compilato senza firma: `it.messori.ace.prova`, "ACE Prova". Senza notifiche finché Firebase non ha la seconda app.
- Worktree nuovo: serve `.env.local` (copiarlo da `app`), sennò `src/genitori/comune.test.ts` non parte.
- Deciso dal signore: set ai 15 con due di scarto (`docs/09` §5). Orientamento e APK 1.3 restano da fare.

## Prossimo passo

1. **Stasera dopo le 21 o domani**: APK sul Samsung di Lani seguendo `docs/07-installazione.md` (Family Link, origini sconosciute acceso solo per installare, batteria senza restrizioni, ACE sempre consentita, Chrome limite normale) e la lista "Prova del guscio". Lì si prova anche il **flusso foto** (c'è solo nell'Oggi di Lani): permesso fotocamera, più scatti, galleria, "Ho finito". Poi notifica di prova: deve comparire una riga `fcm` di Lani in `push_iscrizioni`.
2. Signore: Accendi R-Evolution in Impostazioni (`r_evolution_da` vuoto); spostare geografia e spagnolo; approvare la partita del 14/11 segnata da Lani (prima dell'inizio: 0 passi).
3. Signore: cancellare il JSON del service account FCM da Download (è già nel segreto `FCM_SERVICE_ACCOUNT`).
4. Area genitori a 34/40 (16/11, ramo `genitori-ux` unito): restano P3 di sola interfaccia in fondo a `docs/genitori-ux.md` (rosso su "mai sincronizzato", "0 su 0 serate", gergo); errore di `passi()` letto come "tetto pieno" in Dai passi (§8, punti 3-4: tocca la logica, chiedere).
5. Ambiente di prova `ace-prova` (secondo progetto Supabase, preview Vercel): lo crea il signore.
6. Domenica 22/11 alle 21:30 le prime chiavi (`sync_log` fonte chiavi). Debiti: assenze da Nuvola, protezione password trapelate, CSV passi a inizio dicembre (`npm run esporta:passi`).

## Attenzione

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
