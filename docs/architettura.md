# Architettura di ACE

Una pagina per orientarsi. I dettagli stanno nel codice, nei commenti delle migrazioni e nei documenti 01-07.

## I pezzi

- **App** (PWA): React + TypeScript + Vite, `vite-plugin-pwa`, su Vercel (`ace-passino.vercel.app`, `noindex`, CSP in `vercel.json`). Lani dal telefono Android e dall'iPad, i genitori dai loro telefoni. Le regole del gioco sono funzioni pure in `src/lib/regole` (numeri solo da `data/config-gioco.json`), il copione in `src/lib/copione`.
- **Supabase** (progetto `qonullxzhqvbfpiibqye`): Postgres con RLS, Auth (iscrizioni chiuse), Storage privato (`foto-pagine`, `premi`), Edge Functions in Deno, cron (`pg_cron` + `pg_net`, segreto nel Vault).
- **Fuori**: Nuvola (registro elettronico, sola lettura, credenziali nei segreti), il calendario di famiglia (iCal privato di Google), Anthropic (spiegazioni, studio, enigmi: al massimo una chiamata per compito o enigma), Web Push (chiavi VAPID).

## Dati (schema `0001`-`0025`)

| Gruppo | Tabelle | Chi scrive |
|---|---|---|
| Scuola | `materie`, `compiti`, `verifiche`, `voti`, `note`, `lezioni` | `sync-nuvola`; Lani solo la spunta (`fatto_il`, ora del server) |
| Studio | `sessioni_ripasso`, `flashcard`, `flashcard_giri`, `quiz`, `quiz_tentativi`, `video`, `video_visti` | `genera-studio`; Lani spunte e giri |
| Casa | `serate`, `fogli_firma`, `impegni_famiglia`, `umore`, `gesti_casa`, `sgridate` | Lani spunte; genitori gesti, sgridate, fogli; `sync-calendario` |
| Gioco | `movimenti_passi`, `settimane`, `forzieri` (+ vista `forzieri_lani`), `figurine`, `popup_coda`, `saldo_visto` | solo il server (`registra_passi` idempotente, chiave `motivo + riferimento`); genitori premio e consegna |
| Foto | `richieste_foto`, `foto_pagine` + bucket `foto-pagine` | `sync-nuvola` le richieste; Lani e genitori il file e la riga (solo con il file vero) |
| Servizio | `profili`, `impostazioni`, `pin_genitori`, `frasi`, `push_iscrizioni`, `notifiche_inviate`, `sync_log`, `errori_client` | genitori e server |

Regola di fondo: **Lani spunta, il server conta**. I genitori leggono tutto e scrivono solo quello che l'area genitori usa. Ogni permesso è provato in `npm run prova:schema` (matrice per tabella).

## Funzioni e cron

| Edge Function | Chi la chiama | Cosa fa |
|---|---|---|
| `passi` | app (Lani e genitori) dopo ogni spunta | rilegge la riga e assegna i passi con le regole (`_shared/passi.ts`) |
| `sync-nuvola` | cron 14:30 e 19:30 | compiti, verifiche, voti, note, lezioni; passi di voti e note (`_shared/voti.ts`); richieste di foto; lancia `genera-studio` |
| `genera-studio` | `sync-nuvola`, genitori | piano di ripasso, flash card e quiz con Claude |
| `sync-calendario` | cron ogni ora (:05) | calendario di famiglia, 14 giorni (`src/lib/calendario/ics.ts`) |
| `chiavi` | cron domenica 21:30 | chiavi della settimana, rimonta, forzieri (`_shared/chiavi.ts`) |
| `notifiche` | cron ogni 15 minuti | mattina, compiti nuovi, chiusura, sollecito, riepilogo; una per tipo e giorno |
| `enigma` | genitori (genera), Lani (rispondi) | enigmi a tipi con risolutore di controllo; tentativo atomico |
| `premi` | app | URL firmati delle immagini dei premi (sagoma prima, vera dopo) |
| `spiega` | app (lampadina) | spiegazione e tre indizi, salvata sul compito |

Tutte passano da `_shared/accesso.ts` (CORS solo per ACE, corpo ≤ 4 KB, segreto del cron a tempo costante) e registrano gli errori in `errori_client` (`_shared/ambiente.ts`). I cron sono in UTC: quelli che devono cadere a un'ora italiana girano due volte e la funzione salta il giro sbagliato.

## Un passo, dalla spunta al popup

```mermaid
sequenceDiagram
  participant L as Lani (app)
  participant DB as Postgres (RLS)
  participant P as Edge Function passi
  participant A as App (Oggi, Astra)
  L->>DB: update compiti set fatto_il (dopo 5 s di "Annulla")
  Note over DB: trigger: solo fatto_il, ora del server
  L->>P: { tipo: 'compito', id }
  P->>DB: rilegge il compito, storni, chiavi già date
  P->>DB: registra_passi('compito', id, 10 o 13)
  Note over DB: chiave unica motivo+riferimento: mai doppio
  P->>DB: forzieri: enigma o apertura; popup_coda (uno per evento)
  P-->>L: { passi, forzieri }
  A->>DB: vedi_saldo(): dal vecchio saldo al nuovo
  A->>DB: popup_coda: un popup per apertura
```

## Prove

`npm test` (regole, copione, calendario, Nuvola, enigmi, accesso, simulatore breve, idempotenza dei cron), `npm run test:server` (in UTC), `npm run prova:schema` (sicurezza su PGlite), `npm run prova:schermate` (Playwright con Supabase finto), `npm run simula:anno`, `npm run lighthouse` (con la CSP), `npm run axe`, `npm run lint`, `npx knip`, `npm run tipi:funzioni`.
