# Simulazione dell'anno di scuola

`npm run simula:anno` (circa un minuto) fa vivere a una Lani finta l'anno dal 23/11/2026 al 4/6/2027, giorno per giorno, con il calendario di `data/config-gioco.json` (vacanze comprese). Gira su PGlite con tutte le migrazioni vere e con lo **stesso codice delle Edge Functions**: passi (`supabase/functions/_shared/passi.ts`), chiavi della domenica (`_shared/chiavi.ts`), voti e note (`_shared/voti.ts`), forzieri e popup. L'orologio finto muove insieme il codice e il database (PGlite legge l'ora da `Date.now`). Dati tutti finti, seme fisso: ogni giro dà gli stessi numeri.

`npm test` fa girare 4 settimane del profilo normale, così il simulatore non smette di funzionare quando cambia il codice.

## Risultati (9/11, regole e numeri attuali)

| Profilo | Passi a fine anno | Tappa | Cima | Chiavi (media a settimana) | Forzieri aperti | Settimane con rimonta |
|---|---|---|---|---|---|---|
| diligente (95%) | 6444 | 25 | no | 69 (2,56) | 8 | 9 |
| normale (80%) | 6210 | 24 | no | 50 (1,85) | 8 | 17 |
| altalenante (95% / 50%) | 5591 | 22 | no | 37 (1,37) | 7 | 10 |
| crisi a gennaio, poi rimonta | 6080 | 24 | no | 50 (1,85) | 8 | 16 |
| furbetta (70%, prova a barare) | 6780 | 25 | no | 51 (1,89) | 8 | 6 |

Dettagli per profilo nei file `.md` (grafico passi e bandierina, passi per motivo, forzieri, chiavi per settimana) e nei `.csv` (una riga per giorno e motivo, passi già col moltiplicatore della rimonta: lo stesso formato serve per la taratura di dicembre).

**Nessun invariante violato** in nessun profilo, controllati ogni giorno: saldo mai sotto zero; nessun movimento doppio; al massimo 4 caselle di studio per tipo al giorno; gesti mai oltre 6 passi al giorno; compito rifatto solo dopo uno storno e storno uguale ai passi tolti; compito scaduto spuntato in ritardo senza passi; chiavi di ogni settimana uguali a quelle delle regole (e al massimo 1 con una nota); forziere aperto solo con tappa e chiavi; enigma mai prima dell'ultima tappa; Lani (con la sua vista `forzieri_lani`) non vede mai il premio di un forziere chiuso; bandierina ferma nei giorni senza scuola; figurine mai oltre l'album; ogni popup nei limiti del copione (titolo ≤ 4 parole, testo ≤ 25, niente emoji); nessun rimprovero dei genitori accodato dopo le 21.

## Bug trovato e corretto

- **Tetto dei gesti di casa**: due gesti nello stesso istante (doppio tocco, due genitori insieme) non si vedevano a vicenda e il tetto di 6 passi al giorno saltava (8 nel simulatore). Ora il tetto si conta sui passi dei gesti già registrati quel giorno (`passiNuovoGesto`, con prova).
- Nel finto ambiente di prova, `come()` lasciava attaccato l'utente alle query successive (le scritture "del server" risultavano del papà). Corretto.

## Da decidere

1. **La cima non arriva con le sole fonti dello sprint 1.** Il modello della taratura (`docs/02`, "80% di impegno: cima a metà maggio") conta su dieci minuti di allenamento (+10 al giorno), partite (+10/+15) e R-Evolution da gennaio, tutto dello sprint 2; la bandierina dal 7/1 corre già 1,4 volte più veloce. Con quello che c'è oggi il profilo all'80% finisce alla tappa 24 (6.210 passi su 7.200) e il 95% alla 25. Proposta: tenere i numeri e confermare lo sprint 2 a gennaio; se slitta, alla taratura di dicembre abbassare le tappe ancora da fare (come previsto per il caso opposto) o rallentare la bandierina fino all'arrivo di R-Evolution.
2. **Lo stesso gesto due volte nello stesso giorno vale due volte** (letto fatto segnato da mamma e da papà: +4). L'area Genitori spegne i pulsanti solo al tetto. Proposta: un gesto per voce al giorno (indice unico su data e voce, pulsante spento dopo il tocco).
3. **Spunte false e studio facoltativo.** Lo studio facoltativo dà passi solo con i compiti per domani spuntati; una spunta falsa li sblocca, e quando il genitore la storna il giorno dopo i passi dello studio restano. Nella simulazione la furbetta (70%) prende 1.780 passi dalle flash card contro i 572 del profilo normale e finisce davanti alla diligente. Proposta: con lo storno di un compito si stornano anche i passi di studio di quel giorno; oppure lo studio si conta la sera, a compiti confermati.
4. **Lo studio facoltativo pesa molto.** 4 giri di flash card al giorno, weekend compresi, fanno circa 12 passi al giorno: quanto un compito. Da guardare alla taratura con i dati veri.

## Cosa il simulatore non fa ancora

- **Enigmi** (+20 passi a enigma risolto, al massimo 160): la funzione `enigma` usa l'IA per giudicare la risposta e non è ancora in un modulo condiviso.
- **Pagella del primo quadrimestre** (+100/+200 e +25 per materia): nel codice non c'è ancora chi la registra.
- **Notifiche** (≤ 3 al giorno + 1 sollecito, ≤ 60 caratteri): la funzione `notifiche` non è ancora in un modulo condiviso; i limiti dei testi sono provati in `src/lib/copione`.
- **Un popup per apertura**: è una regola dell'app (Popup.tsx), non del server; il simulatore controlla solo la coda.
- Video (manca l'elenco), dieci minuti, partite e R-Evolution (sprint 2), riscatto della serie nera.
- Il confronto con `scripts/simula_passi.py`: Python non è installato su questo PC. Il CSV ha il formato giusto per rifarlo.
