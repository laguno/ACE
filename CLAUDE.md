# ACE — istruzioni per Claude Code

ACE è un'app ad uso **solo familiare** per Leilani (Lani), 12 anni, seconda media all'IC San Polo d'Enza: compiti, studio, organizzazione e un gioco a percorso ("Astra") che la accompagna verso il Liceo Scientifico Sportivo. La usano Lani (telefono e iPad) e i genitori, Alessandro e Lucrezia. Si lavora in italiano: interfaccia, testi, commenti e messaggi di commit.

## Leggere prima di scrivere codice

1. `docs/06-sprint-1.md`: cosa si costruisce ora, in che ordine, criteri di fatto.
2. `docs/02-regole-di-gioco.md` + `data/config-gioco.json`: regole e numeri (fonte autorevole).
3. `docs/03-schermate.md` + `design/*.html`: schermate e stile.
4. `docs/05-copione.md`: ogni testo che vede Lani, con posa e verso.
5. `docs/04-dati-e-integrazioni.md`: Nuvola, Classroom, calendario, IA, notifiche, accessi.
6. `docs/01-documento-di-progetto.md`: storia completa delle decisioni (dove contraddice i file sopra, valgono quelli).

## Stack

- PWA: React + TypeScript + Vite + `vite-plugin-pwa`, deploy su Vercel.
- Supabase (progetto `qonullxzhqvbfpiibqye`): Postgres con RLS, Auth, Storage (bucket privato `foto-pagine`), Edge Functions, cron.
- Schema iniziale: `supabase/migrations/0001_schema_iniziale.sql` (da rivedere e applicare, non ancora applicato).
- Regole di gioco: `src/lib/regole/index.ts`, funzioni pure con test (`npm test`, vitest).
- Immagini: `public/assets/` (WebP), catalogo in `data/manifest.json`. Non rigenerare né ritoccare gli avatar: sono disegnati con Gemini dal signore.

## Regole che non si discutono

- **Numeri del gioco solo da `data/config-gioco.json`.** Nessun valore di passi, tappe o chiavi scritto a mano nel codice.
- **Lani non scrive mai passi, chiavi, voti, note o premi.** Spunta le cose fatte; i passi li calcola il server in modo idempotente (`movimenti_passi`, chiave unica `motivo + riferimento`).
- **Il premio di un forziere resta nascosto a Lani** finché il forziere non è aperto.
- **Credenziali** (Nuvola, API, calendario) solo come segreti di Supabase/Vercel, inseriti dal signore. Non chiederle in chat, non scriverle nel codice, non metterle nel client.
- **Non entrare nelle piattaforme degli e-book** degli editori e non copiarne il testo. Le pagine arrivano dalle foto del libro di carta.
- **Privacy**: repository privato; niente foto reali di familiari (le sorgenti stanno in `_fuori-app/` sul computer del signore, fuori dal repo); nessuna foto delle compagne di squadra.
- **Copione**: popup con titolo ≤ 4 parole e testo ≤ 25 parole, un popup per apertura, niente emoji, numeri veri, lodare il gesto e non la persona, rimprovero sul fatto con la cosa da fare subito, nessun rimprovero dei genitori dopo le 21:00, mai rimproveri nelle notifiche (≤ 3 al giorno + 1 sollecito, ≤ 60 caratteri).
- **Tono verso Lani**: italiano di casa, "tu", mai parole da adulti, mai umiliare. I voti brutti non si sgridano: si guarda avanti con il piano.

## Come lavorare

- Piccoli passi verificabili; test per ogni regola nuova in `src/lib/regole`.
- Prima di cambiare una regola o un numero, chiedere al signore: le regole sono decise da lui.
- Migrazioni nuove in `supabase/migrations/` con numerazione progressiva; mai modificare una migrazione già applicata.
- Mobile first a 390 px; bersagli tattili ≥ 44 px; contrasto 4,5:1.
- Commit piccoli con messaggi in italiano.

## Comandi

- `npm test`: test delle regole.
- `npm run simula`: simulazione Monte Carlo del percorso (Python 3), per la taratura.
