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

## Passo 2: avviso Nuvola

Se `sync_log` ha due esiti consecutivi non ok (`errore` o `interrotta`) per `sync-nuvola`, notificare ai soli genitori, una volta, con una riga. Mai rimproveri, niente a Lani, rispettare i limiti del copione e il tetto di notifiche in `manda()`. Provare con test.

## Passo 3: correzioni di accessibilità emerse dal passo 1

Solo difetti, non gusti. Un commit per punto.

## Passo 4: backup pianificato (solo proposta, non implementare)

Controllare se il piano Supabase del progetto offre già backup giornalieri. Proporre (non fare) una GitHub Action notturna con `pg_dump` cifrato e conservazione di 14 giorni; la stringa di connessione la inserisce il signore come segreto del repository. Scrivere la proposta in questo documento e fermarsi.

## Passo 5: sensorialità (non iniziare senza l'ok esplicito del signore)

Il signore vuole più sensorialità e dinamismo. Il principio 4 di PRODUCT.md ("Calore senza rumore") va aggiornato prima di toccare l'interfaccia. Quando il signore dà l'ok:

- Valori (durate, intensità, volumi) in un solo file di configurazione, nessun numero sparso nel codice.
- Il feedback si dimensiona sulla frequenza: spunta (20 volte al giorno) minuscola; tappa, forziere, partita vinta in R-Evolution, chiave: momento grande.
- `prefers-reduced-motion` rispettato; niente ansia, niente conti alla rovescia, nessun suono nelle notifiche.
- Suono: un solo AudioContext, sblocco al primo tocco, interruttore per dispositivo in Impostazioni dei genitori; file Kenney (Interface Sounds, UI Audio, controllare la licenza) di pochi kB, nel service worker. Su iPad (PWA) il Web Audio può restare muto al rientro dal background e col tasto silenzioso: usare un fallback `<audio>` o unmute-ios-audio e riferire cosa funziona solo dopo prova sull'iPad vero. `navigator.vibrate` non esiste su iOS: lì solo visivo.
- Strumenti: comandi `animate` e `delight` di Impeccable (`npx skills add pbakaus/impeccable --skill animate` e `--skill delight`, se non presenti). `delight` aggiunge momenti di gioia e tocchi inattesi; `animate` animazioni e microinterazioni che sostengono usabilità e piacere. In aggiunta, la skill `design-skills:interaction-design` per microinterazioni, stati e gesti (consiglio di Jarvis, 17/11).
- Mappa: spunta = cerchio che si riempie con rimbalzo, "+N" che sale, tic breve, vibrazione 10 ms; tappa = momento grande con jingle breve e doppia vibrazione corta; forziere = scossa, apertura, premio che emerge, apertura e brillio, una vibrazione lunga; partita vinta = tabellone animato, sticker che festeggia, fischio e applauso brevi; errore = piccola scossa, nessun suono; cambio schermata = transizione di [testo del piano interrotto qui: da completare col signore]
