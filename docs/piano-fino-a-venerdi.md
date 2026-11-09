# Piano di lavoro dal 9 al 13 novembre 2026

Scritto da Jarvis, approvato dal signore il 9/11. Vale per le sessioni con l'account Claude **aziendale**, finché Jarvis non torna venerdì 13. Si legge dopo `CLAUDE.md` e `HANDOFF.md`.

**Obiettivo.** Venerdì ACE deve essere un progetto da manuale, non solo un'app che funziona: codice pulito, sicurezza provata da Lani "attaccante", un anno di scuola simulato senza errori, ogni caso limite coperto, misure prima e dopo. Venerdì Jarvis legge `docs/rapporto-venerdi.md` e controlla tutto.

---

## 1. Paletti (non si discutono)

### Account e dati
- Questa è l'app di una bambina e gira con un account di lavoro. **Nessun dato reale di famiglia nelle conversazioni.** Non leggere e non stampare in chat righe reali di voti, note, compiti, foto, frasi di famiglia o premi: per i controlli bastano conteggi e aggregati (`count(*)`, `max(data)`).
- Prove e simulazioni sempre su **dati finti**, in locale (PGlite o Supabase locale) o con il Supabase finto di Playwright. Sul database vero solo letture aggregate, migrazioni nuove e deploy, come già concesso.
- L'avviso dell'hook "account aziendale" è atteso questa settimana: il signore lo sa. Non togliere l'hook.

### Lani non sa niente
- L'app è una **sorpresa**: nessuna notifica, email o popup deve arrivare ai dispositivi di Lani prima del 23/11. Le prove delle notifiche si fanno solo sui dispositivi dei genitori o con iscrizioni finte.
- Non accedere con l'account di Lani da dispositivi reali.

### Regole del gioco e copione
- **Numeri, regole e testi del copione non si cambiano.** Se un controllo trova un problema di regola o di testo, va nella sezione "Da decidere" del rapporto, con proposta, e non si implementa. Unica eccezione: errori evidenti (refusi, singolare e plurale, un numero diverso da `config-gioco.json`).
- Mai indebolire o cancellare un test per farlo passare. Se un test era sbagliato, si spiega perché nel commit.

### Sicurezza e costi
- Segreti solo dove sono. Niente nuovi servizi esterni che ricevono dati (niente Sentry, analytics, CDN di terzi): gli errori si registrano nel nostro Supabase.
- Chiamate vere all'IA (Anthropic) al massimo **40 in tutta la settimana**, contate nel rapporto. Nelle prove si usano risposte finte.
- Nuvola: nessuna chiamata oltre ai cron già attivi, salvo **una** sincronizzazione manuale per verificare una correzione.
- Mai `git push --force`, mai riscrivere la storia, mai cancellare dati di produzione, mai modificare migrazioni applicate (nuove da `0022`).

### Metodo
- Un ramo per filone (`audit-sicurezza`, `simulatore`, `enigmi`, ...). Commit piccoli in italiano. In `main` solo con **tutte** le prove verdi, `npm run build` e le foto di confronto rigenerate.
- Ogni sera: `HANDOFF.md` aggiornato e push.
- Se il limite d'uso si avvicina, ci si ferma a un punto pulito: ramo in ordine, HANDOFF aggiornato.

---

## 2. Skill e strumenti da installare (lunedì sera)

Installare solo quelli elencati, nel progetto. Telemetria spenta dove esiste, nessun hook automatico senza dirlo nel rapporto.

| Strumento | Come | A cosa serve |
|---|---|---|
| Supabase agent skills | `npx skills add supabase/agent-skills` | Buone pratiche ufficiali su RLS, Storage, Edge Functions, prestazioni Postgres |
| Skill ufficiali Anthropic | `/plugin marketplace add anthropics/skills`, poi `webapp-testing` e `frontend-design` | Prove dell'app con Playwright, rifinitura grafica |
| Impeccable | già installato | Seconda passata di `critique` e `audit` a fine settimana |
| `/security-review` e `/review` | comandi di Claude Code | Revisione di sicurezza e del codice per ogni ramo prima del merge |
| axe-core per Playwright | `@axe-core/playwright` (dev) | Accessibilità automatica su ogni schermata |
| fast-check | `fast-check` (dev) | Prove "a proprietà" sulle regole: migliaia di casi generati |
| Lighthouse CI | `@lhci/cli` (dev) | Punteggi PWA, prestazioni, accessibilità a 390 px |
| gitleaks | binario o `npx gitleaks` | Nessun segreto nella storia del repository |
| knip | `knip` (dev) | Codice, file ed esportazioni morte |
| ESLint | config con `typescript-eslint` strict | Qualità del codice; zero avvisi a fine settimana |

Se una di queste non si installa, si annota nel rapporto e si va avanti: niente sostituti scelti da soli che mandano dati fuori.

---

## 3. Le misure di partenza (lunedì sera, prima di toccare il codice)

Salvare in `docs/rapporto-venerdi.md`, tabella "Prima": numero di prove (unitarie, schema, schermate); copertura delle prove (`vitest --coverage`); errori di `tsc --strict`; avvisi ESLint; risultati knip; Lighthouse (PWA, prestazioni, accessibilità, buone pratiche) su Oggi, Sera, Astra a 390 px; violazioni axe per schermata; punteggi Impeccable (27/40 e 14/20 del 9/11); peso della build; avvisi di sicurezza e prestazioni di Supabase (advisors); gitleaks.

A fine settimana la stessa tabella, "Dopo". Obiettivi:

| Misura | Obiettivo venerdì |
|---|---|
| Prove | almeno il doppio di oggi, tutte verdi |
| Copertura `src/lib` e funzioni del server | ≥ 90% righe |
| `tsc --strict`, ESLint, knip | zero |
| Lighthouse a 390 px | PWA verde, prestazioni ≥ 90, accessibilità 100, buone pratiche ≥ 95 |
| axe | zero violazioni su tutte le schermate |
| Impeccable | critique ≥ 34/40, audit ≥ 18/20 |
| Advisors di Supabase | solo gli avvisi voluti, ciascuno spiegato |
| gitleaks | zero |

---

## 4. I filoni di lavoro, in ordine di priorità

### A. Sicurezza: Lani "attaccante" (martedì)
1. `/security-review` su tutto il repository e sulle Edge Functions; ogni risultato corretto o spiegato.
2. **Prova di attacco completa** con l'utente Lani (in locale): per ogni tabella, vista, funzione RPC, bucket e Edge Function, provare lettura, inserimento, modifica e cancellazione che non le spettano. In particolare: scrivere passi, chiavi, voti, note, premi; leggere premio, soluzione, immagine originale del premio prima dello sblocco; vedere le frasi di famiglia non ancora uscite; cambiare `timbra_ora`; spuntare compiti scaduti; ripetere una casella di studio; tentare l'enigma più di 3 volte in parallelo; leggere le foto di altri; chiamare le funzioni cron senza segreto. Ogni prova diventa un controllo in `npm run prova:schema`.
3. Lo stesso per un **genitore**: non deve poter fare cose da server (es. scrivere movimenti arbitrari fuori dalle funzioni previste).
4. Edge Functions: autenticazione su tutte, CORS solo sui domini di ACE, limiti di dimensione delle richieste, nessun dato sensibile nei log.
5. Intestazioni di sicurezza su Vercel (CSP senza `unsafe-inline` se possibile, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` con la sola fotocamera).
6. gitleaks sulla storia. Advisors di Supabase.

### B. Il simulatore di un anno di scuola (martedì-mercoledì) — il pezzo forte
Uno script `npm run simula:anno` che, su un database locale con le migrazioni vere e le funzioni dei passi vere, fa vivere a una **Lani finta** tutto l'anno dal 23/11/2026 al 4/6/2027, giorno per giorno, con il calendario vero di `config-gioco.json` (vacanze comprese).

- **Profili di Lani**: diligente (95%), normale (80%), altalenante (settimane buone e storte), in crisi a gennaio poi in rimonta, "furbetta" (spunta e poi si fa stornare, prova a barare). Generatore casuale con seme fisso, così ogni giro è ripetibile.
- **Eventi**: compiti da Nuvola (anche cambiati, spostati o cancellati dopo la spunta), verifiche e voti (anche corretti dal docente), note di ogni tipo, gesti e sgridate dei genitori, storni, compiti rifatti, fogli, borsa nei giorni di sport, studio facoltativo fino al tetto, foto richieste, chiavi della domenica, rimonta, forzieri, enigmi (risolti e no), figurine, serie nera e riscatto, pagella del primo quadrimestre, R-Evolution da gennaio (con l'alternativa dicembre, 7.600 passi).
- **Invarianti controllati ogni giorno** (il simulatore si ferma al primo errore e stampa il giorno): saldo mai sotto zero; nessun movimento doppio (`motivo + riferimento`); mai più di 4 caselle di studio per tipo al giorno; gesti di casa mai oltre 6; chiavi della domenica coerenti con le tre regole; forziere aperto solo con tappa e chiavi; enigma visibile una tappa prima; premio e immagine originale mai visibili a Lani prima del tempo; un solo popup per apertura; nessun rimprovero dei genitori mostrato dopo le 21; notifiche ≤ 3 al giorno + 1 sollecito, ≤ 60 caratteri, mai rimproveri; bandierina ferma in vacanza; figurine mai oltre 64; la cima raggiungibile con il profilo all'80%.
- **Uscita**: `docs/simulazione/<profilo>.md` con grafico dei passi, data di ogni forziere, chiavi per settimana, e il confronto con il modello di `scripts/simula_passi.py` (quello Jarvis lo rifà in Python venerdì: esporta anche il CSV con passi per giorno e per motivo, è lo stesso formato che servirà per la taratura di dicembre).

### C. Casi limite e date difficili (mercoledì)
Ognuno diventa una prova:
- **Ora legale**: domenica 28 marzo 2027 (chiavi delle 21:30, chiusura serale, cron in UTC) e il ritorno all'ora solare 31 ottobre. Mezzanotte e giorni a cavallo.
- Fine e inizio delle vacanze di Natale, Pasqua, ponti; primo giorno di scuola dopo le vacanze (piano di ripasso).
- Spunta alle 23:59 e alle 00:01; due dispositivi (telefono e iPad) che spuntano insieme; doppio tocco; "Annulla" premuto allo scadere dei 5 secondi; app chiusa durante i 5 secondi.
- **Offline**: spunta senza rete, rete che torna, app riaperta; cosa vede Lani e cosa succede ai passi.
- Nuvola giù, Nuvola che cambia formato, risposta vuota, compito con testo strano (emoji, solo numeri, pagine "340-352", "pag. 12 es. 3, 5 e 7"); calendario ICS con ricorrenze, eccezioni, eventi di tutto il giorno, fuso orario diverso.
- Verifica spostata, annullata, con voto arrivato prima della verifica in calendario.
- Premio cambiato nei momenti consentiti e no; forziere raggiunto con 0 chiavi; due forzieri raggiunti nello stesso giorno.

### D. Foto delle pagine (mercoledì)
Provare il flusso "Da fotografare" fino in fondo, da Lani e da un genitore, con file veri generati per la prova:
- foto da 12 MP; **HEIC dall'iPad** (convertita o rifiutata con un messaggio chiaro); PNG enorme; file che non è un'immagine; immagine ruotata con EXIF (deve apparire dritta); foto orizzontale; più pagine; stessa foto caricata due volte; caricamento interrotto e ripreso; nessuna rete; permesso della fotocamera negato; spazio del bucket e limiti di dimensione.
- Controllare: compressione (peso finale), passi +2 una volta per richiesta e solo se la foto è di Lani, policy dello Storage (Lani vede solo le sue, nessuno le vede da un indirizzo pubblico), cancellazione di una foto sbagliata da parte di un genitore.

### E. Enigmi e immagini dei premi (giovedì)
Istruzioni già date dal signore, da eseguire per intero:
1. **Premio 7** diventa "Biglietti per una partita di pallavolo femminile di Serie A" (niente cena).
2. **Enigmi di tipo diverso** per forziere, in salita: 1 indovinello in rima; 2 codice segreto (spostamento di una lettera, con la striscia dell'alfabeto nel biglietto); 3 acrostico; 4 codice matematico (A=1… con calcoli da seconda media: potenze, frazioni, percentuali); 5 anagramma con indizio; 6 griglia di lettere con coordinate tipo battaglia navale; 7 logica a indizi; 8 rebus a parole ("il mio primo… il mio secondo…"); 9 cima: una lettera da ciascuna delle 8 soluzioni precedenti forma la parola finale. Catalogo in `data/enigmi.json` (regole, esempio, formato). Regole per tutti: italiano di casa per una dodicenne, carta e penna in 10-20 minuti, una sola soluzione, niente conoscenze esterne né marchi o mascotte riconoscibili alla prima riga, nessuna parola del premio, 2-3 risposte accettate, un aiutino dopo il primo tentativo sbagliato. Simboli di casa ammessi: Bart, Lady, Leo, il nonno, il numero 9, lo chignon in campo, Tahiti, "passino passino". **Mai nomi delle compagne di squadra.**
3. **Verifica prima di salvare**: una seconda chiamata che non conosce la soluzione prova a risolvere; se fallisce o trova altro, si rigenera (max 3, poi avviso ai genitori).
4. Il biglietto mostra bene griglie, tabelle e alfabeto a 360 px. Un esempio di ogni tipo nella Vetrina.
5. I 9 enigmi in `docs/enigmi-bozza.md` **prima** di salvarli nel database: li approva il signore (e Jarvis venerdì). Le soluzioni stanno in quel file: il repository è privato e Lani non lo vede.
6. L'enigma compare quando manca l'ultima tappa prima del forziere; premio ed enigma si cambiano solo finché l'enigma non è comparso (poi il pulsante è disattivato, con la spiegazione). Verifica nel codice e con prove.
7. **Immagini dei premi**: pronte in `C:\progetti\ace\asset\premi\pronte\` (`premio-N.webp` originale 1024 px, `premio-N-sagoma.webp` sagoma grigia 512 px). Bucket privato (es. `premi`), **mai** in `public/` o nel repository. Prima dello sblocco Lani riceve solo la sagoma ("Indovini cos'è?"); l'originale, con URL firmato dal server, solo a enigma risolto ("Hai indovinato!") o forziere aperto (nel popup). Premio cambiato senza nuova immagine: pacco regalo con il punto di domanda. Prova di sicurezza con l'utente Lani. Aggiornare `docs/02-regole-di-gioco.md`: la sagoma si vede da subito, il premio vero a enigma risolto o forziere aperto.

### F. Qualità del codice (giovedì)
- `/review` per ogni ramo prima del merge. `tsc --strict` senza `any` nuovi; tipi del database generati da Supabase (`supabase gen types`) e usati ovunque.
- Componenti oltre 250 righe divisi; logica fuori dai componenti, in `src/lib`; gestione degli errori uniforme (un solo modo per mostrare "qualcosa non va" a Lani, in italiano di casa, e registrarlo).
- knip: via file ed esportazioni morte. Dipendenze aggiornate solo nelle patch (niente salti di versione maggiore questa settimana).
- Prove a proprietà con fast-check su tutte le funzioni di `src/lib/regole` (es. "i passi di una settimana non dipendono dall'ordine delle spunte", "uno storno annulla esattamente la spunta").
- Prove di mutazione facoltative (Stryker) solo su `src/lib/regole`, se c'è tempo: il punteggio va nel rapporto.

### G. PWA, notifiche e dispositivi (giovedì)
- Lighthouse CI su Oggi, Sera, Astra, Studio. Prestazioni: immagini con `loading="lazy"` e dimensioni, font precaricati, niente blocchi al primo disegno.
- **Aggiornamento dell'app**: quando esce una versione nuova il service worker non deve lasciare Lani con quella vecchia; avviso gentile o aggiornamento al rientro. Prova.
- Offline: cosa si vede senza rete (ultima situazione salvata), nessuna schermata bianca.
- Notifiche: prova completa su Android Chrome con un'iscrizione di un **genitore**; limiti del copione verificati dal simulatore; iscrizione scaduta gestita.
- Emulazione Playwright di Motorola (Android, 360-412 px) e iPad (Safari, verticale e orizzontale); tema scuro di sistema acceso; testo ingrandito al 130%.

### H. Affidabilità (giovedì-venerdì mattina)
- Tabella `errori_client` (RLS: inserisce chiunque sia autenticato, leggono solo i genitori) e registrazione degli errori dell'app e delle funzioni; scheda "Stato" nell'area genitori: ultima sincronizzazione di Nuvola e del calendario, ultimi errori, ultime chiavi calcolate, prossimo cron.
- **Backup**: script `npm run backup` che esporta il database (senza segreti) in un file datato sul PC del signore, fuori dal repository; prova di ripristino su un database locale. Scrivere nel runbook ogni quanto farlo.
- Idempotenza dei cron: rilanciare due volte di fila `chiavi`, `sync-nuvola` e `notifiche` non deve cambiare niente. Prova.

### I. Debiti rimasti (se c'è tempo, prima di venerdì)
- Riscatto della serie nera (sette giorni fatti bene dopo il rimprovero), con prove e simulatore.
- Script di esportazione CSV per la taratura (passi per giorno e per motivo).

### J. Documenti (venerdì mattina)
- `docs/architettura.md`: schema dei dati, funzioni, cron, flusso di un passo dalla spunta al popup, in una pagina con un diagramma Mermaid.
- `docs/runbook.md`: cosa fare se Nuvola non sincronizza, se le chiavi della domenica non arrivano, se un passo è sbagliato, se Lani perde il telefono, come fare il backup.
- `docs/guida-genitori.md`: una pagina per il signore e Lucrezia, con le cose di tutti i giorni.
- `docs/07-installazione.md` aggiornata con la lista della prova in famiglia.

---

## 5. Il rapporto di venerdì

`docs/rapporto-venerdi.md`, al massimo tre pagine:
1. Tabella delle misure prima e dopo.
2. Cosa è stato fatto, per filone, con i commit.
3. Bug trovati e corretti (quanti, i più gravi spiegati in una riga).
4. Risultati del simulatore per profilo (data della cima, chiavi medie, forzieri) e il CSV.
5. **Da decidere**: problemi di regole, numeri o testi trovati, ciascuno con una proposta. Niente di questo implementato.
6. Rischi aperti prima del 23/11.
7. Chiamate all'IA usate (su 40) e skill installate.

Lo legge Jarvis venerdì: deve poter controllare ogni affermazione con un comando o un file.
