# Piano studio di ACE: documento di sviluppo per chi continua

Scritto il 20/11/2026 per un'altra sessione di Claude Code che prende il lavoro a metà. Leggilo tutto
prima di toccare qualcosa. Poi leggi, nell'ordine: `HANDOFF.md`, `CLAUDE.md`, `docs/02-regole-di-gioco.md`,
`data/config-gioco.json`, `docs/05-copione.md`.

## 1. Come si lavora con il signore (non saltare)

- Si scrive **sempre in italiano**: risposte, interfaccia, commenti, commit.
- Le decisioni sono del signore. Si fa **una domanda alla volta**, mai un elenco di domande.
- Regole che non si discutono (da `CLAUDE.md`):
  - numeri del gioco solo in `data/config-gioco.json`;
  - i passi li calcola il server;
  - migrazioni già applicate mai modificate;
  - copione con limiti di parole;
  - niente emoji in popup e notifiche.
- **Niente coda di approvazione per i genitori**, per nessuna funzione: il signore non la può gestire.
- **Nessun controllo privacy sulle foto** delle pagine: dentro non ci sono nomi, ci pensa lui.
- **Niente push, niente pubblicazione in produzione, niente `db push`** senza un ok esplicito del signore in chat.

## 2. Dove sta il lavoro

- Repository: `C:\progetti\ace\app` (cartella principale).
  - È sul ramo `rifinitura`, con lavoro non salvato di un'altra sessione.
  - **Non cambiare ramo lì e non toccare quei file.**
- Ramo del piano studio: `studio`, nel worktree `C:\progetti\ace\app-studio`. Si lavora solo qui.
- Il ramo esiste **solo su questo computer**: non è mai stato pushato.
  - Se la nuova sessione gira su un altro computer, il signore deve prima autorizzare il push del ramo `studio` su GitHub.
  - Se gira sullo stesso computer, basta aprire la cartella `C:\progetti\ace\app-studio`.
- Ultimo commit: `1556360` ("numeri confermati dal signore il 20/11 (in corso)").
- **`origin/main` è andato avanti di 2 commit** dopo l'unione: `3c57b72` (Settimana: i genitori tolgono cartella o borsa) e `3933b7c` (HANDOFF).
  - Vanno portati dentro (vedi §6, passo 1).
  - Lo chiede anche la prova `scripts/allinea-main.test.ts`, che fallisce finché il ramo non contiene `origin/main`.
- I rami d'origine dei blocchi sono già tutti uniti in `studio`; tienili solo come riferimento:
  - `metacognizione` (worktree `C:\progetti\ace\app-metacognizione`);
  - `studio-tutor` (`app-studio-tutor`);
  - `studio-mate` (`app-studio-mate`);
  - `studio-notifiche` (`app-studio-notifiche`);
  - `studio-carte` (`app-studio-carte`).

## 3. Cosa è il piano

È il piano di studio basato sulle evidenze (prima proposto da "Jarvis", poi rivisto sul codice vero), approvato dal signore il 19/11/2026. Si fa tutto insieme, non a fasi.

| Blocco | Cosa fa | File principali | Migrazioni |
|---|---|---|---|
| A ripasso FSRS | FSRS-5 come regola pura, a giorni interi. Prima di girare la carta Lani dice quanto è sicura (non lo so / forse / sicura); il voto FSRS nasce da sicurezza ed esito. "Sicura ma sbagliata" resta segnata come sovrastima. Con una verifica in calendario la carta torna prima della data. | `src/lib/regole/fsrs.ts`, `src/Ripasso.tsx` | 0045 |
| B pillole | Carte del giorno: si pescano 40 scadute, si compone una pillola di massimo 12, mescolata tra argomenti; le carte nuove a blocco all'inizio. Coda dei ripassi sul telefono senza rete (chiave unica, niente doppioni). Le letture offline le copre già Workbox. | `src/lib/regole/pillola.ts`, `src/coda-studio.ts`, `src/Studio.tsx` | — |
| C passi nuovi | Passi misti: restano tutti quelli di prima. In più carte del giorno (una volta al giorno, senza guardare le giuste) e ripasso della vigilia (extra sull'ultima sessione fatta il giorno prima della verifica). | `supabase/functions/_shared/passi.ts`, `src/lib/regole/index.ts` (`ripassoCumulativo`), `come-passi.ts` | — |
| D metacognizione | Piano del giorno con minuti stimati e veri; voto previsto contro voto vero di Nuvola, mostrato come tendenza; micro-lezione settimanale; riepilogo della domenica per i genitori. | `src/Metacognizione.tsx`, `src/genitori/Riepilogo.tsx` | 0050–0052 |
| E tutor | Estende `spiega`: tentativo obbligatorio prima degli indizi, "Spiegamelo tu", storico per i genitori, tetto giornaliero, controllo lato server che la risposta non contenga il risultato. | `supabase/functions/spiega`, `src/Tutor.tsx`, `src/genitori/Tutor.tsx` | 0055–0056 |
| F matematica | Serie mescolate generate dall'IA (`genera-mate`), esempi svolti che si svuotano, modello a barre. Passi per serie tentata, non per risposte giuste. | `src/Matematica.tsx`, `supabase/functions/genera-mate` | 0060–0063 |
| G notifiche | Niente notifiche a Lani durante allenamenti e partite (con margini) e dalle 21:00; nelle sere piene niente ripasso serale. Tetto invariato: 3 al giorno + 1 sollecito. | `src/lib/calendario/index.ts`, `supabase/functions/notifiche` | — |
| H qualità carte | Controllo automatico delle carte dell'IA prima di salvarle, in `genera-studio` e `foto-studio`; una carta segnalata da Lani resta fuori dal giro. | `supabase/functions/genera-studio`, `foto-studio` | 0070 |

Nota: FSRS è scritto in casa perché la rete dell'ufficio blocca `npm install ts-fsrs` (`UNABLE_TO_GET_ISSUER_CERT_LOCALLY`). La forma (voti 1–4, stabilità, difficoltà) è la stessa della libreria: si può passare a `ts-fsrs` più avanti senza cambiare il resto.

## 4. Numeri confermati dal signore il 20/11/2026

Sono già scritti in `data/config-gioco.json` (commit `1556360`).

| Voce | Valore | Dove |
|---|---|---|
| Carte del giorno | 3 passi, una volta al giorno | `passi.studio_facoltativo.pillola_del_giorno` |
| Ripasso della vigilia | +3 sopra i 10 del ripasso (totale 13) | `passi.studio_facoltativo.ripasso_cumulativo` |
| Voto previsto entro mezzo voto | 3 passi | `metacognizione.voto_previsto.passi` |
| Serie di matematica | 3 passi | `passi.studio_facoltativo.matematica_serie` |
| Tutor | 12 chiamate al giorno | `tutor.chiamate_al_giorno` |
| Allenamento "tardo" (niente ripasso serale) | dalle 18:00 | `notifiche.allenamento_tardo_dalle` (sezione del silenzio) |
| Silenzio intorno allo sport | 30 minuti prima, 60 dopo | `...sport.margine_prima_minuti`, `margine_dopo_minuti` |
| Ritenzione FSRS | 0,9 | `ripasso.ritenzione` |
| Intervallo massimo | 30 giorni | `ripasso.intervallo_massimo_giorni` |
| Carte tolte dal giro per errori | mai (0 = mai) | `ripasso.cadute_da_riprendere` |
| Pillola | massimo 12 carte | `ripasso.pillola.carte_max` |

La soglia delle 18:00 vale solo per le sere piene. La chiusura anticipata della giornata ha una soglia sua e non cambia.

## 5. Stato delle prove

L'ultimo giro completo è stato fatto **dopo l'unione, prima dei numeri del 20/11**:
- 483 test di unità e 362 controlli di sicurezza dello schema, tutti verdi;
- 219 prove delle schermate verdi, 1 rossa.

L'unica rossa è `e2e/astra.e2e.ts › figurina e album`: era già rotta su `origin/main` e non dipende da questo lavoro.

Dopo i numeri del 20/11 restano rosse queste prove. Sono rosse perché si aspettano i valori provvisori, non perché ci sia un errore:

1. `src/lib/calendario/silenzio.test.ts › orarioSollecito › martedì con allenamento alle 18:30 (chiusura alle 18:00): il sollecito aspetta il rientro`
2. `supabase/functions/_prove/cron.test.ts › notifiche › mai durante l'allenamento: i compiti nuovi delle 14:45 aspettano il rientro`
3. `supabase/functions/_prove/cron.test.ts › notifiche › martedì con allenamento alle 18:30: chiusura alle 18:00, sollecito solo al rientro`
4. `supabase/functions/_prove/cron.test.ts › notifiche › partita FIPAV la sera: niente sollecito, né in campo né dopo le 21`
5. `scripts/allinea-main.test.ts › contiene origin/main`: si risolve con il passo 1 del §6.

Le prove 1–4 calcolano gli orari con i margini vecchi (15 prima / 30 dopo) e con l'allenamento tardo alle 17:00. Vanno riscritte con 30 / 60 e 18:00.
- **Non cambiare i numeri per far passare le prove.**
- Ricalcola gli orari attesi: per esempio, un allenamento dalle 18:30 alle 20:00 ora silenzia dalle 18:00 alle 21:00, che è già l'ora del silenzio serale. Il sollecito quindi non parte quella sera, o va anticipato come dice la regola in `src/lib/calendario/index.ts` (`_nota_silenzio` in config).
- Controlla con la regola pura cosa succede davvero e scrivi l'attesa giusta.
- Se il comportamento che ne esce ti sembra sbagliato per Lani (per esempio, sollecito mai inviato nelle sere di allenamento), **chiedi al signore prima di cambiare la regola**.

## 6. Cosa resta da fare, in ordine

1. **Portare dentro `origin/main`**:
   ```
   cd C:\progetti\ace\app-studio
   git fetch origin
   git merge --no-ff origin/main
   ```
   Se ci sono conflitti, quasi sempre sono aggiunte di due parti nello stesso punto: tieni entrambe. Le migrazioni non si scontrano: 0044 è di main, le nostre sono 0045–0070.
2. **Sistemare le prove 1–4 del §5** come spiegato sopra. Commit piccolo in italiano.
3. **Giro completo delle prove**, tutto verde tranne `astra › figurina e album`:
   ```
   npx tsc -b --noEmit
   npx eslint .
   ```
   Per i test di unità (in bash) servono variabili finte, senza le quali `src/genitori/comune.test.ts` fallisce:
   ```
   VITE_SUPABASE_URL=http://localhost:54321 VITE_SUPABASE_PUBLISHABLE_KEY=finta npx vitest run
   ```
   Poi:
   ```
   npm run prova:schema
   ```
   Per le prove delle schermate (in bash):
   ```
   PORTA_PROVE=5291 npx playwright test
   ```
   La porta di default 5179 è spesso occupata dalle altre copie del progetto. Il giro completo dura circa 4–6 minuti: lancialo in sottofondo.
4. **Aggiornare `HANDOFF.md`**: nella sezione "Piano studio basato sulle evidenze" togli la riga "Da confermare col signore" e scrivi che i numeri sono confermati il 20/11, con rimando al §4 di questo file. Massimo una pagina in tutto.
5. **Fermarsi e chiedere al signore** se vuole pubblicare. Una domanda sola.

## 7. Pubblicazione (solo con l'ok del signore)

Leggi prima la parte su pubblicazione e finestre vietate in `HANDOFF.md` e `docs/runbook.md`. In breve:
- **Finestre vietate**: 14:20–14:45 e 19:45–21:00, quando girano `sync-nuvola` e le notifiche della sera.
- **Backup prima di tutto**: `npm run backup` (serve Docker).
- **Prove verdi** come al §6, passo 3.
- **Ramo**: unire `studio` in `main` e fare il push, solo con l'ok.
- **Migrazioni**: da 0045 a 0070, con `supabase db push --remote --yes --include-all`. Supabase rifiuta UPDATE e DELETE senza WHERE.
- **Edge Functions da pubblicare**:
  - toccate direttamente: `spiega`, `notifiche`, `genera-studio`, `foto-studio`;
  - nuova: `genera-mate`;
  - tutte quelle che importano `_shared` cambiato, almeno `passi` e `sync-nuvola`.
  - Per sicurezza conviene ripubblicarle tutte.
- **App**: deploy su Vercel come al solito.
- **Dopo**: controllare `sync_log`, Stato di ACE e il telefono di Lani (prima pillola, sicurezza prima di girare, notifiche nella sera di allenamento).

## 8. Trappole già incontrate

- **`main` locale indietro**: la base giusta è sempre `origin/main`. Fai `git fetch` prima di tutto.
- **Cartella principale**: in `C:\progetti\ace\app` non fare `git switch` né `git stash` senza nome. La pila degli stash è condivisa tra tutti i worktree.
- **Niente Python sul computer**: per piccoli script usa `node`.
- **`config-gioco.json` va cambiato riga per riga** (Edit o sostituzioni mirate). `JSON.stringify` riformatta tutto il file e rende illeggibile il diff.
- **I file hanno fine riga CRLF**: le sostituzioni che cercano `\n` possono non trovare niente. Meglio lo strumento Edit.
- **Supabase finto delle prove (`e2e/finto.ts`)**: un filtro `eq` su una colonna che non c'è nei dati finti scarta la riga. Per i booleani nuovi usa `.neq('colonna', true)`. Le colonne con default del database nei dati finti mancano.
- **`src/tipi-database.ts`** è aggiornato a mano per le colonne nuove. Se lo rigeneri da Supabase, prima applica le migrazioni.
- **`scripts/prova-schema.mjs`** ha l'elenco `LANI_INSERISCE` delle tabelle in cui Lani può scrivere. Ogni tabella nuova scrivibile da Lani va aggiunta lì, altrimenti la prova di sicurezza fallisce (e deve fallire).
- **`tsconfig.tsbuildinfo`** nella cartella non va committato.

## 9. Criterio di fatto

- Ramo `studio` con dentro `origin/main`.
- Tutte le prove verdi tranne `astra › figurina e album`.
- `HANDOFF.md` aggiornato.
- Nessun numero cambiato senza il signore.
- Niente in produzione finché il signore non dice sì.
