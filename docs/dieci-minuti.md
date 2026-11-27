# Dieci minuti a carte

Progetto del signore con Jarvis del 25/11/2026 (testo completo incollato in chat; qui le decisioni prese e come sono costruite). Ramo `feature/dieci-minuti`, prima su ACE Prova. Rilascio a tappe: **tappa 1** ruota + sette carte + migrazione (questa); **tappa 2** giorni di allenamento e partita.

## Decisioni del signore (25/11)

- Lani non sceglie: ogni giorno gira una **ruota** che assegna la carta. **Mazzo settimanale** lunedì-domenica (ora di Roma) senza ripetizioni, si rimescola il lunedì. **Un solo giro al giorno**, l'esito lo fissa il server.
- Schema comune: 1' di riscaldamento, 8 blocchi da 40" + 20", 1' di record; "3, 2, 1, cambio" e vibrazione. Il record lo scrive Lani, si festeggia solo quando batte il migliore della carta (carta 4: del trick). Valori in `data/config-dieci-minuti.json`.
- Sette carte: 1 Gambe da muro, 2 Core d'acciaio, 5 Caviglie e equilibrio (pesanti); 3 Riflessi, 4 Palla al muro: trick, 6 Allungamento, 7 Calma (leggere). Niente sedia al muro, mai la divisa.
- Confermate il 25/11 le proposte di Jarvis: giorno fatto = dieci minuti completati; migrazione additiva; online con la carta 4 animata e le altre con sticker fisso (animazioni dopo); carta 3 con l'interruttore "Ho il visore" (di base palla rimbalzina); esercizi a rotazione fino a 8 blocchi (carte 3 e 4: otto diversi); riscaldamento e minuto finale uguali per tutte (Calma: respirazione, senza record).
- Carta 3 col visore (26/11): record **Combo più lunga** (0-999, nessuna migrazione), confrontato solo con le combo.
- Col visore (26/11): una sola sessione di 10 minuti, senza riscaldamento, pause, cambi né vibrazioni; il record si scrive alla fine e SEGNA FATTO compare solo dopo averlo salvato.
- Tappa 2 (migrazione `0073`): nei giorni di allenamento o partita niente carte pesanti; se restano solo pesanti, una Calma in più. Lo decide `gira_ruota()` con le righe di `impegni_famiglia` del giorno; una carta già assegnata resta.
- Sfondi (25/11, specifica di Jarvis): un tema per carta in `data/config-dieci-minuti.json`, disegni in `src/Sfondo.tsx` e `src/sfondi.css`, carattere Orbitron nella sessione. La scia della carta 1 va a ritmo, ogni 2 secondi in lavoro.

## Come è costruita

- **Server**: migrazione `0072_carte_dieci_minuti.sql`, tabella `carte_del_giorno` (una riga per giorno: carta, record, su cosa) e due funzioni: `gira_ruota()` (se oggi non c'è la riga pesca fra le carte non uscite da lunedì) e `segna_record(valore, su)`. Lani legge e basta, scrive solo dalle funzioni. Prove in `npm run prova:schema`.
- **Storico e chiavi**: nessuna riga riscritta. `esercizi_dieci_minuti` e i valori vecchi di `serate.dieci_minuti_esercizio` restano; i giorni nuovi lì scrivono `carta-N`. Il giorno conta come prima: timer in fondo, funzione `passi` (tipo `dieci_minuti`), 6 giorni su 7 con un jolly, chiavi la domenica alle 23 (già nel codice, non toccato).
- **Giorni di allenamento e partita (verificato)**: ACE li conosce da `impegni_famiglia`: allenamenti dal calendario Google di famiglia (titolo con "Lani" e "allenament"), partite dalla FIPAV (funzione `classifiche`, id `fipav:...`); "[LANI ASSENTE]" toglie la partita (`src/lib/calendario`).
- **Schermate**: `src/DieciMinuti.tsx` (fascia in Oggi: ruota, poi carta del giorno con VIA, poi FATTI), `src/Ruota.tsx` (sette spicchi, uscite spente, suono e vibrazione), `src/SessioneDieci.tsx` (sessione a tutto schermo per tutte le carte). Regole pure in `src/lib/regole/dieci-minuti.ts` con test.
- **Sticker**: solo `lani-dieci-minuti` (plank) e `lani-vr` sono in abiti da allenamento, quindi le carte 1, 2, 3, 5, 6, 7 usano il primo (carta 3 col visore il secondo). Gli altri sticker di Lani sono in abiti da scuola.
- **Impostazioni dei genitori**: il vecchio menu degli esercizi è diventato l'elenco delle sette carte, in sola lettura.
- Il timer non ha più la pausa (come il prototipo): la fase si calcola dall'ora di avvio timbrata dal server.

## Carta 4: asset dei trick (24-25/11)

- **Originali**: GIF di Gemini del signore in `C:\progetti\ace\asset\avatar\lani\esercizi` (640x360, 30 fotogrammi, 10 al secondo, sfondo verde). Stanno **fuori dal repository**, quindi fuori da PWA e APK. I `_rif_*.png` della stessa cartella non servono all'app.
- **Conversione**: `npm run trick:webp` (script `scripts/trick-webp.mjs`; altra cartella: `node scripts/trick-webp.mjs <cartella>`). Scrive `public/assets/trick/<id>.webp` (animato) e `<id>-fermo.webp` (primo fotogramma, per il movimento ridotto).
- **Cosa fa**: toglie il verde (riempimento dal verde pieno, così le strisce verdi scure della palla restano; alfa netta, il contorno bianco dello sticker regge il bordo), taglia i fotogrammi fermi in coda, un solo ritaglio per tutti i fotogrammi con 10 px di margine, avanti-indietro dove il giro scattava (bagher a un braccio, palleggio da seduta, uno alto uno basso, palleggio di lato).
- **Peso**: dal 25/11 misura piena degli originali (168-367 px di lato) e qualità 75, 10 fotogrammi al secondo: 3,1 MB in tutto, 120-463 kB per trick. Prima c'era la variante "intermedia" scelta il 24/11 (3/4 del lato, qualità 50, 1,8 MB), ma sul telefono si vedeva sgranata; scorrevolezza giudicata accettabile. Gli originali sono piccoli (alti al massimo 360 px) e la figura arriva a 270 px CSS: su un telefono a densità ~2,6 l'immagine resta comunque ingrandita. Altre varianti da riga di comando: "intermedia" `SCALA=0.75 Q=50`, "leggera" `SCALA=0.75 Q=50 PASSO=2` (~840 kB).
- Entrano da soli nel precache del service worker (`globPatterns` comprende `webp`).

## Difetti degli originali che il taglio non risolve

Decisione del 24/11 (Jarvis e signore): per il prototipo si tengono tutte; si rifà con Gemini solo quello che non funziona nella prova con Lani. Il muro mancante si disegna nella schermata (muro stilizzato a destra del trick). Da verificare con Lani: capisce il trick da sola, dal nome e dal movimento?


- `battito-mani`: **non c'è la palla**, Lani batte solo le mani.
- Palla tagliata dal bordo alto della GIF in alcuni fotogrammi: palleggio base, palleggio da seduta, giro su se stessa, uno alto uno basso, palleggio di lato, bagher e palleggio alternati.
- `pancake`: Lani va in ginocchio e colpisce di bagher; la mano piatta a terra sotto la palla non si vede.
- `muro-rimbalzo`: il muro non è disegnato, la palla esce a destra e torna.
- `bagher-un-braccio`: palla sopra la testa a lato (già noto).
- Vestiti giusti in tutte le undici (maglietta viola, tuta bordeaux, scarpe bianche), mai la divisa.

Limite di qualità (25/11): le GIF sono 640x360 a 256 colori e Lani occupa circa 170x360 px; sul telefono la figura si ingrandisce 2-2,5 volte, quindi resta sgranata anche a qualità piena. Non ci sono i video originali: il signore ha deciso di andare avanti così.

## Difetti degli originali che il taglio non risolve

Decisione del 24/11 (Jarvis e signore): per il prototipo si tengono tutte; si rifà con Gemini solo quello che non funziona nella prova con Lani. Il muro mancante si disegna nella schermata (muro stilizzato a destra del trick). Da verificare con Lani: capisce il trick da sola, dal nome e dal movimento?


- `battito-mani`: **non c'è la palla**, Lani batte solo le mani.
- Palla tagliata dal bordo alto della GIF in alcuni fotogrammi: palleggio base, palleggio da seduta, giro su se stessa, uno alto uno basso, palleggio di lato, bagher e palleggio alternati.
- `pancake`: Lani va in ginocchio e colpisce di bagher; la mano piatta a terra sotto la palla non si vede.
- `muro-rimbalzo`: il muro non è disegnato, la palla esce a destra e torna.
- `bagher-un-braccio`: palla sopra la testa a lato (già noto).
- Vestiti giusti in tutte le undici (maglietta viola, tuta bordeaux, scarpe bianche), mai la divisa.

