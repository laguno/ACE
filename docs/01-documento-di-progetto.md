> **Nota per Claude Code.** Questo è il documento di progetto completo, con la storia delle decisioni (esportato il 7 novembre 2026). Alcune parti sono superate: dove contraddice `02-regole-di-gioco.md`, `03-schermate.md` o `data/config-gioco.json`, valgono quelli. In particolare: punti → **passi**, stelle → **chiavi**; i forzieri si aprono con un numero fisso di chiavi totali (2, 4, 7, 14, 17, 21, 26, 31, 36), non con frazioni delle stelle possibili; i valori della tabella "Il sistema a punti" sono stati aggiornati il 7 novembre.

# App per Lani — documento di progetto

2026-11-04 · Alessandro Messori

## Il problema

Da settembre Lani ha 8 insufficienze su 20 voti e 12 note in sette settimane. La causa probabile non è la memoria: la scuola ha smesso di contare per lei, mentre la pallavolo conta tutto.

| Periodo | Insufficienze | Note (escluse di merito) | Ritardi | Giorni di assenza |
|---|---|---|---|---|
| Seconda media, set-ott 2026 (7 settimane) | 8 su 20 | 12 | 1 + un'uscita | 3 |
| Prima media, feb-giu 2026 | 8 su ~79 | 5 | 7 | 7 |
| Prima media, set 2025-gen 2026 | 1 su ~68 | 2 | 3 | 5 |

Fonte: registro Nuvola e pagella di prima media.

**Cosa dicono i dati**

- Undici note su dodici riguardano l'organizzazione: materiale dimenticato (il lunedì il materiale da disegno), lavori non consegnati, fogli e giustificazioni in ritardo. Una sola è disciplinare.
- Le capacità ci sono: la stessa materia passa da 4 a 8 (Tecnologia), da 4½ a 7½ (Storia). Ad ottobre 2025 ha preso una nota di merito per un lavoro fatto di sua iniziativa.
- Matematica si è rotta per prima, a marzo 2026: da 9 a una serie di 5. A maggio è arrivato il modulo per il corso di recupero.
- Due delle tre assenze di quest'anno cadono in giorni di verifica (25 settembre, 23 ottobre). Da chiarire se fossero malattia.

**Il contesto**

| Quando | Cosa |
|---|---|
| Settembre 2026 | Crollo a scuola su tutta la linea |
| Fine agosto 2026 | Entra nella R-Evolution: le amiche ora sono quelle di squadra |
| Primavera-estate 2026 | Rapporti a scuola sempre peggiori, in particolare con una compagna e con i maschi. Estate in casa o al camp |
| Marzo 2026 | Matematica crolla, aumentano i ritardi |
| Gennaio 2026 | Passa dall'Under 12 all'Under 13 dell'Arena |
| Ottobre 2025 | Primo telefono |

Al colloquio del 3 novembre le prof.sse Braglia e Arcuri hanno detto che Lani ha bisogno di aiuto e sembra regredita. Lei stessa ha detto a casa che le serve aiuto. A casa non parla mai delle compagne di scuola.

## Obiettivi

L'obiettivo di stagione è la pagella di giugno 2027: è quella che decide l'accesso al liceo sportivo di Parma, e prepara la soglia di Reggio di gennaio 2028.

| Livello | Obiettivo | Come si misura |
|---|---|---|
| Giornata | Cartella e borsa pronte, compiti fatti, fogli consegnati, ripasso se c'è una verifica, mini-allenamento | Spunte nell'app, riscontro con le note di Nuvola |
| Settimana | Una quota di punti da definire | Somma dei punti della settimana |
| Stagione | Media finale di seconda sopra il taglio del Bertolucci quadriennale; matematica stabilmente a 7 | Media da Nuvola, aggiornata in tempo reale |

**I due licei**

|  | [Bertolucci, Parma](https://www.liceoattiliobertolucci.edu.it/wp-content/uploads/2025/11/Delibera-522-CdI-10.11.2025-Criteri-iscrizioni-2026-27.pdf) | [Ariosto-Spallanzani, Reggio](https://liceoariostospallanzani-re.edu.it/index.php/servizi/servizi-per-le-famiglie/criteri-accettazione-iscrizioni) |
|---|---|---|
| Posti | 27 al quadriennale (il quinquennale è riservato ai residenti in provincia di Parma) | 26, una sola classe |
| Pagella che conta | Finale di seconda media, giugno 2027 | Primo quadrimestre di terza, gennaio 2028 |
| Cosa conta | Media di tutti i voti | Ita, Mat, Sci, Ing, Scienze motorie: nessun voto sotto 7 e media almeno 8 per avere punti di merito (20-50). Più residenza 4, sport 15 (campionato provinciale), consiglio orientativo liceo 6 |
| Taglio recente | Quadriennale: tutti dentro a gennaio 2026 (ultimo 7,23); l'anno prima esclusi a 7,33 ([graduatoria 2025](https://www.liceoattiliobertolucci.edu.it/wp-content/uploads/2025/02/timbro_Pubblicazione-graduatorie-L.-Sportivo-07.02.2025.pdf), [graduatoria 2026](https://www.liceoattiliobertolucci.edu.it/wp-content/uploads/2026/01/timbro_Pubblicazione-graduatorie-L.-Sportivo-31.01.2026.pdf)) | Non pubblicato |
| Lani oggi, con la pagella di giugno 2026 | Media 7,75: dentro, di poco | Media 7,8 ma matematica 6: zero punti di merito, 25 punti in tutto |

I criteri si rideliberano ogni anno: quelli per lei usciranno nell'autunno 2027.

## Principi

L'app è la stagione sportiva di Lani applicata alla scuola: si premia l'allenamento quotidiano, i voti sono il risultato che si vede.

1. **Processo, non voti.** La maggior parte dei punti viene da cose che lei controlla, ogni giorno. I buoni risultati danno un bonus; nessun voto toglie punti.
2. **La lingua della pallavolo.** Allenamento, partita, statistiche, stagione: è il mondo dove Lani sta bene e si sente capace.
3. **La parte quotidiana è sua.** Voi genitori avete un riepilogo settimanale, non una segnalazione per ogni mancanza.
4. **Corto e prevedibile.** La routine della sera deve stare in pochi minuti, sempre allo stesso modo.
5. **Fatti verificabili.** Dove serve un riscontro, lo dà Nuvola, non un genitore che fa da giudice.

**Cosa evitare**

- Punti tolti per i voti, classifiche, saldo negativo.
- Serie di giorni che si azzerano al primo errore.
- La pallavolo usata come punizione.
- Contare sulla novità: la gamification cala dopo tre o quattro settimane, deve restare l'abitudine.

## La settimana di Lani

Lani ha 30 ore di scuola, quattro allenamenti e fino a due partite a settimana: il tempo per i compiti è poco e cambia ogni giorno, quindi ACE deve adattarsi al giorno, non a un orario fisso.

| Giorno | Scuola | Pallavolo | Finestra per i compiti | Chiusura della giornata |
|---|---|---|---|---|
| Lunedì | 8-14 | 15:00-17:00 Rivalta, rientro 17:15-17:30 | dalle 17:45 | 20:30 |
| Martedì | 8-14 | 18:30-20:30 Rivalta | 14:45-18:00, la più lunga | prima di uscire, verso le 18:00 |
| Mercoledì | 8-14 | 16:15-18:00 Calerno | 14:45-15:45 e dopo cena | 20:30, con la borsa se giovedì c'è partita |
| Giovedì | 8-14 | partita quando c'è (5/11 ritrovo 17:00 a Reggio; 12/11 alle 19:45 a San Polo) | il pomeriggio, prima della partita | prima della partita, con la borsa per venerdì |
| Venerdì | 8-14 | 15:00-17:00 Rivalta | leggera | nessuna: sabato non c'è scuola |
| Sabato | — | partita quando c'è (14/11 alle 18:30 a Scandiano) | mattina: ripasso per le verifiche del lunedì | — |
| Domenica | — | a volte partita | pomeriggio | **la più importante: cartella del lunedì, borsa, piano della settimana** |

Fonte: calendario di famiglia e orario delle lezioni su Nuvola, settimane del 2 e del 9 novembre 2026.

**Due cose che la tabella spiega**

- Lunedì e venerdì l'allenamento è alle 15 a Rivalta: Lani esce di casa al mattino con cartella e borsa insieme. La borsa si prepara la sera prima.
- La nota "di lunedì manca ripetutamente il materiale da disegno" nasce la domenica sera: è la chiusura più carica della settimana, e oggi nessuno la presidia.

**I momenti di ACE**

1. **7:00 · Oggi.** Quando il telefono si attiva: tre righe su cosa c'è oggi (verifiche, allenamento o partita, una cosa da non dimenticare).
2. **14:30 · Il pomeriggio.** Dopo la sincronizzazione con Nuvola: i compiti arrivati in mattinata e l'ordine in cui farli, adattato alla finestra del giorno.
3. **Durante i compiti · Sessioni.** Prima quello che serve per domani, poi il ripasso delle verifiche in arrivo, a blocchi brevi.
4. **Sera · Chiusura.** Prima i dieci minuti, poi cartella, borsa, fogli da firmare. L'orario cambia con il giorno, come in tabella.
5. **Domenica sera · Chiusura lunga.** Cartella del lunedì, borsa, verifiche e partite della settimana.
6. **Domenica · Riepilogo per i genitori.**

La sincronizzazione con Nuvola segue gli stessi momenti: alle 14:30, quando i compiti della mattina sono registrati, e alle 19:30, per quelli inseriti nel pomeriggio.

## Astra — il percorso

Il progresso si vede su un percorso a livelli che sale dalla terra alle stelle, da novembre a giugno: *per aspera ad astra*. Si avanza solo con i punti; il tempo è una bandierina che avanza da sola.

- **Tappe a punti.** Ogni tappa è una soglia di punti: si avanza solo facendo, e il percorso non torna mai indietro.
- **Il segnatempo.** Una bandierina avanza ogni settimana al ritmo giusto per arrivare in cima a giugno. Lani vede se è avanti, in pari o in rincorsa.
- **Le stelle.** Ogni settimana vale da una a tre stelle: una per la quota di punti, due se in più nessuna nota, tre se ha centrato tutti gli obiettivi. Misurano la qualità; la distanza misura la quantità.
- **I forzieri.** Premi a soglie fisse lungo il percorso, nascosti finché non ci arriva. Ciò che un forziere promette va sempre mantenuto.
- **I traguardi a data.** Vacanze di Natale, pagella di fine gennaio, Pasqua, pagella finale in cima. Arrivarci prima della data vale stelle in più.
- **La rimonta.** Quando è molto dietro la bandierina, i punti della settimana valgono un po' di più: recuperare deve sembrare sempre possibile.
- **Le note** pesano sulla quota della settimana, quindi su stelle e premio settimanale, mai sulla posizione nel percorso.

## Il sistema a punti

Ogni obiettivo di giornata vale punti; quello mancato resta visibile come "punti lasciati sul campo", ma il saldo non scende. I soli punti tolti vengono dalle note di Nuvola sul processo.

| Obiettivo | Quando | Punti (proposta) | Chi conferma |
|---|---|---|---|
| Cartella pronta per domani | ogni sera di scuola | 5 | Lani; Nuvola fa da riscontro |
| Borsa pronta | sera prima di allenamento o partita | 2 | Lani |
| Compiti per domani fatti | ogni giorno di scuola | 10 | Lani, sull'elenco preso da Nuvola |
| Fogli da firmare consegnati | quando ci sono | 2 | voi |
| Sessione di ripasso | nei 3-4 giorni prima di una verifica | 10 | Lani |
| Dieci minuti di allenamento (dallo sprint 2) | ogni giorno, a qualsiasi ora, con il timer; vale solo se finito tutto | 10 | Lani |

**Regole aggiunte il 7 novembre** (tutti i valori sono in passi)

- **Compiti fatti in anticipo.** Un compito fatto almeno due giorni prima della scadenza vale il 30% in più: 13 invece di 10. La serie di giorni in anticipo dura al massimo fino a fine settimana, poi riparte.
- **Foto dei compiti.** +2 per ogni compito fotografato tra quelli che ACE chiede da Nuvola o Classroom, una volta per pagina.
- **Studio facoltativo, abbondante.** Fino a 4 al giorno per tipo, sulle materie della settimana; danno passi solo se i compiti del giorno sono spuntati.
  - Flash card: +3 a giro; ogni carta si gira solo dopo 7 secondi.
  - Video: +3 a video visto fino in fondo. Sono video scelti da YouTube per argomento; non si può impedire di saltare, ma ACE se ne accorge: se Lani manda avanti o cambia schermata, il video non dà passi. Nello sprint 1 pochi video scelti; la raccolta completa dopo.
  - Quiz a scalare sullo stesso argomento: 1° tentativo 10 con almeno il 90% di risposte giuste, 6 sotto; 2° tentativo 6 o 4; 3° tentativo 3 o 2; dal 4° in poi 1.
- **Chiavi contate solo sulle cose obbligatorie:** compiti, cartella, borsa, fogli, ripasso prima delle verifiche e, dallo sprint 2, i dieci minuti. Studio facoltativo, gesti di casa e bonus danno passi ma non entrano nel conto delle chiavi.

**Bonus di risultato** (circa un quinto dei punti totali: il grosso viene dalla costanza)

| Risultato | Bonus (proposta) |
|---|---|
| Verifica o interrogazione da 9 o 10 | +30 |
| Da 8 | +20 |
| Da 7 | +10 |
| Voto migliore del precedente nella stessa materia, se è almeno 6 | +15, si somma agli altri |
| Sufficienza subito dopo un'insufficienza | +20 |
| Partita giocata | +10 |
| Partita vinta | +15 in più |
| Pagella del primo quadrimestre con media da 7 / da 7,5 in su | +100 / +200 |
| Ogni materia portata da insufficiente a sufficiente in pagella | +25 |

Un voto insufficiente non dà punti, e nessun voto ne toglie.

**Punti dei genitori**

- Solo in positivo, con due eccezioni volute: il bagno e i malus di comportamento qui sotto.
- Un elenco fisso deciso dai genitori: scrivania in ordine, lavastoviglie fatta, letto fatto, vestiti in ordine, +2 ciascuno.
- Si danno quando i genitori lo notano, non su richiesta di Lani.
- Tetto giornaliero di 6 punti.
- Lani vede chi glieli ha dati e perché: "Papà: +2, camera in ordine".

**Malus**

- Note didattiche su Nuvola (dimenticanze, lavori non consegnati): ogni tre note, un malus complessivo (proposta: −10).
- Nessun malus per i voti, per una verifica andata male o per un'assenza.

- Note disciplinari: −20 ciascuna.
- Note di merito: +50 ciascuna.
- Comportamento antisportivo in campo (dallo sprint 2): −7, lo segna un genitore.
- Balle o imbrogli scoperti, nell'app o fuori (per esempio compiti spuntati ma non fatti): −10, lo segna un genitore. Come il bagno, parte subito il popup di sgridata e la figurina della serie nera.
- Note di "altro tipo" (moduli, giustificazioni): nessun effetto sui punti; se ne occupa il promemoria dei fogli da firmare.
- Ogni nota didattica o disciplinare toglie comunque la seconda stella della settimana.

**Premi**

- Settimana: superata la quota, un premio piccolo.
- Mese: un premio di processo (es. un mese di cartella sempre pronta).
- Stagione: la pagella di giugno sopra il taglio sblocca il premio grande.
- Il catalogo lo decidete voi in anticipo; meglio se legato alla pallavolo (ginocchiere, una partita di Serie A dal vivo).

I valori sono un punto di partenza: si tarano dopo le prime due settimane d'uso.

## Struttura dell'app

Decisa il 6 novembre. Prevale sulla tabella delle funzioni qui sotto dove le due non coincidono.

**Due profili nella stessa app.** Lani, sul suo telefono e sull'iPad; i genitori, sui loro telefoni, con un PIN. Lani non entra nella parte genitori.

**L'app si apre sul momento giusto:** al mattino su Oggi, nel pomeriggio sui compiti, la sera sulla chiusura.

| Sezione di Lani | Cosa contiene |
|---|---|
| Oggi | Le tre righe del mattino; la striscia "In famiglia" con gli impegni del giorno; nel pomeriggio i compiti arrivati e l'ordine in cui farli |
| Studio | Verifiche in arrivo con il piano di ripasso, flash card, quiz, tutor di matematica, materiali. Le verifiche si chiamano verifiche, non partite |
| Sera | Dieci minuti, cartella, borsa, fogli da firmare |
| R-Evolution | Prossima partita con ritrovo e passaggio, allenamenti della settimana, risultati, classifiche U13 e U14, fasi della coppa, partite giocate. Il nome viene dalle impostazioni, se cambia squadra si cambia lì |
| Astra | Percorso, stelle, forzieri, album delle figurine e la figurina di Lani: medie per materia con la tendenza, obiettivo del liceo come barra da riempire, punti e stelle. Lani vede voti e obiettivo |

**Lato genitori:** La settimana (riepilogo della domenica), Punti di casa, Premi (catalogo e contenuto dei forzieri), Impostazioni (orari, menu dei dieci minuti, Nuvola, nome della squadra). I genitori vedono tutte le sezioni di Lani e possono correggere le sue spunte; Lani vede la correzione e chi l'ha fatta. Premi, gesti di casa, voci della sera e menu dei dieci minuti si aggiungono e si modificano dall'app, senza toccare il codice.

**Notifiche.** A Lani al massimo tre al giorno: alle 7:00, nel pomeriggio solo se sono arrivati compiti nuovi, all'ora della chiusura; più un solo sollecito se la sera non è chiusa dopo 45 minuti. Ai genitori solo il riepilogo della domenica e i fogli da firmare in scadenza.

**Personaggi.** Compaiono nelle istruzioni del giorno, negli avvisi e nelle notifiche, ognuno con un ruolo fisso; possono arrabbiarsi o fare i dispettosi quando la situazione lo chiede. Niente voci: al loro posto versi adatti alla situazione (sbadiglio, borbottio, abbaio, esultanza). Come produrre i versi si decide più avanti, dopo una prova.

**Ordine di costruzione, a tappe ravvicinate.** Ogni tappa va a Lani appena è pronta.

1. Sprint 1: Nuvola, Oggi, Studio (verifiche in arrivo, piano di ripasso, flash card, quiz, spiegazione degli argomenti), Sera (cartella, borsa, fogli da firmare), Astra completo con percorso, stelle, forzieri, figurina e album, punti, lato genitori, mappa dei libri con gli indici. Circa due settimane.
2. Sprint 2: tutor di matematica e tutta R-Evolution, con i dieci minuti di allenamento (menu, scelta del giorno, storico; voce nella Sera con i punti), partite, risultati e classifiche.

**Studio: decisioni del 6 novembre.**

- **Contenuti.** Non dipendono dall'organizzazione di Lani. Base sempre disponibile: flash card e quiz generati dagli argomenti di Nuvola e dalla mappa dei libri. Per la precisione: appena la sincronizzazione trova una verifica, un'interrogazione o un compito nuovo su pagine mai fotografate, i genitori ricevono subito un avviso con le pagine da fotografare (se Nuvola indica solo l'argomento, le pagine probabili le ricava la mappa dei libri). La richiesta resta nella loro lista finché non è fatta. Le pagine fotografate restano in memoria. Lani può fotografare durante i compiti, senza obbligo e senza punti. Claude non entra nelle piattaforme degli e-book con le credenziali e non ne copia il testo.
- **Piano di ripasso.** Per ogni verifica, sessioni da 15-20 minuti nei pomeriggi liberi, dopo i compiti per il giorno dopo: con 4 o più giorni, rilettura guidata e flash card, poi flash card e mappa da completare, poi quiz, infine la sera prima un quiz breve sugli errori. Con meno giorni le sessioni si comprimono, fino a una. Giorni di partita e sera tardi liberi.
- **Flash card.** Domanda, risposta a mente, carta girata, giudizio con tre tasti (Sapevo, Quasi, Non sapevo); ripetizione a intervalli crescenti; 10-15 carte per volta; tre tipi: domanda e risposta, frase da completare, vero o falso con il perché. Tasto "Questa carta è sbagliata" che la manda ai genitori.
- **Ripasso quotidiano.** Ogni giorno, weekend compresi, le carte in scadenza (5-10 minuti), come voce di Oggi con qualche punto; nei giorni di partita salta.
- **Quiz.** 8-10 domande nello stile della verifica, soprattutto a scelta multipla più un paio a risposta breve; spiegazione dopo ogni risposta; le sbagliate diventano flash card; niente cronometro. Vale i punti della sessione di ripasso; piccolo bonus solo con almeno 9 su 10 al primo tentativo.
- **Aiuto nei compiti.** Tasto "Non ho capito": spiegazione dell'argomento con un esempio diverso dall'esercizio, poi indizi uno alla volta, mai la soluzione. Indizi passo per passo di matematica col tutor, nella tappa 2.
- **Compiti fatti.** Basta la spunta di Lani; le note di Nuvola fanno da riscontro.
- **Materiali.** Allegati dei compiti da Nuvola e materiali da Google Classroom, collegando l'account scolastico di Lani con l'autorizzazione dei genitori.
- **Tempi.** Il signore lavora a Claude Code anche di giorno: la tappa 1 sta in circa due settimane.

**Copione dei personaggi: il bastone (6 novembre).** Linea dura, scelta dal signore.

| Situazione | Chi compare |
|---|---|
| Nota disciplinare | Mamma arrabbiata, con il malus |
| Nota per dimenticanza | Papà arrabbiato, col dito alzato |
| Sera non chiusa dopo il sollecito | Bart triste la sera; la mattina dopo papà arrabbiato |
| Compiti non spuntati la sera | Lady sdraiata sul quaderno |
| Piccole cose senza nota (borsa dimenticata, cartella chiusa all'ultimo) | Leo che fa marameo |
| Verifica andata male | Nessuna rabbia: Lani "partita persa a testa alta" e il piano per recuperare |

**Copione dei personaggi: la carota.**

| Situazione | Chi compare |
|---|---|
| Mattina | Lani buongiorno; in divisa nei giorni di partita |
| Passaggi | Chi accompagna davvero, dal calendario di famiglia: papà, mamma, il nonno il mercoledì |
| Punti di casa | Il genitore che li dà, col pollice |
| Verifica da 7-8 | Mamma che applaude |
| Partita vinta | Papà che festeggia |
| Stella della settimana | Leo che festeggia |
| Sera chiusa | Bart che dorme sul cuscino |
| Verifica da 9-10, forziere, pagella | Il pollice del nonno, solo per queste |

**Premi e punti (6 novembre).** Nove premi fino a giugno, come il numero di maglia di Lani: due forzieri per ognuno dei quattro mondi più il forziere della cima. Nessun premio settimanale né mensile. Un forziere si apre con i punti e con un minimo di stelle conquistate (per esempio metà delle stelle possibili fino a quel momento): le note, che tolgono stelle, ritardano il premio. Il contenuto dei forzieri lo scelgono i genitori nell'app. Valori dei punti come nella tabella del sistema a punti, da tarare dopo due settimane.

**Orari della chiusura.** Lunedì 20:30; martedì verso le 18:00, prima dell'allenamento; mercoledì 20:30, con la borsa se giovedì c'è partita; giovedì prima della partita, con la borsa per venerdì; venerdì e sabato niente; domenica 20:00, chiusura lunga. Gli orari si spostano da soli quando cambia il calendario di famiglia.

**Figurine dell'album (6 novembre).** Sistema misto. Le pose comuni si sbloccano la prima volta che il personaggio compare in quella posa in un popup o in una notifica. Le pose rare (cima, festeggia, divisa) arrivano solo da forzieri e tappe. Le pose arrabbiate o dispettose sono una serie "nera" che arriva solo con il bastone e non dà punti. I popup di feedback ci sono, senza esagerare: sono il modo naturale in cui si completa l'album.

**Calcolo del punteggio (6 novembre, approvato; ricalcolato il 7 novembre con le regole nuove).** Tarato perché Lani arrivi in cima facendo bene circa l'80% delle cose obbligatorie. Il modello è stato simulato 300 volte per livello di impegno, dal 23 novembre al 4 giugno, con le vacanze del calendario regionale, la settimana reale di Lani, verifiche, note, gesti di casa e studio facoltativo; le attività R-Evolution (dieci minuti, partite) arrivano con lo sprint 2. Ipotesi sullo studio facoltativo, con impegno dell'80%: circa uno o due giri di flash card e un video al giorno, più i quiz quando c'è una verifica vicina; da verificare dopo due settimane d'uso.

- **Percorso a difficoltà crescente, come nei videogiochi.** Si parte con 27 tappe per 7.200 passi: 125, 135, 145, 160, 170, 180, 190, 200, 210, 225, 235, 245, 255, 265, 280, 290, 300, 310, 320, 330, 345, 355, 365, 375, 385, 395, 410. Forzieri a: 405, 915, 1.515, 2.220, 3.020, 3.920, 4.915, 6.010, 7.200 passi. Settimana tipo con impegno dell'80%: circa 230 passi senza R-Evolution, 320 con. Se R-Evolution esce a dicembre, i passi disponibili crescono prima e il percorso giusto diventa di 7.600 (tappe 130→430, forzieri a 425, 955, 1.590, 2.330, 3.175, 4.125, 5.180, 6.340, 7.600): alla taratura di inizio dicembre, quando la data di R-Evolution è certa, si alzano solo le tappe ancora da fare.
- **Bandierina.** Avanza con il calendario, si ferma durante le vacanze e arriva in cima l'ultimo giorno di scuola. Con l'80% di impegno Lani le sta appena davanti.
- **Chiavi**** della settimana.** Una chiave con almeno il 70% dei passi obbligatori possibili in quella settimana; due se in più non ci sono note; tre se completa almeno il 95% delle cose obbligatorie. Chiavi per aprire i forzieri (ritoccate il 7 novembre): 2, 4, 7, 14, 17, 21, 26, 31, 36 per la cima. Con R-Evolution a gennaio e 7.200 passi: impegno del 70%, in cima il 4% delle volte; del 75%, il 40%; dell'80%, l'86% (a metà maggio); del 90%, sempre (a fine aprile). Con R-Evolution a dicembre e 7.600 passi i risultati sono gli stessi. Se R-Evolution esce a dicembre ma il percorso resta di 7.200, all'80% si arriva in cima il 93% delle volte: più facile, mai più difficile. I primi tre forzieri arrivano presto: fine novembre, metà dicembre, gennaio.
- **Forzieri.** Si aprono alla tappa giusta se Lani ha abbastanza stelle: un terzo delle stelle possibili per i primi tre forzieri, la metà per gli altri. Se non le ha, il forziere aspetta e si apre quando recupera.
- **Rimonta.** Se è indietro di più di una tappa e mezza rispetto alla bandierina, i punti della settimana valgono ×1,25, ma solo nelle settimane in cui fa almeno il 70%.

| Impegno | Arriva in cima | Forzieri, date tipiche |
|---|---|---|
| 90% | sempre, inizio maggio | primo a fine novembre, poi circa ogni 2-3 settimane |
| 80% | 84 volte su 100, fine maggio | 30/11, 14/12, 4/1, 25/1, 8/2, 1/3, 29/3, 26/4, cima 24/5 |
| 70% | 14 volte su 100 | otto forzieri, l'ultimo a metà maggio |
| 60% | mai | i primi tre; gli altri restano bloccati dalle stelle |

I primi forzieri arrivano presto (il secondo prima di Natale, il quarto con la pagella di gennaio), poi si diradano. Da ritarare dopo le prime due settimane d'uso: il modello di simulazione va nel pacchetto per Claude Code.

**L'enigma del forziere (6 novembre).** Prima di aprire un forziere Lani non vede il premio, ma un enigma che lo descrive. I genitori non scrivono niente: quando inseriscono il premio, ACE genera da solo l'enigma con il servizio di intelligenza artificiale, difficile ma adatto ai 12 anni. L'enigma compare solo in prossimità del tesoro, cioè quando a Lani manca l'ultima tappa prima del forziere. Se lo risolve prima di arrivarci prende un piccolo bonus di punti. Da definire: valore del bonus, numero di tentativi, come si controlla la risposta.

**Gestione dei 9 premi (6 novembre).** I contenuti dei forzieri si decidono subito, tutti e nove, e restano modificabili. Sono ancora da decidere: il signore ne parla con Lucrezia. Regole proposte da Jarvis, da confermare:

- Progressione come nei videogiochi: i primi tre premi piccoli o privilegi senza spesa, poi sempre più importanti; la cima resta legata alla pagella di giugno.
- Ogni forziere contiene anche una figurina rara, aggiunta da ACE.
- Enigma: compare all'ultima tappa prima del forziere; tre tentativi; la risposta la controlla l'intelligenza artificiale, accettando sinonimi; se lo risolve prima di arrivare, +20 punti.
- Un premio si può cambiare finché il suo enigma non è comparso; se cambia, ACE rigenera l'enigma.
- Stati di un forziere: chiuso, enigma visibile, aperto, consegnato. Lo segnano consegnato i genitori; se dopo 7 giorni non lo è, ACE lo ricorda a loro, mai a Lani. Ciò che un forziere promette va mantenuto.

**Eccezione: il bagno dopo la doccia (6 novembre).** È l'unico caso in cui i genitori tolgono punti, in deroga alla regola "solo in positivo", ed è stata una scelta voluta. Quando trovano il bagno lasciato in disordine dopo la doccia lo segnano nell'app: a Lani parte subito la sgridata (popup con la mamma o il papà arrabbiati, verso del borbottio) e perde 1 punto, senza possibilità di rimediare. Il peso è simbolico, conta la sgridata. Effetto stimato con il modello: due volte a settimana la probabilità di arrivare in cima scende dall'84% al 77%; tutti i giorni, al 57%.

**Passi e chiavi (6 novembre).** I punti si chiamano passi e le stelle chiavi: i passi fanno camminare lungo il percorso, le chiavi aprono i forzieri. Ogni forziere chiede un numero fisso di chiavi, scritto sul lucchetto: 2, 4, 7, 14, 17, 21, 26, 31, 36 per la cima (ritoccati il 7 novembre dopo il ricalcolo). Il mantra dell'app è "Ogni giorno, passino passino", frase che il signore dice a Lani da quando era piccola; accanto ci sono frasi e citazioni sparse, una al giorno al massimo, e le "frasi di famiglia" che i genitori aggiungono dall'app. Dettagli nel copione dei personaggi. Grafica pronta: passo, chiave piena, chiave vuota, mazzo di chiavi.

**La squadra: figurine di R-Evolution (7 novembre).** Con lo sprint 2 l'album si apre su una pagina a parte, "La squadra", con un contatore suo: le 64 figurine di casa non cambiano. Si sbloccano con le cose di campo: partite, allenamenti, raduni, convocazione. L'allenatore, con il suo permesso, ha un avatar vero (scheda e tre pose: time-out, applaude, pollice in su) ed è la figurina rara della pagina. Le compagne sono figurine senza volto: di spalle o in azione, con maglia, numero, ruolo e nome di battesimo o soprannome; nessuna foto delle ragazze passa da Gemini, perché non si può chiedere il consenso a tutte le famiglie. Serve la rosa con numeri e ruoli, che può dare Lani. Se una compagna lascia la squadra, la sua figurina resta.

**Libri (7 novembre).** Mappa dei libri completa per 10 materie su 11 (manca Geografia vol. 2); Religione esclusa da ACE. I volumi non in casa (Steam Generation Processi produttivi e L'informatica e noi, Quaderno per le competenze 2, Visione d'insieme, eventuale Workbook di inglese) li carica Lani dall'app con le foto delle pagine. Aritmetica 1 e Geometria 1 restano in uso ogni tanto.

**Impegni di famiglia (6 novembre).** ACE mostra anche gli impegni del calendario di famiglia su Google, lo stesso che usa già per passaggi e orari della chiusura. Sono in sola lettura: si modificano in Google, non nell'app. Dove compaiono:

- **Oggi:** una striscia compatta "In famiglia" sotto le tre righe del mattino, al massimo tre impegni (ora, titolo, chi c'è), ripiegabile con un tocco.
- **Sera:** una riga "Domani in famiglia" solo se c'è qualcosa che cambia la sera o la mattina (cena fuori, partenza presto, ospiti).
- **Domenica, chiusura lunga:** la settimana di famiglia accanto a verifiche e partite.

Gli impegni non generano notifiche, così resta il limite di tre al giorno. Nelle impostazioni i genitori scelgono quali calendari mostrare; un evento con la parola "privato" nel titolo non compare mai. Rientra nello sprint 1, dentro Oggi.

**Livello bonus R-Evolution: la selezione territoriale (7 novembre).** Promessa del signore fatta prima di ACE: se Lani entra nella rappresentativa territoriale di Reggio Emilia per il Trofeo dei Territori, riceve un iPhone ricondizionato. In ACE è un livello bonus della sezione R-Evolution, fuori dai 9 forzieri di Astra, e arriva con lo sprint 2.

- **Il forziere d'oro** sta in R-Evolution e porta scritta la condizione: "convocata nella rappresentativa territoriale". Si apre solo con la convocazione, che segnano i genitori.
- **La strada verso la selezione** dà passi anche se la convocazione non arriva: giornate di selezione e raduni (in calendario), dieci minuti orientati a salto, elevazione ed esplosività, cioè quello che le selezionatrici cercano.
- **Copione:** papà o il nonno quando arriva la convocazione, Lani in divisa quando parte per il torneo.
- **Annate (da confermare con il bando, che esce di solito a febbraio):** nel 2025 giocavano le nate nel 2011-2012. Se la regola resta, nella primavera 2027 tocca alle nate nel 2013-2014, con Lani nell'annata più giovane; nel 2028 alle nate nel 2014-2015, con Lani nell'annata più grande.
- **Da chiedere** all'allenatrice o al comitato di Reggio: il calendario delle giornate di selezione 2026/27.
- **Se arriva l'iPhone:** il controllo del telefono passa da Family Link a Tempo di utilizzo di Apple; ACE va aggiunta alla schermata Home per ricevere le notifiche.

## Funzioni

Sei funzioni, di cui la prima è il cuore: senza una routine serale che funziona, il resto non serve.

| Funzione | Cosa fa | Dati da |
|---|---|---|
| Domani | Ogni sera la lista per il giorno dopo: libri e materiale secondo l'orario, compiti, borsa se c'è allenamento, fogli da firmare. L'orario del promemoria cambia con il giorno (lun e ven rientro 17:30, mar dopo le 20:30) | Orario delle lezioni, compiti di Nuvola, calendario di famiglia |
| Partite | Le verifiche in arrivo, con un piano di ripasso in 3-4 sessioni nei giorni prima | Eventi di classe di Nuvola |
| Statistiche | Media per materia e generale, tendenza, distanza dal taglio del liceo; matematica in evidenza | Voti di Nuvola |
| I dieci minuti | Un menu di sessioni da 10 minuti a scelta | Catalogo interno |
| Punti e premi | Saldo, punti lasciati sul campo, quota della settimana, premi sbloccati | L'app |
| Vista genitori | Riepilogo della settimana, fogli da firmare, gestione del catalogo premi | L'app e Nuvola |

**Il menu dei dieci minuti (ogni giorno, dopo cena: recupero nei giorni di pallavolo, forza e riflessi negli altri)**

- Core: plank e varianti.
- Mobilità e flessibilità.
- Forza a corpo libero: squat, affondi.
- Respirazione o meditazione guidata.
- Riflessi: una sessione di Beat Saber sul visore.

Niente salti in più: Lani è in piena crescita e fa già tre allenamenti più le partite. Il menu va fatto vedere all'allenatrice o al preparatore della R-Evolution.

## Studio assistito

L'app trasforma ciò che Nuvola registra ogni giorno in materiale di ripasso. Il criterio è uno solo: aiutarla a ricordare e capire, mai fare i compiti al posto suo.

| Strumento | Cosa fa | Note |
|---|---|---|
| Controllo quotidiano di Nuvola | Scarica compiti, argomenti delle lezioni, verifiche, voti, note e allegati, due volte al giorno | Alimenta tutto il resto |
| Archivio dei materiali | Raccoglie gli allegati dei compiti, il materiale di Classroom e le foto delle pagine del libro | I libri digitali degli editori restano nelle loro app: hanno licenze proprie |
| Flash card | Domande e risposte generate dagli argomenti del giorno, ripassate a intervalli crescenti | È la tecnica di studio con le prove più solide; 10 minuti al giorno |
| Quiz pre-verifica | Domande nello stile della verifica, nei 3-4 giorni prima | Si integra con la funzione Partite |
| Mappe concettuali | Per storia, geografia, scienze; meglio se la mappa ha dei vuoti che completa lei | Costruirla aiuta più che leggerla |
| Tutor di matematica | Esercizi graduati con suggerimenti passo per passo, mai la soluzione già fatta | Prima si ricostruiscono gli argomenti persi da marzo 2026 |
| Ripasso audio | Un riassunto di pochi minuti da ascoltare in macchina verso gli allenamenti | Sfrutta i tempi morti |

**Da dove arrivano i contenuti**

Su Nuvola gli argomenti delle lezioni e delle verifiche sono descrittivi, ma i compiti indicano quasi sempre solo le pagine. Per sapere che cosa c'è scritto servono altre fonti, in quest'ordine:

1. Foto delle pagine del libro, scattate da Lani durante la sessione: l'app chiede le pagine indicate nel compito. Restano private e servono solo al suo studio.
2. Allegati delle prof, presi in automatico da Nuvola e da Classroom.
3. Foto del quaderno degli appunti.
4. In mancanza d'altro, il solo argomento della lezione: le schede generate così lo dichiarano.

I libri digitali degli editori (per esempio l'e-book d'inglese su Oxford Learner's Bookshelf) non vengono copiati: ACE porta Lani alla pagina giusta e le dice cosa fare.

**La mappa dei libri.** ACE sa sempre cosa serve per ogni compito e su quale argomento verte, senza contenere il testo dei libri. Per ogni libro adottato conserva l'indice (capitoli e intervalli di pagine), raccolto una volta a inizio anno: per i libri cartacei dal sito dell'editore o da una foto del sommario; per gli e-book leggendone la struttura in un'unica sessione, con l'accesso fatto dal genitore. Così "studiare pag. 340–352" diventa "Grammatica: il verbo, genere e forma". Libro (dall'orario e dalla materia) + argomento (dall'indice) + cosa fare (da Nuvola) bastano per generare flash card e quiz. Niente copie dei libri né accessi automatici agli e-book: ACE apre l'e-book alla pagina giusta e Lani entra con il suo accesso.

**Libri adottati, classe 2ª A, anno 2026-27** (elenco ufficiale AIE, scuola REMM821014, aggiornato all'8 settembre 2026). Base della mappa dei libri.

| Materia | Titolo | Vol. | Editore | ISBN |
|---|---|---|---|---|
| Arte e immagine | Artemondo 2ª ed., volume A + album | U | Zanichelli | 9788808454249 |
| Geografia | Verdeazzurro Plus 2, Gli Stati d'Europa + Atlante 2 | 2 | Mondadori Scuola | 9791220422154 |
| Italiano, antologia | Lettura oltre 2, quaderno 2, letteratura e teatro | 2 | Fabbri Scuola | 9788891556455 |
| Italiano, grammatica | A rigor di logica (2 tomi) | U | Fabbri Scuola | 9788891548443 |
| Matematica | Tutto chiaro! Aritmetica 2 + Geometria 2 + quaderno | 2 | De Agostini | 9788851160463 |
| Musica | Passione musica, volume B, storia della musica | U | Minerva Italica | 9788829866656 |
| Religione | Domande di Tommaso 1, kit | 1 | La Scuola | 9788835052050 |
| Scienze | Eco A+B+C+D | U | Principato | 9788841652398 |
| Inglese | Highlight 2 | 2 | Oxford University Press | 9780194162593 |
| Spagnolo | Todos a la meta, vol. unico | U | Zanichelli | 9788808520258 |
| Storia | Ponti nel tempo 2, l'età moderna | 2 | Le Monnier | 9788800361798 |
| Tecnologia | Steam Generation, tecnologia + disegno + informatica | U | Le Monnier | 9788800363693 |

**Mappa dei libri, stato al 6 novembre.** File: C:\progetti\ace\asset\dati\mappa-libri.json. Raccolti da fonti pubbliche degli editori: Scienze (Eco A, B, C, D, dai campioni ufficiali: 36 unità, 123 lezioni con le pagine, alcune voci da verificare sul libro) e Tecnologia (Steam Generation: processi produttivi e informatica; manca il volume di disegno). Geografia: in rete c'è solo l'indice del volume 1. Da raccogliere gli altri dieci, con la sessione sugli e-book aperta dal signore (si legge solo l'indice) o con le foto delle pagine d'indice.

**Ordine di costruzione (superato: vale quello in Struttura dell'app)**

1. Controllo di Nuvola e funzione Domani.
2. Partite, con flash card, quiz e tutor di matematica.
3. Statistiche, punti e premi.
4. Mappe concettuali, ripasso audio, i dieci minuti.

Generare flash card, quiz e spiegazioni richiede di inviare il testo delle lezioni a un servizio di intelligenza artificiale. Si inviano solo contenuti didattici, mai nome, voti o note di Lani.

## Grafica e avatar

ACE ha l'aspetto di un gioco: un percorso illustrato dalla terra alle stelle, un avatar di Lani in stile anime chibi, icone ed elementi con l'effetto sticker. Le prime bozze vanno rifatte con la skill *frontend-design*.

- **Illustrazioni del percorso**: pacchetti grafici per videogiochi con licenza CC0, cioè di uso libero, composti in un percorso originale. Per esempio [Kenney Map Pack](https://kenney.nl/assets/map-pack) (180 elementi) e [Kenney Board Game Icons](https://www.kenney.nl/assets/board-game-icons) (250 elementi).
- **Avatar**: Lani in stile anime chibi, ricavato da una sua foto, in due versioni: tenuta da studentessa per la scuola e lo studio, divisa R-Evolution per allenamenti e partite. L'app mostra quella giusta per il momento della giornata.
- **Effetto sticker**: un contorno bianco spesso intorno all'avatar, ai forzieri e alle icone principali, come nelle miniature di YouTube.

**Stile visivo — proposta "zucchero filato"**

Kawaii pastello, sui gusti di Lani: anime chibi, marshmallow, zucchero filato, rosa, fucsia, lilla e azzurrino.

| Ruolo | Colore |
|---|---|
| Fondo, panna marshmallow | #FFF6FA |
| Rosa zucchero filato: superfici, nuvole | #FFC8E1 |
| Lilla: percorso, schede | #CDB8F5 |
| Azzurrino: cielo, informazioni | #BFE6FF |
| Fucsia: decorazioni, punti | #E23D8E |
| Fucsia scuro: pulsanti con testo bianco | #C2185B |
| Burro: stelle e premi | #FFE27A |
| Prugna: testi | #3D2350 |
| Notte stellata della cima | da #7B6AE0 a #2F2A6E |

- Caratteri: titoli in un tondo morbido (Baloo 2), testi in Nunito.
- Forme "marshmallow": angoli molto arrotondati, volumi gonfi, ombre morbide e colorate, mai grigie.
- Effetto sticker: contorno bianco spesso intorno ad avatar, forzieri e stelle, come una figurina.
- Il percorso sale in quattro mondi: colline di caramelle, montagne innevate di zucchero, nuvole di zucchero filato, spazio con la stella in cima: *per aspera ad astra*.
- Una sola cosa vistosa per schermata, l'avatar o il percorso; tutto il resto calmo e leggibile.
- Kit di gioco, da fare prima delle schermate: oggetti (forzieri, stelle, coppa, tappe, caramella dei punti, razzo della rimonta) generati con Gemini nello stile degli avatar; icone di servizio da un set aperto arrotondato, ricolorato; suoni dai pacchetti gratuiti Kenney (Interface Sounds, UI Audio), sempre attivi perché a scuola il telefono non si usa; animazioni in codice. Il pallone da pallavolo, ovunque compaia, è sempre il Molten tricolore (verde, bianco e rosso).

**I quattro mondi del percorso** (si passa dall'uno all'altro con i punti; le date sono quelle in cui ci si arriva tenendo il passo della bandierina)

| Mondo | Periodo indicativo | Traguardi |
|---|---|---|
| Colline di caramelle | novembre – dicembre | vacanze di Natale |
| Montagne di zucchero | gennaio – febbraio | pagella del primo quadrimestre in vetta; gita a Cerreto Laghi |
| Nuvole di zucchero filato | marzo – aprile | Pasqua |
| Lo spazio | maggio – giugno | compleanno; la stella in cima con la pagella finale |

**Avatar — i tratti fissi**

- Scuola e casa: capelli lunghi e ricci, occhiali tondi; felpa, jeans, zaino nero con dettagli viola.
- In campo: capelli raccolti in uno chignon, senza occhiali; maglia bianca con spalle e fianchi bordeaux, numero 9, pantaloncini bordeaux, ginocchiere bianche. La divisa resta come nelle immagini di Gemini, stemma compreso (scelta del 5 novembre).
- Versioni speciali (compleanno, cima): un fiore di tiare bianco fra i capelli.

**Avatar — prompt per Gemini**

In una chat nuova, con le due foto allegate:

```text
Ti allego due foto di mia figlia di 12 anni: una con i vestiti di tutti i giorni e una in divisa da pallavolo. Crea un suo avatar originale in stile anime chibi kawaii che le somigli.

Stile, uguale in tutte le immagini che ti chiederò:
- chibi: testa grande e corpo piccolo, circa due teste e mezzo di altezza; occhi grandi e lucidi, guance rosate, linee morbide e pulite
- colori pastello: rosa, fucsia, lilla, azzurrino, come zucchero filato e marshmallow
- luce morbida, nessun effetto fotografico
- un contorno bianco spesso tutto intorno alla figura, come uno sticker
- sfondo piatto a tinta unita azzurro chiaro, senza sfumature, ombre o oggetti
- nessun testo, nessun logo, nessuna scritta

Tratti fissi:
- capelli lunghi e ricci, del colore della foto
- somiglianza con il suo viso, sempre in versione chibi

Per cominciare crea una scheda del personaggio con tre figure affiancate, sullo stesso sfondo:
1. figura intera, di fronte, tenuta da scuola: felpa morbida lilla, jeans, zaino nero con dettagli viola, capelli sciolti, occhiali tondi
2. figura intera, di fronte, divisa da pallavolo come nella foto: maglia bianca con spalle e fianchi bordeaux, numero 9 sul petto, pantaloncini bordeaux, ginocchiere bianche, calzini e scarpe bianche; capelli raccolti in uno chignon alto; senza occhiali; nessun logo né sponsor
3. primo piano del viso, sorridente, con gli occhiali tondi
```

Poi, nella stessa chat, un'immagine per volta:

```text
Usa lo stesso personaggio della scheda, con lo stesso stile, lo stesso contorno bianco da sticker e lo stesso sfondo. Una sola figura, immagine quadrata, nessun testo. Situazione: [situazione]
```

Prima serie

1. Studentessa: figura intera, tenuta da scuola, saluta con la mano, sorriso tranquillo.
2. Divisa: figura intera, divisa da pallavolo, pallone sotto il braccio, sorriso fiero.
3. Felice: mezzobusto, tenuta da scuola, sorriso aperto e pollice in su, piccole stelle gialle intorno.
4. Dispiaciuta: mezzobusto, tenuta da scuola, un po' giù ma con mezzo sorriso, come a dire "capita, si riparte"; niente lacrime.
5. Esultanza: figura intera, divisa da pallavolo, salta con le braccia alzate, coriandoli rosa e lilla.
6. Oops: mezzobusto, tenuta da scuola, mano sulla fronte, imbarazzata ma divertita, guance rosse.
7. Assonnata: mezzobusto, pigiama pastello, capelli sciolti, sbadiglia stringendo un cuscino, occhiali in mano.
8. In battuta: figura intera, divisa da pallavolo, in posizione di battuta con il pallone lanciato in alto, sguardo concentrato.

Seconda serie

1. Inverno: figura intera, cappotto lilla, sciarpa e berretto rosa, zaino nero e viola, qualche fiocco di neve.
2. Pioggia: figura intera, impermeabile azzurrino, stivaletti, ombrello rosa.
3. Natale: figura intera, maglione natalizio rosa e bianco, cappellino di Natale, un pacchetto regalo in mano.
4. Primavera: figura intera, felpa leggera rosa, petali di ciliegio intorno.
5. Compleanno: figura intera, vestito pastello, fiore di tiare bianco dietro l'orecchio, torta con candeline.
6. La cima: figura intera, tenuta da scuola, alza una coppa dorata, fiore di tiare bianco dietro l'orecchio, stelle intorno.
7. Determinata: mezzobusto, fascia fra i capelli, pugno chiuso, sguardo deciso e sorriso.
8. Concentrata: mezzobusto, tenuta da scuola, tablet e matita in mano, sguardo attento.
9. Pensierosa: mezzobusto, dito sul mento, piccoli simboli + − × ÷ che fluttuano intorno.
10. Buongiorno: mezzobusto, pigiama pastello, si stiracchia sorridendo, tazza di latte.
11. Dieci minuti: figura intera, abbigliamento sportivo pastello, in posizione di plank su un tappetino.
12. Realtà virtuale: figura intera, abbigliamento sportivo pastello, visore e due controller, in movimento.

Scheda del personaggio ottenuta il 5 novembre: stile, capelli, occhiali, felpa e numero 9 vanno bene. La divisa resta come generata. Prima serie di otto situazioni fatta lo stesso giorno, scontornata e usata nelle bozze.

```text
Va benissimo così. Una sola correzione nella divisa: togli lo stemma e il segno bianco sul petto, lascia solo il numero 9. Tutto il resto identico.
```

**Sfondi dei quattro mondi — prompt per Gemini**

Nella stessa chat degli avatar, così lo stile resta uguale:

```text
Ora crea uno sfondo verticale, formato 9:16, nello stesso stile pastello delle immagini precedenti. Senza personaggi, senza testo, senza sentieri. Lascia la parte centrale abbastanza libera e poco dettagliata, perché sopra ci disegneremo un percorso. Colori: rosa, fucsia, lilla, azzurrino, panna. Paesaggio: [mondo]
```

1. Colline di caramelle: colline morbide e tondeggianti come marshmallow, alberelli a forma di zucchero filato e di lecca-lecca, piccoli dolcetti sparsi; in alto il cielo sfuma in rosa chiaro.
2. Montagne di zucchero: montagne arrotondate con la neve come glassa, qualche pino pastello; in basso colline rosa che sfumano, in alto cielo lilla chiaro.
3. Nuvole di zucchero filato: grandi nuvole rosa, lilla e azzurrine; in basso spuntano le cime delle montagne, in alto il cielo si fa più scuro, viola.
4. Lo spazio: cielo viola e blu profondo pieno di stelline e qualche pianeta pastello; in alto una grande stella dorata e luminosa con un contorno bianco da sticker; in basso nuvole che sfumano.

**La famiglia negli avatar**

La famiglia compare negli stessi panni chibi, sempre come squadra che fa il tifo, mai come chi controlla.

| Dove | Chi | Cosa fa |
|---|---|---|
| Punti dei genitori | papà o mamma | accanto al messaggio "+2, camera in ordine", con il pollice in su |
| Oggi, partite | chi accompagna | "La mamma ti porta a Montecchio", "Al ritorno c'è papà" |
| Astra, traguardi e forzieri | la famiglia | applaude dal bordo del percorso |
| Astra, la cima | tutta la famiglia | aspetta Lani in cima e festeggia con lei |
| Vista genitori | papà e mamma | nell'intestazione |

**Leonardo**, il fratello che a volte la prende in giro ma poi le vuole bene. Regole: prende in giro solo nei momenti leggeri (la routine, il sonno, un'esultanza esagerata), mai su voti, note, verifiche, aspetto o amicizie; quando Lani è giù smette di scherzare e fa il tifo; mai confronti o classifiche fra fratelli. Le sue battute le scriviamo noi e le approvate voi.

**Bart**, il cane, è il compagno della sera; **Lady**, la gatta, è la dispettosa. Alle partite papà e mamma indossano la felpa viola del CVR. Nonno Fausto, burbero, la porta ad allenamento il mercoledì e ogni tanto alle partite: brontola su tutto ma mai su di lei, e il suo pollice in su è raro e prezioso. Tutti i prompt, con le pose di ciascuno e le espressioni negative, sono in .

```text
Crea un nuovo personaggio nello stesso identico stile di Lani: stesse proporzioni, stesso contorno bianco da sticker, stesso sfondo azzurro chiaro, nessun testo. Dalla foto allegata, [papà / mamma / fratellino di 7 anni]. Scheda con tre figure affiancate: 1) figura intera, sorridente; 2) applaude facendo il tifo; 3) pollice in su.
```

## Dati e privacy

I dati sono quelli di una minorenne e restano in famiglia: nessun account su servizi esterni, nessuna analisi o pubblicità di terzi.

- **Dove vivono i dati**: su un dispositivo di casa o in uno spazio privato della famiglia, accessibile solo a voi tre.
- **Nuvola**: l'app ne legge compiti, eventi, voti e note. Nuvola stessa avverte che quei dati non vanno comunicati o diffusi.
- **Credenziali**: non vanno salvate in chiaro né date a terzi. Come leggere Nuvola in modo sicuro è la prima questione tecnica da risolvere.
- **Telefono**: Family Link lo tiene attivo dalle 7:00 alle 21:30, per 3 ore al giorno. La routine serale, dieci minuti compresi, deve chiudersi prima delle 21:30.

## Fuori dall'app

L'app risolve le dimenticanze, non il perché: tre insegnanti e Lani stessa dicono che le serve aiuto, e quello va guardato da persone.

- [ ] Parlare con il pediatra di quanto sta succedendo, compresa la situazione con le compagne.
- [ ] Chiedere alle prof della classe come sta Lani con i compagni: con chi sta, se è sola, cosa succede con quella compagna e con i maschi.
- [ ] Chiarire se le assenze del 25 settembre e del 23 ottobre erano per malattia.
- [ ] Coinvolgere l'allenatrice della R-Evolution: il menu degli allenamenti e una parola sull'ordine, da atleta.
- [ ] Verificare con la società come viene certificato il livello del campionato.

## Decisioni e questioni aperte

**Decisioni prese**

- App ad uso solo familiare; i dati restano in famiglia.
- Lani non partecipa alla progettazione.
- Gamification sul modello della stagione sportiva: punti per gli obiettivi di giornata, premi a settimana, mese e stagione.
- Punti tolti solo dalle note: −20 per ogni disciplinare, −10 ogni tre didattiche; +50 per ogni nota di merito. Mai punti tolti per i voti.
- Un'abitudine quotidiana di 10 minuti, tutti i giorni, legata al dopo cena: recupero nei giorni di pallavolo, forza e Beat Saber negli altri.

- Dispositivi: telefono Android di Lani e iPad. Si fa una web app installabile su entrambi, senza passare dagli store.
- Nuvola: lettura automatica due volte al giorno da una funzione programmata su Supabase, con le credenziali di un genitore cifrate nell'archivio segreti del progetto; in sola lettura; se l'accesso fallisce, avvisa i genitori.
- Intelligenza artificiale: approvata per generare il materiale di studio, inviando solo contenuti didattici.

- Infrastruttura, come Tiare: l'app su Vercel, dati e sincronizzazione su un progetto Supabase dedicato, separato da quello di Tiare, con server in UE e accesso riservato ai tre account di famiglia.

- Lettura di Nuvola verificata il 4 novembre 2026: accesso con utente e password, poi le API interne di Nuvola (compiti, eventi, voti, note) in sola lettura.

- Nome: **ACE**, il punto diretto in battuta. Motto *per aspera ad astra*; la schermata del percorso si chiama Astra.
- Avatar di Lani in stile anime chibi, generati con Gemini da due sue foto (in borghese e in tenuta da gioco).

- Pallavolo: calendario, risultati e classifiche dalle [pagine pubbliche FIPAV Reggio Emilia](https://reggioemilia.portalefipav.net/risultati-classifiche.aspx?PId=13810), con il link calendario che il portale offre per ogni girone e una lettura leggera delle pagine dei risultati due volte al giorno. L'esportazione in xlsx resta fuori: il portale la esclude dagli accessi automatici.

**Checklist — da decidere**

Stile e grafica

- [x] Stile visivo "zucchero filato": palette, caratteri, forme.
- [x] Kit di gioco: generare i 16 oggetti con Gemini (prompt unico nelle istruzioni avatar), poi ritaglio e nomi.
- [x] Avatar: seconda serie (la prima è fatta) e sfondi dei quattro mondi.
- [x] Rifare lo sfondo delle nuvole (prato e pini a metà, montagne sotto: composizione confusa).
- [x] Deciso: i personaggi possono arrabbiarsi o fare i dispettosi quando la situazione lo chiede (l'app non deve essere sdolcinata). Quando, lo fissa il copione dei personaggi.
- [x] Asset rinominati in C:\progetti\ace\asset con manifest.json; la cartella _fuori-app (foto vere, schede vecchie, doppione) non va nel repo.
- [x] Tenuta da studentessa: come si veste di solito Lani.
- [x] Divisa R-Evolution: colori, numero di maglia, logo della società sì o no.
- [ ] Far vedere l'avatar a Lani prima di metterlo nell'app.
- [ ] Gemini: impostazioni che non conservano le foto; cancellare foto e chat dopo.
- [x] Avatar della famiglia: papà, mamma, Leonardo, nonno Fausto, Bart (il cane) e Lady (la gatta).

Punti e premi

- [ ] Quota settimanale e soglie del percorso.
- [ ] Catalogo dei premi: settimana, mese, forzieri, cima.
- [ ] Gesti di casa che valgono punti, oltre a camera in ordine e lavastoviglie.
- [ ] Menu dei dieci minuti, da far vedere all'allenatrice.

App e dati

- [ ] Significato dell'acronimo ACE: proposta "Allenamento, Costanza, Energia".
- [ ] Orari della chiusura serale, giorno per giorno.
- [ ] Data di avvio: prima versione entro Natale?
- [ ] Accesso a Google Classroom di Lani.
- [ ] Elenco dei libri adottati in 2A e sessione unica per la mappa degli e-book.
- [ ] Girone dell'Under 13: B sul portale FIPAV, C nel calendario di famiglia.

Temi di progettazione ancora aperti

- [ ] Tono di voce e notifiche.
- [ ] Studio assistito nel dettaglio: flash card, quiz, tutor di matematica.
- [ ] Pacchetto per Claude Code.
