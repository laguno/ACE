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
| Prove | `regole.test.ts`, `classifiche.test.ts`, `cron.test.ts` (classifiche), `scripts/simulatore/dieci-minuti.test.ts`, `e2e/dieci-minuti`, `e2e/r-evolution`, `e2e/genitori`, `prova:schema` (partite, menu) | Esito dell'ultimo giro in fondo. |

## Proposta del percorso (da approvare)

Simulazione Monte Carlo, stesso criterio di docs/01 (cima con impegno 70/75/80/90%: circa 4/40/86/100 su 100). `node scripts/simula_passi.mjs <accensione> <totale> <prima tappa> [prob. panchina]`.

| Scenario | 70 | 75 | 80 | 90 |
|---|---|---|---|---|
| 7/1, 7.200 (taratura di oggi) | 5 | 38 | 86 | 100 |
| 23/11, 7.200 | 7 | 49 | 94 | 100 |
| 23/11, 7.600 (riserva "dicembre") | 3 | 43 | 92 | 100 |
| **23/11, 7.700** | 3 | 39 | 89 | 100 |
| 1/12, 7.700 | 2 | 41 | 87 | 100 |
| 23/11, 7.700, 25% partite in panchina | 3 | 36 | 86 | 100 |

**Proposta: `totale_passi` 7.700**, 27 tappe `[130,140,155,165,180,190,200,215,225,235,250,260,275,285,295,310,320,335,345,355,370,380,395,405,415,430,440]`, e `periodo.r_evolution_prevista` = giorno di accensione. Va bene sia per il 23/11 sia per l'1/12. **Non è nel config**: lo cambia il signore (o lo dice e si cambia), insieme a docs/02:27 che parla ancora di 7.600. Con 7.200 e avvio a novembre il percorso diventa troppo facile. Regola di docs/02: si alzano **solo le tappe ancora da fare**. Se all'accensione Lani ha già passato delle tappe, quelle restano com'erano (125, 135, …) e la differenza va spalmata sulle successive.

## Da fare, in ordine

1. **Percorso**: decisione sulla proposta qui sopra, poi config + docs/02.
2. **Popup di annuncio** il giorno dell'accensione (copione da scrivere) e prova della barra a 5 voci sui telefoni veri.
3. **Partite dal calendario**: avversaria proposta dal titolo dell'evento, quando si sa come sono scritti.
4. **Fase successiva dei campionati**: come cambiare girone senza toccare il config (es. CId in Impostazioni).
5. **Pagina "La squadra"**, automatica con gli avatar.
6. **Livello bonus della selezione**, selezioni e raduni: rimandati.
7. **Tutor di matematica**; raccolta video; versi dei personaggi.

## Prima di unire a `main`

- `npm test`, `npm run prova:schema`, `npx playwright test`, `npx tsc -p .`, `npm run build`.
- Il signore applica `0029`-`0033` (0033 è il cron delle classifiche) e pubblica le funzioni `passi`, `chiavi` e `classifiche` (quest'ultima con `verify_jwt = false`, già in `config.toml`).
- Rigenerare `src/tipi-database.ts` (oggi ritoccato a mano per `serate`, `partite`, `esercizi_dieci_minuti`, `classifiche`).
- Poi accendere R-Evolution da Impostazioni.
