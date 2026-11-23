# Prototipo "La mia settimana" (23/11/2026)

> **Superato dalla v2**: le bozze da seguire sono in `design/v2/` (vedi `design/v2/LEGGIMI.md`). Questo resta come storia.

Bozze disegnate da Jarvis sul canvas di claude.ai e approvate dal signore il 23/11. Il canvas non si
vede da Claude Code: queste sono le sorgenti copiate da lì. Sono file `.dc.html` (formato del canvas):
il markup ha gli stili scritti in linea, le liste stanno in `<sc-for>` e i valori di prova nello
script `renderVals()` in fondo. Si leggono come una bozza di `design/*.html`: misure, colori,
ordine dei pezzi e testi.

| File | Schermata | Dove va nell'app |
|---|---|---|
| `La-mia-settimana.dc.html` | La mia settimana di Lani | `src/Settimana.tsx` (default) |
| `Oggi-striscia.dc.html` | Oggi con la striscia sopra la barra | `src/Oggi.tsx`, `src/Tabellina.tsx`, `Striscia` in `src/Settimana.tsx` |
| `Genitori-settimana.dc.html` | Settimana dei genitori | `src/genitori/Settimana.tsx`, `src/Genitori.tsx` |

## Cosa seguire

- **Le due barre**: alte 16 px (6 nella striscia), passi in fucsia su rosa, cose in azzurro su
  azzurro chiaro, tacca scura a 70% (prima chiave) e 95% (terza chiave) **con l'etichetta sotto la
  tacca** ("1ª chiave", "3ª chiave") e a sinistra "N di M passi" / "N di M cose".
- **Fila delle tre chiavi** sotto le barre, con il nome: Quota passi, Nessuna nota, Tutto fatto.
  Nell'app si usano gli sticker `chiave-piena` / `chiave-vuota` al posto delle chiavi in SVG.
- **"Oggi, per restare in rotta"**: al massimo tre righe con il cerchio vuoto.
- **Griglia giorno per giorno**: colonna dei nomi da 92 px con "+N passi" sotto, sette cerchi da
  30 px (fatta piena con la spunta, da fare col bordo, persa col bordo tratteggiato, "non serve"
  un puntino), legenda in fondo.
- **Oggi**: carta "Le cose di oggi" in cima con il conto "N di M", una tacca per cosa e la frase
  dei passi; promemoria dello sport; le cose divise per momento con il valore a destra di ogni
  riga; riquadro tratteggiato "Passi in più · fanno salire Astra, non le chiavi".
- **Genitori**: barre con i numeri e le soglie in chiaro, "Chiavi previste", griglia, sezione
  "Passi per voce" (fatte di possibili, passi fatti di possibili), link tratteggiato "Premi e
  forzieri · Protetti dal PIN genitori" in fondo.

## Cosa NON seguire (errori o cose superate del prototipo)

- La barra di navigazione disegnata in `Oggi-striscia` (Oggi, Astra, R-Evo, Album) è inventata:
  quella vera resta **Oggi, Studio, Sera, R-Evo, Astra**. Va presa solo la striscia sopra di essa.
- I tab Mattina / Pomeriggio / Sera dentro Oggi sono un ripiego del prototipo: **Sera resta la sua
  scheda nella barra**. Dentro Oggi vanno i momenti che Oggi già mostra (mattina e pomeriggio).
- Le schede dei genitori disegnate (Settimana, Oggi, Scuola, Stato) sono inventate: restano quelle
  dell'app, senza Forzieri (23/11).
- "Le chiavi si contano lunedì mattina": il signore ha deciso **domenica alle 23:00**.
- I numeri delle bozze sono di prova: nell'app arrivano tutti da `calcolaSettimana`
  (`src/lib/regole/settimana.ts`) e da `data/config-gioco.json`.
- Colore dell'azzurro: `#6FB6F0` non regge il contrasto come testo; nell'app `--azzurro: #2a6fb0`
  per il testo, l'azzurro chiaro può restare per il riempimento della barra.

## Differenze rimaste nella prima versione (ramo `settimana`, commit del 23/11 mattina)

1. Le etichette "1ª chiave" e "3ª chiave" sotto le tacche mancano: c'è solo la frase sotto la barra.
2. Oggi non ha la carta "Le cose di oggi" in cima: le tacche stanno dentro la tabellina, e le righe
   non hanno il valore a destra come nella bozza.
3. Genitori: manca la sezione "Passi per voce" e la riga "Chiavi previste".
4. La mia settimana usa la testata di ACE con lo sticker (`Testata`): va bene, è lo stile di casa;
   sotto, le carte devono seguire la bozza.
