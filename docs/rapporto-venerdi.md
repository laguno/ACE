# Rapporto di venerdì 13 novembre 2026

Piano: `docs/piano-fino-a-venerdi.md`. Ogni numero si ricontrolla con il comando accanto. Le prove girano su dati finti; sul database vero solo letture aggregate (advisors).

## 1. Misure prima e dopo

"Prima" preso lunedì 9/11 sera sul ramo `misure`, da `main` a `7fc0532`, prima di toccare il codice dell'app.

| Misura | Comando | Prima (9/11) | Dopo (13/11) | Obiettivo |
|---|---|---|---|---|
| Prove unitarie | `npm test` | 164 | | ≥ 328 in tutto, verdi |
| Prove dello schema e della sicurezza | `npm run prova:schema` | 70 | | |
| Prove delle schermate | `npm run prova:schermate` | 63 (+17 saltate: confronto, axe, Lighthouse) | | |
| Copertura delle righe di `src/lib` | `npm run copertura` | 98,1% (365/372) | | ≥ 90% |
| Copertura delle funzioni del server | `npm run copertura` | 0% (0/759): nessuna prova le carica | | ≥ 90% |
| `tsc --strict` | `npx tsc -p .` | 0 errori (strict già acceso; controlla solo `src`) | | 0, anche su e2e, scripts e funzioni |
| ESLint (typescript-eslint strict) | `npm run lint` | 64 errori: 54 `no-non-null-assertion`, 7 `no-explicit-any`, 3 altri | | 0 |
| knip | `npm run knip` | 13 esportazioni e 2 tipi non usati; 1 dipendenza (fast-check, serve al filone F) | | 0 |
| Lighthouse Oggi, a 390 px (prestazioni / accessibilità / buone pratiche) | `npm run lighthouse` | 81 / 95 / 100 | | ≥ 90 / 100 / ≥ 95 |
| Lighthouse Sera | idem | 88 / 96 / 100 | | idem |
| Lighthouse Astra (caricamento; clic e fotografia) | idem | 85 / 100 / 100; scheda 93 / 95 / 100 | | idem |
| Lighthouse Studio | idem | 85 / 100 / 100; scheda 100 / 100 / 100 | | idem |
| axe, 16 schermate in tema chiaro e scuro | `npm run axe` | 8 violazioni, 2 regole: `aria-prohibited-attr` (Oggi, Astra, Figurina), `aria-progressbar-name` (Sera) | | 0 |
| Impeccable (critique / audit) | skill `impeccable` | 27/40, 14/20 (9/11) | | ≥ 34/40, ≥ 18/20 |
| Peso della build | `npm run build` | JS 624 KB (181 KB gzip), un solo pezzo; precache 145 file, 4,48 MB | | |
| Advisors di Supabase | `npx supabase db advisors --remote --type all` | 79: sicurezza 1 errore (vista `forzieri_lani`, voluta) + 8 funzioni security definer (volute) + protezione delle password trapelate (la accende il signore); prestazioni 45 `multiple_permissive_policies`, 20 `unindexed_foreign_keys`, 3 `auth_rls_initplan`, 1 `unused_index` | | solo i voluti, spiegati |
| gitleaks | `gitleaks git --redact` | 0 su 105 commit. Nei file locali (`gitleaks dir`) 2 in `.env.local`, escluso dal repository e mai committato: atteso | | 0 |
| `npm audit` | `npm audit --omit=dev` | 0 nelle dipendenze dell'app; 15 negli strumenti di sviluppo (13 moderate, 2 low) | | 0 nell'app |

Note sulle misure:
- Lighthouse 13 non ha più la categoria PWA: l'installabilità si controlla a mano nel filone G (manifest, service worker, icone). SEO 50 è voluto (`noindex`).
- Lighthouse gira sulla build di produzione con il Supabase finto (`dist-lh`), una misura per schermata: i numeri variano di qualche punto da un giro all'altro. Astra e Studio sono schede, non indirizzi: oltre al caricamento si misurano il clic (timespan) e la schermata (snapshot).
- Lighthouse CI (`@lhci/cli`) non riesce a usare il Supabase finto: si usa `lighthouse` direttamente dentro Playwright. Tolto `@lhci/cli` toglie anche le 9 vulnerabilità "high" degli strumenti.

## 2. Cosa è stato fatto, per filone

- **Strumenti e misure** (ramo `misure`): ESLint, knip, copertura, axe e Lighthouse come comandi npm; schermate di prova condivise tra confronto, axe e Lighthouse (`e2e/casi.ts`).
- **E. Enigmi** (ramo `enigmi-v4`): bozza v4 dopo le segnalazioni del signore (`91b145c`), in attesa del suo ok prima del salvataggio.
- **A. Sicurezza** (ramo `audit-sicurezza`, `7337269`, `0925d2f`): mappa di tabelle, policy, funzioni e trigger; prova di attacco da Lani, genitore e anon; migrazione `0024`; accesso comune alle Edge Functions (`_shared/accesso.ts`, con prove); CSP e intestazioni su Vercel con prova senza violazioni; `npm run tipi:funzioni` (tsc sulle funzioni, 0 errori). `npm run prova:schema` da 70 a 239 controlli, tra cui una matrice per ogni tabella (chi inserisce, chi cancella, cosa vede anon) e l'elenco esatto delle funzioni chiamabili. `/security-review` sul ramo: nessuna vulnerabilità introdotta. Da applicare in produzione: migrazione, funzioni, merge (vedi 6).

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

## 4. Simulatore

## 5. Da decidere

1. **Quiz, flash card e video si fidano del telefono.** Le risposte giuste di un quiz, l'ora d'inizio di un giro di flash card e i secondi di video visti li manda l'app; il server controlla i tempi minimi e il tetto di 4 caselle al giorno, ma un quiz "tutto giusto" inventato vale i suoi passi. Le soluzioni dei quiz sono leggibili da Lani (servono all'app per correggere). Proposta: lasciare così per lo sprint 1 (serve un'app modificata, non un tocco sbagliato); se serve, correzione sul server (Lani manda le risposte, il server conta le giuste e le soluzioni non arrivano al telefono).

## 6. Rischi aperti prima del 23/11

1. Filone A in produzione il 9/11 sera: migrazione `0024` e 9 funzioni pubblicate dal signore (il controllo automatico di Claude Code blocca i deploy), merge in `main` (`c4356e7`). Advisors da 79 a 69: in più `rls_enabled_no_policy` su `pin_genitori`, voluto (il PIN passa solo dalle funzioni). CORS e intestazioni verificati dal vivo (pagina di accesso senza violazioni della CSP). Manca la prova dell'app vera da un genitore: Oggi, area Genitori, una foto.

## 7. Chiamate all'IA e skill

- Chiamate vere all'IA: 0 su 40.
- Installati come dipendenze di sviluppo: `@axe-core/playwright`, `fast-check`, `lighthouse` (al posto di `@lhci/cli`), `puppeteer-core`, `knip`, `eslint`, `@eslint/js`, `typescript-eslint`, `@vitest/coverage-v8`. Nessuno manda dati fuori; Lighthouse senza invio dei rapporti.
- Skill di Supabase (`supabase`, `supabase-postgres-best-practices`) installate dal signore il 9/11 con `npx skills add supabase/agent-skills`: solo testi Markdown, nessuno script; versione fissata in `skills-lock.json`, file in `.agents/` (fuori dal repository, come Impeccable).
- gitleaks 8.30.1 installato dal signore il 9/11 (`winget install gitleaks`).
- Skill ufficiali Anthropic: plugin `example-skills` (catalogo `anthropics/skills`), con `webapp-testing` e `frontend-design`, installato dal signore il 9/11. Strumenti del piano tutti installati.
