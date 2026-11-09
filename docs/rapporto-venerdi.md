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
| gitleaks | `gitleaks git` | da misurare: non installato (vedi 7) | | 0 |
| `npm audit` | `npm audit --omit=dev` | 0 nelle dipendenze dell'app; 15 negli strumenti di sviluppo (13 moderate, 2 low) | | 0 nell'app |

Note sulle misure:
- Lighthouse 13 non ha più la categoria PWA: l'installabilità si controlla a mano nel filone G (manifest, service worker, icone). SEO 50 è voluto (`noindex`).
- Lighthouse gira sulla build di produzione con il Supabase finto (`dist-lh`), una misura per schermata: i numeri variano di qualche punto da un giro all'altro. Astra e Studio sono schede, non indirizzi: oltre al caricamento si misurano il clic (timespan) e la schermata (snapshot).
- Lighthouse CI (`@lhci/cli`) non riesce a usare il Supabase finto: si usa `lighthouse` direttamente dentro Playwright. Tolto `@lhci/cli` toglie anche le 9 vulnerabilità "high" degli strumenti.

## 2. Cosa è stato fatto, per filone

- **Strumenti e misure** (ramo `misure`): ESLint, knip, copertura, axe e Lighthouse come comandi npm; schermate di prova condivise tra confronto, axe e Lighthouse (`e2e/casi.ts`).
- **E. Enigmi** (ramo `enigmi-v4`): bozza v4 dopo le segnalazioni del signore (`91b145c`), in attesa del suo ok prima del salvataggio.

## 3. Bug trovati e corretti

## 4. Simulatore

## 5. Da decidere

## 6. Rischi aperti prima del 23/11

## 7. Chiamate all'IA e skill

- Chiamate vere all'IA: 0 su 40.
- Installati come dipendenze di sviluppo: `@axe-core/playwright`, `fast-check`, `lighthouse` (al posto di `@lhci/cli`), `puppeteer-core`, `knip`, `eslint`, `@eslint/js`, `typescript-eslint`, `@vitest/coverage-v8`. Nessuno manda dati fuori; Lighthouse senza invio dei rapporti.
- Skill di Supabase (`supabase`, `supabase-postgres-best-practices`) installate dal signore il 9/11 con `npx skills add supabase/agent-skills`: solo testi Markdown, nessuno script; versione fissata in `skills-lock.json`, file in `.agents/` (fuori dal repository, come Impeccable).
- In sospeso, da lanciare dal signore: skill ufficiali Anthropic (`/plugin`), gitleaks (`winget install gitleaks`).
