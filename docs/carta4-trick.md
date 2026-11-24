# Carta 4 dei dieci minuti, "Palla al muro: trick" — PROTOTIPO

Ramo `feature/dieci-minuti-carta4`, solo ACE Prova. Niente produzione, niente migrazioni.

## Asset (Fase 1, 24/11)

- **Originali**: GIF di Gemini del signore in `C:\progetti\ace\asset\avatar\lani\esercizi` (640x360, 30 fotogrammi, 10 al secondo, sfondo verde). Stanno **fuori dal repository**, quindi fuori da PWA e APK. I `_rif_*.png` della stessa cartella non servono all'app.
- **Conversione**: `npm run trick:webp` (script `scripts/trick-webp.mjs`; altra cartella: `node scripts/trick-webp.mjs <cartella>`). Scrive `public/assets/trick/<id>.webp` (animato) e `<id>-fermo.webp` (primo fotogramma, per il movimento ridotto).
- **Cosa fa**: toglie il verde (riempimento dal verde pieno, così le strisce verdi scure della palla restano; alfa netta, il contorno bianco dello sticker regge il bordo), taglia i fotogrammi fermi in coda, un solo ritaglio per tutti i fotogrammi con 10 px di margine, avanti-indietro dove il giro scattava (bagher a un braccio, palleggio da seduta, uno alto uno basso, palleggio di lato).
- **Peso**: variante "intermedia" (scelta da Jarvis e dal signore il 24/11): 3/4 del lato, 10 fotogrammi al secondo come gli originali, qualità 50. 1,6 MB in tutto, 68-258 kB per trick (i più pesanti sono quelli con l'avanti-indietro) più 3-5 kB per il fermo. Un fotogramma costa 4-7 kB comunque; a 5 fotogrammi al secondo si perdeva il gesto. Altre varianti da riga di comando: "leggera" `PASSO=2` (~840 kB), "fluida" `SCALA=1 Q=60` (~2,5 MB).
- Entrano da soli nel precache del service worker (`globPatterns` comprende `webp`).

## Difetti degli originali che il taglio non risolve

Decisione del 24/11 (Jarvis e signore): per il prototipo si tengono tutte; si rifà con Gemini solo quello che non funziona nella prova con Lani. Il muro mancante si disegna nella schermata (muro stilizzato a destra del trick). Da verificare con Lani: capisce il trick da sola, dal nome e dal movimento?


- `battito-mani`: **non c'è la palla**, Lani batte solo le mani.
- Palla tagliata dal bordo alto della GIF in alcuni fotogrammi: palleggio base, palleggio da seduta, giro su se stessa, uno alto uno basso, palleggio di lato, bagher e palleggio alternati.
- `pancake`: Lani va in ginocchio e colpisce di bagher; la mano piatta a terra sotto la palla non si vede.
- `muro-rimbalzo`: il muro non è disegnato, la palla esce a destra e torna.
- `bagher-un-braccio`: palla sopra la testa a lato (già noto).
- Vestiti giusti in tutte le undici (maglietta viola, tuta bordeaux, scarpe bianche), mai la divisa.

## Schermata (Fase 2, 24/11)

- **Dove**: in fondo a Oggi, fascia "PROVA — Palla al muro: trick" con VIA, **solo nelle build di prova** (`vite --mode locale`, cioè ACE Prova, e il server di sviluppo). In produzione la condizione è falsa al build: `src/Carta4.tsx` non entra nel pacchetto e i trick non entrano nel precache (`globIgnores` in `vite.config.ts`; controllato sulla build).
- **File**: `src/Carta4.tsx` (schermata), `src/lib/regole/trick.ts` + test (scaletta, fase dai secondi passati, 8 trick su 9 senza ripetizioni, segnali, fumetti, record), `data/config-trick.json` (**tutte le durate**, vibrazioni e testi, PROVVISORIO), `e2e/carta4.e2e.ts`.
- **Sessione**: 60" di riscaldamento (palleggio base, poi bagher base, poi negli ultimi 20" arriva il primo trick), 8 blocchi da 40" + 20", 60" di record. "3, 2, 1… cambio!" negli ultimi 3" di ogni fase, vibrazione corta a ogni secondo del conto e lunga al cambio, "Ancora 10 secondi!" nel lavoro. Allenatore in basso a sinistra con il fumetto (pollice nel lavoro, timeout in pausa, applaude alla fine).
- **"Come si fa"**: la prima volta che un trick arriva (nella pausa prima, o negli ultimi 20" del riscaldamento) tre vignette numerate con un fotogramma e una riga; da quando comincia il suo lavoro è "visto" e resta il "?" per riaprirla.
- **Record**: un trick a caso fra gli otto; si festeggia (`lani-cima`, coppa) solo se batte il migliore salvato. `lani-festeggia` non si usa: è in divisa.
- **Stato provvisorio, solo sul telefono**: `localStorage` `ace-prova:trick:visti` e `ace-prova:trick:record`. Niente server, niente passi, niente migrazioni.
- **Schermo spento / app in sottofondo**: la fase si calcola dall'ora di avvio, quindi al rientro il timer è giusto; mentre lo schermo è spento non vibra. Lo schermo resta acceso con la Wake Lock API dove il telefono la offre (da verificare su ACE Prova).
- **Movimento ridotto**: solo `<id>-fermo.webp`, niente transizioni né salti, niente vibrazione (come i sensi di ACE).
- Aggiunte rispetto alla lista: il pulsante **Esci** (senza, Lani non può uscire) e il **muro stilizzato** accanto al trick del muro (deciso il 24/11).
- **Altro difetto notato**: nelle GIF Lani ha lo chignon e niente occhiali, negli sticker dell'app capelli sciolti e occhiali.
