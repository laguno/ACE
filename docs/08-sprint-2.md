# Sprint 2

**Obiettivo**: R-Evolution dentro ACE (dieci minuti, partite, risultati e classifiche, pagina "La squadra", livello bonus della selezione), poi tutor di matematica.
**Quando vale per Lani**: dal giorno `periodo.r_evolution_da` di `data/config-gioco.json` (oggi 7 gennaio 2027). Prima di quella data tutto il nuovo resta nascosto e non dà passi, quindi il branch si può unire a `main` anche prima senza cambiare il gioco in corso.
**Branch**: `sprint-2` (worktree `C:\progetti\ace\app-sprint-2`), aperto il 13/11/2026 mentre su `main` si fanno i test in famiglia. `main` riceve solo correzioni; ogni tanto si porta `main` dentro `sprint-2`.

## Fatto (13/11, da rivedere col signore)

| Cosa | Dove | Note |
|---|---|---|
| Dieci minuti nella Sera | `src/DieciMinuti.tsx`, carta prima della cartella | Esercizio proposto (recupero nei giorni di pallavolo, forza e riflessi negli altri), scelta dal menu, timer di 10 minuti, "Fatto" solo in fondo. Entra nel conto "x su y pronte". |
| Controllo sul server | `_shared/passi.ts` (gestore `serata`) | +10 (`passi.obbligatori.dieci_minuti`) solo da R-Evolution e solo se tra avvio e spunta ci sono almeno `dieci_minuti.secondi`; le ore le mette il trigger `timbra_ora`. |
| Dieci minuti nelle chiavi | `contaSettimana` + `_shared/chiavi.ts` | Da R-Evolution ogni sera della settimana è una cosa obbligatoria possibile (7 a settimana). |
| Menu nel config | `data/config-gioco.json` → `dieci_minuti` | Bozza dal menu di docs/01: plank, squat e affondi, visore (forza e riflessi); mobilità, respirazione (recupero). |
| Partite | `src/Partita.tsx` nella settimana dei genitori | Un genitore segna giorno, avversaria e set. +10 giocata, +15 in più se vinta (`passi.partite`), popup del copione "Partita vinta" / "Partita persa". Correzione da persa a vinta: aggiunge solo i 15 che mancano. |
| Schermata R-Evolution | `src/REvolution.tsx`, quinta voce della barra | Partite con risultato (vinte in fucsia), dieci minuti del mese, passi presi in campo. La voce compare solo da R-Evolution. |
| Migrazioni | `0029_dieci_minuti.sql`, `0030_partite.sql` | **Non applicate.** Colonne `dieci_minuti_da`, `dieci_minuti_esercizio` su `serate`; tabella `partite` (Lani legge, genitori scrivono). |
| Prove | `regole.test.ts`, `scripts/simulatore/dieci-minuti.test.ts`, `e2e/dieci-minuti.e2e.ts`, `e2e/genitori.e2e.ts`, `prova:schema` | Tutte verdi il 13/11. |

## Da fare, in ordine

1. **Popup di annuncio** il primo giorno di R-Evolution (App.tsx lo prevedeva nello sprint 1) e controllo della barra a 5 voci a 360 px.
2. **Partite dal calendario**: il giorno è già proposto dall'ultima partita di Lani in calendario (ultimi 7 giorni); manca l'avversaria dal titolo, quando si sa come sono scritti gli eventi delle partite.
3. **Menu dei dieci minuti modificabile dall'app** (Impostazioni dei genitori), come chiede docs/01. Oggi sta nel config.
4. **Pagina "La squadra"** nell'album, con contatore suo: allenatore (figurina rara, avatar già in `public/assets/avatar-piccoli/allenatore/`) e compagne senza volto. Si sbloccano con partite, allenamenti, raduni, convocazione.
5. **Classifiche**: classifica del campionato di Lani.
6. **Livello bonus della selezione**: forziere d'oro in R-Evolution, "convocata nella rappresentativa territoriale", lo apre solo un genitore. Passi per giornate di selezione e raduni.
7. **Tutor di matematica** passo per passo: progetto a sé (IA con suggerimenti, mai la soluzione), da scrivere prima su carta col signore.
8. Raccolta completa dei video; versi dei personaggi.

## Decisioni del signore (13/11)

- **Nessuna data**: R-Evolution si accende con un **interruttore dei genitori** in Impostazioni (forse già la settimana dopo il 13/11). Prima dell'accensione tutto resta nascosto e senza passi.
- **Percorso**: con l'avvio anticipato va **ricalcolato** (simulazione), poi lo approva il signore.
- **Dieci minuti al mattino**, non la sera: si avviano **dalle 6:00 alle 13:00**, tutti i giorni.
- **Menu dei dieci minuti**: la bozza resta come partenza; da ora lo cambiano i genitori in Impostazioni.
- **Partite**: le **segna Lani**; un genitore **corregge** il punteggio se serve e **approva** (passi solo dopo l'approvazione) oppure **rifiuta** (la partita sparisce).
- **Panchina** tutta la gara: **5 passi, +5 se vinta** (giocata resta +10, +15 se vinta).
- **Classifiche** dal portale FIPAV Reggio Emilia: **U13 Femminile girone C** ("13R-EVOLUT. POLO DIGITALE", CId 93436) e **U14 Femminile girone A** ("U14R-EVOLUTION", CId 93399). Una volta al giorno. Se passano alla fase dopo, cambia il girone: come gestirlo è da decidere.
- **Allenatore**: niente altri permessi da chiedere. **La squadra**: si fa più avanti, automatica, insieme agli avatar.
- **Selezioni e raduni**: rimandati, per ora non si vedono.

## Prima di unire a `main`

- `npm test`, `npm run prova:schema`, `npm run prova:schermate`, `npx tsc -p .`, `npm run build`.
- Applicare `0029` e `0030` su Supabase (lo lancia il signore) e pubblicare la funzione `passi`. Le colonne nuove sono facoltative: la Sera di oggi continua a funzionare anche prima.
- Rigenerare `src/tipi-database.ts` dopo le migrazioni (oggi ritoccato a mano per `serate` e `partite`).
