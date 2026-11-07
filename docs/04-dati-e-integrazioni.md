# Dati e integrazioni

## Architettura

- **App**: PWA (React + TypeScript + Vite, `vite-plugin-pwa`), ospitata su Vercel. Proposta: se Claude Code preferisce un'altra base equivalente, la propone al signore prima di cambiare.
- **Backend**: Supabase, progetto `qonullxzhqvbfpiibqye` (database Postgres con RLS, Auth, Storage, Edge Functions, cron). Schema iniziale in `supabase/migrations/0001_schema_iniziale.sql` (provato su Postgres 16: 30 tabelle, policy RLS).
- **Regole di gioco**: `src/lib/regole/` + `data/config-gioco.json`. Il calcolo dei passi avviene **lato server** (funzione Postgres o Edge Function che usa la stessa logica), mai fidandosi del client.

## Nuvola (registro elettronico, Madisoft)

- Lettura verificata il 4 novembre 2026: accesso con utente e password di un genitore, poi le API interne di Nuvola (compiti, eventi di classe/verifiche, voti, note) **in sola lettura**.
- Gli endpoint esatti vanno rimappati con il signore presente, dal pannello di rete del browser in una sessione che apre lui. **Claude non inserisce mai le credenziali**: il signore le mette come segreti di Supabase (`supabase secrets set NUVOLA_UTENTE=... NUVOLA_PASSWORD=...`).
- Edge Function `sync-nuvola`, programmata alle **14:30 e 19:30** (cron di Supabase): scarica, normalizza in `compiti`, `verifiche`, `voti`, `note`, scrive `sync_log`; se l'accesso fallisce avvisa i genitori.
- Dopo ogni sincronizzazione: genera il piano di ripasso per le verifiche nuove, le richieste di foto per pagine mai fotografate (pagine probabili dalla mappa dei libri se Nuvola dà solo l'argomento), le notifiche del pomeriggio, i movimenti di passi per voti e note.

## Google Classroom

Materiali e alcuni compiti. L'account scolastico di Lani (`@icsanpolodenza.edu.it`) è un Google Workspace della scuola che **non riceve posta dall'esterno**: per Classroom serve l'autorizzazione OAuth con quell'account, approvata dai genitori; se l'amministratore della scuola blocca le app esterne, Classroom resta fuori dallo sprint 1 e si usa solo Nuvola.

## Calendario di famiglia (Google)

Sola lettura. Proposta semplice: l'indirizzo iCal privato del calendario come segreto (`GOOGLE_CALENDAR_ICS_URL`), letto da una Edge Function ogni ora e copiato in `impegni_famiglia`. Serve per: striscia "In famiglia", chi accompagna a allenamenti e partite, orari della chiusura serale che si spostano. Eventi con "privato" nel titolo esclusi. Nelle impostazioni i genitori scelgono quali calendari mostrare.

## Intelligenza artificiale

API di Anthropic (chiave `ANTHROPIC_API_KEY`, solo lato server, costo di pochi euro al mese). Usi:
- flash card e quiz dagli argomenti di Nuvola, dalla mappa dei libri e dalle foto delle pagine;
- spiegazione "Non ho capito" (argomento, mai la soluzione dell'esercizio);
- enigma dei forzieri dal premio inserito dai genitori; valutazione della risposta con sinonimi;
- varianti dei testi del copione (rotazione, mai lo stesso testo prima di 7 giorni).

Vincoli: niente dati personali superflui nei prompt; mai il testo degli e-book delle piattaforme degli editori (Claude non vi accede con le credenziali e non ne copia il testo); le foto delle pagine le fanno i genitori o Lani dal libro di carta.

## Mappa dei libri — `data/mappa-libri.json`

Indici di 10 materie su 11 (manca Geografia vol. 2, Religione esclusa), con unità, lezioni e pagine; inventario dei pezzi in casa e di quelli mancanti (li carica Lani con le foto). Serve a tradurre l'argomento di Nuvola in pagine probabili e a dare contesto all'IA.

## Video

YouTube IFrame Player API con `controls=0`, eventi di stato e tempo: il video vale solo se arriva in fondo senza salti in avanti e con la pagina visibile (`visibilitychange`). Elenco curato per argomento nella tabella `video`; nello sprint 1 pochi video scelti, la raccolta completa dopo.

## Notifiche push

Web Push con chiavi VAPID; su iPhone funzionano solo con ACE aggiunta alla schermata Home (iOS 16.4+). Pianificazione lato server (cron), limiti del copione: 3 al giorno + 1 sollecito, ≤ 60 caratteri.

## Accessi

Supabase Auth. Un utente per Lani e uno per ciascun genitore. **Per Lani niente mail della scuola** (non riceve posta da fuori): accesso con codice/PIN o con una mail di un genitore. Profilo genitori protetto da PIN anche sullo stesso dispositivo.

## Privacy

Dati solo in famiglia. Repository privato. Le foto reali dei familiari usate per gli avatar restano fuori dal repository (`_fuori-app/` sul computer del signore) e vanno cancellate da Gemini dopo l'uso. Nessuna foto delle compagne di squadra. Credenziali solo come segreti di Supabase, mai nel codice o nel client.
