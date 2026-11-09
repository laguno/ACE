# Revisione UI con Impeccable (9 novembre 2026)

Revisione di Oggi, Pomeriggio, Sera, Studio, Flash card, Quiz, Astra, Figurina, Album e Genitori, a 390 e 360 px, con Impeccable (`critique` e `audit`). **Il codice non è stato toccato.** Il signore e Jarvis scelgono cosa adottare; poi si applica con i comandi mirati (`layout`, `typeset`, `polish`, `harden`, `clarify`), una schermata per commit, con le foto prima e dopo.

**Come è stata fatta.** Contesto in `PRODUCT.md`: app per una ragazza di 12 anni, 390 px, `design/*.html` e `design/Stile.html` fonte autorevole; sticker che sbordano, riquadri con le icone, pillole e sfondo per momento sono voluti. Due valutazioni separate:

- **A**, revisione di design: euristiche di Nielsen, carico cognitivo, percorso emotivo, note per schermata.
- **B**, rilevatore automatico più misure tecniche: contrasti calcolati, bersagli tattili, inventario di spazi, raggi, ombre e caratteri.

Prove usate: le foto di `docs/confronto/` (rigenerate oggi), le foto dei popup in `docs/confronto/vetrina/` e il sorgente. L'overlay nel browser di Impeccable è stato saltato: l'app richiede l'accesso a Supabase e le prove usano un Supabase finto. Ho verificato a mano sul codice le affermazioni più forti: `.pillola` non esiste, `.sera h1` sovrascrive `.testata h1`, il forziere ha `aria-label="Forziere N"`, `.lani-sentiero` è dichiarata 8 volte, il corsivo è finto.

## In sintesi

| | Punti | Giudizio |
|---|---|---|
| Critique (Nielsen) | **27/40** | Accettabile, vicino a buono |
| Audit tecnico | **14/20** | Buono, il punto debole sono i temi (colori e ombre scritti a mano, regole ripetute) |
| Aspetto "fatto dall'IA" | **No** | La famiglia disegnata, gli sfondi per momento e il copione di casa la rendono riconoscibile. Il rischio è l'uniformità: la stessa carta bianca con h2 a sinistra e "+N" a destra in cinque schermate. |
| Rilevatore automatico | 1 risultato | Solo l'entrata del popup "a rimbalzo" (`stile.css:481`) |

**Funziona bene:**
- Fedeltà alle bozze: sticker, sfondi, riquadri con le icone.
- Flash card e quiz a tutto schermo.
- Colori del testo tutti a token e sopra 4,5:1.
- Bersagli tattili tutti ≥ 44 px.
- `prefers-reduced-motion` rispettato.
- Si animano solo transform e opacity.
- Un solo h1 per schermata.
- Immagini leggere: 92 WebP per 3,2 MB, la più grande pesa 99 KB.

## Le quattro regole proposte (da approvare)

Sono le domande di Jarvis. Per ognuna c'è lo stato attuale misurato, la regola proposta e cosa cambia.

### 1. Spazi su una scala unica: 4 / 8 / 12 / 16 / 24 / 32

**Oggi:**
- Il 60% dei `gap` e il 55% dei `padding` stanno fuori scala. Il valore più usato è 10 (21 volte); poi 6, 14, 18, 22 e 26.
- Lo spazio tra le carte cambia da schermata a schermata:
  - 10 px in Oggi, Studio, Figurina e Album;
  - 16 px in Sera e Genitori;
  - 14 px in Flash card e Quiz.
- Il padding delle carte è 16, 14/16, 18 (Figurina), 26/24 (flash card), 22 (popup), 12/14/12/18 (testata di Astra, asimmetrico).

**Proposta:**
- 12 px tra le carte in tutte le schermate.
- 16 px di padding per le carte, 24 per le carte "eroe" (flash card, popup).
- 8 px tra le righe dentro una carta.
- Sostituzioni: 10 → 12 tra le carte e 8 dentro; 14 → 16, 6 → 8, 18 → 16, 22 → 24, 26 → 24.

Comando: `layout`.

### 2. Tre bordi a sinistra: 20 / 16 / 32

**Oggi** si usano quattro bordi:
- 16 px: carte, h1 di Genitori e Album, opzioni del quiz;
- 20 px: testate, freccia indietro, domanda del quiz;
- 32 px: contenuto delle carte;
- 34 px: testata di Astra e Figurina.

Il rientro di 4 px delle testate c'è anche nelle bozze.

**Proposta:**
- 20 px per il testo fuori dalle carte: h1, sopratitolo, Indietro, titoli di sezione, note.
- 16 px per il bordo delle carte.
- 32 px per il contenuto delle carte.

Da correggere: l'h1 di Genitori, l'h1 e "Serie nera" dell'Album (devono passare a 20), il padding di 18 di Astra e Figurina (deve passare a 16).

Comando: `layout`.

### 3. Gerarchia dei titoli

**Oggi:**
- 22 dimensioni di carattere; tra 11 e 19 px ci sono 8 gradini vicinissimi.
- L'h1 vale 24, 26, 28, 30, 31, 32 o 34 a seconda della schermata. `.sera h1` (`stile.css:109`) sovrascrive `.testata h1` (`:73`), quindi la Sera ha 30 e Oggi 31.
- Gli h2 delle carte sono 19 (Oggi, Studio) o 21 (Sera, Genitori).
- L'h2 "Serie nera" dell'Album non ha stile.
- Testi a 11 px nella barra, nei pallini e nelle bandiere della mappa.

**Proposta:**

| Elemento | Misura |
|---|---|
| h1 delle schermate con testata | 30 px |
| h1 delle sottoschermate (Flash card, Quiz, Astra, Figurina, Album) | 26 px |
| h2 delle carte | 20 px |
| Titolo delle voci | 17 px Baloo |
| Sopratitolo | 14/800 Nunito |
| Etichette | 13/800 |
| Testo | 15–16 |
| Minimo assoluto | 12 px (niente 11) |

Baloo solo per titoli e numeri.

Comando: `typeset`.

### 4. Raggi e ombre coerenti

**Oggi** ci sono 17 raggi diversi: 999, 16, 18, 50%, 22, 28, 26, 34, 20, 14, 12, 32, 6, 3… Le ombre sono 16, e solo 5 usi passano dai token `--ombra` e `--ombra-barra`. Il bordo inferiore dei bottoni è di 4 o 5 px.

**Proposta:**
- **Raggi:**
  - 16 per gli elementi piccoli (riquadri, campi, indizi);
  - 24 per carte e pannelli;
  - 32 per popup e flash card;
  - 999 per pillole e bottoni.
- **Ombre:** tre token della stessa tinta:
  - `--ombra` per le carte;
  - `--ombra-alta` per popup, flash card e flottanti;
  - `--ombra-etichetta` per la mappa.
- **Bordo inferiore dei bottoni:** 4 px ovunque.

Comando: `polish`.

## Da correggere comunque (difetti, non gusti)

Sono violazioni WCAG o bug, indipendenti dalle quattro regole. Proposta: farle subito, in un commit `harden`.

| P | Cosa | Dove | Correzione |
|---|---|---|---|
| P1 | "← Astra" in prugna su viola: 3,4–3,7:1 (serve 4,5) | `stile.css:406` + `:446`, Figurina | pillola bianca dietro la freccia, come "Sei qui" |
| P1 | L'avviso dei genitori usa la classe `.pillola`, che non esiste: esce senza stile | `Genitori.tsx:67` | usare lo stile delle pillole del kit |
| P2 | Bordi di campi e opzioni del quiz a 1,2:1 sul bianco (WCAG 1.4.11) | `stile.css:89`, `:199`, `:288` | bordo `--testo-2` sottile o fondo panna nel campo |
| P2 | Anello di focus del popup lilla a 1,8:1 | `stile.css:489-490` | `outline: 3px solid var(--accento)` come nel resto |
| P2 | Il forziere si chiama "Forziere N" ma mostra "915 · 4 chiavi" (WCAG 2.5.3) | `Astra.tsx:182` | nome che contiene il testo visibile |
| P2 | Il popup non trattiene il focus né si chiude con Esc | `Popup.tsx:66` | `<dialog>` nativo con `showModal()` |
| P2 | Quiz: la barra è piena a "1 di 1" prima di rispondere | `Ripasso.tsx`, `TestaStudio` | contare le risposte date |
| P3 | Corsivo finto: il motto di Astra e il biglietto dell'enigma usano un corsivo che il font non ha | `stile.css:251`, `:357` | caricare Nunito 800 corsivo o togliere il corsivo |
| P3 | Entrata del popup "a rimbalzo" | `stile.css:481` | `cubic-bezier(0.22, 1, 0.36, 1)` |

## Pulizia del CSS (nessun cambiamento visibile)

`stile.css` è cresciuto a strati di "ritocchi".

- **43 selettori dichiarati più volte**, tra cui:
  - `.lani-sentiero`, 8 volte, con `top` che passa da −110 a −96, −64 e −62;
  - `.tappe .bandiera.sopra` ×3;
  - `.chip` ×3, `.popup` ×3, `.pallini` ×2, `main` ×2, `.album*` ×2.
- **Regole morte:** `.mondo`, `.saldi`, `.percorso`, `.nome-tappa`, le prime regole di `.tappa`, `.qui`, `.bandiera`, `.forziere`.
- **60 colori scritti a mano fuori da `:root`.** `#ffe27a` è già `--burro`; `#2e7d32` e `#7b6ae0` non hanno un token; i coriandoli in `Popup.tsx` sono i colori dei token scritti in maiuscolo.

Proposta: un commit `polish` che fonde ogni selettore in un'unica regola, toglie le regole morte e aggiunge i token mancanti, con le foto di confronto identiche prima e dopo.

## Da decidere: testi e contenuti (tocca il copione, decide il signore)

La revisione A ha segnalato punti in cui il **testo**, non la grafica, indebolisce l'esperienza. Vanno decisi con il copione (`docs/05-copione.md`), non con i comandi di grafica.

1. **Forziere, il momento più alto del gioco, si chiude con "Ok"** e il testo ripete il titolo ("Forziere aperto" / "Forziere aperto! Dentro c'è…"). La bozza aveva "Vedi il premio". Proposta: pulsante "Evviva" o "Vedi il premio" per forziere e cima.
2. **La Sera non promette un traguardo.** Il contatore "2 su 7, già +12 passi" ha perso "Chiudi tutto e Bart va a dormire" della bozza.
3. **Studio si apre con un divieto.** "Prima i compiti di oggi: poi flash card e quiz danno passi" è la prima cosa che si vede. Proposta: metterlo dentro la carta, o dirlo in positivo ("Finiti i compiti, flash card e quiz valgono passi").
4. **La regola del quiz** ("10 passi con almeno il 90% giusto, 6 sotto. Poi 6, 3 e dal quarto 1") è chiara per i genitori, meno per Lani. *Nota: la forma con la percentuale l'ha appena chiesta Jarvis.* Alternativa: "Quasi tutte giuste al primo colpo: 10 passi."
5. **"Questa carta è sbagliata"** sotto "Com'è andata?" si legge come "ho sbagliato io". Proposta: "C'è un errore in questa carta".
6. **Figurina:** il segno "=" per "stabile" non è chiaro a una dodicenne.
7. **Album:** troppe caselle uguali con "??? Arriva con la pallavolo"; il testo ripetuto non aggiunge niente.

## Note per schermata

Solo quelle che le quattro regole non coprono già. P = gravità, poi il comando.

**Oggi**
- P2 · La pillola dei passi di ieri ha perso il numero grande e la storia di Bart della bozza (`clarify`).
- P3 · Le righe della carta "In famiglia" partono a 12 px invece di 16 (`layout`).
- P3 · Il link "Vai su Astra" non è allineato alla riga delle chiavi (`polish`).

**Pomeriggio**
- P2 · Due cerchi diversi sulla stessa riga: il numero a 34 px e la lampadina a 44 (`polish`).
- P2 · A 390 px Ripasso e Carte del giorno restano sotto la piega (`layout`).
- P3 · "Inizia da qui: è il più lungo" in fucsia compete con il testo del compito (`quieter`).

**Sera**
- P1 · "Da far firmare" finisce sotto la barra in basso; è la cosa più importante per i genitori (`layout`).
- P2 · "2 su 7" mette insieme compiti e cartella senza dire dove si arriva (`clarify`).

**Studio**
- P3 · Le carte delle verifiche hanno fino a 5 righe di peso uguale; serve una gerarchia (`typeset`).

**Flash card**
- P3 · Con risposte corte la carta alta 400 px resta mezza vuota (`layout`).

**Quiz**
- P3 · Titolo (24) e domanda (23) hanno quasi lo stesso peso (`typeset`).

**Astra**
- P2 · A 360 px la testata fissa occupa circa 210 px, più di un quarto dello schermo (`adapt`).
- P3 · La figurina nella testata è a figura intera e piccola (60 px); la bozza ha il ritratto nel cerchio (`polish`).

**Album**
- P3 · Caselle di altezza diversa (`layout`).

**Genitori**
- P1 · Gesti positivi (+2) e sgridate (−10) hanno lo stesso bottone. La bozza li distingueva: rosa pieno contro lilla contornato (`harden`).
- P2 · 6 schede in fila con scorrimento laterale: Impostazioni e Vetrina sono fuori schermo (`distill`).
- P2 · Manca la testata del kit (sopratitolo, avatar). Questo rientra nella grafica di Genitori, che è il passo 3 dell'ordine dei lavori.
- P2 · "Balla" apre un `prompt` del browser (`harden`).
- P3 · Le etichette a 17 px vanno a capo ("Vestiti in ordine / +2"); "Esci" pesa quanto un'azione (`typeset`).

## Ordine suggerito, se tutto viene approvato

1. `harden`: i difetti della tabella "Da correggere comunque" (P1 e P2).
2. `polish`: pulizia del CSS e token, senza cambiamenti visibili; le foto di confronto devono restare uguali.
3. `layout` + `typeset`: le regole 1-3, una schermata per commit con le foto prima e dopo, partendo da Sera (la firma sotto la barra) e Genitori.
4. `polish`: la regola 4, raggi e ombre.
5. I testi della sezione "Da decidere", dopo il copione aggiornato dal signore.
