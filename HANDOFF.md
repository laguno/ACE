# HANDOFF

## Dove siamo

Sprint 1, **tappa 1 (fondamenta)**, sul branch `tappa-1-fondamenta`, non ancora unito a `main`.
- Fatto: progetto Vite + React + PWA; regole di gioco con test (21 verdi); schema `0001` rivisto, approvato da Jarvis e **applicato** su Supabase; accesso con sessione persistente e area genitori con PIN (scritti, non ancora provati con utenti veri); Vercel collegato a GitHub.
- Manca per chiudere la tappa: utenti e profili, Edge Function dei passi, prova vera con l'utente di Lani contro la RLS, prova sul telefono.

## Ultima sessione (7 novembre 2026)

Letti i documenti; aggiunte le regole dello storno e del compito rifatto; schema `0001` corretto due volte (revisione di Claude, poi la correzione di Jarvis sulle ore delle spunte) e applicato con `npx supabase db push --remote`; creato il progetto Vercel `ace` (https://ace-passino.vercel.app) e collegato a `laguno/ACE`.

## Decisioni prese

| Data | Chi | Decisione |
|---|---|---|
| 7/11 | signore | Storno delle spunte corrette: movimento opposto esatto, non malus, solo prima delle chiavi della domenica; l'imbroglio voluto è la sgridata "balla −10" |
| 7/11 | signore | Compito rifatto dopo uno storno: 10 passi base senza anticipo, motivo `compito_rifatto`, una volta sola, prima delle chiavi |
| 7/11 | signore | Lani entra con `alessandro.messori4+lani@gmail.com` e password lunga, sessione persistente, niente PIN |
| 7/11 | signore | Ogni genitore ha il suo account; un PIN condiviso (hash bcrypt) protegge l'area genitori sui dispositivi di Lani |
| 7/11 | signore | R-Evolution nascosta nello sprint 1 (barra a 4 voci); arriverà con un popup di annuncio |
| 7/11 | signore | Icona provvisoria: pallone su fucsia; alternative Lani che saluta e il passo, sceglie Lani alla prima prova |
| 7/11 | signore | Vercel: progetto `ace`, indirizzo `ace-passino.vercel.app`, `noindex`, anteprime sui push e produzione dal merge su `main` |
| 7/11 | signore | Fogli da firmare: Lani segna "L'ho dato" (`dato_il`), i passi arrivano con la conferma del genitore |
| 7/11 | Jarvis | Schema `0001` approvato con correzione: ore delle spunte di Lani messe dal server (`timbra_ora`), `flashcard_giri.iniziato_il` |

## Prossimo passo

Inserire i profili (SQL di Claude con gli id degli utenti), poi l'Edge Function dei passi con i controlli annotati in `docs/06-sprint-1.md`.

## In attesa di

- Signore: disattivare le iscrizioni in Supabase Auth; creare gli utenti di Lani, del signore e di Lucrezia; mandare gli id e i nomi da mostrare.

## Attenzione

- Gli avvisi di Supabase su `forzieri_lani` (vista security definer) e sulle 5 funzioni RPC sono voluti: vedi i commenti nello schema.
- `db push` va sempre con `--remote`, altrimenti la CLI cerca un database locale in Docker.
- L'inizio del giro di flash card arriva dal telefono: se serve più rigore, timbrarlo sul server (tappa 4).
- Python non è installato su questo PC: `npm run simula` non parte.
- Lo schema `0001` è applicato: le modifiche vanno in `0002` e successive.

## Come verificare

- `npm test`: regole di gioco.
- `npm run prova:schema`: sicurezza dello schema su PGlite (35 controlli).
- `npx tsc -p .` e `npm run build`: tipi e build della PWA.
- Supabase: avvisi di sicurezza e `supabase_migrations.schema_migrations` allineata alle migrazioni del repository.
