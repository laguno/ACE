# Area genitori: studio per il restyling (16/11)

Restyling deciso dal signore il 16/11. L'area è cresciuta per accumulo ed è organizzata per "cosa c'è" (Settimana, Premi, Correzioni, Fogli, Altro), non per "cosa devono fare i genitori". Logica, regole e RLS non cambiano. Questo documento è il punto 1 del piano (studio prima di toccare il codice).

## 1. Foto di oggi

`docs/genitori-ux/prima/`, a 390 e 360 px, con dati finti (lunedì 23/11 ore 18, una partita da approvare, una foto da fare, un foglio da firmare, due spunte, una verifica, due forzieri con premio). Le rifà `FOTO_GENITORI=prima npx playwright test genitori-foto` (e `=dopo` alla fine, per il confronto).

**Tema scuro**: le foto con il tema scuro di sistema sono identiche byte per byte a quelle chiare. Non è un difetto: l'app dichiara `color-scheme: light only` (index.html e stile.css), quindi Chrome per Android non scurisce la pagina. Per questo le foto scure non sono state tenute. Nel restyling resta così (coerente con PRODUCT.md); la prova "tema scuro di Android" vuol dire controllare che nulla venga invertito.

| Schermata | Altezza a 390 px | Note a colpo d'occhio |
|---|---|---|
| Settimana | 2740 px (3,2 schermi) | 10 blocchi uno sotto l'altro: numeri, Da fotografare, Dai qualche passo, Partite dalla FIPAV, Partite da approvare, Partita (segna), Lani a casa, Verifiche, Da segnare. Le sgridate sono in fondo. |
| Premi | 2713 px | 9 carte uguali, sempre tutte aperte; pulsante spento mostrato sui forzieri già aperti. |
| Correzioni | 1 schermo | Pulita, ma separata da Settimana. |
| Fogli | 1 schermo | Il modulo "Nuovo foglio" sta sopra la cosa da fare ("Da firmare"). |
| Altro | 1 schermo | Elenco a righe: il modello più riuscito dell'area. |
| Impostazioni | 3705 px (4,4 schermi) | Sette giorni × (orario + area di testo), poi frasi, R-Evolution, dieci minuti, PIN. |
| Stato di ACE | 1 schermo | |
| Vetrina | 7623 px | Anteprime per i genitori: va bene lunga, sta in fondo. |
| Regole | 3599 px | Testo di consultazione. |

## 2. Critica e accessibilità

Due valutazioni separate, come vuole la critique di Impeccable: A (revisione di design su codice e foto) e B (detector di Impeccable nella pagina, axe, misure con Playwright). Misure ripetibili: `MISURE_GENITORI=1 npx playwright test genitori-misure` scrive `docs/genitori-ux/misure-prima.json` (con `=dopo`, `misure-dopo.json`).

### Punteggi di partenza

| Misura | Oggi | Obiettivo |
|---|---|---|
| Impeccable critique (Nielsen, /40) | **22** (accettabile) | ≥ 34 |
| Impeccable audit (/20) | **15** (accessibilità 3, prestazioni 3, responsive 3, temi 3, anti-pattern 3) | 18+ |
| axe (20 schermate: 10 × 2 larghezze) | 1 violazione: `target-size` sul `<summary>` "Enigma e soluzione" in Premi | 0 |
| Bersagli sotto 44 px | 2: le caselle "in campo" di Partita (24 × 24) | 0 |
| Campi senza etichetta | 0 | 0 |
| Overflow orizzontale a 360 px | 0 | 0 |
| Carico cognitivo (checklist, falliti su 8) | 6: alto | ≤ 2 |

Nielsen, punto per punto (A): stato del sistema 3, linguaggio 3, controllo e libertà 2, coerenza 2, prevenzione errori 2, riconoscimento 2, flessibilità 2, **estetica e minimalismo 1**, recupero dagli errori 2, aiuto 3.

### Cosa funziona (da tenere)

- Il tono: frasi brevi in italiano di casa, conseguenze dette prima del tocco ("Lani vedrà la tua faccia col pollice", "Dopo le 21 il popup aspetta la mattina", "Per un imbroglio voluto c'è anche Balla").
- L'elenco a righe di "Altro": è il modello da estendere a tutta l'area.
- Etichette dei campi complete, nessun overflow, axe quasi pulito: la base tecnica è sana, il problema è l'organizzazione.

### Problemi, in ordine

1. **[P1] La schermata d'ingresso è ordinata per cosa c'è.** Settimana ha 10 blocchi e circa 21 pulsanti; il gesto quotidiano è al 3° blocco, la sgridata all'ultimo, mentre i moduli rari (Partita, Lani a casa) sono sempre aperti. Nessun riepilogo "da fare per voi".
2. **[P1] Campi con l'aspetto del browser.** I bordi della casa ci sono (`.modulo`), ma date (5 in Settimana, 1 in Fogli), orari (7 in Impostazioni), select (4) e caselle restano widget di sistema: "gg/mm/aaaa", "--:--", la freccia di Android. È proprio dove il genitore agisce che il kit si rompe.
3. **[P1] Impostazioni è un muro.** 3705 px, 20 campi, cinque funzioni diverse in una sola pagina, ognuna col suo "Salva": non è chiaro che cosa salva cosa.
4. **[P1] Bersagli piccoli**: `<summary>` di Premi (axe `target-size`) e caselle "in campo" a 24 px.
5. **[P2] Premi: 9 carte uguali**, 7 vuote, sempre aperte (2713 px). Il pulsante spento "Cambia e rifai l'enigma" compare anche quando non serve a niente.
6. **[P2] Gerarchia dei bottoni**: il fucsia pieno compare 5 volte in Settimana, quindi non indica più l'azione principale. Le schede sono in alto (lontane dal pollice), a 12 px su 5 colonne.
7. **[P2] Nessun annulla** dopo un gesto o una sgridata; "Segna come consegnato" scrive senza conferma e senza gestire l'errore.
8. **[P2] "Esci dall'area genitori" sul telefono di un genitore fa il logout** dell'account (`supabase.auth.signOut()`), non solo l'uscita dall'area: etichetta ingannevole, in fondo a ogni pagina.
9. **[P3]** "Altro" non dice cosa contiene; la data "Dal 23 al 29 novembre" ripetuta in ogni scheda (il detector la segnala come eyebrow); ombra viola sul foglio di conferma (detector: `dark-glow`); `Genitori.tsx` è un unico file di 935 righe.

### Personas

- **Genitore stanco la sera** (30 secondi per un gesto): deve scorrere per la cosa che è venuto a fare; non ricorda quali gesti ha già dato ("oggi 2 su 6" è l'unico indizio); non vuole scrivere dove basterebbe una scelta.
- **Pollice** (Casey): azioni frequenti a metà pagina, schede in alto, selettori di sistema lenti.
- **Accessibilità** (Sam): focus visibile solo sugli input (non su textarea e select); stato dei forzieri detto soprattutto col colore; testo da 12-13 px nelle note e nei bottoni piccoli.

## 3. I compiti dei genitori

Frequenza dalla guida (`docs/guida-genitori.md`) e dalla logica. Tocchi contati dal momento in cui l'area è aperta, sul telefono del genitore (sui dispositivi di Lani si aggiungono: Genitori, PIN, Apri). "Scorrimento" è quanto bisogna scendere a 390 × 844 prima di vedere il comando. Le date native contano 2 tocchi (apri il selettore, scegli il giorno) più uno per confermare su Android.

| Compito | Frequenza | Dove oggi | Tocchi oggi | Scorrimento | Attriti |
|---|---|---|---|---|---|
| Dare un gesto di casa | ogni giorno, più volte | Settimana, 3° blocco | 1 | ~0,4 schermi (più se c'è "Da fotografare") | Quando ci sono foto da fare il blocco scende; il conteggio "oggi 0 su 6" è piccolo. |
| Segnare una sgridata | ogni tanto (sera) | Settimana, ultimo blocco | 2 (Bagno/Antisportiva) · 2 + scrittura (Balla) | ~1,9 schermi | Il comando più delicato è il più lontano; nessun ritorno visibile dopo, a parte la pillola in cima (fuori schermo). |
| Firmare un foglio (Lani l'ha dato) | ogni tanto | scheda Fogli | 2 | 0,6 schermi (sotto il modulo) | Il modulo "Nuovo foglio" viene prima di quello da firmare. Niente avviso in Settimana. |
| Aggiungere un foglio | raramente | scheda Fogli | 6 + scrittura (scheda, titolo, data 3, Aggiungi) | 0 | Campo data nativo senza stile. |
| Approvare una partita | ogni settimana (weekend) | Settimana, 5° blocco (con R-Evolution accesa) | 1 (Approva) · 3-5 se si corregge il risultato | ~1,1 schermi | La stessa partita può comparire due volte ("Partite dalla FIPAV" e "Partite da approvare"); due select e una casella native. |
| Correggere una spunta | ogni settimana (entro domenica) | scheda Correzioni | 3 (scheda, Togli, conferma) | 0 | Separata dalla settimana a cui si riferisce: si toglie senza vedere il contesto del giorno. |
| Foto mancante (fotografarla voi) | ogni tanto | Settimana, 2° blocco | 1 + fotocamera | 0,3 schermi | Ok, ma non c'è un riepilogo "da fare". |
| "Lani a casa" | raramente | Settimana, 7° blocco | 7 (Dal 3, Al 3, Segna) | ~2,2 schermi | Due date native senza stile; per un solo giorno serve comunque scegliere due date. |
| Spostare una verifica | raramente | Settimana, 8° blocco | 4 (Sposta, data 2, Salva) · 2 per "Settimana prossima" | ~2,6 schermi | Le verifiche "da recuperare" senza data non sono segnalate in cima. |
| Consegnare un forziere | raramente (~1 al mese) | scheda Premi, carta del forziere | 2 | fino a 3 schermi (forziere 9) | Nessuna conferma e nessun errore gestito; nessun avviso in Settimana che un forziere è da consegnare. |
| Cambiare un premio | raramente | scheda Premi | 3 + scrittura (scheda, campo, Cambia) | fino a 3 schermi | 9 moduli sempre aperti; pulsante spento mostrato anche quando non serve. |
| Impostazioni (orari, materiale, PIN, R-Evolution, dieci minuti, frasi) | raramente | Altro → Impostazioni | 3 + modifica + Salva | fino a 4 schermi | Un solo "Salva" per sette giorni; il PIN è l'ultimo blocco. |

### Cosa dice la tabella

- Le due azioni di ogni giorno (gesto, sgridata) stanno nella stessa scheda ma a quasi due schermi di distanza; quella più delicata è in fondo.
- Nessuna schermata dice "cosa c'è da fare per voi": foto, fogli, partite, forzieri da consegnare, verifiche da recuperare sono sparsi in tre schede, e due (fogli, forzieri) non si vedono da Settimana.
- Le cose rare (Lani a casa, sposta verifica, segna partita) occupano più spazio di quelle quotidiane nella schermata d'ingresso.
- La correzione delle spunte è separata dal giorno a cui appartiene.

## 4. Nuova organizzazione (proposta, da approvare)

Bozza: `design/Genitori-v2.html` (aprirla nel browser: 9 cornici a 390 px). È la proposta di Jarvis a quattro schede, con gli affinamenti che vengono dallo studio.

| Scheda | Contenuto | Cosa assorbe di oggi |
|---|---|---|
| **Oggi** (si apre qui) | "Da fare per voi" con il numero (partite da approvare, fogli che Lani dice di aver dato, foto mancanti, forzieri aperti da consegnare, verifiche da recuperare senza data), ognuna con la sua azione sulla riga; se è vuoto, "Niente da fare per voi". Poi due azioni grandi: **Dai passi** e **Segna**. Poi "Lani oggi" in tre righe: passi di oggi, serata chiusa o no, prossima verifica. | i blocchi Da fotografare, Partite da approvare di Settimana; "Firmato" di Fogli; "Segna come consegnato" di Premi |
| **Settimana** | Riassunto in una riga (media, note, serate chiuse); sette giorni da toccare; per il giorno scelto compiti con la spunta ("Togli" sul posto), verifiche ("Sposta"), "Lani a casa questo giorno", "Segna una partita"; in fondo Fogli da firmare con "Aggiungi un foglio". | Correzioni, Fogli, Lani a casa, Verifiche, Partita |
| **Forzieri** | Una riga per forziere: numero, premio o "Da scegliere", stato (enigma pronto, aperto da consegnare, consegnato). Il prossimo da impostare ha l'unico pulsante pieno. Toccando una riga si apre la pagina del forziere: premio, enigma e soluzione, immagine. | Premi |
| **Impostazioni** | Indice a righe: Sera e cartella, Obiettivo media, R-Evolution (interruttore sul posto, con conferma), Dieci minuti, Frasi di famiglia, PIN. Ogni voce apre la sua pagina con un solo "Salva". In fondo "Per controllare": Stato di ACE, Vetrina, Regole; sotto, "Esci dall'account" (con conferma) sul telefono del genitore. | Altro, Impostazioni |

Affinamenti rispetto alla proposta:

- **Schede in basso**, con icona, etichetta da 12,5 px e bollino del numero di "Da fare" su Oggi: stanno nella zona del pollice e si vede da ogni scheda se c'è qualcosa in attesa.
- **"Dai passi" è un foglio dal basso che resta aperto**: si possono dare più gesti di fila; ogni tocco mostra "+2 a Lani · Annulla" per qualche secondo; le voci già date oggi restano segnate; arrivati al tetto le voci si spengono con il motivo. L'annulla toglie il gesto appena dato con lo stesso meccanismo idempotente di oggi (da verificare nella costruzione: se servisse logica nuova, si toglie l'annulla e si tiene la conferma).
- **"Segna"**: scelta, eventuale nota (solo per Balla), conferma con il numero ("Segna −10"); dopo le 21 un avviso giallo "Lani lo vede domattina".
- **Lani a casa per giorno**: dal giorno della Settimana, un tocco e una conferma; nel foglio di conferma "fino a" per più giorni. Toglie due date di sistema su tre.
- **Testata da adulti**: niente sticker grande, titolo da 24 px, data del giorno; sui dispositivi di Lani "Chiudi l'area" in alto a destra.
- **Un solo fucsia pieno per schermata**; le altre azioni sono bottoni bordati.
- **Campi del kit** (cornice 5): testo, area di testo, data e ora (selettore di sistema dentro un campo della casa, che mostra "3 dic 2026" e non "gg/mm/aaaa"), numero a passi (− 3 +) al posto delle select dei set, scelta a segmenti (In campo / In panchina) al posto della casella, scelta da elenco, interruttore, errore sotto il campo, stato vuoto.

## 5. Percorsi: tocchi prima e dopo

Dal momento in cui l'area è aperta, telefono del genitore, 390 × 844.

| Compito | Prima: tocchi · scorrimento | Dopo: tocchi · scorrimento | Nota |
|---|---|---|---|
| Dare un gesto | 1 · 0,4-1 schermo | 2 · 0 (poi 1 per ogni gesto in più) | Un tocco in più, ma nessuna ricerca e c'è l'annulla. |
| Segnare una sgridata | 2 · 1,9 schermi | 3 · 0 | Un tocco in più, voluto: è l'azione più delicata. |
| Firmare un foglio | 2 · 0,6 | **1** · 0 | Da Oggi. |
| Aggiungere un foglio | 6 + scrittura | 6 + scrittura | Settimana → Aggiungi un foglio. |
| Approvare una partita | 1 · 1,1 | **1** · 0 | Correggere il risultato: riga → foglio con − 3 + → Approva (3-4). |
| Correggere una spunta | 3 · 0 | 3-4 · 0 | Settimana → (giorno) → Togli → conferma: uno in più se il giorno non è quello aperto, ma la spunta si vede nel suo giorno. |
| Fotografare una pagina | 1 + fotocamera · 0,3 | 1 + fotocamera · 0 | Da Oggi. |
| Lani a casa (un giorno) | 7 · 2,2 | **4** · 0 | Settimana → giorno → riga → conferma. |
| Spostare una verifica | 4 · 2,6 | 4-5 · 0 | Da Oggi se è da recuperare (Metti data → data → Salva); dalla Settimana altrimenti. |
| Consegnare un forziere | 2 · fino a 3 | **2** · 0 | Da Oggi, con conferma (oggi non c'è). |
| Cambiare un premio | 3 + scrittura · fino a 3 | 4 + scrittura · 0 | Forzieri → riga → campo → Salva. |
| Spegnere/accendere R-Evolution | 3 · ~3 schermi | **2** · 0 | Impostazioni → interruttore → conferma. |
| Altre impostazioni | 3 + modifica · fino a 4 | 3 + modifica · 0-1 | Una pagina per funzione. |

In sintesi: niente più ricerca scorrendo per nessun compito; le cose da decidere stanno tutte in un posto; tre compiti costano un tocco in più in cambio di zero scorrimento, annulla o conferma.

## 6. PIN (punto 4, da costruire dopo)

- Oggi sui dispositivi di Lani il PIN si chiede a ogni ingresso e l'area si richiude appena l'app va in secondo piano (`visibilitychange` in `AreaGenitori.tsx`).
- Da fare: sbloccata per 10 minuti dall'ultima azione dentro l'area, anche uscendo dall'app o spegnendo lo schermo (scadenza salvata, non un timer in memoria); poi di nuovo il PIN; "Chiudi l'area" blocca subito.
- **Sul telefono di un genitore il PIN oggi non viene chiesto** (`suoDispositivo` apre l'area direttamente): non c'è niente da togliere. Unica proposta: l'etichetta "Esci dall'area genitori", che lì fa il logout dell'account, diventa "Esci dall'account" in Impostazioni, con conferma.

## 7. Domande per il signore

1. Va bene la struttura a quattro schede con la barra in basso e "Da fare per voi" in cima a Oggi?
2. Gesto in 2 tocchi (foglio "Dai passi") invece di 1: accettabile in cambio di zero scorrimento e dell'annulla?
3. Lani a casa per giorno (con "fino a" per più giorni) al posto del modulo Dal/Al?

## 8. Valutazione dopo il restyling (16/11 pomeriggio)

Sul ramo finale (`de987e0`), dopo i due ritocchi decisi: Segna più snello (la spiegazione di ogni voce resta solo finché non si sceglie, tolta la nota ripetuta sotto) e, in Settimana, Fogli da firmare e Foto delle pagine richiudibili (Fogli aperta solo se c'è un foglio da firmare, Foto sempre chiusa: si apre solo per cancellare una foto sbagliata).

### Impeccable B (tecnica): detector, axe, misure

| Misura | Prima | Dopo |
|---|---|---|
| Detector sui sorgenti (`detect.mjs`, area genitori + kit + stile) | 0 | 0 |
| Detector nella pagina (10 schermate × 390 e 360) | 2 (eyebrow sulla data, `dark-glow`) | 4 `cramped padding`, falsi positivi: bottoni larghi alti 56-60 px con `min-height` e padding verticale 0 (voci di Dai passi, "Rifiuta" della partita, "Salva e rifai l'enigma") |
| axe (`accessibilita.e2e.ts`, chiaro e scuro) | 1 (`target-size`) | 0 |
| Bersagli sotto 44 px | 4 | 0 |
| Campi senza etichetta | 0 | 0 |
| Campi con l'aspetto del browser | 4 | 0 |
| Overflow a 360 px | 0 | 0 |
| Altezza della schermata d'ingresso a 390 px | 2740 px (Settimana) | 1015 px (Oggi) |
| Impostazioni a 390 px | 3705 px | 970 px (indice); la pagina Sera e cartella resta 2639 px |

Misure in `docs/genitori-ux/misure-dopo.json`, foto in `docs/genitori-ux/dopo/`.

### Impeccable A (Nielsen, revisione separata)

**29/40** (era 22): stato 3, linguaggio 3, controllo 3, coerenza 3, prevenzione errori 3, riconoscimento 3, flessibilità 3, estetica 3 (era 1), recupero dagli errori 2, aiuto 3. Carico cognitivo: 2 falliti su 8 (era 6). Non è ancora l'obiettivo di 34.

Problemi rimasti, tutti risolvibili con sola interfaccia:

1. [P1] Sera e cartella: 14 campi in 2639 px con un solo Salva in fondo; cambiando scheda le modifiche si perdono senza avviso; "Chiusura di lunedì" accanto a "Materiale per martedì".
2. [P2] I `summary` delle sezioni chiuse (Partite, Fogli, Foto, Enigma e soluzione) non hanno la freccia: sembrano titoli vuoti.
3. [P2] Recupero dagli errori: "Non salvato. Riprova." non dice cosa, sparisce dopo 10 s e non ha il bottone Riprova.
4. [P3] Forzieri: 9 righe, 6 uguali "Da scegliere".
5. [P3] "Partita: Foxes Volley 3-1" va a capo dentro il punteggio; le pillole "0 note", "0 serate chiuse" non dicono se va bene.

### Code-review (`/code-review`, main...genitori-ux)

Prima: 8 segnalazioni.

| # | Dove | Cosa | Esito |
|---|---|---|---|
| 1 | `Settimana.tsx` togli | errore dell'update di `compiti` ignorato dopo lo storno: "Spunta tolta" anche se la spunta resta | corretto: "Passi annullati, ma la spunta è rimasta. Riprova Togli." |
| 2 | `Impostazioni.tsx` Sera | con le impostazioni non caricate il Salva riscriveva tutti i giorni con i soli campi compilati | corretto: in errore la pagina non mostra il modulo |
| 3 | `Genitori.tsx` passi() | l'errore della funzione `passi` è inghiottito (restituisce 0) | lasciato: tocca la logica dei passi |
| 4 | `Oggi.tsx` Dai passi | per lo stesso motivo un errore si legge come "tetto già pieno" | lasciato, come il 3 |
| 5 | `Oggi.tsx` Lani oggi | l'ora di chiusura ignora `ora_chiusura_breve` (sera prima di una partita) | lasciato: solo testo per i genitori |
| 6 | `Settimana.tsx` query compiti | filtra per scadenza originale: un compito vecchio spostato a questa settimana non compare | lasciato: caso raro |
| 7-8 | Oggi / Settimana / Forzieri | Firmato e Consegna scritti due volte | lasciato: pulizia, nessun difetto |

Dopo: 2 corretti, 6 lasciati per scelta (3 e 4 da decidere col signore: servirebbe distinguere l'errore dal tetto in `passi()`).

### Ritocco di sola interfaccia (approvato dal signore il 16/11)

Fatto (`27231f3`): freccia su tutte le sezioni che si aprono; Sera e cartella una sera alla volta (fila dei sette giorni con l'ora, sotto la sera scelta con "In cartella per" il giorno dopo; 2639 → 895 px) con il foglio "Modifiche non salvate" uscendo da "‹ Impostazioni" o dalle schede; pillola di errore con **Riprova** (rifà la stessa funzione, nessuna logica nuova sui passi) e testi che dicono cosa non è salvato.

Impeccable A rifatta: **31/40** (prevenzione errori 3 → 4, recupero dagli errori 2 → 3), carico cognitivo 1 su 8. B: detector 0 sui sorgenti, axe 0, bersagli piccoli 0. Mancano 3 punti a 34; restano solo P3, tutti di sola interfaccia: Forzieri con 9 righe (6 "Da scegliere"), pillole "0 note" / "0 serate chiuse" senza un'idea di bene o male, punteggio della partita che va a capo, "Premio non salvato" e "Foglio non salvato" senza Riprova, Stato di ACE senza il passo da fare, conferma delle modifiche solo su Sera.

### Difetti minori (approvati dal signore il 16/11): 34/40

Fatto (`583d8c6`): Forzieri con in vista solo quelli con premio e il prossimo da scegliere, gli altri chiusi in "Altri N da scegliere" (951 → 844 px); pillole di Settimana che dicono se va bene ("media, sotto l'obiettivo 7,35", "Nessuna nota", "X su Y serate chiuse finora"); punteggio della partita con il trattino non separabile; Riprova anche su premio e foglio; Stato di ACE con le sezioni e le righe del kit e, dopo un giro non riuscito, cosa fare.

Impeccable A: **34/40, obiettivo raggiunto** (riconoscimento 3 → 4, estetica 3 → 4, recupero dagli errori 3 → 4), carico cognitivo 0 su 8. B: detector 0 sui sorgenti, axe 0, bersagli piccoli 0. Il Riprova di "Passi annullati, ma la spunta è rimasta" rifà anche `storna_spunta`: è sicuro, il secondo storno non scrive niente (`registra_passi`, `on conflict (motivo, riferimento) do nothing`).

Restano P3 di sola interfaccia: "mai sincronizzato" in rosso anche quando è normale e "Errori degli ultimi 7 giorni: 0" ripetuto da "Nessun errore registrato."; "0 su 0 serate chiuse finora" il lunedì; gergo ("Enigma pronto", "R-Evolution", "Set loro", "Dieci minuti"); conferma delle modifiche solo su Sera; le sere cambiate non segnate nella fila dei giorni.
