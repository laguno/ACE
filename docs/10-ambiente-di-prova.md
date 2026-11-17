# ACE — Ambiente di prova e "ACE Prova" sul telefono del signore

Redatto da Jarvis il 16/11/2026 dopo aver letto `HANDOFF.md`, `docs/storico.md`, `vercel.json`, `capacitor.config.ts`, `android/app/build.gradle`, `scripts/apk.ps1`, `docs/07-installazione.md`. Stato: **proposta approvata nelle linee generali dal signore**.

**Aggiornamento 16/11, 17:50 — il progetto Supabase `ace-prova` non si può ancora creare.** Il signore ha eliminato il vecchio progetto "VolleyPro AI Coach", ma il pulsante di creazione del nuovo resta disabilitato (piano gratuito). Finché non si sblocca, **si fa tutto ciò che non dipende da quel progetto**: CSP per ambiente (§2), `capacitor.config.ts` e Gradle per "ACE Prova" (§3), motore del gioco (docs/09). Alternative se non si sblocca: Supabase locale con Docker più tunnel https, oppure piano a pagamento.

**Fatto il 16/11 sera (ramo `gioco`, non pubblicato):** CSP in `vercel.ts` al posto di `vercel.json` (§2); `capacitor.config.ts`, tipo di build `prova` in Gradle e `scripts\apk.ps1 -Ambiente prova` (§3, comando in `docs/runbook.md`). **Da verificare alla prima preview, prima di unire a `main`:** che Vercel legga `vercel.ts` e che le intestazioni arrivino (`curl -I` sull'indirizzo della preview: `content-security-policy` col Supabase giusto). Se mancano, non unire: la produzione resterebbe senza intestazioni di sicurezza.

**Aggiornamento 17/11.** Il secondo progetto in cloud non si fa (piano gratuito già occupato nell'organizzazione): il back-end di prova è **Supabase locale** in Docker sul PC (`docs/runbook.md`, "Ambiente di prova locale"). `vercel.ts` è stato tolto: Vercel rifiutava il deploy senza messaggio; resta `vercel.json` statico con la produzione. "ACE Prova" sul telefono apre la preview del ramo `gioco` solo per il gioco (`/#gioco` non usa il database); il resto dell'app in preview usa ancora il database vero, quindi lì non si entra.

## Cosa c'era già deciso

Dal 13/11 il signore ha deciso un **ambiente di prova** (`docs/storico.md`, riga 40; `HANDOFF.md`, punto 5): non un utente di test (il database è di una sola bambina), ma un secondo progetto Supabase **`ace-prova`** con le stesse migrazioni e funzioni, la preview di Vercel collegata a quello, dati finti dal simulatore, ogni pubblicazione prima lì e poi in produzione. Il signore crea il progetto e mette le chiavi in Vercel.

**Il rischio di oggi** (`docs/storico.md`, riga 48): le preview di Vercel usano il **database vero**; da una preview non si deve segnare una partita né chiudere un popup di Lani. L'ambiente di prova toglie questo rischio alla radice.

## Le tre parti

### 1. Back-end di prova: progetto Supabase `ace-prova`

- Stesse migrazioni (`0001`-`0039` più `libreria_risorse`) e stesse Edge Functions della produzione.
- **Dati finti**: il simulatore (`scripts/simulatore`, già in uso per la taratura) genera una Lani finta in un punto qualunque dell'anno: serve per provare tappe, forzieri e album senza aspettare mesi.
- **Cron e segreti**: i cron di `sync-nuvola`, `partite`, `classifiche` e `notifiche` **non devono usare Nuvola, FIPAV né Lani veri**. In `ace-prova`: o spenti, o puntati a dati finti. Nessun segreto di produzione (`NUVOLA_*`, `FCM_SERVICE_ACCOUNT`) viene copiato lì: i segreti li inserisce il signore, mai in chat.
- Accesso: un account del signore come "genitore" e uno finto come "Lani".

### 2. Sito di prova: Vercel

- Un ramo dedicato (`prova`) con un indirizzo fisso, e le variabili d'ambiente della **Preview** puntate a `ace-prova`; quelle di **Production** restano com'è.
- **Attenzione, trovata nel codice:** `vercel.json` ha la **CSP con l'indirizzo Supabase di produzione scritto a mano** (`connect-src` e `img-src` su `qonullxzhqvbfpiibqye.supabase.co`). Con la preview collegata a `ace-prova` il browser bloccherebbe tutte le richieste. Va resa dipendente dall'ambiente (per esempio generando le intestazioni al build dalla variabile `VITE_SUPABASE_URL`).
- Vercel può proteggere le preview con un suo accesso: sul telefono si entra una volta con l'account del signore.

### 3. App "ACE Prova" sul telefono del signore

- Un APK con **identificatore diverso** (`it.messori.ace.prova`), nome "ACE Prova" e icona con una fascia "PROVA", così sta **accanto** all'ACE vera sullo stesso telefono, senza toccarla.
- Il guscio apre l'indirizzo del sito di prova invece della produzione: `capacitor.config.ts` legge l'indirizzo da una variabile (`ACE_AMBIENTE=prova`), l'identificatore si cambia con un parametro di Gradle; stessa firma (stesso keystore), stesso script `scripts/apk.ps1` con un parametro.
- **Notifiche:** `google-services.json` è legato a `it.messori.ace`. Per le notifiche in "ACE Prova" serve aggiungere una seconda app Android nello stesso progetto Firebase (lo fa il signore) e la funzione `notifiche` di `ace-prova` col suo segreto. Se non servono subito, la prima versione di "ACE Prova" parte **senza** notifiche.
- **È qui che si prova l'orientamento orizzontale** del gioco (APK 1.3 con il plugin di orientamento, vedi `docs/09-gioco-pallavolo.md`): prima su "ACE Prova" del signore, e solo dopo sul Samsung di Lani.

La stessa preview, su iPhone/iPad, si aggiunge alla Home da Safari e ha un'altra origine, quindi non si mescola con ACE vera.

## Come si lavora poi

1. Ogni novità nasce su un ramo, va sull'indirizzo di prova, il signore la prova su "ACE Prova".
2. Se va bene: backup, prove verdi, pubblicazione in produzione, nelle finestre consentite (non 14:20-14:45 né 19:45-21:00).
3. Le migrazioni si applicano **prima a `ace-prova`**, poi alla produzione.

## Rischi

| Rischio | Contromisura |
|---|---|
| Dati veri di Lani in prova | Progetto separato, nessun segreto di produzione copiato, cron di Nuvola/FIPAV/notifiche spenti o finti |
| CSP blocca la preview | Intestazioni dipendenti dall'ambiente (§2) |
| Due app ACE sul telefono, confusione | Nome, icona con fascia e identificatore diversi |
| Le prove non rispecchiano la produzione | Stesse migrazioni e funzioni, applicate prima su prova, poi in produzione |
