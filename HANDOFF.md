# HANDOFF

## Dove siamo

Sprint 1, **tappa 1 (fondamenta) chiusa** e unita a `main` l'8 novembre 2026: progetto Vite + React + PWA; regole di gioco con test (29 verdi); schema `0001` + `0002` applicati su Supabase; utenti e profili (Lani, Papà, Mamma) con RLS provata; accesso con sessione persistente; area genitori con PIN provata sull'iPad; Vercel collegato a GitHub; Edge Function `passi` pubblicata e provata.

**Tappa 2 (Nuvola)** in corso sul branch `tappa-2-nuvola`: `sync-nuvola` pubblicata e provata dal vivo (14 materie, 28 compiti, 16 verifiche, 24 voti, 12 note; idempotente), cron `0003` attivo e provato via `pg_net`; passi di voti e note (dal 23/11, `periodo.inizio`) con test, 0 movimenti per ora.

## Ultima sessione (8 novembre 2026)

Prova sull'iPad (tappa 1, guasto di `verifica_pin` corretto con `0002`), merge su `main`. Tappa 2: endpoint di Nuvola mappati dal pannello di rete del signore; accesso Keycloak automatico con i segreti `NUVOLA_UTENTE`/`NUVOLA_PASSWORD`; normalizzazione in `src/lib/nuvola` con test.

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
| 8/11 | signore | Lani non prova l'app prima: sorpresa ad app finita. Le prove sui dispositivi le fanno i genitori |
| 7/11 | Jarvis | Schema `0001` approvato con correzione: ore delle spunte di Lani messe dal server (`timbra_ora`), `flashcard_giri.iniziato_il` |

## Prossimo passo

Merge della tappa 2 su `main`, poi tappa 3 (Oggi e Sera). Dal 23/11 controllare in `movimenti_passi` i primi passi di voti e note. Più avanti: avviso ai genitori se la sincronizzazione fallisce (con le push, tappa 6); 2 verifiche su 16 senza materia (nome e docente ambigui). Piccolo debito: l'area genitori mostra "PIN non giusto" anche quando l'errore è del server; distinguere i due casi.

## In attesa di

- Signore: cancellare `C:\progetti\ace\nuvola.har` (dati di Lani, non serve più).
- Signore: sull'iPad, dopo il merge, rifare l'accesso su `ace-passino.vercel.app` (l'anteprima ha un'altra origine, quindi un altro salvataggio). Il PIN resta sul server.

## Attenzione

- Iscrizioni chiuse in Supabase Auth: i nuovi utenti si creano dalla dashboard, con "Auto Confirm User" attivo.
- Gli avvisi di Supabase su `forzieri_lani` (vista security definer) e sulle 5 funzioni RPC sono voluti: vedi i commenti nello schema.
- `db push` va sempre con `--remote`, altrimenti la CLI cerca un database locale in Docker.
- Edge Function `passi`: l'app la chiama con { tipo, id } dopo ogni spunta; mancano borsa (tappa 3), voti e note (tappa 2), rimonta (tappa 5). Si pubblica con `npx supabase functions deploy passi --use-api`.
- L'inizio del giro di flash card arriva dal telefono: se serve più rigore, timbrarlo sul server (tappa 4).
- Python non è installato su questo PC: `npm run simula` non parte.
- Schema `0001`-`0003` applicati: le modifiche vanno in `0004` e successive.
- Nuvola: `/alunni` dà più schede (due per il 2026 in 2A); si usa anno più recente e id più alto (10928). Compiti e voti non hanno id: chiavi costruite in `src/lib/nuvola`. Il segreto del cron sta in due posti: `CRON_SEGRETO` (Edge Functions) e `cron_segreto` (Vault).
- Supabase rifiuta UPDATE e DELETE senza WHERE anche dentro le funzioni (safeupdate); PGlite no, quindi `prova:schema` non lo scopre.
- `db push` dal terminale di Claude Code vuole `--yes` (la CLI non può chiedere conferma); il permesso automatico lo blocca: lo lancia il signore con `!`.
- Le anteprime di Vercel chiedono l'accesso a Vercel; la produzione no.

## Come verificare

- `npm test`: regole di gioco.
- `npm run prova:schema`: sicurezza dello schema su PGlite (35 controlli).
- `npx tsc -p .` e `npm run build`: tipi e build della PWA.
- Supabase: avvisi di sicurezza e `supabase_migrations.schema_migrations` allineata alle migrazioni del repository.
