# Runbook: cosa fare se…

Per il signore (e per Claude quando lo aiuta). Prima di tutto: **area Genitori → Altro → Stato di ACE** dice quando sono andate le ultime sincronizzazioni, le ultime chiavi e gli errori recenti. Sul database vero si guardano conteggi e date, non le righe di Lani.

## Nuvola non sincronizza

1. Stato di ACE: "Nuvola … non riuscita"? Al primo giro fallito i genitori ricevono anche una notifica.
2. Supabase → Edge Functions → `sync-nuvola` → Logs: il messaggio dice il passo (accesso, schede, compiti…).
3. Cause tipiche: password di Nuvola cambiata (aggiornare il segreto `NUVOLA_PASSWORD`), Nuvola giù (riprova da sola alle 14:30 e alle 19:30), formato cambiato (il messaggio nomina il percorso; serve una correzione in `src/lib/nuvola`).
4. Una sincronizzazione a mano, dopo una correzione: area genitori non ce l'ha; dalla dashboard di Supabase si invoca `sync-nuvola` con un token di genitore. Una sola volta.

## Il calendario non si aggiorna

Stato di ACE → Calendario. Se fallisce: l'indirizzo iCal privato di Google è cambiato (Google → Impostazioni del calendario → Indirizzo segreto in formato iCal) → aggiornare il segreto `GOOGLE_CALENDAR_ICS_URL`. Il messaggio d'errore non mostra mai l'indirizzo.

## Le chiavi della domenica non arrivano

1. Stato di ACE → "Chiavi della domenica": l'ultima settimana contata.
2. Il cron gira alle 19:30 e alle 20:30 UTC e la funzione salta se a Roma non sono le 21: d'inverno conta il secondo giro, d'estate il primo. Rilanciarla non fa danni (una settimana contata non si riconta).
3. Per contare una settimana precisa: un genitore invoca `chiavi` con `{ "lunedi": "AAAA-MM-GG" }`.

## Un passo è sbagliato

- Spunta data per sbaglio: area Genitori → Correzioni → togli la spunta (storno esatto, solo prima delle chiavi della domenica).
- Voto corretto dal docente: lo sistema da solo `sync-nuvola` (movimento `voto_corretto` con la differenza).
- Altro: i passi non si scrivono a mano (nemmeno i genitori possono). Si guarda `movimenti_passi` per motivo e riferimento e si decide con Claude una correzione con una migrazione o una funzione, mai a mano.

## Lani perde il telefono

1. Supabase → Authentication → utente di Lani → **Sign out** (chiude tutte le sessioni) e cambio password.
2. Area genitori sull'iPad: cambiare il PIN (Impostazioni).
3. `push_iscrizioni`: le iscrizioni del telefono perso si cancellano da sole al primo invio fallito (404/410).
4. Nuovo telefono: installare ACE (docs/07-installazione.md) ed entrare con il nuovo accesso.

## Backup

- **Quando**: ogni domenica sera dopo le chiavi, e prima di ogni migrazione nuova.
- **Come**: dal PC del signore, nella cartella `app`, `npm run backup`. Il file va in `Documenti\ACE-backup\ace-AAAA-MM-GG_hh-mm-ss.sql` (fuori dal repository). Contiene i dati dello schema `public`; niente segreti, niente account, niente foto (le foto stanno nello Storage: per tenerle, scaricare la cartella `foto-pagine` dalla dashboard una volta al mese).
- **Ripristino** (emergenza, con Claude): su un database con tutte le migrazioni, svuotare le tabelle di `public` e caricare il file in una transazione. Provato su Supabase locale con `npm run ripristina -- <file>` (Docker): i dati tornano identici.
- Tenere almeno gli ultimi 4 backup.

## Taratura di dicembre

`npm run esporta:passi` (sola lettura) scrive `Documenti\ACE-backup\passi-AAAA-MM-GG.csv`: somme per giorno e motivo, saldo e bandierina, nello stesso formato di `docs/simulazione/*.csv`. Da passare a Jarvis per la simulazione in Python.

## Una funzione dà errore

Stato di ACE → Errori: dove e messaggio. Se si ripete, aprire una sessione con Claude con il messaggio (non le righe di Lani). Le funzioni si pubblicano con `npx supabase functions deploy --use-api --yes`; le migrazioni con `npx supabase db push --remote --yes`, sempre dopo `npm run backup`.

## Ambiente di prova: mai indietro rispetto a main

Convenzione del 18/11. L'app di prova serve a provare le novità, su qualunque ramo: il ramo servito in quel momento (il **ramo di prova**) deve contenere tutto `main` e può solo essere più avanti.

- **Prima di ogni prova**: `npm run prova:allinea` fa `git fetch` e unisce `origin/main` nel ramo attivo. Se l'unione non riesce (conflitti) la annulla, elenca i file e si ferma: la prova non parte finché non si risolve a mano (`git merge origin/main`, commit) e si riavvia. Annota il ramo servito in `ace-prova-ramo.json`, nella cartella comune di git (vale per tutti i worktree).
- `npm run prova:telefono` lo fa da solo (script `preprova:telefono` di npm). `scripts/prova-locale.ps1` (ramo `gioco`) va aperto con questa riga, da aggiungere quando `gioco` riceve `main`: `node scripts/allinea-main.mjs; if ($LASTEXITCODE -ne 0) { exit 1 }`
- **Prima di pubblicare in produzione**: `npm run rilascio:controlla` (oppure `npm run rilascio:controlla -- <commit>`; di solito il commit è `main`). Si ferma nelle finestre senza pubblicazioni (14:20-14:45 e 19:45-21:00) e se il ramo di prova non contiene il commit da pubblicare: allora si allinea il ramo di prova, si prova e si rilancia. Solo controlli: backup (`npm run backup`), prove verdi, ok del signore e pubblicazione restano a mano.
- **Al push (dal 20/11)**: l'hook `pre-push` nella cartella comune di git (`C:\progetti\ace\app\.git\hooks\pre-push`, vale per tutti i worktree, non è nel repository) blocca il push su `main` se il ramo di prova non contiene già il commit. Ordine: unire nel ramo di prova, provare, poi push su `main`. Se si riclona il repository, l'hook va rimesso (testo in questo paragrafo della storia git del 20/11).
- **Nei test**: `npm test` fallisce (`scripts/allinea-main.test.ts`, "questo ramo") se `origin/main`, com'era all'ultimo fetch, non è antenato del ramo. Non c'è una CI: questo controllo ne fa le veci. Fuori da git o senza `origin/main` salta.

## L'app sul telefono è vecchia

Chiudere ACE del tutto e riaprirla: il service worker scarica la versione nuova. Se non basta, Impostazioni del browser → Dati del sito → ace-passino → cancella (poi rifare l'accesso).

## APK di ACE (guscio Android)

ACE sul telefono di Lani è un APK (guscio Capacitor in `android/`, configurazione in `capacitor.config.ts`) che apre `ace-passino.vercel.app`: le novità dell'app arrivano da sole, senza reinstallare. Si rifà l'APK solo se cambia il guscio (icona, permessi, plugin, versione di Android): prima si alza `versionCode` (e `versionName`) in `android/app/build.gradle`.

- **Keystore**: `C:\progetti\ace\chiavi\ace-release.jks`, alias `ace`. La password sta **solo** nel gestore di password del signore: mai nel repository, in un file o in chat.
- **Backup del keystore** (subito dopo averlo creato, e controllare una volta l'anno): copiare `ace-release.jks` su una chiavetta USB tenuta in casa e in una seconda copia fuori casa (cloud personale va bene: senza password il file non serve a niente). Nel gestore di password, accanto alla password, scrivere dove stanno le copie. Se il keystore si perde, il telefono non accetta più aggiornamenti firmati con una chiave nuova: bisogna disinstallare ACE e installare il nuovo APK (si perde solo l'accesso, da rifare; i dati stanno su Supabase).
- **Creare il keystore** (una volta sola, dal PowerShell del signore; chiede la password due volte e i dati del certificato, basta il nome):
  `& 'C:\Program Files\Java\jdk-21.0.10\bin\keytool.exe' -genkeypair -v -keystore C:\progetti\ace\chiavi\ace-release.jks -alias ace -keyalg RSA -keysize 4096 -validity 10000`
- **Fare l'APK firmato**: dalla cartella `app`, `powershell -File scripts\apk.ps1`. Chiede la password del keystore e scrive `C:\progetti\ace\apk\ace-<versione>.apk`, fuori dal repository. Serve l'Android SDK in `C:\progetti\ace\android-sdk` (strumenti a riga di comando di Google, installati il 16/11, fuori dal repository) e Java 21.
- **Notifiche FCM**: progetto Firebase `ace-famiglia`; `android/app/google-services.json` sta nel guscio (non è un segreto). La chiave del service account sta solo nel segreto di Supabase `FCM_SERVICE_ACCOUNT` (il JSON intero) e nella cartella `chiavi`. Se la chiave trapela: Firebase → Impostazioni progetto → Account di servizio → Google Cloud → elimina la chiave, se ne genera una nuova e si aggiorna il segreto.
- **Le notifiche al telefono non arrivano**: `push_iscrizioni` con `tipo = 'fcm'` deve avere una riga del telefono (si crea quando Lani tocca "Attiva i promemoria" o a ogni apertura con il permesso dato); log della funzione `notifiche` (`push fcm …`); sul telefono Impostazioni → App → ACE → Notifiche e Batteria "Senza restrizioni".
