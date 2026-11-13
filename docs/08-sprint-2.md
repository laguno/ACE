# Sprint 2

**Obiettivo**: R-Evolution dentro ACE (dieci minuti, partite, risultati e classifiche, pagina "La squadra", livello bonus della selezione), poi tutor di matematica.
**Quando vale per Lani**: da quando un genitore la **accende** in Impostazioni (impostazione `r_evolution_da` = giorno di accensione). Spenta, tutto il nuovo resta nascosto e non dà passi, quindi il branch si può unire a `main` prima senza cambiare il gioco in corso. `periodo.r_evolution_prevista` del config (7/1/2027) serve solo alla bandierina finché è spenta.
**Branch**: `sprint-2` (worktree `C:\progetti\ace\app-sprint-2`), aperto il 13/11/2026 mentre su `main` si fanno i test in famiglia. `main` riceve solo correzioni; ogni tanto si porta `main` dentro `sprint-2` (13/11: niente da portare).

## Decisioni del signore (13/11)

- **Nessuna data**: R-Evolution si accende con un **interruttore dei genitori** in Impostazioni (forse già la settimana dopo il 13/11).
- **Percorso**: con l'avvio anticipato va **ricalcolato**; proposta sotto, la approva il signore.
- **Dieci minuti al mattino**, non la sera: si avviano **dalle 6:00 alle 13:00**, tutti i giorni.
- **Menu dei dieci minuti**: la bozza resta come partenza; lo cambiano i genitori in Impostazioni.
- **Partite**: le **segna Lani**; un genitore **corregge** il punteggio se serve e **approva** (passi solo dopo) oppure **rifiuta** (la partita sparisce).
- **Panchina** tutta la gara: **5 passi, +5 se vinta** (in campo +10, +15 se vinta).
- **Classifiche** dal portale FIPAV Reggio Emilia, una volta al giorno: **U13 Femminile girone C** ("13R-EVOLUT. POLO DIGITALE", CId 93436) e **U14 Femminile girone A** ("U14R-EVOLUTION", CId 93399). Se passano alla fase dopo cambia il girone: come gestirlo è da decidere (oggi si cambia il CId nel config).
- **Allenatore**: niente altri permessi. **La squadra**: più avanti, automatica, insieme agli avatar.
- **Selezioni e raduni**: rimandati.

## Fatto (13/11, branch `sprint-2`, non pubblicato)

| Cosa | Dove | Note |
|---|---|---|
| Interruttore R-Evolution | Impostazioni dei genitori (`InterruttoreREvolution` in `src/Genitori.tsx`); client `src/accensione.ts`; server `rEvolutionDa()` in `_shared/passi.ts` e `_shared/chiavi.ts` | "Accendi R-Evolution da oggi" salva il giorno; "Spegni" lo toglie (i passi già presi restano). Regole: `rEvolutionAttiva(g, accesaDa)`, `inizioREvolution(accesaDa)` per la bandierina. |
| Dieci minuti al mattino | `src/DieciMinuti.tsx`, carta in fondo a Oggi | Solo con R-Evolution accesa e dentro `dieci_minuti.finestra` (06:00-13:00, ora di Roma); dopo l'avvio il timer resta anche oltre le 13. Ore sulla riga di `serate` del giorno (colonne di 0029). Tolti dalla Sera. |
| Controllo sul server | `_shared/passi.ts`, gestore nuovo `dieci_minuti` (id = giorno) | +10 solo se avviati nella finestra, timer in fondo, spunta lo stesso giorno (`dieciMinutiValidi`). Riferimento `dieci_minuti:<giorno>`. |
| Menu dei dieci minuti | tabella `esercizi_dieci_minuti` (0031), `MenuDieciMinuti` in Impostazioni | Lani legge, genitori aggiungono e tolgono; almeno uno per tipo resta (bottone spento). Partenza: i 5 esercizi della bozza, stessi id. Tolto dal config. |
| Partite | `src/Partita.tsx`: `SegnaPartita` (Lani in R-Evolution, genitore in Settimana), `PartiteDaApprovare` (Settimana) | Lani: "Manda da approvare", con "Sono entrata in campo". Genitore: corregge set e campo, Approva (chiama `passi`) o Rifiuta (cancella). Il server firma `approvata_da` (trigger). Passi da `passiPartita(nostri, loro, inCampo)`. |
| Classifiche | `src/lib/classifiche` (lettura della pagina, con test), funzione `classifiche`, tabella `classifiche` (0032), cron 0033 alle 6:15, riga in Stato | Schermata R-Evolution: una carta per campionato, riga di Lani in fucsia, data di aggiornamento. Errore: avviso ai genitori, resta la classifica di prima. |
| Schermata R-Evolution | `src/REvolution.tsx` | Classifiche, partite (quelle da approvare segnate così e non contate), dieci minuti del mese, modulo per segnare la partita. |
| Simulazione | `scripts/simula_passi.mjs` (porting in Node di `simula_passi.py`) | Vedi proposta del percorso. |
| Annuncio | `r_evolution_accesa` in `src/lib/copione`, trigger `annuncia_r_evolution` (0034) su `impostazioni`, pulsante "Vediamo" in `src/Popup.tsx` | All'accensione il server accoda il popup (i genitori non scrivono `popup_coda`), uno per giorno di accensione. Testo uguale nel copione e nella migrazione (test). Se la riga `r_evolution_da` c'è già prima di 0034, niente popup: spegnere e riaccendere. |
| Prove | `regole.test.ts`, `classifiche.test.ts`, `cron.test.ts` (classifiche), `scripts/simulatore/dieci-minuti.test.ts`, `e2e/dieci-minuti`, `e2e/r-evolution`, `e2e/genitori`, `prova:schema` (partite, menu) | Esito dell'ultimo giro in fondo. |

## Percorso: 7.700 passi (approvato dal signore il 13/11, nel config)

Simulazione Monte Carlo, stesso criterio di docs/01 (cima con impegno 70/75/80/90%: circa 4/40/86/100 su 100). `node scripts/simula_passi.mjs <accensione> <totale> <prima tappa> [prob. panchina]`.

| Scenario | 70 | 75 | 80 | 90 |
|---|---|---|---|---|
| 7/1, 7.200 (taratura di oggi) | 5 | 38 | 86 | 100 |
| 23/11, 7.200 | 7 | 49 | 94 | 100 |
| 23/11, 7.600 (riserva "dicembre") | 3 | 43 | 92 | 100 |
| **23/11, 7.700** | 3 | 39 | 89 | 100 |
| 1/12, 7.700 | 2 | 41 | 87 | 100 |
| 23/11, 7.700, 25% partite in panchina | 3 | 36 | 86 | 100 |

**Deciso: `totale_passi` 7.700**, 27 tappe `[130,140,155,165,180,190,200,215,225,235,250,260,275,285,295,310,320,335,345,355,370,380,395,405,415,430,440]`, e `periodo.r_evolution_prevista` = giorno di accensione. Va bene sia per il 23/11 sia per l'1/12. Nel config dal 13/11 (tolta la riserva da 7.600), `r_evolution_prevista` = 23/11; docs/02, docs/05 e `npm run simula` aggiornati. Con 7.200 e avvio a novembre il percorso diventa troppo facile. Regola di docs/02: si alzano **solo le tappe ancora da fare**. Se all'accensione Lani ha già passato delle tappe, quelle restano com'erano (125, 135, …) e la differenza va spalmata sulle successive.

## Da fare, in ordine

1. Prova della barra a 5 voci sui telefoni veri.
2. ~~Partite dal calendario~~ fatto il 13/11: "Segna la partita" propone giorno e avversaria dall'ultima partita del calendario ("Partita Lani U13: CASA vs OSPITI", `avversariaDelTitolo` in `src/lib/calendario`). Partita corretta dopo l'approvazione: l'app non lo permette (si correggono solo quelle da approvare), quindi i passi non vanno mai stornati da lì.
3. **Fase successiva dei campionati**: come cambiare girone senza toccare il config (es. CId in Impostazioni).
4. **Pagina "La squadra"**, automatica con gli avatar.
5. **Livello bonus della selezione**, selezioni e raduni: rimandati.
6. **Tutor di matematica**; raccolta video; versi dei personaggi.
7. **Da decidere (signore): accensione dopo le 13.** Il giorno in cui R-Evolution si accende conta già i dieci minuti tra le cose possibili della settimana, anche se accesa dopo la finestra del mattino: +10 passi e +1 cosa che Lani non può fare, percentuale per le chiavi un po' più bassa. Alternative: contare dal giorno dopo se accesa dopo le 13, oppure lasciare così (si accende di mattina). Dalla revisione con Open Code Review del 13/11.

## Prima di unire a `main`

- `npm test`, `npm run prova:schema`, `npx playwright test`, `npx tsc -p .`, `npm run build`.
- Già in produzione dal 13/11 (main non le usa, la preview sì): migrazioni `0029`-`0033` e funzione `classifiche` (prima lettura FIPAV ok: U13 6 squadre, U14 4). In produzione `r_evolution_da` = 2026-11-13 (premuto sulla preview): main la ignora.
- Insieme all'unione, non prima (altrimenti R-Evolution si vede in main): `0034` (l'annuncio finirebbe nella coda che legge anche main), `0035` (firma e niente pareggi sulle partite, sicura anche prima) e le funzioni `passi` e `chiavi` (con la riga accesa i dieci minuti conterebbero per le chiavi mentre main non li mostra). Poi Spegni e Accendi il giorno vero, così parte l'annuncio. Finché `passi` non è pubblicata, "Approva" di una partita sulla preview non dà passi.
- Rigenerare `src/tipi-database.ts` (oggi ritoccato a mano per `serate`, `partite`, `esercizi_dieci_minuti`, `classifiche`).
- Poi accendere R-Evolution da Impostazioni.

## Ultimo giro di prove

13/11 sera, macchina tornata veloce, tutto in parallelo: `tsc` ok, `eslint` ok, `npm test` 287 (+1 saltata), `prova:schema` 273, `build` ok, `npx playwright test` 150 passate e 22 saltate (confronto e lighthouse, solo a richiesta). Corretta `e2e/astra.e2e.ts`: col percorso a 7.700 il forziere 1 è a 425 passi (prima 405).

## Revisione con Open Code Review (13/11)

`ocr` 1.13.6 (`npm i -g @alibaba-group/open-code-review`) in modo delega, senza chiave: `ocr delegate preview --from origin/main --to sprint-2` e `ocr delegate rule <file>`, la revisione la fa Claude. 7 segnalazioni, 1-6 corrette: margine di 5 s sul timer dei dieci minuti e avviso se il server non li conta; lettura di `impostazioni` in `chiavi.ts` con controllo d'errore; bandierina di Astra dal giorno di accensione come sul server; interruttore dei genitori che a lettura fallita non mostra "Accendi"; `0035` (Lani segna partite solo a nome suo, niente pareggi). La 7 è in "Da fare".
