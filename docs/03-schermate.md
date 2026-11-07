# Schermate

Le bozze sono in `design/*.html` (esportate dal canvas di design, con le immagini puntate su `public/assets/`). Sono **riferimento visivo**, non codice da copiare: layout assoluti a 390×844, testi d'esempio. I testi veri vengono dal copione (`05-copione.md`), i numeri da `data/config-gioco.json`.

## Stile: "zucchero filato"

| Elemento | Valore |
|---|---|
| Titoli | Baloo 2, 800 |
| Testo | Nunito, 600-800 |
| Testo principale | #3D2350 (viola scuro); secondario #5E4470 |
| Accento e pulsanti | #C2185B (fucsia), pressed #8E0F42; decorazioni #E23D8E |
| Fondi | #FFF6FA (panna rosata), #FFE3EF (rosa), #F3E6FD (lilla), #CDB8F5 (lilla medio), #BFE6FF (azzurro mattino), #FFE27A (giallo burro, oro e traguardi) |
| Carte | bianche, raggio 26-34 px, ombra morbida viola `0 10px 24px rgba(123,106,224,.14)` |
| Pulsanti | pillola, altezza ≥ 44 px (principali 54), ombra interna in basso |
| Icone di servizio | set Phosphor (bold), mai emoji |
| Personaggi | sticker con contorno bianco, mai ritagliati dentro cerchi |

Accessibilità: contrasto 4,5:1 anche sui testi piccoli, bersagli tattili ≥ 44 px, `<button>` e `<label>` veri, testo alternativo sugli avatar che contano.

## Navigazione

Barra in basso a 5 voci: **Oggi · Studio · Sera · R-Evolution · Astra**. R-Evolution arriva con lo sprint 2 (nello sprint 1 la voce c'è ma mostra "In arrivo" oppure si nasconde: decidere con il signore). L'app si apre sul momento giusto: mattina su Oggi, pomeriggio sui compiti, sera sulla chiusura.

Profili: Lani (telefono e iPad) e genitori (telefoni, con PIN). Lani non entra nella parte genitori.

## Lani

### Oggi, mattina — `design/Oggi.html`
- Data, "Buongiorno, Lani", una riga sulla giornata; avatar del momento (buongiorno, divisa nei giorni di partita, inverno da dicembre a febbraio, assonnata dopo una partita finita tardi, compleanno/Natale/primavera).
- **Tre cose per oggi**: verifiche, allenamento o partita con chi accompagna (dal calendario di famiglia), una cosa da non dimenticare.
- Pillola "Ieri sera hai chiuso tutto: +{passi}" con Bart.
- **Striscia "In famiglia"**: al massimo tre impegni dal calendario Google di famiglia (ora, titolo, chi c'è), ripiegabile; nessuna notifica; eventi con "privato" nel titolo esclusi.
- **Chiavi della settimana** (3 icone piene/vuote) e link ad Astra.
- Facoltativa: riga dell'umore con quattro facce (contenta, assonnata, broncio, frustrata), un tocco. Con broncio o frustrata quel giorno Leo non prende in giro e i testi usano le varianti calme. Ai genitori solo nel riepilogo della domenica.

### Oggi, pomeriggio — `design/Pomeriggio.html`
- "Compiti per domani" con finestra di tempo disponibile.
- **In quest'ordine**: compiti numerati, il più lungo prima; per ciascuno il tasto lampadina "Non ho capito" (spiega l'argomento con un altro esempio, poi indizi uno alla volta, mai la soluzione).
- Ripasso della verifica in arrivo (sessione n di 4, pallini dei giorni, "Inizia").
- Carte del giorno (+3).
- Foto: dove ACE chiede pagine da fotografare, pulsante "Fotografa" (+2 per compito).

### Studio — `design/Studio.html`, `Flashcard.html`, `Quiz.html`
- Verifiche in arrivo con il piano di ripasso: 4 sessioni da 15-20 minuti nei pomeriggi liberi (rilettura e flash card → flash card e mappa → quiz → la sera prima quiz breve sugli errori); con meno giorni si comprimono.
- **Flash card**: domanda, timer di 7 secondi prima di poter girare ("si gira dopo 7 secondi"), poi Sapevo / Quasi / Non sapevo; ripetizione a intervalli crescenti; 10-15 carte per giro; tre tipi (domanda, frase da completare, vero o falso con il perché); "Questa carta è sbagliata" la manda ai genitori. Fine giro: +3, fino a 4 giri al giorno.
- **Quiz**: 8-10 domande nello stile della verifica, spiegazione dopo ogni risposta, niente cronometro, le sbagliate diventano flash card. Passi a scalare per tentativo (vedi regole).
- **Video** (nuovo, da disegnare sul modello del quiz): lettore YouTube incorporato senza controlli di avanzamento; se Lani manda avanti o lascia la schermata il video non vale; a fine video "+3".
- Materiali: allegati di Nuvola e di Classroom.

### Sera — `design/Domani.html`
- Titolo "Pronta per {giorno}?" con barra di avanzamento della chiusura.
- Compiti per domani da spuntare; se mancano, Lady sdraiata sul quaderno.
- Cartella e borsa (materie del giorno dopo + materiale; borsa con divisa, ginocchiere, scarpe, borraccia).
- Da far firmare (pulsante "L'ho dato").
- Dieci minuti (sprint 2) con timer.
- "Domani in famiglia" se c'è un impegno che cambia la routine.
- Domenica: chiusura lunga guidata da papà, con la settimana in un colpo d'occhio.

### Astra — `design/Main.html`, `Astra-anno.html`
- Mondo corrente, mantra sotto il titolo, chiavi della settimana, saldo passi con l'icona del passo.
- Percorso con tappe fatte/attuale/da fare, Lani "sei qui", "mancano {n}" alla prossima tappa, forzieri con passi e chiavi richieste, bandierina "Il calendario è qui", traguardi (es. Vacanze di Natale).
- Link a Figurina e Album.

### Figurina — `design/Figurina.html`
Carta di Lani in divisa n. 9: media generale, passi, chiavi; obiettivo liceo come barra (es. 7,3); medie per materia con la tendenza.

### Album — `design/Album.html`
64 figurine (contatore "14 di 64"); quelle da scoprire in silhouette con l'indizio ("Prendi tre chiavi", "Vinci una partita", "In cima, a giugno"). Serie nera in una sezione a parte. Pagina "La squadra" dallo sprint 2.

### Popup — `design/Popup-*.html`
Regole dal copione: titolo ≤ 4 parole, testo ≤ 25 parole, un pulsante principale e al massimo uno secondario, **un popup per apertura** (coda per priorità: bastone, voto, forziere/tappa, altro), il bastone e la carota mai insieme, niente rimproveri dei genitori dopo le 21:00. Riga figurina in fondo quando se ne sblocca una.
- `Popup-forziere`: Lani sorpresa, premio, chiavi possedute e prossima soglia.
- `Popup-lucchetto`: lucchetto + papà dispiaciuto, "Servono {n} chiavi", chiavi possedute/necessarie, la frase "I passi ti fanno camminare, le chiavi aprono i forzieri."
- `Popup-bastone`: personaggio arrabbiato, badge del malus, cosa fare subito, riga della serie nera.
- `Popup-enigma`: Lani detective, biglietto con indovinello e indizio cifrato, campo risposta, tentativi, "+20 passi se indovini".

### Prima accensione — `design/Benvenuta.html`
Tre schermate con Lani timida: (1) cos'è ACE e le tre sezioni; (2) Astra: "I passi ti fanno camminare, le chiavi aprono i forzieri"; (3) notifiche: permesso, massimo tre al giorno. lani-timida accompagna anche la prima apertura di ogni sezione con le istruzioni.

## Genitori

### La settimana — `design/Genitori.html`
- Media (con obiettivo), note della settimana, serate chiuse.
- **Da fotografare**: richieste aperte con pagine probabili dalla mappa dei libri, pulsante "Fotografa".
- **Dai qualche passo**: scrivania, lavastoviglie, letto, vestiti (+2, contatore "oggi x su 6").
- **Da segnare, se serve**: bagno −1, antisportiva −7, balla −10 (con conferma).
- Premi (stato dei 9 forzieri, contenuti, consegna), Impostazioni (orari, gesti di casa, calendari da mostrare, Nuvola, squadra, frasi di famiglia, menu dei dieci minuti).
- Possono correggere le spunte di Lani; Lani vede la correzione e chi l'ha fatta.

### Prima accensione — `design/Genitori-avvio.html`
Quattro passi: collega Nuvola; scegli i premi dei 9 forzieri; controlla gesti di casa e orari; metti ACE sulla schermata Home (senza, niente notifiche su iPhone).

## Notifiche — `design/Notifiche.html`
Titolo sempre "ACE", icona del personaggio, ≤ 60 caratteri, materie abbreviate. A Lani al massimo tre al giorno (7:00; pomeriggio solo se ci sono compiti nuovi; ora della chiusura) più un sollecito 45 minuti dopo. Mai rimproveri nelle notifiche. Ai genitori: riepilogo della domenica, fogli da firmare in scadenza, pagine da fotografare.
