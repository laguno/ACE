# Regole di gioco

Versione approvata dal signore il 7 novembre 2026. **Questo file e `data/config-gioco.json` sono la fonte autorevole**: dove il documento di progetto (`01-documento-di-progetto.md`) dice altro, valgono loro. Il codice di riferimento è in `src/lib/regole/`, con i test.

## L'idea in una riga

> I passi ti fanno camminare, le chiavi aprono i forzieri.

Mantra dell'app: **"Ogni giorno, passino passino."**

- **Passi**: ogni cosa fatta dà passi. I passi fanno avanzare Lani lungo il percorso di Astra (27 tappe, dalla terra alle stelle).
- **Chiavi**: ogni domenica sera da 0 a 3, sulla settimana intera e solo sulle cose obbligatorie. Le chiavi si accumulano e non si spendono.
- **Forzieri**: 9, uno ogni 3 tappe. Si aprono quando Lani arriva alla tappa **e** ha raccolto abbastanza chiavi in totale.

## Il percorso

27 tappe per **7.200 passi**, sempre più care (come nei videogiochi): 125, 135, 145, 160, 170, 180, 190, 200, 210, 225, 235, 245, 255, 265, 280, 290, 300, 310, 320, 330, 345, 355, 365, 375, 385, 395, 410.

| Forziere | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | Cima |
|---|---|---|---|---|---|---|---|---|---|
| Tappa | 3 | 6 | 9 | 12 | 15 | 18 | 21 | 24 | 27 |
| Passi | 405 | 915 | 1.515 | 2.220 | 3.020 | 3.920 | 4.915 | 6.010 | 7.200 |
| Chiavi totali | 2 | 4 | 7 | 14 | 17 | 21 | 26 | 31 | 36 |

Quattro mondi (sfondi in `public/assets/sfondi/`): Colline di caramelle, Montagne di zucchero, Nuvole di zucchero filato, Lo spazio.

**Se R-Evolution esce a dicembre** il percorso giusto è di 7.600 passi (`config.percorso.alternativa_r_evolution_dicembre`). Alla taratura di inizio dicembre si alzano **solo le tappe ancora da fare**: Lani non deve mai vedere cambiare nulla all'indietro.

## Passi: cose obbligatorie (contano anche per le chiavi)

| Cosa | Quando | Passi |
|---|---|---|
| Compiti per domani fatti | ogni giorno di scuola | 10 (13 se fatti almeno 2 giorni prima della scadenza) |
| Cartella pronta | ogni sera di scuola | 5 |
| Borsa pronta | sera prima di allenamento o partita | 2 |
| Foglio da firmare consegnato | quando c'è (lo segna un genitore) | 2 |
| Sessione di ripasso | 3-4 giorni prima di una verifica | 10 |
| Dieci minuti di allenamento | ogni giorno, a qualsiasi ora, con il timer; vale solo se finito tutto | 10 (dallo sprint 2) |

**Anticipo**: la serie di giorni in anticipo dura al massimo fino a fine settimana, poi riparte.

## Passi: studio facoltativo (non conta per le chiavi)

Fino a **4 al giorno per tipo**, sulle materie della settimana. Danno passi **solo se i compiti del giorno sono spuntati**.

| Cosa | Passi | Regola |
|---|---|---|
| Giro di flash card | 3 | ogni carta si gira solo dopo 7 secondi |
| Video visto fino in fondo | 3 | video YouTube scelti per argomento; se manda avanti o cambia schermata non dà passi |
| Quiz, 1° tentativo | 10 con almeno il 90% giusto, 6 sotto | |
| Quiz, 2° tentativo | 6 o 4 | stesso argomento |
| Quiz, 3° tentativo | 3 o 2 | |
| Quiz, dal 4° | 1 | |
| Carte del giorno (ripasso a intervalli) | 3 a giro | ogni giorno, weekend compresi; salta nei giorni di partita |
| Foto di un compito richiesta da ACE | 2 | una volta per pagina, solo pagine chieste da Nuvola/Classroom |

## Passi: gesti di casa (li danno i genitori)

Scrivania in ordine, lavastoviglie fatta, letto fatto, vestiti in ordine: **+2 ciascuno, tetto 6 al giorno**. Si danno quando i genitori lo notano, non su richiesta di Lani. Lani vede chi li ha dati: «Mamma: +2, scrivania in ordine».

## Passi: risultati

| Risultato | Passi |
|---|---|
| Verifica o interrogazione da 9 o 10 | +30 |
| Da 8 | +20 |
| Da 7 | +10 |
| Voto migliore del precedente nella stessa materia, se almeno 6 | +15 in aggiunta |
| Sufficienza subito dopo un'insufficienza | +20 |
| Partita giocata / vinta (sprint 2) | +10 / +15 in più |
| Enigma del forziere risolto | +20 |
| Nota di merito | +50 |
| Pagella del primo quadrimestre con media da 7 / da 7,5 | +100 / +200 |
| Materia da insufficiente a sufficiente in pagella | +25 |

Un voto insufficiente non dà passi, e **nessun voto ne toglie**.

## Passi tolti (gli unici)

| Cosa | Passi | Chi lo segna |
|---|---|---|
| Nota disciplinare | −20 | Nuvola |
| Note per dimenticanza | −10 ogni tre | Nuvola |
| Bagno lasciato in disordine dopo la doccia | −1 | un genitore |
| Comportamento antisportivo in campo (sprint 2) | −7 | un genitore |
| Balla o imbroglio scoperto, nell'app o fuori (es. compiti spuntati ma non fatti) | −10 | un genitore |

Le sgridate segnate dai genitori fanno partire subito il popup con il personaggio arrabbiato e mettono in attesa la figurina della serie nera (vedi Figurine). Tutto il resto toglie la possibilità di guadagnare, non passi già presi. Il saldo non scende sotto zero.

## Correzione delle spunte

Decisa dal signore il 7 novembre 2026. Se un genitore toglie una spunta sbagliata, il server registra uno **storno**: un movimento opposto (motivo `storno`, riferimento alla spunta) che annulla esattamente i passi di quella spunta, moltiplicatore compreso. Non è un malus: una spunta sbagliata non è un passo guadagnato.

- Lo storno vale solo fino alla chiusura delle chiavi della domenica sera di quella settimana; dopo, passi e chiavi già dati non si toccano.
- Se la spunta era un imbroglio voluto, i genitori segnano a parte la sgridata "balla −10".
- Lani vede la correzione e chi l'ha fatta, senza popup di sgridata.
- **Compito rifatto**: se Lani rispunta un compito stornato nella stessa settimana (prima delle chiavi della domenica), il server le ridà i passi base (10), senza bonus anticipo, con motivo `compito_rifatto` e lo stesso riferimento. Una sola volta per compito.

## Chiavi della settimana

Contate la **domenica sera**, solo sulle cose obbligatorie:

1. **Prima chiave**: almeno il 70% dei passi obbligatori possibili in quella settimana.
2. **Seconda**: in più, nessuna nota (qualsiasi nota la toglie, quindi con una nota si arriva al massimo a una chiave).
3. **Terza**: in più, almeno il 95% delle cose obbligatorie fatte.

## Rimonta

Se a inizio settimana Lani è indietro di più di **una tappa e mezza** rispetto alla bandierina, i passi della settimana valgono **×1,25**, ma solo se in quella settimana prende almeno la prima chiave.

## Bandierina del tempo

Mostra dove "dovrebbe" essere Lani a quella data. Avanza solo nei giorni di scuola, si ferma in vacanza, arriva in cima l'ultimo giorno di scuola (4 giugno 2027). Dopo l'arrivo di R-Evolution i giorni pesano 1,4 volte (più passi disponibili). Calendario in `config.calendario` (da verificare con quello dell'istituto).

## Forzieri ed enigma

- **Stati**: chiuso → enigma visibile (quando manca l'ultima tappa) → aperto → consegnato.
- Se Lani arriva alla tappa senza abbastanza chiavi, compare il **popup del lucchetto** e il forziere si apre da solo appena le chiavi bastano.
- **Premi**: li scelgono i genitori nell'app, tutti e nove, modificabili finché l'enigma non è comparso. Progressione da videogioco: i primi tre piccoli o privilegi senza spesa, poi sempre più importanti; la cima legata alla pagella di giugno. Lani non vede il premio prima dell'apertura (attenzione a RLS: vedi schema).
- **Enigma**: quando un genitore inserisce il premio, ACE genera con l'IA un indovinello che lo descrive, difficile ma adatto ai 12 anni, con un indizio cifrato. Tre tentativi; la risposta la valuta l'IA accettando sinonimi; +20 se risolto prima di arrivare al forziere.
- Ogni forziere regala anche una figurina rara non ancora presa.
- Consegna: la segnano i genitori; se dopo 7 giorni non è segnata, ACE lo ricorda **a loro**, mai a Lani. Ciò che un forziere promette va mantenuto.

## Figurine (album da 64)

- Una posa comune si sblocca la prima volta che compare in un popup o in una notifica; riga in fondo al popup: «Nuova figurina: {nome}. Album {n}/64».
- Pose rare: il loro momento è raro (il 9 del nonno, la cima). Le pose senza momento naturale (leo-tennis, leo-copertina, leo-dispiaciuto, leo-partita-persa) escono solo dai forzieri.
- **Serie nera** (pose arrabbiate e dispettose): non danno passi; si sbloccano con il **riscatto**, sette giorni fatti bene dopo il rimprovero che le mostra. L'album si completa senza prendere note.
- **Pagina "La squadra"** (sprint 2), con contatore suo: allenatore (con avatar vero, con il suo permesso) e compagne **senza volto** (di spalle, maglia, numero, ruolo, nome di battesimo). Nessuna foto delle ragazze.

## Livello bonus R-Evolution (sprint 2)

Forziere d'oro in R-Evolution, fuori dai 9: «convocata nella rappresentativa territoriale» (Trofeo dei Territori) → iPhone ricondizionato. Si apre solo con la convocazione, segnata dai genitori. Giornate di selezione e raduni danno passi anche senza convocazione.

## Taratura

Dopo due settimane d'uso si confrontano i passi reali con il modello (`scripts/simula_passi.py`) e si ritoccano i numeri in `data/config-gioco.json`. Risultati attesi con le regole attuali (R-Evolution a gennaio):

| Impegno | Arriva in cima | Quando |
|---|---|---|
| 70% | 4% delle volte | si ferma verso il 7° forziere |
| 75% | 40% | fine maggio |
| 80% | 86% | metà maggio |
| 90% | sempre | fine aprile |
