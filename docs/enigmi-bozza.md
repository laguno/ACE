# Enigmi dei forzieri: bozza da controllare

Terza versione, 9 novembre 2026 (premio 7 cambiato: solo i biglietti, senza la cena). Ogni forziere ha un tipo diverso e la difficoltà sale (tipi e regole in `data/enigmi.json`). **Non è ancora nel database**: si salva dopo il controllo del signore e di Jarvis.

Le parti meccaniche le ha fatte il codice (`src/lib/enigmi`), non a mano: messaggio cifrato e striscia, calcoli, anagrammi, griglia, tabella della cima. I test le ricontrollano.

Per ogni forziere: il biglietto come lo vede Lani, le risposte accettate, l'aiutino (compare dopo il primo tentativo sbagliato) e la parola chiave (serve alla cima). Lani ha 3 tentativi; se indovina, +20 passi.

---

## 1. Indovinello in rima: Pigiama party con le amiche del volley

> Niente rete e niente palla, ma la squadra c'è al completo:
> la trasferta è in casa tua e l'orario è un po' segreto.
> Si scende in campo coi calzini e la divisa a fiorellini:
> vince chi resta sveglia di più, tra risate e cuscini.

- **Risposte accettate:** pigiama party con le amiche del volley / pigiama party con la squadra / festa in pigiama
- **Aiutino:** Pensa a cosa ti metti per dormire, e a chi dorme da te quella notte.
- **Parola chiave:** PIGIAMA

## 2. Codice segreto: Cinema con popcorn

Vicino al forziere c'è un messaggio in codice. Ogni lettera è spostata avanti di una: per leggerlo usa la striscia (sopra la lettera del biglietto, sotto quella vera).

```
MVDJ TQFOUF, TDIFSNP HJHBOUF F VO TFDDIJFMMP DIF GB DSBD
```

```
B C D E F G H I J K L M N
| | | | | | | | | | | | |
A B C D E F G H I J K L M

O P Q R S T U V W X Y Z A
| | | | | | | | | | | | |
N O P Q R S T U V W X Y Z
```

Che cosa c'è nel forziere?

- **Messaggio in chiaro:** LUCI SPENTE, SCHERMO GIGANTE E UN SECCHIELLO CHE FA CRAC
- **Risposte accettate:** cinema con popcorn / andare al cinema / film al cinema con i popcorn
- **Aiutino:** La prima parola è LUCI.
- **Parola chiave:** CINEMA

## 3. Acrostico: Pantaloncini di Hello Kitty

> Fa caldo, è giugno, e le gambe chiedono aria.
> Indossi qualcosa di corto, che non arriva al ginocchio.
> Ogni volta che lo guardi c'è una gatta: non è Lady, è bianca e viene dal Giappone.
> Coi baffi e le orecchie a punta, ma la bocca proprio no.
> Cerca bene sul suo orecchio: c'è sempre qualcosa di rosso.
> Ora leggi le prime lettere: è proprio quella cosa rossa.

- **Parola delle iniziali:** FIOCCO
- **Risposte accettate:** pantaloncini di Hello Kitty / shorts di Hello Kitty / pantaloncini corti con Hello Kitty
- **Aiutino:** È una gattina famosa con un fiocco: la trovi su astucci e diari.
- **Parola chiave:** PANTALONCINI

## 4. Codice matematico: Un set per la skincare

A=1, B=2, C=3 ... Z=26. Risolvi ogni calcolo e cambia il risultato in una lettera: escono due parole.

```
Prima parola
1) 1/5 di 15
2) il 20% di 90
3) √25
4) 3² + 4
5) 1/4 di 4

Seconda parola
6) il 10% di 220
7) √81
8) 4² + 3
9) 1/4 di 60
```

Non una sola: una scatola intera, per il tuo piccolo rito davanti allo specchio, la sera e appena sveglia.

- **Parole:** CREMA VISO (3, 18, 5, 13, 1 · 22, 9, 19, 15)
- **Risposte accettate:** set per la skincare / kit per la cura della pelle / creme per il viso
- **Aiutino:** Il primo calcolo fa 3: è la terza lettera dell'alfabeto.
- **Parola chiave:** SKINCARE

## 5. Anagramma con indizio: Una felpa Bershka scelta da te

Rimetti in ordine le lettere: quattro parole.

```
1) A T S A C
2) U O C I P C A C P
3) N O M A C E I R
4) E L F A P
```

1) Ci metti le mani quando hai freddo, o il telefono quando esci.
2) Lo tiri su quando piove e non hai l'ombrello.
3) La stanzetta con la tenda dove provi i vestiti in negozio.
4) Ha la 1 e la 2, e Bart ci dorme sopra se la lasci sul divano.

Stavolta nella 3 ci entri tu, e scegli tu.

- **Parole:** TASCA, CAPPUCCIO, CAMERINO, FELPA
- **Risposte accettate:** felpa Bershka scelta da lei / felpa scelta da me / felpa
- **Aiutino:** La prima parola è TASCA.
- **Parola chiave:** FELPA

## 6. Griglia con coordinate: Pantaloncini Nike Pro da pallavolo

Colonna e riga, come a battaglia navale: B5 è la lettera nella colonna B, riga 5.

```
   A B C D E F
1  H U R N A A
2  K K F P Q D
3  F W V Y J D
4  F F E A Q Q
5  W O S M Z B
6  Z T H C I L
```

D6 B5 C1 B6 E6 / D2 C4 C1 / E6 F6 / D5 B1 C1 B5 / C5 B5 B6 B6 B5 / E6 F6 / D1 B5 C3 C4

Aderenti come una seconda pelle, e sul fianco un segno a forma di baffo.

- **Messaggio:** CORTI PER IL MURO SOTTO IL NOVE
- **Risposte accettate:** pantaloncini Nike Pro da pallavolo / pantaloncini da pallavolo / pantaloncini Nike
- **Aiutino:** Li porti in partita, con la maglia numero 9.
- **Parola chiave:** PALLAVOLO

## 7. Logica a indizi: Biglietti per una partita di pallavolo femminile di Serie A

Leo, il nonno, Bart e Lady propongono una serata a testa, in quattro giorni diversi.

Cose da fare: tifo dal vivo per le campionesse sotto rete, teatro, concerto, pattinaggio sul ghiaccio.
Giorni: mercoledì, venerdì, sabato, domenica.

```
        da fare      giorno
Leo
nonno
Bart
Lady
```

1. Leo sceglie il concerto: fa sempre rumore.
2. Bart non va a teatro e non pattina: sul ghiaccio scivola con tutte e quattro le zampe.
3. Lady non va a teatro: sulle poltrone di velluto si addormenta.
4. Il nonno va a teatro di domenica, come ha sempre fatto.
5. Lady pattina a metà settimana.
6. Il concerto di Leo è il giorno prima della serata di Bart.

Nel forziere c'è la serata di sabato. Che cos'è?

- **Soluzione della tabella:** Leo concerto venerdì; nonno teatro domenica; Bart tifo sotto rete sabato; Lady pattinaggio mercoledì (unica: Bart non può né teatro né ghiaccio e il concerto è di Leo, quindi Bart fa il tifo; Lady non va a teatro, quindi pattina e il teatro è del nonno; nonno domenica, Lady mercoledì; Leo il giorno prima di Bart: venerdì e sabato)
- **Risposte accettate:** biglietti per una partita di pallavolo femminile di Serie A / partita di Serie A di volley femminile / biglietti per la partita di pallavolo
- **Aiutino:** Bart non può andare né a teatro né sul ghiaccio, e il concerto è già di Leo.
- **Parola chiave:** PARTITA (la cima non cambia: la T è la 4ª lettera)

## 8. Rebus a parole: Una libreria con le ante, scelta e sistemata insieme

> Il mio primo si apre per entrare, e dietro Bart ti aspetta quando torni da scuola.
> Il mio secondo li apri per studiare, e anche per sognare prima di dormire.
> Primo e secondo insieme tengono in ordine le tue storie.
> Il mio terzo sta sugli armadi: si apre a due a due, e dietro sparisce il disordine.
> Il mio intero è in camera tua: lo scegliamo insieme e lo montiamo insieme, cacciavite in mano.

- **Pezzi:** PORTA + LIBRI (portalibri) + ANTE
- **Risposte accettate:** libreria con le ante / portalibri con le ante / libreria
- **Aiutino:** Il primo è PORTA; il secondo sono quelli che leggi.
- **Parola chiave:** LIBRERIA

## 9. La cima: Una giornata a Gardaland con un'amica

Prendi la parola chiave del premio di ogni forziere (la cosa principale: per un pigiama party, PIGIAMA). Da ognuna una lettera, e trovi la parola della cima.

```
 1ª lettera: forziere 2, la 5ª
 2ª lettera: forziere 6, la 7ª
 3ª lettera: forziere 3, la 3ª
 4ª lettera: forziere 7, la 4ª
 5ª lettera: forziere 5, la 5ª
 6ª lettera: forziere 1, la 3ª
 7ª lettera: forziere 4, la 4ª
 8ª lettera: forziere 8, la 5ª
```

Mettici dopo «russe»: è un giorno intero tra giri a testa in giù, con un'amica accanto.

- **Parola finale:** MONTAGNE (C**I**NE**M**A → M; PALLAV**O**LO → O; PA**N**TALONCINI → N; PAR**T**ITA → T; FELP**A** → A; PI**G**IAMA → G; SKI**N**CARE → N; LIBR**E**RIA → E)
- **Risposte accettate:** giornata a Gardaland con un'amica / Gardaland / parco divertimenti con un'amica
- **Aiutino:** Le parole chiave sono: PIGIAMA, CINEMA, PANTALONCINI, SKINCARE, FELPA, PALLAVOLO, PARTITA, LIBRERIA.

---

## Da decidere

1. **Cima, parole chiave.** Il 3 e il 6 sono tutti e due pantaloncini: Lani potrebbe scegliere PANTALONCINI anche per il 6 invece di PALLAVOLO, e la 7ª lettera non tornerebbe. Proposte: (a) le parole chiave scritte nel biglietto della cima (più facile, mai ambigua); (b) restano nell'aiutino, come ora.
2. **Riconoscibilità.** Nel 3 la gatta bianca senza bocca viene dal Giappone alla terza riga; nel 6 il "baffo" sul fianco è nell'ultima riga. Vanno bene così o si tolgono?
3. **Se un premio cambia** prima che il suo enigma compaia, si rifanno quell'enigma e la cima (le lettere dipendono dalle parole chiave).
