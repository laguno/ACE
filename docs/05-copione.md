> **Nota per Claude Code.** Copione dei personaggi, esportato il 7 novembre 2026. Ogni riga indica situazione, posa (id del manifest in `data/manifest.json`), testo e verso. I valori numerici aggiornati sono in `data/config-gioco.json`.

# ACE — copione dei personaggi


2026-11-06 · Alessandro Messori

## Le regole del copione

Ogni messaggio dice a Lani cosa è successo e cosa fare adesso, in due righe al massimo. Queste regole valgono per tutto il resto del documento e per i testi che ACE genererà da solo.

**Forma**

- Popup: un titolo di massimo 4 parole (lo genera ACE dalla situazione: "Compiti finiti", "Nota") e al massimo due frasi brevi, 25 parole in tutto. Un solo pulsante principale, al massimo uno secondario.
- Notifica: massimo 60 caratteri, così si legge intera sulla schermata bloccata. Nelle notifiche le materie lunghe si abbreviano (Tecno, Ed. fisica, Ed. civica, Ita, Mate).
- Il narratore di ACE parla a Lani con il "tu"; solo le righe marcate "pensiero" sono in prima persona, con la voce di Lani. Italiano di casa, senza parole da adulti ("obiettivo raggiunto" no, "fatto!" sì).
- Niente emoji nel testo: l'emozione la porta il personaggio con la sua posa.
- I numeri sono sempre veri e precisi: "+10", "mancano 45 passi", mai "tanti passi".

**Cosa dire (le regole del buon feedback)**

- Si loda il gesto, non la persona: "Cartella pronta in 3 minuti" sì, "Sei bravissima" no. La lode generica alla lunga non conta più niente.
- Ogni rimprovero ha dentro la cosa da fare subito: "Mancano i compiti di storia. Hai tempo fino alle 20:30".
- Il rimprovero riguarda il fatto, mai il carattere: "Hai dimenticato il quaderno" sì, "Sei sempre la solita" mai.
- Una sola cosa per volta. Se le cose da dire sono tre, il popup dice la più urgente e le altre restano in lista.
- Sui voti brutti nessuna rabbia: si guarda avanti, con il piano per recuperare.

**Quanti e quando**

- Massimo 3 notifiche al giorno, come deciso: 7:00, pomeriggio solo con compiti nuovi, chiusura della sera, più un solo sollecito.
- Il testo di un popup non ripete il titolo (decisione del 9/11): il titolo dice cos'è, il testo aggiunge.
- Singolare e plurale sempre giusti nei segnaposti numerici (una chiave / 2 chiavi, un passo, un tentativo, una sessione, un compito, una cosa); nel codice la forma è {n:singolare:plurale}.
- Il pulsante dice il gesto (deciso il 10/11): forziere aperto, cima, voto da 9, voto migliorato, recupero e nota di merito "Evviva!"; tappa e tre chiavi "Avanti!"; chiavi della settimana "Vado avanti"; gesti dei genitori "Grazie!"; voti da 6 e 7 "Guardo il piano", insufficienze "Vediamo il piano" (tutti e due portano a Studio); serie nera e figurina nera "Ci riprovo"; bagno "Vado a sistemare"; enigma "Prova"; lucchetto, note, sgridate, bastone e il resto "Ho capito".
- Massimo un popup per ogni apertura dell'app. Se ce ne sono di più in coda, aspettano la volta dopo, partendo dal più importante.
- Lo stesso testo non torna prima di 7 giorni: per i messaggi frequenti ci sono più varianti, a rotazione.
  - Se nello stesso momento scattano più situazioni, vince quella con priorità più alta: bastone del giorno, poi voto, poi forziere e tappa, poi il resto. Per i voti un solo popup: recupero dopo insufficienza, poi voto migliorato, poi fascia del voto; i passi si sommano comunque.
- Il bastone e la carota non stanno mai nello stesso popup.
- Dopo le 21:00 niente rimproveri di mamma e papà: aspettano la mattina dopo, dentro il buongiorno.

**Figurine**

- Una posa comune si sblocca la prima volta che compare in un popup o in una notifica; ACE lo dice con una riga in fondo: "Nuova figurina: Bart che sonnecchia".
- Tutte le pose si sbloccano la prima volta che compaiono; quelle rare sono rare perché il loro momento è raro (il 9 del nonno, la cima). Le pose senza un momento naturale (leo-tennis, leo-copertina, leo-dispiaciuto, leo-partita-persa) escono solo dai forzieri: ogni forziere ne regala una non ancora presa. lani-timida accompagna la prima apertura di ogni sezione, con le istruzioni.
- Le pose arrabbiate e dispettose formano la serie nera e non danno passi. Si sbloccano con il riscatto: sette giorni fatti bene dopo il rimprovero che le mostra. L'album si completa senza prendere note.

**Variabili** che ACE riempie da solo. Persone e luoghi: {chi} (chi accompagna), {luogo}, {ora}, {giorno}, {giorni} (quanti mancano). Scuola: {materia}, {materie}, {materiale}, {foglio}, {motivo} (della nota), {pagine}, {voto}, {prima} (voto precedente). Studio: {n}, {sapevo}, {quasi}, {totale}, {giuste}, {sbagliate}, {esercizio}. Gioco: {passi}, {mancano_passi}, {mancano_tappe}, {tappa}, {chiavi}, {premio}, {nome} (della figurina), {cosa} (la voce mancante). Ogni variabile sta dopo i due punti o dentro un elenco, così maschile e femminile non rompono mai la frase.

## I personaggi

Ogni personaggio ha un compito fisso: così Lani capisce che aria tira prima ancora di leggere. La famiglia fa il tifo e, quando serve, sgrida; non controlla mai.

| Chi | Il suo compito | Come parla | Mai | Verso |
|---|---|---|---|---|
| Lani | È lei stessa: buongiorno, concentrazione, festa, stanchezza | Prima persona, come un pensiero: "Ok, prima storia" | Parlare male di sé | Sbadiglio, "sì!" |
| Papà | Sgrida per le dimenticanze; festeggia le partite; accompagna | Diretto, frasi corte, un po' da allenatore | Urlare in maiuscolo, rinfacciare il passato | Fischio, "ehm" |
| Mamma | Sgrida per le note disciplinari; applaude i voti; accompagna | Calma ma ferma, poche parole | Minacce, confronti con altri | Sospiro, applauso |
| Leo | Prende in giro nelle cose leggere; fa il tifo quando lei è giù | Battute da fratello di 7 anni, da gamer; può chiamarla "puzzolona" o "scaccolani" | Voti, note, verifiche, aspetto, amicizie; confronti tra fratelli | Risatina, "game over" |
| Nonno Fausto | Il pollice raro: solo 9-10, forzieri, pagella; il mercoledì la porta lui | Burbero, a monosillabi; brontola su tutto ma mai su di lei | Complimenti lunghi | Borbottio |
| Bart | Il compagno della sera: chiusura, ripasso, sonno | Non parla: lo racconta una riga ("Bart ti aspetta per chiudere") | — | Abbaio, guaito |
| Lady | La dispettosa: si sdraia sui compiti non fatti, snobba chi rimanda | Non parla: lo racconta una riga, con ironia | Cattiveria vera | Miagolio offeso, fusa |

**Pose disponibili (64)**: Lani 26 (detective e sorpresa da fare), papà 7, mamma 7, Leo 12, nonno 2, Bart 5, Lady 5 (l'elenco completo è nel manifest). Ogni riga del copione indica la posa da usare.

## Mattina e pomeriggio

La mattina sono tre righe da leggere mentre fa colazione; il pomeriggio è un ordine di lavoro, non una predica.

| Situazione | Posa | Testo | Verso |
|---|---|---|---|
| Buongiorno, giorno normale | lani-buongiorno | "Oggi: verifica di {materia}, allenamento alle {ora}. Non scordare: {cosa}." | sbadiglio |
| Buongiorno, giorno di partita | lani-divisa | "Partita alle {ora} a {luogo}. Borsa già pronta? Ti porta {chi}." | fischio |
| Buongiorno, niente di speciale | lani-saluta | "Giornata tranquilla. Una sola cosa da ricordare: {cosa}." | — |
| Buongiorno, compleanno, Natale, primo giorno di primavera | lani-compleanno / lani-natale / lani-primavera | "Auguri, Lani!" / "Ultimo giorno prima delle vacanze" / "È primavera. Alla cima: {mancano_tappe} tappe" | festa |
| Passaggio | papa-passaggio / mamma-passaggio / nonno-passaggio | "Ti porta {chi} a {luogo}. Si parte alle {ora}." Nonno: "Mercoledì. Alle {ora} sotto casa. Puntuale." | clacson (nonno: borbottio) |
| Compiti arrivati (14:30) | lani-pensierosa | "Sono arrivati {n} compiti. Prima {materia}: è per domani." Pulsante: "Inizio" | — |
| Pomeriggio con verifica in arrivo | lani-determinata | "Compiti per domani, poi 15 minuti di ripasso di {materia}. Verifica tra {giorni} giorni." | — |
| Durante i compiti, blocco finito | lani-concentrata | "Storia fatta. Avanti con {materia}." | spunta |
| Tutti i compiti spuntati | lani-contenta | "Compiti finiti: +10. Il resto del pomeriggio è tuo." | "sì!" |
| Pomeriggio corto (allenamento presto) | lani-stanca | "Oggi poco tempo: fai solo {materia}, il resto stasera dopo cena." | — |
| Pioggia o giornata grigia (solo come tocco grafico) | lani-pioggia | Nessun testo in più: cambia solo l'avatar del giorno | — |
| Rientro dopo 2 o più giorni senza aprire l'app | lani-oops | "Bentornata. Ecco solo le cose di oggi: {n}." Nessuna predica sui giorni persi. | — |
| Giorno di malattia o assenza (lo segnano i genitori) | lani-stanca | "Oggi riposo. I compiti li trovi domani, con calma." Gli obiettivi del giorno non contano. | — |
| Buongiorno da dicembre a febbraio | lani-inverno | Come il buongiorno normale; cambia solo la posa | — |
| Buongiorno dopo una partita finita tardi | lani-assonnata | "Ieri partita fino a tardi. Oggi solo l'essenziale: {cosa}." | sbadiglio |
| Striscia "In famiglia" (sotto il buongiorno, senza popup) | icona di chi è coinvolto (papa-passaggio, mamma-passaggio, nonno-passaggio) | "In famiglia: 19:30 cena dai nonni · sabato Leo al torneo di tennis" (massimo tre, dal calendario di famiglia) | — |
| Sera: domani c'è un impegno di famiglia che cambia la routine | bart-contento | "Domani in famiglia: {impegno} alle {ora}. Tienilo a mente per la cartella e la sveglia." | — |

**Varianti del buongiorno**, a rotazione: "Ecco la giornata." / "Tre cose per oggi." / "Pronta? Ecco cosa c'è." / "Colazione e via: oggi c'è..."

## Studio

Nello studio il personaggio parla poco: commenta il risultato con un numero preciso e indica il passo dopo. I voti brutti non si sgridano mai.

| Situazione | Posa | Testo | Verso |
|---|---|---|---|
| Nuova verifica trovata su Nuvola | lani-pensierosa | "{materia}, {giorno}. Il piano è pronto: {n} sessioni da 15 minuti." (con una sola sessione: "una sessione") Pulsante: "Vedi il piano" | — |
| Inizio sessione di ripasso | lady-compiti | "Lady si è già seduta sul libro di {materia}. Tocca a te." | fusa |
| Sessione finita | lady-fusa | "Sessione fatta: +10. Lady fa le fusa sul libro chiuso. Prossima: {giorno}." | spunta |
| Flash card, giro finito | bart-contento | "{sapevo} su {totale} al primo colpo. Le {quasi} incerte tornano domani." | abbaio |
| Flash card, quasi tutte sbagliate | lani-pensierosa | "Queste erano difficili. Domani le rivediamo, una alla volta." | — |
| Ripasso quotidiano disponibile | bart-pallone | "{n} carte da ripassare, 5 minuti. Bart ha già il pallone in bocca." | abbaio |
| Quiz 9 o 10 su 10 al primo tentativo | lani-festeggia | "{giuste} su 10 al primo tentativo: +10!" | esultanza |
| Quiz da 6 a 8 | lani-determinata | "{giuste} su 10. Le {sbagliate} sbagliate sono diventate flash card." | — |
| Quiz sotto il 6 | lani-pensierosa | "{giuste} su 10. Ora sai cosa ripassare: domani si riprova." | — |
| "Non ho capito" premuto | lani-pensierosa | "Ok, vediamola con un altro esempio." | — |
| Sera prima della verifica | bart-sonnecchia | "Ultimo quiz breve sugli errori, poi a letto: domani {materia}." | sbadiglio |
| Voto 9 o 10 | nonno-pollice | "{voto} in {materia}. Il nonno ha alzato il pollice. Succede di rado." | borbottio |
| Voto 7 o 8 | mamma-applaude | "{voto} in {materia}: +{passi}. Le {n} sessioni di ripasso si vedono." (con una: "La sessione di ripasso si vede") | applauso |
| Voto migliore del precedente | papa-pollice | "Da {prima} a {voto} in {materia}: +{passi}." | fischio |
| Sufficienza dopo un'insufficienza | papa-applaude | "Recuperata {materia}: +20. Questa è una rimonta." | applauso |
| Voto insufficiente | lani-partita-persa | "{voto} in {materia}. Il piano per la prossima è già pronto." Pulsante: "Vedi il piano" | — |
| Voto insufficiente, seconda volta nella stessa materia | papa-ci-pensiamo / mamma-ci-pensiamo, a rotazione | "Di nuovo {materia}. Stasera ci guardiamo insieme il piano." (avvisa anche i genitori) | — |
| Voto 6 | lani-saluta | "6 in {materia}: sufficienza. Per il 7 il piano è pronto." | — |

**Studio facoltativo, aggiunte del 7 novembre.** Flash card, video e quiz sulle materie della settimana, fino a 4 al giorno per tipo; danno passi solo con i compiti del giorno spuntati.

| Situazione | Posa | Testo | Verso |
|---|---|---|---|
| Studio aperto prima dei compiti | lady-compiti | "Prima i compiti di oggi: poi flash card e quiz danno passi." | miagolio |
| Flash card, carta appena girata | (nessun popup) | Sulla carta, mentre scorre il timer: "Leggi bene: si gira tra 7 secondi." | — |
| Flash card, giro finito | bart-contento | "Giro finito: +3. {sapevo} su {totale} al primo colpo." | abbaio |
| Video visto fino in fondo | lani-concentrata | "Video finito: +3. Ora un giro di flash card?" | spunta |
| Video mandato avanti o lasciato a metà | lady-snob | "Hai mandato avanti: questo video non dà passi. Riprendi da dove eri." | miagolio |
| Quiz ripetuto (2° o 3° tentativo) | lani-determinata | "{giuste} su 10, tentativo {n}: +{passi}." | — |
| Quiz dal 4° tentativo | lani-pensierosa | "Questo quiz ormai vale 1 passo. Prova un argomento nuovo." | — |
| Quarto giro del giorno dello stesso tipo | bart-sonnecchia | "Per oggi hai fatto il pieno di {cosa}. Domani si ricomincia." | sbadiglio |
| Foto dei compiti caricata | lani-contenta | "Foto di {materia} caricata: +2." | clic |
| Compito fatto in anticipo | lani-festeggia | "Fatto con due giorni d'anticipo: +13 invece di 10." | "sì!" |
| Serie di anticipo (dal secondo giorno) | leo-cinque | "{n} giorni avanti con i compiti. Leo vuole il cinque." | risatina |

Nel voto 7-8 la frase sul ripasso compare solo se ACE sa che Lani ha fatto davvero le sessioni; altrimenti resta solo il voto e i passi.

## Sera

La sera Bart guida la chiusura: prima i dieci minuti, poi cartella, borsa e fogli. La domenica la chiusura è lunga e la guida papà.

| Situazione | Posa | Testo | Verso |
|---|---|---|---|
| Ora della chiusura | bart-contento | "Ora di chiudere la giornata: {n} cose, 10 minuti." Pulsante: "Chiudo" | abbaio |
| Dieci minuti di allenamento | lani-dieci-minuti | "Dieci minuti: oggi {esercizio}. Pronta?" | fischio |
| Dieci minuti fatti | lani-contenta | "Fatto: +10. Bart approva." Vale solo se il timer arriva in fondo. | — |
| Cartella: voci da spuntare | lani-concentrata | "Domani: {materie}. Serve anche: {materiale}." | — |
| Cartella con il materiale di disegno (lunedì) | leo-furbetto | "Leo scommette che dimentichi l'album da disegno. Fagli perdere la scommessa." | risatina |
| Borsa per allenamento o partita | lani-battuta | "Borsa: ginocchiere, scarpe, borraccia, divisa se c'è partita." | — |
| Fogli da firmare | mamma-pollice | "C'è un foglio da far firmare: {foglio}. Portalo alla mamma o al papà adesso." | — |
| Sera chiusa | bart-sonnecchia | "Tutto chiuso: +{passi}. Bart si è già messo sul cuscino." | sbadiglio |
| Sera chiusa, settimana tutta chiusa (venerdì) | bart-festeggia | "Cinque sere su cinque. Bart fa il giro della casa di corsa." | abbaio |
| Domenica, chiusura lunga | papa-passaggio | "Domenica sera: cartella del lunedì, borsa, e la settimana in un colpo d'occhio." | fischio |
| Settimana in arrivo pesante | lani-determinata | "Settimana piena: {n} verifiche, {m} partite. Il piano è pronto." | — |
| Tardi, chiusura ancora aperta (sollecito, una volta) | bart-triste | "Bart ti aspetta ancora. Mancano {n} cose." | guaito |
| Visore la sera (Beat Saber come dieci minuti) | lani-vr | "Dieci minuti di riflessi col visore. Poi via, a letto." | — |

## Il bastone

Linea dura, come deciso: il rimprovero arriva subito, dice quanto è costato e cosa fare adesso. Non umilia e non rinfaccia il passato. Ogni rimprovero sblocca la sua figurina della serie nera.

| Situazione | Posa | Testo | Verso | Passi |
|---|---|---|---|---|
| Nota di merito (titolo "Nota di merito") | mamma-festeggia | "In {materia}: +50. Questa va sul frigo." | applauso | +50 |
| Nota disciplinare | mamma-arrabbiata | "Nota disciplinare in {materia}. −20, e salta la seconda chiave. Stasera ne parliamo." | sospiro | −20 |
| Nota per dimenticanza (prima e seconda) | papa-arrabbiato | "Nota per dimenticanza: {motivo}. Salta la seconda chiave; alla terza nota anche −10." | "ehm" | 0 |
| Terza nota per dimenticanza | papa-arrabbiato | "Terza nota per dimenticanze: −10. Da domani doppia spunta sulla cartella." Poi il contatore riparte da zero. | "ehm" | −10 |
| Bagno lasciato in disordine dopo la doccia | mamma-arrabbiata o papa-arrabbiato (chi lo segna) | "−1. Ora: asciugamani appesi, tappetino a posto, specchio pulito." | borbottio | −1 |
| Bagno, seconda volta nella settimana | lady-offesa | "Perfino Lady si rifiuta di entrarci. −1." | miagolio offeso | −1 |
| Compiti non spuntati alla chiusura | lady-dispettosa | "Lady si è sdraiata sul quaderno di {materia}. Si sposta solo se lo apri." | miagolio | 0 |
| Chiusura non fatta dopo il sollecito, la sera | bart-triste | "Bart è andato a dormire da solo. La sera è rimasta aperta." | guaito | 0 |
| La mattina dopo una sera non chiusa | papa-arrabbiato | Un solo popup che sostituisce il buongiorno: "Ieri sera niente chiusura. Prima di uscire: cartella e {cosa}." | "ehm" | 0 |
| Borsa dimenticata, cartella chiusa all'ultimo | leo-marameo / leo-ride / leo-linguaccia, a rotazione | "Leo ha visto la borsa sul divano. Ride ancora." | risatina | 0 |
| Ripasso saltato con la verifica vicina | lady-compiti | "Lady sbadiglia sul libro di {materia}. Verifica tra {giorni} giorni: domani due sessioni." | sbuffo | 0 |
| Lani rimanda una cosa per la terza volta | lani-oops | Pensiero: "Terza volta che rimando: {cosa}. Ok, 5 minuti e via." | — | 0 |
| Riscatto: sette giorni di cartella completa dopo una nota | papa-pollice | "Sette giorni di cartella completa dopo la nota. Papà se n'è accorto." | fischio | 0 (è un riconoscimento) |
| Bagno, terza volta nella settimana | leo-sbuffa | "Leo non entra in bagno dopo di te, puzzolona. −1." | sbuffo | −1 |

**Bastone, aggiunte del 7 novembre.** Li segna un genitore; parte subito il popup e si sblocca la figurina della serie nera.

| Situazione | Posa | Testo | Verso | Passi |
|---|---|---|---|---|
| Comportamento antisportivo in campo (con R-Evolution) | papa-arrabbiato | "Così non si gioca: −7. Il rispetto vale più di un punto." | "ehm" | −7 |
| Balla o imbroglio scoperto, nell'app o fuori | mamma-arrabbiata | "{Cosa}. −10. Con la verità si perde sempre meno." | sospiro | −10 |
| Compiti spuntati ma non fatti (è un imbroglio) | mamma-arrabbiata | "Avevi spuntato {materia}, ma non era fatto. −10, e stasera si rifà." | sospiro | −10 |

**Regole del bastone**

- I passi tolti sono solo quelli decisi: note (−20 disciplinare, −10 ogni tre dimenticanze), bagno (−1), comportamento antisportivo in campo (−7) e balle o imbrogli scoperti (−10). Tutto il resto toglie la possibilità di guadagnare, non passi già presi.
- Leo prende in giro solo per borsa, cartella, sonno: mai per note, voti o verifiche.
- Dopo le 21:00 niente rimproveri di mamma e papà: aspettano la mattina dopo, dentro il buongiorno. Bart e Lady possono esserci anche la sera, perché mostrano una conseguenza e non sgridano.
- Le pose lani-broncio e lani-frustrata non si usano nei rimproveri: servono solo come risposta di Lani nelle schermate, se lei sceglie l'umore della giornata.

## Astra: passi, chiavi, forzieri

Sul percorso la famiglia fa il tifo dal bordo. Ogni messaggio dice dove si trova Lani rispetto alla bandierina, perché è quello che decide la sua motivazione.

| Situazione | Posa | Testo | Verso |
|---|---|---|---|
| Passi di casa dati da un genitore | papa-pollice / mamma-pollice | "Papà: +2, camera in ordine." | — |
| Tappa raggiunta | lani-contenta | "Tappa {tappa}! Alla prossima: {mancano_passi} passi." (con 1: "un passo") | "sì!" |
| Davanti alla bandierina | leo-cinque | "Sei {n} tappe davanti alla bandierina. Leo vuole il cinque." | risatina |
| In pari con la bandierina | lani-determinata | "In pari con la bandierina: {chiavi} chiavi finora." | — |
| Indietro: parte la rimonta | lani-determinata (oggetto: razzo) | "Sei indietro di {n} tappe. Se questa settimana prendi almeno una chiave, i passi valgono ×1,25." | razzo |
| Settimana chiusa: 1 chiave | lani-saluta | "Per la seconda mancava: {cosa}." | — |
| Settimana chiusa: 2 chiavi | mamma-applaude | "Quota fatta e nessuna nota. Per la terza: {cosa}." | applauso |
| Settimana chiusa: 3 chiavi | leo-festeggia | "Tutto fatto. Leo non trova niente da prenderti in giro." | esultanza |
| Settimana senza chiavi | mamma-dispiaciuta | "Nessuna chiave. Lunedì si riparte da zero, non da sotto zero. Ogni giorno, passino passino." | — |
| Enigma comparso (a una tappa dal forziere) | lani-detective | "Vicino al forziere c'è un biglietto. Riesci a decifrarlo? Hai 3 tentativi." | fusa |
| Enigma risolto | lani-festeggia | "Indovinato! +20. Ora arriva fino al forziere." | esultanza |
| Enigma sbagliato | lady-snob | "No. Lady ti guarda con sufficienza. Restano {n} tentativi." | miagolio |
| Forziere raggiunto ma mancano chiavi | lucchetto (oggetto) + papa-dispiaciuto | "Sei arrivata al forziere, ma servono {n} chiavi in più. Si apre appena le hai." (con 1: "serve una chiave in più. Si apre appena ce l'hai.") | — |
| Forziere aperto | forziere-aperto + lani-sorpresa | "Dentro c'è: {premio}. E una figurina che non trovi altrove." Pulsante: "Evviva!" | festa |
| Cima | lani-cima + tutta la famiglia | "Per aspera ad astra. Tutta la famiglia è qui." Pulsante: "Evviva!" | festa grande |
| Nuova figurina comune | (la posa sbloccata) | Riga in fondo al popup: "Nuova figurina: {nome}. Album {n}/64." | clic |
| Figurina della serie nera | (la posa sbloccata) | "Sette giorni fatti bene: figurina nera sbloccata, {nome}." | — |
| Album completo | tutte | "Album completo: 64 su 64." | festa grande |
| Partita vinta | papa-festeggia | "Vinta {risultato}! +25. Papà ha già la felpa viola addosso." | esultanza |
| Partita persa | lani-partita-persa | "Persa {risultato}. +10 per averla giocata. Si riparte al prossimo allenamento." | — |
| Settimana storta o insufficienza: Leo fa il tifo | leo-gamer | "Leo dice che al prossimo livello vinci tu. E lui di livelli se ne intende." | risatina |

## Passi, chiavi e il mantra

Deciso dal signore il 6 novembre: i punti si chiamano **passi** e le stelle **chiavi**. I passi fanno camminare lungo il percorso, le chiavi aprono i forzieri. Il calcolo resta quello approvato.

- **Passi.** Ogni azione dà passi: "+10 passi", "−1 passo". Le tappe costano da 125 a 410 passi (percorso di 7.200, ricalcolato il 7 novembre).
- **Chiavi.** Ogni domenica sera da 0 a 3 chiavi, contate solo sulle cose obbligatorie (compiti, cartella, borsa, fogli, ripasso prima delle verifiche e, con R-Evolution, i dieci minuti): una con almeno il 70% fatto, due se in più nessuna nota, tre se ha fatto quasi tutto. Una nota toglie la seconda chiave. Lo studio facoltativo dà passi, non chiavi.
- **Ogni forziere mostra sul lucchetto quante chiavi servono**, con un numero fisso:

| Forziere | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | Cima |
|---|---|---|---|---|---|---|---|---|---|
| Chiavi | 2 | 4 | 7 | 14 | 17 | 21 | 26 | 31 | 36 |

- **La frase che spiega tutto**, detta da Lani in posa timida la prima volta che apre Astra e ripetuta nel popup del lucchetto: "I passi ti fanno camminare, le chiavi aprono i forzieri."

**Il mantra: "Ogni giorno, passino passino."** È la frase di famiglia e diventa la firma dell'app.

- Sempre visibile in Astra, sotto il titolo.
- Nel buongiorno del lunedì, dopo una settimana storta e quando parte la rimonta.
- Mai nei rimproveri e mai più di una volta al giorno nei popup, perché non si consumi.

**Frasi e citazioni sparse.** Una al giorno al massimo, mai la stessa prima di 30 giorni, mai nei rimproveri. Dove compaiono: la schermata di apertura, la fine della chiusura serale, la sera prima di una verifica, la tappa raggiunta. I genitori possono aggiungere dall'app le loro "frasi di famiglia", e quelle hanno la precedenza. Prima raccolta:

| Frase | Di chi | Quando |
|---|---|---|
| Il viaggio di mille miglia comincia con un passo | Lao Tzu | Primo giorno, inizio settimana |
| Goccia a goccia si scava la pietra | proverbio, dal latino | Ripasso, flash card |
| Chi va piano va sano e va lontano | proverbio | Settimana storta |
| Roma non fu fatta in un giorno | proverbio | Rimonta |
| Il successo è la somma di piccoli sforzi, ripetuti giorno dopo giorno | Robert Collier | Tappa raggiunta |
| Se sembra impossibile, allora si può fare | Bebe Vio | Sera prima di una verifica difficile |
| Non è perché le cose sono difficili che non osiamo, è perché non osiamo che sono difficili | Seneca | Forziere bloccato dalle chiavi |
| Il talento vince le partite, ma il lavoro di squadra e l'intelligenza vincono i campionati | Michael Jordan | Giorno di partita |
| Per aspera ad astra | motto latino | Solo alla cima |

Prima di metterle nell'app va controllata ogni attribuzione: se un autore non è certo, si scrive "proverbio" o si toglie la frase. Si possono aggiungere frasi di pallavolisti e allenatori, ad esempio Julio Velasco, ma solo dopo averle verificate su una fonte.

## Notifiche

Le notifiche sono al massimo tre al giorno più un sollecito, sotto i 60 caratteri, con l'icona del personaggio. Il titolo è sempre "ACE".

| Quando | Personaggio | Testo (sotto i 60 caratteri) |
|---|---|---|
| 7:00, giorno normale | Lani | "Oggi verifica di {materia}, allenamento {ora}" (materia abbreviata) |
| 7:00, giorno di partita | Lani in divisa | "Partita alle {ora} a {luogo}. Borsa pronta?" |
| 7:00, niente in programma | Lani | "Giornata tranquilla. Apri per la cosa da ricordare" |
| Pomeriggio, compiti nuovi | Lani | "{n} compiti nuovi. Primo: {materia}, è per domani" (con 1: "Un compito nuovo") |
| Ora della chiusura | Bart | "Bart ti aspetta: chiusura della sera, 10 minuti" |
| Sollecito, 45 minuti dopo | Bart triste | "Mancano ancora {n} cose per chiudere la giornata" (con 1: "Manca ancora una cosa") |
| Domenica, chiusura lunga | Papà | "Domenica sera: prepariamo la settimana" |
| Ai genitori, domenica | — | "Riepilogo della settimana di Lani: {chiavi} chiavi" (con 1: "una chiave") |
| Ai genitori, foglio da firmare in scadenza | — | "Foglio da firmare per Lani entro {giorno}" |
| Ai genitori, pagine da fotografare | — | "{Verifica o Compito} {materia}: foto pagine {pagine}"; più richieste nello stesso giro: "{n} richieste di foto nuove: le trovate in ACE" |

Le notifiche non portano mai il bastone: il rimprovero si vede solo aprendo l'app, così il telefono non diventa una sirena di brutte notizie. Le figurine sbloccate da una notifica compaiono all'apertura successiva.

## Decisioni

Decise dal signore il 6 novembre, dopo la revisione indipendente.

1. **Serie nera.** Si sblocca con il riscatto, non con la colpa: sette giorni fatti bene dopo il rimprovero.
2. **Battute di Leo.** Approvate senza revisione; Leo può chiamarla "puzzolona" o "scaccolani". Restano i limiti: mai su voti, note, verifiche, aspetto o amicizie.
3. **Umore del giorno: si prova.** Nel buongiorno, una riga facoltativa con quattro facce (lani-contenta, lani-assonnata, lani-broncio, lani-frustrata); un tocco e basta. Con broncio o frustrata, quel giorno Leo non prende in giro e i testi usano le varianti più calme. Passi, chiavi e bastone non cambiano. Costo basso: un campo al giorno e qualche variante di testo. Ai genitori arriva solo nel riepilogo della domenica, mai in tempo reale.

**Cosa resta per dopo**: i versi (si scelgono dopo la prova, come deciso), i testi delle istruzioni di primo avvio per Lani e per i genitori, che si scrivono insieme al disegno dei popup.
