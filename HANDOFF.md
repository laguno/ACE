# HANDOFF

Storia delle sessioni, decisioni prese e scelte approvate: `docs/storico.md`.

## Dove siamo (16/11 sera)

Il gioco è partito **lunedì 16/11/2026**: Lani usa ACE in produzione. `main` su `ace-passino.vercel.app`: sprint 1, sprint 2 (R-Evolution, **accesa dal 16/11**), **tema campo di R-Evolution** (16/11 alle 21:08, unione `49b087b`: granata della divisa, nastro "Ultim'ora", tabellone, emoji solo lì; bozza `design/REvolution.html`), assenze, "Come si fanno i passi", area genitori a quattro schede (Impeccable 34/40, obiettivo raggiunto), APK con FCM. Cron: `sync-nuvola` 14:30 e 19:30, `sync-calendario` ogni ora, `notifiche` ogni 15 minuti, `chiavi` domenica 21:30, `classifiche` 6:15, `partite` ogni mezz'ora il giorno della partita. Controlli del 16/11: partita spostata al 13/12 alle 9:00 letta dalla FIPAV; `sync-nuvola` delle 14:30 ok (4 s).

## Revisione dell'interfaccia (17/11 alle 9:50, unione `4650ef0`, in produzione)

- Ramo `revisione-ui-3`: testata compatta allo scorrere, "mancano N" accanto ai passi, un solo cerchio per spuntare, fatti in fondo in Pomeriggio, fucsia in Studio solo entro 2 giorni, "915 passi, 4 chiavi", vibrazione alla spunta, Sera scura, "Cambia sfondo" in Astra, "+N" solo dopo il primo gesto (`VALORE_DOPO_IL_GESTO` in `src/spunte.tsx`, si spegne lì), "Una cosa da dirle oggi" nell'Oggi dei genitori. Foto prima/dopo in `docs/confronto/` e `docs/confronto/prima/`.
- Prove sul ramo unito con `main`: `npm test` 323, `prova:schema` 298, Playwright 192 (axe compreso), build ok. Backup `ace-2026-11-17_09-44-44.sql`. `sync_log` dopo la pubblicazione: tutto ok.
- 17/11 alle 10:40 (`200025e`, backup `ace-2026-11-17_10-36-27.sql`): area genitori, "Una cosa da dirle oggi" e riga Serata leggono `cartella_il` come l'Oggi di Lani. `chiusa_il` non la scrive nessuno (0 serate su 2): prima la riga non compariva mai. Ramo `revisione-ui-3` chiuso.
- Da guardare sui telefoni veri: vibrazione, Sera scura a letto, testata compatta su Safari dell'iPad (senza supporto scorre via come prima).
- Ramo `gioco` (`C:\progetti\ace\app-gioco`, anche su GitHub): motore a tempo, ACE Prova, schermata di prova (accesa nelle preview), plugin di orientamento e APK 1.3, ambiente di prova locale. `vercel.ts` tolto il 17/11 (Vercel rifiutava il deploy): resta `vercel.json`. Non unito a `main`; stato nel suo `HANDOFF.md`.

## R-Evolution rivista (17/11, ramo `revolution-fipav`, **in produzione alle 12:10**, unione `ef9fa29`)

- Richieste del signore dopo la prova sul telefono: barra (nome selezionato tagliato tra 380 e 409 px), partita doppia, coach, dieci minuti collegati a Oggi, risultato solo dalla FIPAV con popup in R-Evolution, niente approvazione dei genitori. Dettagli in `docs/08-sprint-2.md`, "Revisione del 17/11".
- Dati: tolta la riga doppia del 14/11 (backup `ace-2026-11-17_11-03-26.sql`, 0 passi coinvolti).
- Prove: `npm test` 333, `prova:schema` 298, Playwright 202 (31 saltate come sempre), `tsc` 0, build ok.
- 17/11 dopo: la FIPAV è l'unico calendario delle partite (righe `fipav:` in `impegni_famiglia`), pulsante "Assente" nel popup.
- Pubblicato il 17/11 alle 12:05-12:10 (backup `ace-2026-11-17_12-04-56.sql`): `classifiche` (lanciata a mano: ok, 9 partite `fipav:` negli impegni), `passi`, `sync-calendario` (ok, nessuna partita del calendario di casa rimasta), poi `main` su Vercel (stato success).
- Da guardare: la lettura delle 6:15 di domani (`sync_log` classifiche) e il primo "Com'è andata?" vero, sabato 21/11 (U14 alle 16:00).
- Testi del popup e del coach scelti dal signore il 17/11 (docs/05).

## APK di ACE (16/11, ramo `apk` in `C:\progetti\ace\app-apk`, unito a `main`)

- Guscio Capacitor (non TWA) con `server.url` di produzione, id `it.messori.ace`, solo verticale, barra di stato rosa dipinta da `MainActivity` (insets nativi: la pagina web non si tocca). Le modifiche web arrivano da sole; un APK nuovo serve solo per icone, permessi, plugin (versionCode più alto, stessa chiave, "Aggiorna").
- Notifiche: FCM HTTP v1 (JWT RS256 con WebCrypto, `supabase/functions/_shared/push.ts`) accanto a web-push; migrazione `0039_push_fcm` (tipo `web`/`fcm`). I limiti del copione restano in `manda()` di `notifiche`. FCM 404 cancella l'iscrizione, 400 no. Prova: `{"prova":"genitori"}` a `notifiche` (comando in `docs/runbook.md`).
- Nel guscio i genitori ricevono la richiesta del permesso all'accesso (App.tsx); Lani usa "Attiva i promemoria" in Oggi.
- **APK 1.2** (versionCode 3) firmato: `C:\progetti\ace\apk\ace-1.2.apk`. Icona piccola delle notifiche: due impronte (scelta del signore). Keystore `C:\progetti\ace\chiavi\ace-release.jks`, alias `ace`, password nel gestore del signore; backup e firma in `docs/runbook.md`.
- Motorola del genitore con la 1.2: sessione che resta, notifica FCM con ACE chiusa, tocco che apre ACE, icona delle impronte: ok.
- Prove: `npm test` 323 (2 saltate), `prova:schema` 298, `tsc` 0. Backup di oggi in `Documents\ACE-backup` (l'ultimo 15:56, 207 KB).

## Ramo `gioco` (16/11 sera, `C:\progetti\ace\app-gioco`, non unito, non pubblicato)

- **Motore di pallavolo** `src/gioco/motore/index.ts` (`docs/09`): puro, 60 Hz, seme, rally point, partita a tempo (`pallavolo.secondi` = 90 dal 20/11, prima 120, in `data/config-gioco.json`: scambio finito, in parità un punto in più), 3 tocchi, CPU (`ia`, con `errore`). Solo + - * / e `Math.sqrt`: stessa partita su ogni dispositivo. Misure in `M`, da tarare con la grafica.
- **Schermata di prova** `src/gioco/Gioco.tsx`: Canvas, due pollici (e frecce + spazio dal computer), ciclo a passo fisso, in verticale chiede di girare. In sviluppo (`npm run dev`, poi `/#gioco`) e nelle preview di Vercel (`VERCEL_ENV=preview` in `vite.config.ts`): `https://ace-git-gioco-lagunos-projects.vercel.app/#gioco`, provata il 17/11. Nella build di produzione non c'è. Personaggi e testi segnaposto (`lani-battuta`, `leo-tennis`, girati dalla parte sbagliata: arriveranno le figurine giuste). Provata dal signore il 16/11 sul computer: velocità buona, CPU e scambi vanno bene per ora. Provata sul telefono del signore il 17/11.
- **CSP**: provato `vercel.ts`, Vercel rifiutava il deploy senza messaggio; tornato `vercel.json` statico (17/11), preview ok con le intestazioni. Niente CSP per ambiente: non c'è un Supabase di prova in cloud.
- **Ambiente di prova locale** (17/11, provato dal signore sul telefono): Supabase in Docker (`scripts/prova-locale.ps1`), dati finti `npm run prova:dati`, account finti nel seed, cron spenti. ACE Prova 1.3 apre `https://wsa2365.taile6dda8.ts.net` via Tailscale (relay: il PC aziendale blocca il diretto) servita da `npm run prova:telefono` (build, non il server di sviluppo: via relay restava bianca). Notifiche del guscio spente in `--mode locale` (senza Firebase crashava). PC acceso, Docker e `prova:telefono` in esecuzione. Tutto in `docs/runbook.md`.
- **ACE Prova**: `scripts\apk.ps1 -Ambiente prova -UrlProva https://...` (`docs/runbook.md`). Compilato senza firma: `it.messori.ace.prova`, "ACE Prova". Senza notifiche finché Firebase non ha la seconda app.
- Worktree nuovo: serve `.env.local` (copiarlo da `app`), sennò `src/genitori/comune.test.ts` non parte.
- Deciso dal signore: partita a tempo di 2 minuti (`docs/09` §5). Plugin di orientamento aggiunto (`@capacitor/screen-orientation`, `Gioco.tsx`), `versionCode 4` / 1.3 in Gradle: APK ACE Prova 1.3 (`C:progetticepkce-prova-1.3.apk`, apre la preview `/#gioco`) provato dal signore sul suo telefono il 17/11: si gira in orizzontale e il gioco va bene. Manca la prova sul Samsung di Lani.
- **Giri del 20/11 sera e notte** (`5d5645a..12499db`, pubblicati sul ramo `gioco` su GitHub, non uniti). **Piano e prompt per la prossima sessione: `docs/11-piano-gioco-vero.md`** (stato, tutto quello che manca, selezione dei personaggi, mossa finale con barra, ordine dei lavori, contratto motore↔resa, decisioni, prompt da incollare). Report visivo dell'audit: https://claude.ai/artifact/VM8gegDzcXZnp9JzfabeB4 (privato).
  - Fatto: partita di 1:30; `schiaccia` (pulsante e K, `puoSchiacciare`, perdono di 8 tic, schiacciata automatica tolta, CPU che schiaccia); altezze in cm da config (`rete_cm`, `altezze_cm`, `Stato.uPerCm`); salto in memoria e solo su pressione nuova, partenza e frenata rapide; `Stato.tocco` per vibrazione ed effetti; croce unica a sinistra, Salta e Schiaccia 96x88 con etichette, margini dai gesti di Android; disegno interpolato, dpr al massimo 2, sfondo fuori schermo; campo e rete in prospettiva; palla con bordo, ombra e scia; hit-stop, tremolio a trauma², scintille, vibrazione; pillola "Lani N · N Leo", "Punto!" o "Punto di Leo"; Pausa (P/Esc, Continua, Schermo intero, Esci) e pausa al cambio di app; schermo intero e orizzontale al primo tocco nel browser.
  - Verificato: 55 test del motore (383 in tutto), `tsc`/`eslint` puliti, build senza gioco, pulsanti che non coprono i giocatori (0 px²). Provato dal signore su Chrome Android: "molto meglio i pulsanti". **Mai provati sul telefono**: 120 Hz, pausa al cambio di app, schermo intero, Samsung di Lani.
  - **Problemi aperti** (dettagli in docs/11 §2): la palla attraversa i personaggi (contatto solo alle mani); la CPU è troppo forte (`ERRORE_CPU = 40` scritto in `Gioco.tsx`); manca il servizio; figure con un pallone (Lani) e una racchetta (Leo) in mano, una posa sola; niente suoni; niente schermate di inizio e fine; `Gioco.tsx` è di 946 righe, da dividere.
  - **Per partire (tecnico)**:
    - Nel worktree ci sono modifiche non del gioco (`src/App.tsx`, `src/stile.css`, `scripts/dati-finti-locale.sql`, `tsconfig.tsbuildinfo`): mai nei commit.
    - Il ramo è 37+ commit dietro `main`. Unione con `gioco-con-tabellina` (`scripts/allinea-main.mjs` di quel ramo) solo se lo dice il signore.
    - Contratto del motore: `Comandi {sx,dx,salta,schiaccia}`, `Corpo {x,y,vx,vy,cm,schiaccia}`, `nuovaPartita(seme, durata, cm:[n,n], reteCm)`, `passo`, `ia(s, lato, errore)`, `puoSchiacciare`, `cerchio`, `Stato.tocco`, `Stato.uPerCm`. Il motore non importa la config. Solo + - * / e `Math.sqrt`.
    - Prova sul telefono:
      - la porta **5187** (Tailscale senza porta) è della sessione del piano studio (app-tmp-merge);
      - il gioco gira sulla **5188**, esposta con `tailscale serve --bg --https=8443 5188` (aggiunta il 20/11; si toglie con `tailscale serve --https=8443 off`);
      - indirizzo `https://wsa2365.taile6dda8.ts.net:8443/#gioco`, da Chrome sul telefono;
      - build: `npx vite build --mode locale && npx vite preview --mode locale --host 127.0.0.1 --port 5188 --strictPort` (prima fermare il vecchio processo sulla 5188);
      - ACE Prova apre la radice: per il gioco serve Chrome, oppure un APK con `-UrlProva .../#gioco`.
    - Skill di game design installate in `.claude/skills/` (`game-feel`, `design-game`, `game-development`, ignorate da git): lette prima di installarle, sono riferimenti.
    - Gli script Playwright delle foto e di `copre` (sovrapposizione pulsanti/giocatori) stavano nella scratchpad della sessione: vanno riscritti in `scripts/prova-gioco/` (docs/11 §2.5).

## Prossimo passo

1. **Stasera dopo le 21 o domani**: APK sul Samsung di Lani seguendo `docs/07-installazione.md` (Family Link, origini sconosciute acceso solo per installare, batteria senza restrizioni, ACE sempre consentita, Chrome limite normale) e la lista "Prova del guscio". Lì si prova anche il **flusso foto** (c'è solo nell'Oggi di Lani): permesso fotocamera, più scatti, galleria, "Ho finito". Poi notifica di prova: deve comparire una riga `fcm` di Lani in `push_iscrizioni`.
2. Tema campo: guardarlo sul Samsung e sull'iPad di Lani (emoji, nastro, sticker). Idee approvate dal signore, da fare: striscia delle ultime partite a pallini vinta/persa; sticker della testata che cambia posa dopo la partita (`lani-festeggia` se vinta, `lani-partita-persa` se persa).
3. Signore: spostare geografia e spagnolo; approvare la partita del 14/11 segnata da Lani (prima dell'inizio: 0 passi).
4. Signore: cancellare il JSON del service account FCM da Download (è già nel segreto `FCM_SERVICE_ACCOUNT`).
5. Area genitori a 34/40 (16/11, ramo `genitori-ux` unito): restano P3 di sola interfaccia in fondo a `docs/genitori-ux.md` (rosso su "mai sincronizzato", "0 su 0 serate", gergo); errore di `passi()` letto come "tetto pieno" in Dai passi (§8, punti 3-4: tocca la logica, chiedere).
6. Ambiente di prova: niente `ace-prova` in cloud (limite del piano gratuito, decisione del signore 17/11); Supabase locale sul PC.
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
