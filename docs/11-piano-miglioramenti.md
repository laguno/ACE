# Piano di miglioramenti (17/11)

Revisione di ACE del 17/11. Il gioco di pallavolo è escluso: se ne parla dopo.

## Regole di lavoro

- Si lavora nel worktree `app` (`C:\progetti\ace\app`), non in `app-gioco`, dove un'altra sessione ha modifiche aperte.
- Ramo `rifinitura` da `main` aggiornato.
- Un commit per punto, in italiano, test verdi a ogni passo.
- Backup (`npm run backup`) prima di ogni pubblicazione. Finestre vietate: 14:20-14:45 e 19:45-21:00.
- Mai scrivere né chiedere segreti in chat.

## Passo 0: salvare il piano

Questo documento.

## Passo 1: verifica a schermo (sola lettura, nessuna modifica al codice)

Lanciare `npx playwright test accessibilita`, `npm run lighthouse` e `MISURE_GENITORI=1 npx playwright test genitori-misure`. Scrivere i risultati nella sezione "Verifica del 17/11": cosa passa, cosa fallisce, punteggi Lighthouse di Oggi, Sera, Studio, Astra.

Verifica già fatta a mano (da confermare): bordi dei campi 3,16:1 (ok), "← Astra" con pillola bianca (ok), popup con `<dialog>` (ok), etichetta "Esci dall'account" (ok).

Da controllare a schermo e riferire:

- (a) il corsivo del biglietto dell'enigma (`.biglietto p`, `stile.css` riga 442) è un corsivo vero o simulato? Il font Nunito corsivo viene caricato?
- (b) nome accessibile dei forzieri in `Astra.tsx` riga 240: "Forziere N: X passi, Y chiavi" non contiene il testo visibile "915 · 4 chiavi" (WCAG 2.5.3). Proporre la correzione.

## Verifica del 17/11

Fatta il 17/11 alle 15:10-15:40 sul ramo `rifinitura` (= `main` a `b8749ab`), senza modifiche al codice.

### `npx playwright test accessibilita` (axe)

42 su 42 passano: 21 schermate (Oggi, Sera, Studio, Astra, Figurina, Album, i quattro popup, Benvenuta, le pagine dei genitori) in tema chiaro e scuro, a 390 px, con WCAG 2.0/2.1/2.2 A e AA e best-practice. Zero violazioni.

### `npm run lighthouse`

Tutti e 5 i test passano, compresa la prova CSP (nessuna violazione su tutte le schermate). Punteggi a 390 px (caricamento completo; per Studio e Astra anche la fotografia dopo il clic sulla scheda):

| Schermata | Prestazioni | Accessibilità | Buone pratiche | SEO |
|---|---|---|---|---|
| Oggi | 85 | 100 | 100 | 50 |
| Sera | 87 | 100 | 100 | 50 |
| Studio | 84 | 100 (scheda: 100) | 100 | 50 (scheda: 67) |
| Astra | 85 | 100 (scheda: 100) | 100 | 50 (scheda: 67) |

- Prestazioni: il punto debole è il primo disegno grande (LCP, punteggio 0,44-0,58) e il CSS non usato (0,5); il cambio di scheda è a 100. Non è un difetto di accessibilità: resta fuori dal passo 3.
- SEO 50: voluto. App privata, non indicizzabile (niente `meta description`, `robots.txt`, pagina non scansionabile). Nessuna azione.

### `MISURE_GENITORI=1 npx playwright test genitori-misure`

Fallisce, ma per lo script, non per l'app.

- Con `=1` (fase "prima") lo script percorre l'area genitori di prima del restyling del 16/11: cerca il pulsante "Balla" in prima pagina, che non c'è più. Va in timeout a 390 e 360 px.
- Con `=dopo` (fase attuale) si ferma al passo `04-partita`: cerca "Approva" in "Da fare per voi", ma dal commit `e2225d1` il risultato delle partite arriva solo dalla FIPAV e i genitori non approvano più.
- Effetto collaterale: lo script scrive `docs/genitori-ux/misure-<fase>.json` anche quando fallisce e svuota le misure buone. I due file sono stati ripristinati con `git restore`.
- Correzione proposta (non fatta, il passo 1 è in sola lettura): togliere il passo `04-partita` da `DOPO` e scrivere il file solo se entrambe le larghezze sono state misurate. Va approvata dal signore.

### Controlli fatti a mano: confermati

- Bordi dei campi 3,16:1, "← Astra" con pillola bianca, popup con `<dialog>`, etichetta "Esci dall'account": nessuna violazione axe sulle schermate che li contengono; confermati.

### (a) Corsivo del biglietto dell'enigma

Corsivo vero. Prova a schermo (Astra, forziere 2 con l'enigma, 390 px): `.biglietto p` ha `font-style: italic`, peso 600, famiglia Nunito, e la faccia "Nunito italic 600" risulta caricata (`document.fonts.check('italic 600 16px Nunito')` vero). Le facce corsive 600 e 800 sono importate in `src/main.tsx` (righe 15-16). Il browser non deve inclinare il testo da solo. Nessuna azione.

### (b) Nome accessibile dei forzieri

Già a posto. Dal commit `fe73938` l'etichetta visibile e il nome accessibile dicono la stessa cosa: a schermo "395 passi, 2 chiavi", nome "Forziere 1: 395 passi, 2 chiavi". Il nome contiene il testo visibile, quindi WCAG 2.5.3 (Label in Name) è rispettato. La forma "915 · 4 chiavi" citata nel piano era quella di prima. Nessuna correzione necessaria.

## Passo 2: avviso Nuvola

Se `sync_log` ha due esiti consecutivi non ok (`errore` o `interrotta`) per `sync-nuvola`, notificare ai soli genitori, una volta, con una riga. Mai rimproveri, niente a Lani, rispettare i limiti del copione e il tetto di notifiche in `manda()`. Provare con test.

## Passo 3: correzioni di accessibilità emerse dal passo 1

Solo difetti, non gusti. Un commit per punto.

## Passo 4: backup pianificato (solo proposta, non implementare)

Controllare se il piano Supabase del progetto offre già backup giornalieri. Proporre (non fare) una GitHub Action notturna con `pg_dump` cifrato e conservazione di 14 giorni; la stringa di connessione la inserisce il signore come segreto del repository. Scrivere la proposta in questo documento e fermarsi.

### Esito del passo 3 (17/11)

Nessuna correzione: il passo 1 non ha trovato difetti di accessibilità (axe zero violazioni, Lighthouse 100, corsivo vero, nomi dei forzieri già allineati). L'unico guasto, lo script delle misure dei genitori, non è un difetto di accessibilità: la correzione è proposta sopra e aspetta l'ok.

## Proposta di backup pianificato (17/11, da approvare: niente è stato fatto)

### Cosa offre oggi Supabase

L'organizzazione `laguno` è sul piano **Free**. Supabase fa i backup giornalieri solo dai piani Pro (7 giorni), Team (14) ed Enterprise (fino a 30); per il Free consiglia di esportare i dati da soli con `db dump` e tenerli altrove. Il PITR è un'aggiunta a pagamento dei piani Pro e superiori (circa 100 $ al mese per 7 giorni). Oggi l'unico backup di ACE è `npm run backup` lanciato a mano dal signore (dati dello schema `public`, in `Documenti\ACE-backup`).

Alternativa senza codice: passare a Pro (25 $ al mese) dà 7 giorni di backup giornalieri, ma non 14, e i file restano dentro Supabase. La GitHub Action qui sotto costa zero e tiene una copia fuori da Supabase.

### La GitHub Action proposta

File `.github/workflows/backup-notte.yml`:

- **Quando**: ogni notte alle 3:15 ora di Roma (`cron: '15 2 * * *'` in UTC d'inverno), fuori dalle finestre dei cron (14:20-14:45, 19:45-21:00). Anche a mano con `workflow_dispatch`.
- **Cosa**: `pg_dump` versione 17, la stessa del server (dal repository `apt.postgresql.org`), con `--schema=public --no-owner --no-privileges`. Esporta struttura e dati: il file si ripristina da solo, senza rilanciare le migrazioni. Niente `auth`, niente Vault, niente foto (lo Storage resta fuori, come in `npm run backup`; vedi `docs/runbook.md`).
- **Cifratura**: con `age` e una **chiave pubblica** scritta nel workflow. La chiave privata la genera il signore sul suo PC (`age-keygen`) e la tiene accanto al keystore dell'APK, mai nel repository né in GitHub. Così il server di GitHub può cifrare ma non decifrare. Se la chiave privata si perde, i backup non si aprono più.
- **Conservazione**: il file cifrato va negli artefatti dell'esecuzione con `retention-days: 14`; GitHub cancella da solo quelli più vecchi. Un backup pesa pochi kB (i file di `npm run backup` stanno sotto 1 MB), molto sotto i 500 MB di artefatti del piano gratuito per i repository privati.
- **Controllo**: il passo fallisce se il dump è vuoto o non contiene `CREATE TABLE`, come `backup.mjs` per i file vuoti. Un'esecuzione fallita manda la mail di GitHub al proprietario del repository.
- **Segreto**: uno solo, `SUPABASE_DB_URL`, che il signore inserisce in GitHub (Settings → Secrets and variables → Actions). Va usata la stringa del **Session pooler** (porta 5432, utente `postgres.qonullxzhqvbfpiibqye`): l'indirizzo diretto `db.…supabase.co` sul piano Free è solo IPv6 e i runner di GitHub non lo raggiungono. Meglio ancora un utente Postgres di sola lettura dedicato al backup (una migrazione nuova, `0040`, senza password nel file: la password la imposta il signore).
- **Ripristino** (da provare una volta, su Supabase locale): scaricare l'artefatto, `age -d -i chiave-ace.txt backup.sql.age > backup.sql`, poi `psql` sul database locale. La procedura finirebbe in `docs/runbook.md`.

### Decisioni del signore prima di partire

1. GitHub Action gratuita oppure piano Pro di Supabase.
2. Utente Postgres di sola lettura, oppure la stringa di `postgres` così com'è.
3. Dove tenere la chiave privata di `age`.

## Passo 5: sensorialità (non iniziare senza l'ok esplicito del signore)

Il signore vuole più sensorialità e dinamismo. Il principio 4 di PRODUCT.md ("Calore senza rumore") va aggiornato prima di toccare l'interfaccia. Quando il signore dà l'ok:

- Valori (durate, intensità, volumi) in un solo file di configurazione, nessun numero sparso nel codice.
- Il feedback si dimensiona sulla frequenza: spunta (20 volte al giorno) minuscola; tappa, forziere, partita vinta in R-Evolution, chiave: momento grande.
- `prefers-reduced-motion` rispettato; niente ansia, niente conti alla rovescia, nessun suono nelle notifiche.
- Suono: un solo AudioContext, sblocco al primo tocco, interruttore per dispositivo in Impostazioni dei genitori; file Kenney (Interface Sounds, UI Audio, controllare la licenza) di pochi kB, nel service worker. Su iPad (PWA) il Web Audio può restare muto al rientro dal background e col tasto silenzioso: usare un fallback `<audio>` o unmute-ios-audio e riferire cosa funziona solo dopo prova sull'iPad vero. `navigator.vibrate` non esiste su iOS: lì solo visivo.
- Strumenti: comandi `animate` e `delight` di Impeccable (`npx skills add pbakaus/impeccable --skill animate` e `--skill delight`, se non presenti). `delight` aggiunge momenti di gioia e tocchi inattesi; `animate` animazioni e microinterazioni che sostengono usabilità e piacere. In aggiunta, la skill `design-skills:interaction-design` per microinterazioni, stati e gesti (consiglio di Jarvis, 17/11).
- Mappa: spunta = cerchio che si riempie con rimbalzo, "+N" che sale, tic breve, vibrazione 10 ms; tappa = momento grande con jingle breve e doppia vibrazione corta; forziere = scossa, apertura, premio che emerge, apertura e brillio, una vibrazione lunga; partita vinta = tabellone animato, sticker che festeggia, fischio e applauso brevi; errore = piccola scossa, nessun suono; cambio schermata = transizione di 150-200 ms.

Principio 4 di PRODUCT.md aggiornato e approvato dal signore il 17/11 ("Calore che risponde, senza rumore"); ok del signore al passo 5 il 17/11.

## A fine sessione

Aggiornare HANDOFF.md (massimo una pagina), commit e push. Riferire in 5 righe: cosa è fatto, cosa fallisce ancora, cosa serve dal signore.
