# Enigmi dei forzieri: bozza da controllare

Quarta versione, 9 novembre 2026, dopo le segnalazioni del signore sulla terza; il 7 rifatto il 10/11 come cruciverba. **Approvata dal signore il 10/11** e salvata nel database con la migrazione `0028_enigmi_v4.sql`.

Cosa è cambiato:
- Indovinelli in rima (1, 3, 8); i codici (2, 4, 6) restano senza rima.
- Premio 1: "Pigiama party con le amiche" (al massimo 2, le sceglie Lani). Premio 9: "Una giornata al parco divertimenti" (Gardaland, Mirabilandia o altro). Le parole chiave PIGIAMA e la parola della cima MONTAGNE non cambiano.
- Il 3 più corto; il 7 è un cruciverba a colonna (la logica a indizi non si capiva, 10/11); la cima con le parole chiave scritte nel biglietto.

Le parti meccaniche le fa il codice (`src/lib/enigmi`), non a mano: messaggio cifrato e striscia, calcoli, anagrammi, griglia, tabella della cima. I test le ricontrollano.

Per ogni forziere: il biglietto come lo vede Lani, le risposte accettate, l'aiutino (compare dopo il primo tentativo sbagliato) e la parola chiave (serve alla cima). Lani ha 3 tentativi; se indovina, +20 passi.

---

## 1. Indovinello in rima: Pigiama party con le amiche

> Due amiche le scegli tu, e da noi restano a dormire,
> ma la luce non si spegne: c'è sempre troppo da dire.
> Vestite tutte e tre per la nanna, coi calzini colorati,
> vince chi resta sveglia, tra cuscini e segreti sussurrati.

- **Risposte accettate:** pigiama party con le amiche / pigiama party / festa in pigiama
- **Aiutino:** Pensa a come ti vesti per dormire, e a chi dorme da te quella notte.
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

## 3. Acrostico in rima: Pantaloncini di Hello Kitty

> Giugno scotta: che si fa?
> Al ginocchio non ci arriverà.
> Tutta bianca e senza bocca,
> tiene un fiocco e non si tocca.
> Alle iniziali: chi è? Lo sai già.

- **Parola delle iniziali:** GATTA
- **Risposte accettate:** pantaloncini di Hello Kitty / shorts di Hello Kitty / pantaloncini corti con Hello Kitty
- **Aiutino:** È una gattina famosa con un fiocco, stampata su una cosa corta che metti d'estate.
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

## 7. Cruciverba a colonna: Biglietti per una partita di pallavolo femminile di Serie A

Scrivi le risposte nelle righe, una lettera per casella. Le caselle # in colonna, lette dall’alto in basso, formano una parola.
```
 1        # _ _ _ _ _ _ _
 2      _ # _ _ _ _ _
 3        # _ _ _
 4        # _ _ _ _ _ _
 5      _ # _ _ _ _
 6        # _ _ _ _ _
 7  _ _ _ #
```
1) Al parco ci riposi, in palestra ci aspetti il tuo turno. (8)
2) Verde o nera, in classe: ci scrivi col gesso e si cancella in un attimo. (7)
3) Il pesce ci resta dentro, la palla deve passarle sopra. (4)
4) Bart ci si sdraia sopra, e la mamma lo vuole pulito. (7)
5) Ha le pagine ma non è un libro, e la sera ci guardi cosa c’è per domani. (6)
6) Ha quattro gambe ma non cammina, e a cena ci state intorno tutti. (6)
7) Ce l’ha Bart dietro, e al supermercato ci stai in mezzo per pagare. (4)
È quello che vai a vedere dal vivo, sugli spalti, con le più forti del campionato.

- **Righe:** PANCHINA, LAVAGNA, RETE, TAPPETO, DIARIO, TAVOLO, CODA; colonna PARTITA
- **Risposte accettate:** biglietti per una partita di pallavolo femminile di Serie A / partita di Serie A di volley femminile / biglietti per la partita di pallavolo
- **Aiutino:** La terza è RETE: il pesce ci resta dentro, la palla no.
- **Parola chiave:** PARTITA

## 8. Rebus a parole (in rima): Una libreria con le ante, scelta e sistemata insieme

> Il mio primo si apre per entrare, e dietro c'è Bart ad aspettare.
> Il mio secondo li apri per studiare, e la sera per sognare.
> Primo e secondo insieme tengono in fila le storie da leggere e rileggere.
> Il mio terzo si apre a due a due sull'armadio, e dietro il disordine non si fa vedere.
> Il mio intero sta in camera tua: lo scegliamo e lo montiamo insieme, cacciavite in mano e niente da temere.

- **Pezzi:** PORTA + LIBRI (portalibri) + ANTE
- **Risposte accettate:** libreria con le ante / portalibri con le ante / libreria
- **Aiutino:** Il primo è PORTA; il secondo sono quelli che leggi.
- **Parola chiave:** LIBRERIA

## 9. La cima: Una giornata al parco divertimenti

Le parole chiave dei forzieri sono: PIGIAMA, CINEMA, PANTALONCINI, SKINCARE, FELPA, PALLAVOLO, PARTITA, LIBRERIA. Da ognuna prendi una lettera, e trovi la parola della cima.

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

Mettici dopo «russe»: è un giorno intero tra giri a testa in giù e urla in discesa.

- **Parola finale:** MONTAGNE (CINE**M**A → M; PALLAV**O**LO → O; PA**N**TALONCINI → N; PAR**T**ITA → T; FELP**A** → A; PI**G**IAMA → G; SKI**N**CARE → N; LIBR**E**RIA → E)
- **Risposte accettate:** giornata al parco divertimenti / parco divertimenti / giornata alle montagne russe
- **Aiutino:** La 1ª lettera è M: la 5ª di CINEMA.

---

## Salvataggio (fatto il 10/11)

- Migrazione `0028_enigmi_v4.sql`, generata da questa bozza: i 9 biglietti, titoli dei premi 1 e 9; immagini invariate. Una prova (`src/lib/enigmi`) la rilegge: il 7 dà PARTITA, la cima MONTAGNE.
- In `data/enigmi.json` e `src/lib/enigmi`: acrostico e rebus in rima; il 7 è il tipo "cruciverba" (al posto della logica a indizi); la cima scrive le parole chiave nel biglietto e l'aiutino è libero. Con i test.
- Se un premio cambia, si rifanno il suo enigma e la cima (decisione del 9/11).
