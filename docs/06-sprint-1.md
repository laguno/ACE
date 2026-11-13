# Sprint 1

**Obiettivo**: ACE sul telefono di Lani e dei genitori per l'avvio del **23 novembre 2026**.
**Tempo**: circa due settimane di lavoro con Claude Code (10-21 novembre), prova in famiglia il fine settimana del 21-22.

## Dentro lo sprint 1

Nuvola, Oggi (con "In famiglia"), Studio (verifiche, piano di ripasso, flash card, quiz, video essenziali, "Non ho capito"), Sera (compiti, cartella, borsa, fogli), Astra completo (percorso, passi, chiavi, forzieri con enigma, figurina, album), lato genitori, popup e notifiche, prima accensione, mappa dei libri.

## Fuori (sprint 2, idealmente da dicembre)

R-Evolution (partite, risultati, classifiche, dieci minuti con timer, livello bonus della selezione, pagina "La squadra"), tutor di matematica passo per passo, raccolta completa dei video, versi dei personaggi (si scelgono dopo una prova).

## Ordine di lavoro proposto

Ogni tappa si chiude con test verdi e una prova sul telefono.

1. **Fondamenta**
   - Progetto Vite + React + TS + PWA (manifest, icona, service worker), deploy di prova su Vercel.
   - Supabase: rivedere e applicare `0001_schema_iniziale.sql`; restringere le policy di Lani alle sole colonne previste; vista dei forzieri senza `premio` e `soluzione` per Lani.
   - Auth: profili Lani e genitori, PIN genitori.
   - `src/lib/regole` collegato al motore dei passi lato server (funzione `registra_passi` idempotente: una riga di `movimenti_passi` per evento, chiave unica `motivo + riferimento`).
   - Edge Function dei passi: usa `src/lib/regole` e chiama `registra_passi`. Controlli chiesti da Jarvis nella revisione dello schema:
     - giro di flash card valido solo se `fatto_il - iniziato_il >= carte × 7 secondi`;
     - video valido solo se `secondi_visti >= 95%` di `durata_secondi` (non basta `completo = true`);
     - compito spuntato dopo la scadenza: nessun passo;
     - compito rispuntato dopo uno storno: `passiCompitoRifatto` (motivo `compito_rifatto`);
     - risposta all'enigma solo tramite funzione sul server (valutazione IA, tentativi, +20): Lani non scrive su `forzieri`.
2. **Nuvola**
   - Mappatura degli endpoint con il signore (lui accede, Claude legge solo le richieste di rete).
   - Edge Function `sync-nuvola` alle 14:30 e 19:30, `sync_log`, avviso ai genitori in caso di errore.
   - Normalizzazione di materie e abbreviazioni.
3. **Oggi e Sera**
   - Le tre righe del mattino, compiti del pomeriggio in ordine, chiusura serale con orari per giorno della settimana.
   - Calendario di famiglia (iCal) e striscia "In famiglia".
4. **Studio**
   - Piano di ripasso automatico per ogni verifica.
   - Flash card con timer di 7 secondi e ripetizione a intervalli; quiz a tentativi.
   - Generazione IA da argomento, mappa dei libri e foto; richieste di foto ai genitori.
   - Video essenziali.
5. **Astra**
   - Percorso con 27 tappe e 4 mondi, bandierina, rimonta.
   - Chiavi della domenica sera (cron).
   - Forzieri con stati, enigma generato dall'IA e popup del lucchetto.
   - Figurina, album da 64 con serie nera e riscatto.
6. **Copione**
   - Motore dei popup (coda, priorità, un popup per apertura, silenzio dopo le 21 per i rimproveri dei genitori).
   - Varianti a rotazione, frasi e mantra.
   - Notifiche push con i limiti.
7. **Genitori**
   - La settimana, da fotografare, gesti di casa, sgridate.
   - Premi dei 9 forzieri e impostazioni.
   - Correzione delle spunte.
8. **Prima accensione e installazione**
   - Onboarding di Lani e dei genitori, guida all'installazione.
   - Prova completa in famiglia.

## Criteri di "fatto"

- Tutti i numeri del gioco vengono da `data/config-gioco.json`; i test di `src/lib/regole` passano.
- Lani non può scrivere passi, chiavi, voti, note o premi (verificato con un utente di prova Lani contro RLS).
- Nessuna credenziale nel codice o nel client; segreti solo in Supabase/Vercel.
- Ogni testo mostrato a Lani rispetta il copione (lunghezza, tono, niente emoji, numeri veri).
- Funziona su iPhone (Safari, aggiunta alla Home) e su iPad; notifiche provate.
- Dopo due settimane d'uso: taratura con `npm run simula` (simulatore vero).

## Questioni aperte

- **Premi dei 9 forzieri**: li decidono il signore e Lucrezia. Si inseriscono dall'app, quindi non bloccano lo sviluppo.
- **R-Evolution nello sprint 1**: la voce di menu va nascosta o mostrata come "In arrivo"?
- **Calendario scolastico**: verificare le vacanze dell'istituto (`config.calendario`).
- **Classroom**: l'account della scuola permette app esterne?
- **Versi dei personaggi**: si decidono dopo una prova.
