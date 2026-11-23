# Restyling v2 di ACE (23/11/2026): istruzioni per Claude Code

Le bozze sono state disegnate da Jarvis sul canvas di claude.ai e approvate dal signore il 23/11, schermata per schermata. Sostituiscono le bozze v1 in `design/settimana/`, che restano solo come storia.

Il motivo del restyling: dopo la prima settimana Lani non capiva a che punto era. Il signore vuole **meno testo e meno informazioni**, con **elementi grafici unici e riconoscibili**. Lani ha pochissima soglia d'attenzione.

## Come leggere le bozze

- Sono file `.dc.html`, il formato del canvas. Gli stili sono scritti in linea, le liste stanno in `<sc-for>`, i rami in `<sc-if>` e i valori di prova nello script `renderVals()` in fondo. Le leve in `data-props` mostrano gli stati da gestire (fatto, da fare, vinta, persa...).
- Si prendono misure, colori, ordine dei pezzi e testi. I numeri sono di prova: nell'app arrivano da `calcolaSettimana`, dalle tabelle e da `data/config-gioco.json`.
- `assets/<id>.webp` nelle bozze corrisponde a `public/assets/<cartella>/<id>.webp` (avatar, oggetti, sfondi). In app si usa `Sticker` di `kit.tsx`.
- La barra di navigazione resta **Oggi, Studio, Sera, R-Evo, Astra**.

## Principi (decisi con il signore, valgono per tutte le schermate)

1. **Una moneta per schermata.** Oggi e Sera contano le cose, La mia settimana le chiavi, Astra i passi. R-Evolution non mostra passi: "+N passi presi in campo" esce.
2. **Gettoni dai colori fissi per le cose obbligatorie**, uguali ovunque: compiti lilla `#F3E6FD`/`#6B4FC0`, ripasso burro `#FFF3C4`/`#8A6400`, cartella azzurra `#DCEFFF`/`#2A6FB0`, borsa rosa `#FFE3EF`/`#C2185B`.
3. **Un colore fisso per materia**, in un solo file (`data/colori-materie.json` o simile), con una prova che il testo regga 4,5:1 sul suo fondo. Proposta di partenza:

   | Materia | Testo | Fondo |
   |---|---|---|
   | Italiano | `#8E3B9E` | `#F4E3F7` |
   | Storia | `#A0522D` | `#FBE6D6` |
   | Geografia | `#5D7F1E` | `#EEF5DC` |
   | Matematica | `#C62828` | `#FDE3E3` |
   | Scienze | `#2E7D32` | `#E3F4E1` |
   | Inglese | `#1F5FA8` | `#DCEBFF` |
   | Spagnolo | `#C25E00` | `#FFEBD6` |
   | Tecnologia | `#00796B` | `#DDF3F0` |
   | Arte | `#AD1457` | `#FCE4EC` |
   | Musica | `#5E35B1` | `#EDE7F6` |
   | Educazione fisica | `#0277BD` | `#E1F3FC` |
   | Religione | `#6D5D4B` | `#F1ECE6` |

   Se un colore non regge il contrasto, scuritelo.
4. **Gli sticker dei personaggi sono il cuore dell'app** (parole del signore). Lani, la famiglia (mamma, papà, Leo, nonno), Bart, Lady e l'allenatore devono comparire come nelle bozze, sempre con le pose di `data/manifest.json`. Non rigenerare né ritoccare gli avatar.
5. **Resta l'ambientazione caramella e marshmallow**: sfondi illustrati, pastelli, notte di zucchero per la Sera. Due soli stacchi di stile: **R-Evolution** (la maglia granata) e **i dieci minuti** (allenamento: inchiostro `#14162E`, lime `#C6FF3D`, Bebas Neue).
6. Testi: valgono tutte le regole del copione in CLAUDE.md. Niente emoji, tranne R-Evolution (nastro Ultim'ora).

## Schermata per schermata

| Bozza | Schermata | File nell'app |
|---|---|---|
| `Oggi-v2.dc.html` | Oggi di Lani | `src/Oggi.tsx`, `src/Tabellina.tsx`, `src/DieciMinuti.tsx` |
| `Settimana-v2.dc.html` | La mia settimana | `src/Settimana.tsx` |
| `Studio-v2.dc.html` | Studio | `src/Studio.tsx` |
| `Sera-v2.dc.html` | Sera | `src/Sera.tsx` |
| `Astra-v2.dc.html` | Astra | `src/Astra.tsx` |
| `Dieci-v2.dc.html` | Timer dei dieci minuti a tutto schermo | `src/DieciMinuti.tsx` |
| `REvo-v2.dc.html` | R-Evolution | `src/REvolution.tsx` |

### Pillola di navigazione (tutte le schermate di Lani)

La barra di navigazione diventa una pillola bianca che "chiude l'ovale" con le due barre della settimana: **Passi sopra** (fucsia `#E23D8E` su `#FFE3EF`, con le tre chiavi a destra) e **Cose sotto** (azzurro `#2A6FB0` su `#DCEFFF`, con "N di M" a destra).

Ogni barra ha una **tacca di oggi**: dove dovrebbe essere a fine giornata per restare in pari, cioè possibili fino a oggi diviso possibili della settimana, calcolato da `calcolaSettimana`. Al tocco sulle barre si apre La mia settimana.

La `Striscia` della v1 sparisce: le barre vivono nella pillola.

### Oggi

In alto la data, "Ciao, Lani" e lo sticker. Poi, **un solo riquadro evento**:

- **Partita** (granata, il 9 fantasma, Lani in divisa, ora, avversaria, ritrovo);
- oppure **Verifica importante** (giallo `#FFE27A`, timbro della data, stellina): vedi la regola sotto.

Sotto viene la carta **"Oggi N di 4"**: tre gettoni per compiti, ripasso e cartella, più i dieci minuti. Poi gli impegni del calendario di famiglia come pillole di una riga ("16:00 allenamento"), il promemoria del giorno se c'è e la riga **"+ Passi in più"**, che apre la lista dei passi in più.

In fondo, a tutta larghezza, la **fascia dei dieci minuti** in stile allenamento, con lo sticker dell'allenatore (`allenatore-pollice`, che diventa `allenatore-applaude` quando sono fatti). **VIA** apre il timer.

### Timer dei dieci minuti (nuovo)

Schermo intero in stile allenamento: anello del tempo, nome dell'esercizio grande, PAUSA e RIPRENDI, e il coach con la sua riga ("Timer partito. Fino in fondo, poi spunta."). A tempo finito compare Lani `lani-festeggia` e il bottone **SEGNA FATTO**.

Le regole dei dieci minuti restano quelle di adesso: finestra, timbro del server, margine.

### La mia settimana

Come la bozza: la carta chiavi ("Tre chiavi in gioco" e una frase sola), le due barre con la tacca di oggi e la chiave alla soglia, la griglia con un pallino colorato per voce, la colonna di oggi evidenziata, i giorni futuri tenui, la casella persa tratteggiata con la X e il jolly "J".

### Studio

Resta **come nell'ultima bozza, foto delle pagine compresa** (decisione del 23/11). In cima "Le verifiche": carte con il timbro della data nel colore della materia, il conto alla rovescia, IMPORTANTE e i pallini del ripasso. Poi "Foto dei compiti" e le tessere "Ripassa" e "Spiegamelo tu".

### Sera

Notte di zucchero con nuvole di marshmallow e luna. Contiene:

- la barra a segmenti nei colori dei gettoni;
- una carta per compiti, cartella e borsa: quando una cosa è pronta, la sua carta si chiude in una riga con la spunta;
- la cartella con le materie di domani come bottoni, ognuno col pallino del colore della materia;
- la borsa come carta solo la sera prima dello sport di lunedì e venerdì, le altre sere come promemoria tratteggiato;
- Lady sui compiti (`lady-compiti`) finché ne manca uno;
- l'impegno di famiglia di domani con lo sticker della persona;
- a fine giro, "Buonanotte!" con Bart che dorme (`bart-sonnecchia`).

Niente numeri di passi.

### Astra

Lo sfondo illustrato del mondo e il sentiero restano. La testata si riduce a:

- mondo e nome;
- un bottone "?" (Come si fanno i passi);
- la figurina;
- i **passi in grande** e la barra verso la prossima tappa ("Tappa 6: mancano 60 passi").

Le chiavi si vedono solo nella carta del **prossimo forziere**, in basso: le chiavi che servono, quelle prese piene. L'album resta come bottone tondo.

Escono il mantra, "Cambia sfondo" (spostarlo nella figurina se si vuole tenere), la frase sulle chiavi e la chip della bandierina (la bandierina resta sulla mappa).

### R-Evolution

- **Sfondo come la maglia**: granata sulle spalle, sfumatura a puntini (mezzatinta) verso il bianco, fianchi granata con i puntini, la sagoma in schiacciata stampata in trasparenza e il 9 gigante. La sagoma della bozza è disegnata a mano: se il signore fornisce la grafica vera della maglia, si usa quella.
- **La striscia Ultim'ora resta com'è oggi** (richiesta del signore): stesso stile, stesso nastro, ferma al tocco e con riduci movimento.
- Ordine: testata (sticker che cambia posa dopo la partita: `lani-festeggia` se vinta, `lani-partita-persa` se persa, idea già approvata), Ultim'ora, manifesto della prossima partita, tabellone dell'ultima con le ultime 5, coach a fumetto con VIA ai dieci minuti, classifica corta ("3°" e le tre squadre vicine, poi "Tutta la classifica"), stagione in tre numeri.

## Regola nuova: verifica importante (approvata dal signore il 23/11)

ACE decide da sola quale verifica merita il riquadro in Oggi. Funzione pura in `src/lib/regole` con i test, numeri in `config-gioco.json` (nuova sezione `verifica_importante`):

- solo **una**, la verifica (o interrogazione) più vicina, **entro 3 giorni** (`giorni_prima: 3`);
- **mai le materie pratiche**: Musica, Arte e immagine, Educazione fisica (`materie_escluse`);
- è importante se la materia è **sotto la sufficienza**, cioè media pesata < 6 oppure ultimo voto < 6 (`soglia_voto: 6`, media da `src/lib/media.ts`);
- **le prove comuni sono sempre importanti** (riconoscerle dal testo dell'argomento di Nuvola: controllare sui dati veri come sono scritte);
- le **verifiche di recupero da sole non bastano**: Nuvola le assegna a tutti. Contano solo se la materia è sotto la sufficienza.

Esempio vero: scienze ha media 5,25 e una verifica il 26/11, quindi è importante. Un'esposizione col flauto non lo è mai.

## Notifiche

Il signore vuole che le notifiche **arrivino a Lani, molto più che ai genitori**. Controllare che la funzione `notifiche` le mandi al telefono di Lani e che ai genitori vada solo il riepilogo. I limiti restano quelli di CLAUDE.md (3 al giorno + 1 sollecito, mai dopo le 21, mai in campo). Non cambiare numeri senza chiedere.

## Ordine di lavoro consigliato

1. Pillola di navigazione con le due barre e la tacca di oggi; via la `Striscia`.
2. Oggi con i gettoni, la fascia dei dieci minuti e il timer.
3. La regola della verifica importante (test prima), poi il riquadro in Oggi e IMPORTANTE in Studio.
4. Sera, Astra, R-Evolution, Studio.
5. Colori delle materie in un file solo.
6. Controllo delle notifiche a Lani.

Un commit per passo, in italiano. A 390 px, bersagli ≥ 44 px, contrasto 4,5:1.

## Per mettere tutto su ACE Prova

Partire dal ramo `settimana`, che ha già le regole del 23/11 e la UI v1 da sostituire. Poi:

1. `npm test`, `npm run prova:schema`, `tsc`, build.
2. Playwright sul PC: aggiornare le prove che leggono le schermate cambiate, in particolare `e2e/genitori.e2e.ts`, `e2e/casi.ts` e quelle di Oggi, Sera e Astra.
3. Supabase locale: applicare `0071` e la migrazione nuova se serve, poi `select cron.unschedule('chiavi')`; servire `passi`, `chiavi`, `tabellina`, `notifiche`.
4. Unire nel ramo di prova (`npm run prova:allinea`) e `npm run prova:telefono`.
5. Il signore prova sul telefono. Niente produzione finché non lo dice lui. Prima della produzione: backup, `npm run simula`, `db push`, funzioni ripubblicate e rispetto delle finestre vietate (14:20-14:45 e 19:45-21:00).

## Da fare a parte

**E-book.** La regola nuova è in CLAUDE.md: le piattaforme degli editori si possono usare con l'accesso fatto dal signore e con le loro funzioni di stampa e PDF, senza aggirare protezioni. La prova della stampa su HUB Young è rimandata finché il signore non rifà l'accesso.
