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

## L'app sul telefono è vecchia

Chiudere ACE del tutto e riaprirla: il service worker scarica la versione nuova. Se non basta, Impostazioni del browser → Dati del sito → ace-passino → cancella (poi rifare l'accesso).
