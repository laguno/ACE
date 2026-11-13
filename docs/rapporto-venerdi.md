# Rapporto di venerdì 13 novembre 2026

Piano: `docs/piano-fino-a-venerdi.md`. Ogni numero si ricontrolla con il comando accanto. Le prove girano su dati finti; sul database vero solo letture aggregate (advisors).

## 1. Misure prima e dopo

"Prima" preso lunedì 9/11 sera sul ramo `misure`, da `main` a `7fc0532`, prima di toccare il codice dell'app.

| Misura | Comando | Prima (9/11) | Dopo (13/11) | Obiettivo |
|---|---|---|---|---|
| Prove unitarie | `npm test` | 164 | 269 (+1 saltata), verdi; 519 con lo schema | ≥ 328 in tutto, verdi |
| Prove dello schema e della sicurezza | `npm run prova:schema` | 70 | 250, verdi | |
| Prove delle schermate | `npm run prova:schermate` | 63 (+17 saltate: confronto, axe, Lighthouse) | 139 (+22 saltate: confronto e Lighthouse a parte), verdi; axe dentro | |
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
| Impeccable (critique / audit) | skill `impeccable` | 27/40, 14/20 (9/11) | 32/40, 17/20 (13/11) | ≥ 34/40, ≥ 18/20 |
| Peso della build | `npm run build` | JS 624 KB (181 KB gzip), un solo pezzo; precache 145 file, 4,48 MB | JS iniziale 555 KB (160 KB gzip) + pezzi al primo tocco; precache 196 file, 4,57 MB | |
| Advisors di Supabase | `npx supabase db advisors --remote --type all` | 79: sicurezza 1 errore (vista `forzieri_lani`, voluta) + 8 funzioni security definer (volute) + protezione delle password trapelate (la accende il signore); prestazioni 45 `multiple_permissive_policies`, 20 `unindexed_foreign_keys`, 3 `auth_rls_initplan`, 1 `unused_index` | 10 sul remoto, tutti voluti: vista `forzieri_lani` + 8 funzioni security definer + password trapelate (le accende il signore); prestazioni 0 | solo i voluti, spiegati |
| gitleaks | `gitleaks git --redact` | 0 su 105 commit. Nei file locali (`gitleaks dir`) 2 in `.env.local`, escluso dal repository e mai committato: atteso | 0 su 192 commit | 0 |
| `npm audit` | `npm audit --omit=dev` | 0 nelle dipendenze dell'app; 15 negli strumenti di sviluppo (13 moderate, 2 low) | 0 nell'app; 15 negli strumenti di sviluppo, invariati | 0 nell'app |

Note sulle misure:
- Lighthouse 13 non ha più la categoria PWA: l'installabilità si controlla a mano nel filone G (manifest, service worker, icone). SEO 50 è voluto (`noindex`).
- Lighthouse gira sulla build di produzione con il Supabase finto (`dist-lh`), una misura per schermata: i numeri variano di qualche punto da un giro all'altro. Astra e Studio sono schede, non indirizzi: oltre al caricamento si misurano il clic (timespan) e la schermata (snapshot).
- Lighthouse CI (`@lhci/cli`) non riesce a usare il Supabase finto: si usa `lighthouse` direttamente dentro Playwright. Tolto `@lhci/cli` toglie anche le 9 vulnerabilità "high" degli strumenti.

## 2. Cosa è stato fatto, per filone

- **Strumenti e misure** (ramo `misure`): ESLint, knip, copertura, axe e Lighthouse come comandi npm; schermate di prova comuni in `e2e/casi.ts`.
- **A. Sicurezza** (`7337269`, `0925d2f`): prova di attacco da Lani, genitore e anon (`prova:schema` da 70 a 239 controlli, matrice per ogni tabella); migrazione `0024`; accesso comune alle funzioni (`_shared/accesso.ts`); CSP su Vercel; `/security-review` pulito. In produzione dal 9/11.
- **B. Simulatore** (`4e859da`): `npm run simula:anno`, sezione 4.
- **C. Casi limite** (`ec346e9`): parser del calendario `src/lib/calendario/ics.ts` (ripetizioni, eccezioni, ora legale); `src/lib/casi-limite.test.ts`; `npm run test:server` in UTC.
- **D. Foto** (`3873c69`): `src/lib/foto` (14 prove), `e2e/foto-file.e2e.ts` (12 casi: 12 MP, EXIF, PNG enorme, HEIC, niente rete). Pagina da 12 MP: 812 KB → 164 KB.
- **E. Enigmi**: v4 approvata dal signore il 10/11 (il 7 è un cruciverba), migrazione `0028`, in produzione.
- **F. Qualità** (`843e595`): ESLint strict e knip a zero; 14 prove a proprietà con fast-check; tipi del database generati (`npm run tipi:db`).
- **G. PWA e dispositivi**: axe a zero in chiaro e scuro dentro `prova:schermate`; schermate pesanti al primo tocco; senza rete l'ultima situazione salvata; 7 dispositivi in `e2e/dispositivi.e2e.ts` (WebKit per l'iPad).
- **H. Affidabilità** (`a0a658f`): `errori_client` (`0025`), `src/Errore.tsx`, scheda **Stato di ACE**, `npm run backup` / `ripristina`, cron idempotenti, regole unite (`0026`).
- **I. Debiti**: `npm run esporta:passi` (CSV della taratura).
- **J. Documenti**: `docs/architettura.md`, `docs/runbook.md`, `docs/guida-genitori.md`, `docs/07-installazione.md`.
- **Decisioni del 10/11** (sezione 5): migrazione `0027` (storno dello studio, foto cancellata), gesto una volta per voce al giorno, riscatto della serie nera (`_shared/riscatto.ts`), avatar piccoli (`npm run avatar:piccoli`). In produzione dal 10/11.
- **Impeccable e Lighthouse** (`53620c7`, `7d23210`, `f881a41`): testate di Oggi, Sera e Studio prima dei dati (Lighthouse Oggi 83→87, Sera 86→89); `Attesa` invece dello schermo bianco all'avvio; bordo della barra della Sera; pulsanti dei popup con il gesto ("Ho capito", "Guardo il piano" che apre Studio). Poi (`d1c6c73`, `c2c21a9`): `Attesa` anche nel caricamento delle schermate e dell'Album, token `--bianco` al posto dei 38 `#fff`, contapassi annunciato ai lettori di schermo, frase sulle chiavi di Astra; le sgridate avevano già la conferma. Critique 27 → 29 → 31 → 32/40, audit 15 → 16 → 17/20 (temi 4), snapshot in `.impeccable/critique/`. Restano: numeri del forziere sul percorso ("7.200 · 36 chiavi") da spiegare, testi a 12 px, fascia vuota sotto la testata di Studio.

## 3. Bug trovati e corretti

19 bug, ognuno con una prova. Sicurezza (filone A, in `prova:schema` o `accesso.test.ts`):
1. **Foto senza file** (il più grave): Lani poteva inserire la riga di una foto senza caricarla e prendere i +2. Ora vale solo con il file vero, suo, nella cartella di una richiesta aperta.
2. **Genitori con scrittura libera** su passi, voti, note, figurine e popup: ora li leggono soltanto.
3. **Forzieri**: un genitore poteva aprirli o azzerare l'enigma. Ora cambia solo il premio.
4. Frasi di famiglia leggibili da Lani prima dell'uscita. 5. Hash del PIN leggibile dai genitori. 6. CORS `*` su quattro funzioni. 7. Richieste senza limite di peso (ora 4 KB). 8. `passi` accettava `tipo: "constructor"`. 9. `spiega` chiamava Opus a ogni tocco (ora una volta per compito). 10. Segreto del cron confrontato con `===`. 11. Sei errori di tipo nelle funzioni, senza effetto a runtime.

Gioco, calendario e foto (filoni B, C, D, F):
12. **Tetto dei gesti di casa**: due gesti nello stesso istante superavano i 6 passi al giorno.
13. **Evento ripetuto modificato** per un giorno ("[LANI ASSENTE]"): teneva il titolo principale e chiedeva la borsa lo stesso.
14. Chiusura della sera calcolata sul primo impegno in elenco, non sul primo in ordine di ora. 15. `sposta()` dava "24:20". 16. Prova del copione che non poteva fallire (backspace al posto di `\b`; i testi erano giusti). 17. Soglie delle chiavi scritte nel codice invece che da config (stessi valori). 18. HEIC su Windows rifiutato dal bucket. 19. Un file non immagine fra più pagine faceva caricare le prime e poi fallire.

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

Tutti decisi dal signore il 10/11; quelli da fare sono in produzione dal 10/11.

| # | Problema trovato | Decisione |
|---|---|---|
| 1 | Quiz, flash card e video si fidano del telefono (un quiz "tutto giusto" inventato vale i passi) | Così per lo sprint 1 |
| 2 | La cima non si raggiunge con le fonti dello sprint 1 (tappa 24-25, sezione 4) | Numeri invariati; sprint 2 online al più tardi a dicembre |
| 3 | Lo stesso gesto segnato da mamma e papà vale due volte | Fatto: una volta per voce al giorno |
| 4 | Spunta falsa: lo storno non toglie i passi di studio di quel giorno | Fatto: storno anche dello studio (`0027`) |
| 5 | Lo studio facoltativo vale quanto un compito | Alla taratura di dicembre |
| 6 | Testi nuovi delle foto | Tenuti |
| 7 | Foto sbagliata cancellata: richiesta chiusa e +2 rimasto | Fatto: la richiesta si riapre e il +2 si storna (`0027`) |
| 8 | Caricamento interrotto: foto doppie, +2 una volta | Così |
| 9 | Riscatto della serie nera senza definizione di giorno fatto bene | Fatto: `_shared/riscatto.ts` |
| 10 | Testo della schermata d'errore | Tenuto |
| 11 | Avvisi di Supabase rimasti | Voluti (sezione 1) |
| 12 | Testi della PWA (senza rete, barra della Sera) | Tenuti |
| 13 | Ricarica da sola con la versione nuova | Tenuta |
| 14 | Lighthouse sotto 90: avatar da 512 px mostrati a 52 | Fatto: copie piccole, originali intatti |
| 15 | Lighthouse ancora sotto 90 (JS iniziale): scheletro statico in `index.html` | No: si resta a 86-89 |
| 16 | Sera: nessuna scorciatoia per la cartella (critique) | No: si spunta una cosa alla volta |
| 17 | Astra: "1 chiave in tutto" non dice a cosa servono (critique) | Fatto: "Hai 1 chiave: il prossimo forziere ne vuole 2." (`c2c21a9`, nel copione) |
| 18 | Pillola "0 passi" la mattina (critique) | Tenuta: è il totale, a 0 solo prima del primo giorno |
| 19 | Barra della Sera a tacche (critique) | No: continua come la bozza `Domani.html` |

## 6. Rischi aperti prima del 23/11

1. **Prova in famiglia non ancora fatta** sui dispositivi veri (Samsung di Lani, poi iPad): lista in `docs/07-installazione.md`.
2. **Provati solo con dati finti**: `spiega`, borsa, enigma, foto e push. Serve un accesso di Lani sull'app vera.
3. **Protezione delle password trapelate spenta** in Supabase Auth: la accende il signore (unico avviso di sicurezza non voluto).
4. **Obiettivi non raggiunti**: Lighthouse 86-89 invece di 90 (scelta del signore); Impeccable 32/40 e 17/20 invece di 34 e 18.
5. Dal 23/11 da guardare sul vivo: primi passi, popup e figurine, primo forziere ed enigma 7 sul telefono, prime chiavi il 29/11 alle 21:30, primo giro di `sync-nuvola` con foto e riscatti.

## 7. Chiamate all'IA e skill

- Chiamate vere all'IA: 0 su 40.
- Prove di mutazione (Stryker su `src/lib/regole`, facoltative nel piano): non fatte, il tempo è andato ai filoni obbligatori.
- Installati come dipendenze di sviluppo: `@axe-core/playwright`, `fast-check`, `lighthouse` (al posto di `@lhci/cli`), `puppeteer-core`, `knip`, `eslint`, `@eslint/js`, `typescript-eslint`, `@vitest/coverage-v8`. Nessuno manda dati fuori; Lighthouse senza invio dei rapporti.
- Skill di Supabase (`supabase`, `supabase-postgres-best-practices`) installate dal signore il 9/11 con `npx skills add supabase/agent-skills`: solo testi Markdown, nessuno script; versione fissata in `skills-lock.json`, file in `.agents/` (fuori dal repository, come Impeccable).
- gitleaks 8.30.1 installato dal signore il 9/11 (`winget install gitleaks`).
- Skill ufficiali Anthropic: plugin `example-skills` (catalogo `anthropics/skills`), con `webapp-testing` e `frontend-design`, installato dal signore il 9/11. Strumenti del piano tutti installati.
