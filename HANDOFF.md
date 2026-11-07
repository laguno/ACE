# HANDOFF

## Dove siamo

Sprint 1, **tappa 1 (fondamenta)**, sul branch `tappa-1-fondamenta`, non ancora unito a `main`.
- Fatto: progetto Vite + React + PWA; regole di gioco con test (29 verdi); schema `0001` rivisto, approvato da Jarvis e **applicato** su Supabase; utenti e profili creati (Lani, Papà, Mamma) e provata la RLS con l'utente di Lani sul database vero; accesso con sessione persistente e area genitori con PIN (da provare sul telefono); Vercel collegato a GitHub; Edge Function `passi` pubblicata e provata dal vivo (8 controlli).
- Manca per chiudere la tappa: prova sul telefono di Lani (accesso, PIN sull'iPad), poi merge su `main`.

## Ultima sessione (7 novembre 2026)

Letti i documenti; aggiunte le regole dello storno e del compito rifatto; schema `0001` corretto due volte (revisione di Claude, poi la correzione di Jarvis sulle ore delle spunte) e applicato con `npx supabase db push --remote`; creato il progetto Vercel `ace` (https://ace-passino.vercel.app) e collegato a `laguno/ACE`.

## Decisioni prese

| Data | Chi | Decisione |
|---|---|---|
| 7/11 | signore | Storno delle spunte corrette: movimento opposto esatto, non malus, solo prima delle chiavi della domenica; l'imbroglio voluto è la sgridata "balla −10" |
| 7/11 | signore | Compito rifatto dopo uno storno: 10 passi base senza anticipo, motivo `compito_rifatto`, una volta sola, prima delle chiavi |
| 7/11 | signore | Lani entra con la sua Gmail (`leilani.messori4@gmail.com`) e password lunga, sessione persistente, niente PIN |
| 7/11 | signore | Ogni genitore ha il suo account; un PIN condiviso (hash bcrypt) protegge l'area genitori sui dispositivi di Lani |
| 7/11 | signore | R-Evolution nascosta nello sprint 1 (barra a 4 voci); arriverà con un popup di annuncio |
| 7/11 | signore | Icona provvisoria: pallone su fucsia; alternative Lani che saluta e il passo, sceglie Lani alla prima prova |
| 7/11 | signore | Vercel: progetto `ace`, indirizzo `ace-passino.vercel.app`, `noindex`, anteprime sui push e produzione dal merge su `main` |
| 7/11 | signore | Fogli da firmare: Lani segna "L'ho dato" (`dato_il`), i passi arrivano con la conferma del genitore |
| 7/11 | signore | Config: `video_frazione_minima_vista` 0.95 (regola del 95% di Jarvis) |
| 7/11 | Jarvis | Schema `0001` approvato con correzione: ore delle spunte di Lani messe dal server (`timbra_ora`), `flashcard_giri.iniziato_il` |

## Prossimo passo

Prova sul telefono e sull'iPad di Lani; merge della tappa 1 su `main`; poi tappa 2 (Nuvola, con il signore presente).

## In attesa di

- Signore: salvare la password di Lani sul suo telefono e sull'iPad; impostare il PIN dell'area genitori dal proprio telefono.

## Attenzione

- Iscrizioni chiuse in Supabase Auth: i nuovi utenti si creano dalla dashboard, con "Auto Confirm User" attivo.
- Gli avvisi di Supabase su `forzieri_lani` (vista security definer) e sulle 5 funzioni RPC sono voluti: vedi i commenti nello schema.
- `db push` va sempre con `--remote`, altrimenti la CLI cerca un database locale in Docker.
- Edge Function `passi`: l'app la chiama con { tipo, id } dopo ogni spunta; mancano borsa (tappa 3), voti e note (tappa 2), rimonta (tappa 5). Si pubblica con `npx supabase functions deploy passi --use-api`.
- L'inizio del giro di flash card arriva dal telefono: se serve più rigore, timbrarlo sul server (tappa 4).
- Python non è installato su questo PC: `npm run simula` non parte.
- Lo schema `0001` è applicato: le modifiche vanno in `0002` e successive.

## Come verificare

- `npm test`: regole di gioco.
- `npm run prova:schema`: sicurezza dello schema su PGlite (35 controlli).
- `npx tsc -p .` e `npm run build`: tipi e build della PWA.
- Supabase: avvisi di sicurezza e `supabase_migrations.schema_migrations` allineata alle migrazioni del repository.
