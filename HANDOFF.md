# HANDOFF

Storia delle sessioni, decisioni prese e scelte approvate fino al 15/11: `docs/storico.md`.

## Dove siamo (15/11 sera)

Il gioco parte **lunedì 16/11/2026** (`periodo.inizio`) con l'app com'è. Produzione: `main` `26c2142` su `ace-passino.vercel.app`, con sprint 1, sprint 2 (R-Evolution, risultato automatico dalla FIPAV), assenze e la pagina "Come si fanno i passi". Cron: `sync-nuvola` 14:30 e 19:30, `sync-calendario` ogni ora, `notifiche` ogni 15 minuti, `chiavi` domenica 21:30, `classifiche` 6:15 e `partite` ogni mezz'ora il giorno della partita.

## Fatto il 15/11 sera (messaggio di Jarvis)

- **sync-nuvola delle 19:30**: non il deploy (18:19) né le assenze. Una richiesta, quasi certamente a Nuvola, è rimasta senza risposta fino allo spegnimento (150 s, 115 ms di CPU): riga di `sync_log` aperta, nessun errore. Lanciata a mano alle 20:15: esito ok. Riga chiusa come `interrotta`. Correzione in `main`: limite di 20 s per ogni richiesta a Nuvola ("Nuvola non risponde", con l'avviso ai genitori) e `apriRegistro` che chiude come `interrotta` le righe aperte da più di 5 minuti.
- **Richieste di foto**: le 12 aperte di compiti già passati sono `scaduta` (senza passi). `sync-nuvola` chiude da sola, a ogni giro, quelle di compiti e verifiche con la data prima di oggi; lo Storage non accetta foto per una richiesta non aperta (0024).
- Partita di prova del 12/11 (FOXES VOLLEY, mai approvata) cancellata: nessun movimento né popup collegato.
- Testi del 15/11 **approvati dal signore** (Bentornata, Com'è andata?, Prossima partita, pillola in Oggi, Come si fanno i passi): tolto "proposta del 15/11" da docs/05.
- `come-passi` unito a `main`. A 360 px il pulsante "Come si fanno i passi" ora va a capo.
- Assenze in Lani: in Studio le verifiche "da recuperare" (giorno a casa, non ancora spostate) vengono per prime, quelle spostate a "settimana prossima" non mostrano un giorno; sotto un compito spostato compare "Spostato: eri a casa". **Testi nuovi da approvare** (docs/05, righe "da approvare").
- Prove: `npm test` 318 (2 saltate), `npm run prova:schema` 298, `npx playwright test` 158 (22 saltate), `npx tsc -p .` 0, build ok.

## Prossimo passo

1. **Signore, stasera**: pubblicare le funzioni toccate (`sync-nuvola`, e per `apriRegistro` anche `sync-calendario`, `chiavi`, `classifiche`), un comando alla volta: `npx supabase functions deploy sync-nuvola --use-api --yes`. Quella pubblicata adesso funziona (giro a mano ok), ma senza limite di tempo.
2. Lunedì 16/11 alle 14:30: `sync_log` fonte nuvola con esito `ok`.
3. Signore: in Genitori, Impostazioni, Spegni e poi Accendi R-Evolution (in produzione `r_evolution_da` è ancora 2026-11-13 e manca l'annuncio).
4. **Da martedì**: APK di ACE per il Samsung di Lani (piano di Jarvis del 15/11, approvato): guscio Capacitor (non TWA) con `server.url` di produzione, id tipo `it.messori.ace`, solo verticale; foto a più scatti provate nel guscio; notifiche con FCM (`@capacitor/push-notifications`, chiave del service account come segreto di Supabase, tipo di iscrizione web/fcm in tabella) e web-push per l'iPad, stessi limiti del copione; keystore in `C:\progetti\ace\chiavi\` e APK in `C:\progetti\ace\apk\`, fuori dal repository, backup in `docs/runbook.md`; installazione con Family Link in `docs/07-installazione.md`; prova prima sul telefono di un genitore.
5. **Dopo lunedì**: ambiente di prova `ace-prova` (secondo progetto Supabase, preview di Vercel collegate lì, dati finti dal simulatore). Il signore crea il progetto e mette le chiavi in Vercel.
6. Domenica 22/11 alle 21:30 le prime chiavi (`sync_log` fonte chiavi). Enigmi v4 sull'app vera al primo forziere (il 7 è il cruciverba: griglia allineata sul telefono).
7. Debiti: assenze lette da Nuvola (servizio non mappato); `spiega`, borsa, enigma, foto e push provati solo con le prove; protezione delle password trapelate (la accende il signore). A inizio dicembre il CSV dei passi per la taratura (`npm run esporta:passi`).

## Attenzione

- **Account**: ACE si apre con `claude-personal` (`CLAUDE_CONFIG_DIR=%USERPROFILE%\.claude-personal`); l'hook SessionStart avvisa, senza bloccare, se non è così.
- Deploy e `db push` li lancia il signore (il controllo automatico di Claude Code li blocca): `db push --remote --yes`, `npx supabase functions deploy <nome> --use-api --yes`. `git push` e i deploy vanno lanciati da soli, non in comandi composti.
- Schema `0001`-`0038` e `20261115173113_libreria_risorse` applicati: la prossima migrazione è `0039`. Mai cambiare una migrazione applicata. Le migrazioni con "cron" nel nome non girano su PGlite.
- Supabase rifiuta UPDATE e DELETE senza WHERE anche dentro le funzioni (safeupdate); PGlite no. Dati di prova sul database vero: ripulirli sempre.
- `sync_log.esito`: `ok`, `errore`, `interrotta`. `richieste_foto.stato`: `aperta`, `fatta`, `scaduta`.
- Segreti: `NUVOLA_UTENTE`, `NUVOLA_PASSWORD`, `CRON_SEGRETO` (nel Vault `cron_segreto`), `GOOGLE_CALENDAR_ICS_URL`, `ANTHROPIC_API_KEY`, `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`.
- Storage: `npx supabase storage cp --workdir C:\progetti\ace\app --remote --experimental --yes <file> ss:///<bucket>/<nome>` lanciato dalla cartella del file.
- `docs/05-copione.md` è salvato con i CRLF: `sed -i` di Git Bash li toglie e il diff diventa tutto il file. Rimetterli prima del commit.
- Avvisi di Supabase su `forzieri_lani` e sulle 8 funzioni RPC: voluti. Tipi: `npx supabase gen types typescript --linked > src/tipi-database.ts`. Revisione prima di unire: `ocr delegate preview --from origin/main --to <ramo>`.

## Come verificare

- `npm test`, `npm run prova:schema`, `npx playwright test`, `npx tsc -p .`, `npm run build`.
- Supabase: `sync_log` (righe senza `finito_il` = giro appeso), `cron.job`, avvisi di sicurezza, `schema_migrations` allineata.
