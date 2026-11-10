# Rapporto di venerdì 13 novembre 2026

Piano: `docs/piano-fino-a-venerdi.md`. Ogni numero si ricontrolla con il comando accanto. Le prove girano su dati finti; sul database vero solo letture aggregate (advisors).

## 1. Misure prima e dopo

"Prima" preso lunedì 9/11 sera sul ramo `misure`, da `main` a `7fc0532`, prima di toccare il codice dell'app.

| Misura | Comando | Prima (9/11) | Dopo (13/11) | Obiettivo |
|---|---|---|---|---|
| Prove unitarie | `npm test` | 164 | 269 (+1 saltata), verdi; 519 con lo schema | ≥ 328 in tutto, verdi |
| Prove dello schema e della sicurezza | `npm run prova:schema` | 70 | 250, verdi | |
| Prove delle schermate | `npm run prova:schermate` | 63 (+17 saltate: confronto, axe, Lighthouse) | 138 (+22 saltate: confronto e Lighthouse a parte), verdi; axe dentro | |
| Copertura delle righe di `src/lib` | `npm run copertura` | 98,1% (365/372) | 99,3% (452/455) | ≥ 90% |
| Copertura delle funzioni del server | `npm run copertura` | 0% (0/759): nessuna prova le carica | 93,1% (731/785) | ≥ 90% |
| `tsc --strict` | `npx tsc -p .` | 0 errori (strict già acceso; controlla solo `src`) | 0 errori (`tsc -p .` e `tsc -p supabase/functions`) | 0, anche su e2e, scripts e funzioni |
| ESLint (typescript-eslint strict) | `npm run lint` | 64 errori: 54 `no-non-null-assertion`, 7 `no-explicit-any`, 3 altri | 0 | 0 |
| knip | `npm run knip` | 13 esportazioni e 2 tipi non usati; 1 dipendenza (fast-check, serve al filone F) | 0 | 0 |
| Lighthouse Oggi, a 390 px (prestazioni / accessibilità / buone pratiche) | `npm run lighthouse` | 81 / 95 / 100 | 87 / 100 / 100 | ≥ 90 / 100 / ≥ 95 |
| Lighthouse Sera | idem | 88 / 96 / 100 | 89 / 100 / 100 | idem |
| Lighthouse Astra (caricamento; clic e fotografia) | idem | 85 / 100 / 100; scheda 93 / 95 / 100 | 86 / 100 / 100 | idem |
| Lighthouse Studio | idem | 85 / 100 / 100; scheda 100 / 100 / 100 | 86 / 100 / 100 | idem |
| axe, 16 schermate in tema chiaro e scuro | `npm run axe` | 8 violazioni, 2 regole: `aria-prohibited-attr` (Oggi, Astra, Figurina), `aria-progressbar-name` (Sera) | 0 (dentro `prova:schermate`) | 0 |
| Impeccable (critique / audit) | skill `impeccable` | 27/40, 14/20 (9/11) | 31/40, 16/20 (13/11) | ≥ 34/40, ≥ 18/20 |
| Peso della build | `npm run build` | JS 624 KB (181 KB gzip), un solo pezzo; precache 145 file, 4,48 MB | JS iniziale 555 KB (160 KB gzip) + pezzi al primo tocco; precache 196 file, 4,57 MB | |
| Advisors di Supabase | `npx supabase db advisors --remote --type all` | 79: sicurezza 1 errore (vista `forzieri_lani`, voluta) + 8 funzioni security definer (volute) + protezione delle password trapelate (la accende il signore); prestazioni 45 `multiple_permissive_policies`, 20 `unindexed_foreign_keys`, 3 `auth_rls_initplan`, 1 `unused_index` | 10 sul remoto, tutti voluti: vista `forzieri_lani` + 8 funzioni security definer + password trapelate (le accende il signore); prestazioni 0 | solo i voluti, spiegati |
| gitleaks | `gitleaks git --redact` | 0 su 105 commit. Nei file locali (`gitleaks dir`) 2 in `.env.local`, escluso dal repository e mai committato: atteso | 0 su 192 commit | 0 |
| `npm audit` | `npm audit --omit=dev` | 0 nelle dipendenze dell'app; 15 negli strumenti di sviluppo (13 moderate, 2 low) | 0 nell'app; 15 negli strumenti di sviluppo, invariati | 0 nell'app |

Note sulle misure:
- Lighthouse 13 non ha più la categoria PWA: l'installabilità si controlla a mano nel filone G (manifest, service worker, icone). SEO 50 è voluto (`noindex`).
- Lighthouse gira sulla build di produzione con il Supabase finto (`dist-lh`), una misura per schermata: i numeri variano di qualche punto da un giro all'altro. Astra e Studio sono schede, non indirizzi: oltre al caricamento si misurano il clic (timespan) e la schermata (snapshot).
- Lighthouse CI (`@lhci/cli`) non riesce a usare il Supabase finto: si usa `lighthouse` direttamente dentro Playwright. Tolto `@lhci/cli` toglie anche le 9 vulnerabilità "high" degli strumenti.

## 2. Cosa è stato fatto, per filone

- **Strumenti e misure** (ramo `misure`): ESLint, knip, copertura, axe e Lighthouse come comandi npm; schermate di prova condivise tra confronto, axe e Lighthouse (`e2e/casi.ts`).
- **E. Enigmi**: v4 approvata dal signore il 10/11, con il 7 rifatto come cruciverba a colonna; salvata nel database con la migrazione `0028_enigmi_v4.sql`, in produzione dal 10/11.
- **A. Sicurezza** (ramo `audit-sicurezza`, `7337269`, `0925d2f`): mappa di tabelle, policy, funzioni e trigger; prova di attacco da Lani, genitore e anon; migrazione `0024`; accesso comune alle Edge Functions (`_shared/accesso.ts`, con prove); CSP e intestazioni su Vercel con prova senza violazioni; `npm run tipi:funzioni` (tsc sulle funzioni, 0 errori). `npm run prova:schema` da 70 a 239 controlli, tra cui una matrice per ogni tabella (chi inserisce, chi cancella, cosa vede anon) e l'elenco esatto delle funzioni chiamabili. `/security-review` sul ramo: nessuna vulnerabilità introdotta. In produzione dal 9/11 sera.
- **F. Qualità** (ramo `qualita`, unito: `843e595`): ESLint strict e knip a zero; 14 prove a proprietà con fast-check su `src/lib/regole`; tipi del database generati (`npm run tipi:db`, Supabase locale con Docker) e usati dal client dell'app; segreti delle funzioni da `_shared/ambiente.ts`; soglie delle chiavi lette da config.
- **B. Simulatore** (ramo `simulatore`, unito: `4e859da`; lavoro di un sotto-agente su una copia separata): `npm run simula:anno`, cinque profili sull'anno intero con migrazioni vere e lo stesso codice delle funzioni (passi, chiavi, voti in `_shared/`); dettagli in sezione 4.
- **C. Casi limite** (ramo `casi-limite`, unito: `ec346e9`): parser del calendario in `src/lib/calendario/ics.ts` con prove (ripetizioni, eccezioni, ora legale, fusi); `src/lib/casi-limite.test.ts` (ora legale, mezzanotte, vacanze, testi di Nuvola); `npm run test:server` (prove in UTC come le funzioni).
- **D. Foto** (ramo `foto`, sotto-agente, unito: `3873c69`): regole pure in `src/lib/foto` (14 prove); `e2e/foto-file.e2e.ts` (12 prove con file generati da sharp: 12 MP, EXIF ruotato, PNG enorme, HEIC, file non immagine, più pagine, interruzione, niente rete, fotocamera negata, genitore che cancella); `scripts/simulatore/foto.test.ts` (funzione passi vera su PGlite: +2 una volta per richiesta). Pesi misurati: pagina 12 MP 812 KB → 164 KB (1600×1200); 12 MP tutta grana, caso peggiore, 8,3 MB → 718 KB; PNG 6000×4000 18,5 MB → 150 KB. HEIC che il browser non apre: si carica l'originale come `image/heic` (il bucket lo accetta; Safari e la fotocamera dell'iPad danno già JPEG). Cancellazione di una foto dai genitori in Correzioni (riga e file).
- **H. Affidabilità** (ramo `affidabilita`, unito: `a0a658f`): migrazione `0025` con `errori_client` (errori dell'app e delle funzioni, indirizzi tolti); niente pagina bianca (`src/Errore.tsx`); area genitori → Altro → **Stato di ACE** (sincronizzazioni, prossimo giro, chiavi, errori); `npm run backup` e `npm run ripristina` (provato in locale: dati identici); idempotenza dei cron provata sul codice vero (`scripts/simulatore/idempotenza.test.ts`); migrazione `0026` con le regole unite (stessi permessi, matrice invariata): advisors locali da 69 a 26.
- **G. PWA e dispositivi** (ramo `pwa`, sotto-agente, unito l'11/11): axe a zero su tutte le schermate, in chiaro e scuro, dentro `npm run prova:schermate`; schermate pesanti caricate al primo tocco (JS iniziale da 636 a 546 KB, 157 KB gzip), font solo latini e precaricati, preconnessione a Supabase, profilo ricordato; senza rete l'ultima situazione salvata con una striscia che lo dice (premi dei genitori esclusi dalla copia); versione nuova controllata a ogni rientro in primo piano; iscrizione alle notifiche rinnovata da sola; prove sulla build vera (`e2e/pwa.e2e.ts`) e su 7 dispositivi (`e2e/dispositivi.e2e.ts`: Motorola, iPad verticale e orizzontale con WebKit, tema scuro, testo al 130%). Lighthouse a 390 px dopo: prestazioni 82 / 88 / 88 / 75-88 (Oggi / Sera / Astra / Studio, variano da un giro all'altro), accessibilità 100, buone pratiche 100; frena solo l'LCP (3,8-4,8 s: tre letture di Supabase in fila prima dell'avatar).
- **I. Debiti**: `npm run esporta:passi` (CSV per la taratura, stesso formato del simulatore). Il riscatto della serie nera aspetta una decisione (sezione 5).
- **J. Documenti**: `docs/architettura.md` (con diagramma Mermaid), `docs/runbook.md`, `docs/guida-genitori.md`, `docs/07-installazione.md` (prova in famiglia aggiornata).
- **Impeccable** (10/11): critique 27/40 (due valutazioni indipendenti: design e rilevatore) e audit 15/20, salvate in `.impeccable/critique/`. Corretti subito: icone storte nei riquadri (Oggi, Studio, Altro dei genitori; regola CSS che rendeva flex il riquadro; prova su 16 schermate), "Il calendario è qui" fuori dalla pillola, popup con il gesto delle bozze ("Vado a sistemare", "Ho capito" con la fila di chiavi, "Prova" che porta al biglietto; approvati dal signore), Sera nell'ordine della bozza con la frase di Lady della bozza, mai una schermata vuota (`Attesa` con lo sticker di Lani, prova con la rete lenta), freccia di famiglia Phosphor, chip a 44 px, schede dei genitori a 360 px. Da rifare venerdì per il punteggio "Dopo".
- **Dopo (13/11)**: testate di Oggi, Sera e Studio disegnate prima dei dati: Lighthouse Oggi 83→87, Sera 86→89, Studio e Astra fermi a 86 (Astra ha la testata che dipende dal mondo). L'LCP resta 3,6-4,1 s: frena il JS iniziale (555 KB, quasi tutto React e Supabase, che servono già per l'accesso). Per arrivare a 90 serve uno scheletro statico in `index.html` disegnato prima del JS: da decidere col signore. Impeccable rifatto con due valutazioni indipendenti: critique 29/40 (+2), audit 16/20 (accessibilità 3, prestazioni 3, responsive 4, temi 3, anti-pattern 3), snapshot in `.impeccable/critique/`. Obiettivi 34 e 18 non raggiunti. Problemi: [P1] schermo vuoto in `App.tsx` e `AreaGenitori.tsx` mentre arrivano sessione e profilo; [P2] passi in doppio nella Mattina; [P2] Sera lunga (cartella e sport separati); [P2] barra della Sera poco visibile; [P3] popup di default "Ok". Advisors remoti: 10, tutti voluti (il 79 di prima contava anche le prestazioni, ora a 0). Dopo le correzioni (10/11 sera, `7d23210` e `f881a41`: `Attesa` all'avvio, bordo della barra, pulsanti dei popup col gesto) critique rifatta: 31/40 (+2, visibilità dello stato 3→4); audit fermo a 16/20. Rilevatore statico pulito; nel browser segnala solo il sopratitolo (voluto dalle bozze) e la scala dei caratteri di Astra (12-20 px). Restano: `Suspense fallback={null}` in `App.tsx` e schermi vuoti in caricamento su Figurine e Astra; 38 `#fff` fuori da `:root`; numeri di Astra (chiavi) senza spiegazione; sgridate dei genitori senza Annulla nel messaggio.
- Supabase in locale (Docker): le 26 migrazioni si applicano pulite su un Postgres vero.

## 3. Bug trovati e corretti

Sicurezza (filone A), tutti con una prova in `prova:schema` o in `accesso.test.ts`:
1. **Foto senza file** (il più grave): Lani poteva inserire la riga di una foto senza caricare niente e prendere i +2 della richiesta. Ora la riga vale solo con il file vero, suo, nella cartella della richiesta; lo storage accetta solo immagini fino a 10 MB nella cartella di una richiesta aperta.
2. **Genitori con scrittura libera** su passi, voti, note, settimane, figurine, popup e altre tabelle del server: un genitore poteva scrivere passi e chiavi a mano. Ora le leggono soltanto.
3. **Forzieri**: un genitore poteva aprire un forziere o azzerare i tentativi dell'enigma. Ora cambia solo il premio e segna la consegna.
4. **Frasi di famiglia** leggibili da Lani prima della loro uscita.
5. **Hash del PIN** leggibile dai genitori: ora passa solo dalle funzioni.
6. **CORS `*`** sulle quattro funzioni chiamate dall'app: ora solo le origini di ACE.
7. **Corpo delle richieste senza limite**: ora 4 KB, JSON rotto = 400.
8. **`passi` accettava `tipo: "constructor"`** (metodi ereditati): ora solo i gestori veri.
9. **`spiega` chiamava Opus a ogni tocco**: ora la spiegazione si salva sul compito, una chiamata per compito.
10. Segreto del cron confrontato con `===`: ora a tempo costante.
11. Sei errori di tipo nelle funzioni (`sync-nuvola`, `sync-calendario`), nessuno con effetto a runtime.

Gioco e calendario (filoni B, C, F):
12. **Tetto dei gesti di casa** (simulatore): due gesti nello stesso istante non si vedevano e il tetto di 6 passi al giorno saltava. Ora si conta sui passi già dati quel giorno.
13. **Occorrenza modificata nel calendario**: un evento ripetuto cambiato per un giorno ("[LANI ASSENTE] …") teneva il titolo dell'evento principale, e la borsa veniva chiesta lo stesso.
14. **Chiusura della sera con due impegni dopo le 17**: si chiudeva mezz'ora prima del primo in elenco, non del primo in ordine di ora.
15. **`sposta()`** non girava sulle 24 ore (23:50 + 30 dava "24:20").
16. **Prova del copione cieca**: la regex del singolare e plurale conteneva due caratteri backspace al posto di `\b` e non poteva fallire. I testi erano giusti.
17. Soglie delle chiavi (70% e 95%) scritte nel codice invece che lette da `config-gioco.json` (stessi valori).
18. **Foto senza tipo** (HEIC su Windows): andava come `.jpg` e nel multipart dello Storage sarebbe arrivata come `application/octet-stream`, rifiutata dal bucket con un generico "Riprova". Ora tipo ed estensione giusti.
19. **Foto a metà**: un file non immagine in mezzo a più pagine faceva caricare le prime e poi fallire. Ora si preparano tutte prima, e un file sbagliato ferma tutto con un messaggio chiaro.

## 4. Simulatore

`npm run simula:anno` (un minuto, seme fisso); sintesi in `docs/simulazione/README.md`, un `.md` e un `.csv` per profilo (passi per giorno e per motivo, formato della taratura). Nessun invariante violato in nessun profilo.

| Profilo | Passi a fine anno | Tappa | Cima | Chiavi (media) | Forzieri |
|---|---|---|---|---|---|
| diligente 95% | 6444 | 25 | no | 69 (2,56) | 8 |
| normale 80% | 6210 | 24 | no | 50 (1,85) | 8 |
| altalenante | 5591 | 22 | no | 37 (1,37) | 7 |
| crisi a gennaio, poi rimonta | 6080 | 24 | no | 50 (1,85) | 8 |
| furbetta 70% | 6780 | 25 | no | 51 (1,89) | 8 |

Fuori dal simulatore per ora: enigmi (la funzione usa l'IA), pagella, notifiche, video, dieci minuti, partite, R-Evolution (sprint 2). Il confronto con `scripts/simula_passi.py` lo fa Jarvis (Python non è su questo PC).

## 5. Da decidere

**Risposte del signore (10/11): tutte ok.** Sul 2: lo sprint 2 va online al più tardi a dicembre. Sul 7: niente riapertura a mano dei genitori, la foto cancellata riapre la richiesta e storna il +2 da sola (migrazione 0027; rifatta, il +2 torna). Fatti tutti e in produzione dal 10/11: 3, 4, 7, 9 (riscatto controllato da `sync-nuvola`, `_shared/riscatto.ts`), 14.

1. **Quiz, flash card e video si fidano del telefono.** Le risposte giuste di un quiz, l'ora d'inizio di un giro di flash card e i secondi di video visti li manda l'app; il server controlla i tempi minimi e il tetto di 4 caselle al giorno, ma un quiz "tutto giusto" inventato vale i suoi passi. Le soluzioni dei quiz sono leggibili da Lani (servono all'app per correggere). Proposta: lasciare così per lo sprint 1 (serve un'app modificata, non un tocco sbagliato); se serve, correzione sul server (Lani manda le risposte, il server conta le giuste e le soluzioni non arrivano al telefono).
2. **La cima non si raggiunge con le sole fonti dello sprint 1** (simulatore): all'80% si arriva alla tappa 24, al 95% alla 25. La taratura conta su dieci minuti, partite e R-Evolution (sprint 2). Proposta: tenere i numeri e confermare lo sprint 2 a gennaio; se slitta, alla taratura di dicembre abbassare le tappe rimaste o rallentare la bandierina fino a R-Evolution.
3. **Lo stesso gesto due volte nello stesso giorno vale due volte** (mamma e papà segnano "letto fatto": +4). Proposta: un gesto per voce al giorno.
4. **Spunta falsa e studio facoltativo**: una spunta falsa sblocca lo studio, e lo storno del giorno dopo non toglie quei passi. Nel simulatore la "furbetta" (70%) supera la diligente grazie alle flash card (1.780 passi contro 572 della normale). Proposta: con lo storno di un compito si stornano anche i passi di studio di quel giorno; oppure lo studio si conta la sera, a compiti confermati.
5. **Lo studio facoltativo pesa molto**: 4 giri al giorno, weekend compresi, valgono circa un compito. Da guardare alla taratura di dicembre con i dati veri.
6. **Testi nuovi delle foto** (li vedono Lani e i genitori, sotto il pulsante come "Foto non caricata. Riprova."): "Questo file non è una foto.", "Foto troppo grande: massimo 10 MB.", "Niente rete. Riprova quando torna.". Genitori: "Foto delle pagine", "Le ultime due settimane. Se una foto è sbagliata, cancellala.", "Cancellare la foto?" / "La foto si cancella per sempre. I passi di Lani restano.", "Foto cancellata.". Proposta: tenerli.
7. **Foto sbagliata cancellata**: i +2 di Lani restano e la richiesta resta chiusa (i genitori leggono soltanto `richieste_foto` dalla 0024), quindi la pagina non si può rifotografare. Proposta: migrazione 0025 che lascia ai genitori riaprire una richiesta (solo `stato` da fatta ad aperta); rifacendo la foto il +2 non torna (provato).
8. **Caricamento interrotto**: le foto già salvate restano e la richiesta resta aperta; riprovando con le stesse foto le prime si salvano due volte (innocuo, +2 una volta). Proposta: lasciare così.
9. **Riscatto della serie nera** ("sette giorni fatti bene dopo il rimprovero", docs/02): manca la definizione di giorno fatto bene. Proposta: un giorno di scuola con tutti i compiti in scadenza e la cartella spuntati in tempo e nessuna sgridata o nota; sette di fila (vacanze saltate) sbloccano la figurina della serie nera in attesa.
10. **Testo della schermata d'errore** (nuovo, la vede anche Lani se una schermata si rompe): "Qualcosa non va" / "Non è colpa tua. Riapri ACE e riprova." / pulsante "Riapri ACE". Proposta: tenerlo.
11. **Avvisi di Supabase rimasti, voluti**: 21 chiavi esterne senza indice (tabelle da poche centinaia di righe: un indice non serve e risulterebbe "mai usato"); indici "mai usati" (poco traffico); `forzieri_lani` vista security definer (è il filtro che nasconde premio e soluzione a Lani); `pin_genitori` senza regole (solo funzioni); 8 funzioni security definer chiamabili (sono quelle previste: la matrice di `prova:schema` ne controlla l'elenco esatto); protezione delle password trapelate (la accende il signore). Proposta: lasciarli, spiegati qui.
12. **Testi nuovi della PWA**: striscia senza rete "Sei senza rete: vedi le cose dell'ultima volta. Per spuntare aspetta la rete."; nome per i lettori di schermo della barra della Sera "Cose pronte per domani". Proposta: tenerli.
13. **Versione nuova al rientro**: la pagina si ricarica da sola qualche secondo dopo il rientro se c'è un aggiornamento; se capita durante un quiz appena ripreso, il quiz riparte. Proposta: tenerlo (meglio di Lani con l'app vecchia per giorni).
14. **Prestazioni sotto 90**: l'ultima leva grossa sono copie piccole degli avatar (si vedono a 52 px, i file sono da 512: circa 200 KB in meno). CLAUDE.md dice di non toccare gli avatar. Proposta: copie ridotte generate con sharp accanto agli originali, che restano intatti; serve l'ok del signore.

## 6. Rischi aperti prima del 23/11

1. Filone A in produzione il 9/11 sera: migrazione `0024` e 9 funzioni pubblicate dal signore (il controllo automatico di Claude Code blocca i deploy), merge in `main` (`c4356e7`). Advisors da 79 a 69: in più `rls_enabled_no_policy` su `pin_genitori`, voluto (il PIN passa solo dalle funzioni). CORS e intestazioni verificati dal vivo (pagina di accesso senza violazioni della CSP). Manca la prova dell'app vera da un genitore: Oggi, area Genitori, una foto.
2. **In produzione dal 10/11 mattina**: backup fatto dal signore (115 KB), migrazioni `0025` e `0026`, 9 funzioni ripubblicate. Verificato dal vivo: tutte le funzioni rispondono 401 senza accesso, CORS solo per ACE, calendario "ok" alle 07:05 e 08:05 UTC con il parser nuovo, nessun errore registrato. Advisors da 79 a 34, tutti voluti (Da decidere 11).
3. ~~Copertura delle funzioni~~: raggiunta, 92,9% (era 0%). Le funzioni vere provate in vitest con Deno.serve finto, PGlite e finti di Anthropic, web-push e Nuvola (`supabase/functions/_prove/`, 28 prove).

## 7. Chiamate all'IA e skill

- Chiamate vere all'IA: 0 su 40.
- Installati come dipendenze di sviluppo: `@axe-core/playwright`, `fast-check`, `lighthouse` (al posto di `@lhci/cli`), `puppeteer-core`, `knip`, `eslint`, `@eslint/js`, `typescript-eslint`, `@vitest/coverage-v8`. Nessuno manda dati fuori; Lighthouse senza invio dei rapporti.
- Skill di Supabase (`supabase`, `supabase-postgres-best-practices`) installate dal signore il 9/11 con `npx skills add supabase/agent-skills`: solo testi Markdown, nessuno script; versione fissata in `skills-lock.json`, file in `.agents/` (fuori dal repository, come Impeccable).
- gitleaks 8.30.1 installato dal signore il 9/11 (`winget install gitleaks`).
- Skill ufficiali Anthropic: plugin `example-skills` (catalogo `anthropics/skills`), con `webapp-testing` e `frontend-design`, installato dal signore il 9/11. Strumenti del piano tutti installati.
