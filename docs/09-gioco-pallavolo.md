# ACE — Gioco di pallavolo (progetto, Fase 1)

Redatto da Jarvis il 16/11/2026 dopo aver letto il repository (HANDOFF, CLAUDE.md, docs/01 e 08, manifest, `src/App.tsx`, `src/Figurine.tsx`, `capacitor.config.ts`). Aggiornato lo stesso giorno (17:11) con le decisioni del signore (§5). Le regole di punti e gettoni sono sue.

## 1. Idea (dal signore, 16/11)

Un giochino di pallavolo 2D, semplice, sulla scia di *Volleyball Arena: Spike Hard* (1v1, mani e testa, tuffo, power-up, campi in città diverse) e di *Volleyball Challenge 2026* (battuta, bagher, muro, schiacciata, pallonetto, superpoteri, personaggi e outfit da aprire). In ACE i personaggi sono **figurine che escono dai forzieri**: la famiglia e le compagne della R-Evolution. Più avanti partite 2 contro 2 e sfondi presi dalle palestre dove la squadra gioca davvero.

## 2. Cosa c'è già in ACE (verificato nel repository)

- **Guscio Capacitor** (non TWA): una WebView che apre la produzione `ace-passino.vercel.app`, id `it.messori.ace`, **solo verticale**. Le modifiche web arrivano da sole; un APK nuovo serve solo per icone, permessi, plugin.
- **PWA React + TypeScript + Vite**, schermate caricate con `lazy()` in `src/App.tsx` (Astra, R-Evolution, Album, Figurina).
- **Album da 64 figurine** di famiglia (Lani 26, Leo 12, mamma 7, papà 7, Bart 5, Lady 5, nonno 2, allenatore 3), già nel manifest con categoria e tono. Ogni forziere regala una figurina rara non ancora presa (`docs/02`, riga 133).
- **Pagina "La squadra"** già prevista dallo sprint 2 (`docs/01`, riga 290): compagne come **figurine senza volto**, con maglia, numero, ruolo e nome o soprannome; nessuna foto delle ragazze passa da Gemini.
- Avatar **disegnati con Gemini dal signore**, WebP 512 px trasparenti; CLAUDE.md vieta di rigenerarli o ritoccarli.
- Regole che il gioco deve rispettare: numeri solo da `data/config-gioco.json`; Lani non scrive mai passi o premi (li calcola il server, idempotente); il premio di un forziere resta nascosto fino all'apertura; copione con popup brevi e senza emoji.

## 3. Decisioni tecniche

### 3.1 Dove sta il gioco: modulo separato nel codice, **stessa app**

- Cartella `src/gioco/`, caricata con `lazy()` come R-Evolution: pesa zero finché Lani non lo apre.
- **Non un'app a parte.** Un'app diversa avrebbe un suo conteggio in Family Link e un suo permesso; nel guscio attuale il tempo sul gioco conta già come tempo su ACE. L'APK 1.3 (§3.4) è lo stesso ACE, aggiornato.

### 3.2 Motore

- **Canvas 2D** e un motore proprio e minuscolo; niente Phaser o simili (peso, dipendenze, `knip`).
- Il **motore è separato dalla grafica**: funzioni pure in `src/gioco/motore/` (palla con gravità, rimbalzi su rete e pavimento, contatto giocatore-palla, punteggio al rally point, IA semplice), passo fisso a 60 Hz, generatore casuale con seme. Si prova con vitest come le regole di `src/lib/regole`.

### 3.3 Personaggi: niente generatore SVG

ACE ha già uno stile deciso (disegni Gemini del signore, figurine senza volto per le compagne). Il gioco lo **riusa**:
- una figurina a figura intera, di lato o di spalle, usata come sprite;
- il movimento nasce da **trasformazioni** (inclinazione, schiacciamento, rimbalzo, salto); niente animazioni fotogramma per fotogramma;
- una figurina in più nell'album = un personaggio in più da scegliere.
- **Compagne: solo descrizioni e disegni senza volto, mai foto.**

### 3.4 Campo orizzontale: **soluzione B, APK 1.3** (deciso dal signore, 16/11)

Il campo è **in orizzontale**: in verticale il gioco non diverte. Il guscio è bloccato in verticale, quindi:

- **APK 1.3** (versionCode 4, stessa chiave, "Aggiorna", come da `docs/runbook.md`) con un plugin di orientamento di Capacitor che blocca in **orizzontale solo mentre il gioco è aperto**; il resto di ACE resta in verticale. Il signore ha già accettato un terzo APK.
- Si prova **prima su "ACE Prova"** (`docs/10-ambiente-di-prova.md`), sul telefono del signore, e solo dopo sul Samsung di Lani.
- **iPad e iPhone** (senza guscio) ruotano liberamente: il gioco deve funzionare in entrambi gli orientamenti, o chiedere di girare lo schermo.
- Scartata la soluzione A (schermo ruotato dalla pagina): non provata, e il blocco di sistema in verticale sarebbe rimasto.

L'orizzontale libera anche il 2 contro 2: sul lato lungo i quattro sprite ci stanno.

### 3.5 Controlli (due pollici)

In orizzontale: frecce a sinistra, bottone grande a destra (salta; con la palla a portata, schiaccia). Bersagli ≥ 44 px. Tuffo e bagher automatico dopo, se il gioco funziona.

### 3.6 Il tetto di 3 partite al giorno

Il tetto lo conta il **server** (una riga per partita e giorno, nuova migrazione), non il telefono: un contatore sul dispositivo si azzera cancellando i dati dell'app. Il numero sta in `data/config-gioco.json`, come ogni numero del gioco.

## 4. Le fasi

**Fase 1 (si prova prima di tutto): "Partita di prova"**
- Un campo (uno sfondo del manifest), 1 contro CPU, tre personaggi (Lani, una compagna, uno a sorpresa), set ai 15 punti.
- Criterio di fatto: giocabile a 60 fps sul Samsung di Lani; motore con test; un pomeriggio di prova con lei che dice se è divertente. **Se non lo è, si ferma qui.**
- Gioco libero per la prova, senza tetto né server; solo su "ACE Prova" e sul telefono del signore finché non è pronto.

**Fase 2: collezione e 2 contro 2**
- Personaggi sbloccati dalle figurine dei forzieri; compagna controllata dalla CPU, o secondo giocatore sullo stesso iPad.
- Tetto di 3 partite al giorno, contato dal server (§3.6).
- Pagina "La squadra" con le compagne come figurine senza volto.

**Fase 3: contorno**
- Sfondi delle palestre reali, stilizzati (colori, nomi, niente foto).
- Power-up e superpoteri; livelli di difficoltà della CPU.
- **Non si fa:** multiplayer online.

## 5. Decisioni del signore (16/11) — chiuse

1. **Orizzontale**, non negoziabile; **soluzione B con APK 1.3** (§3.4).
2. **Compagne**: solo descrizioni, come per le figurine; niente foto. Soprannomi e numeri li fornisce il signore quando sarà il momento (servono dalla Fase 2).
3. **Tetto massimo: 3 partite al giorno.** Nessuna condizione per sbloccarle (ribadito alle 17:11).
4. **Nessun premio per la vittoria**: niente passi, niente figurine, niente contatori. Il gioco vale solo il divertimento.
5. **Set ai 15 con due punti di scarto** (16/11 sera): sul 14 pari si va avanti finché uno ha due punti in più.
6. **Dove si implementa.** Sessione di Claude Code sul repository di ACE (ramo `gioco`), con test e le regole di CLAUDE.md. Nessuna pubblicazione nelle finestre vietate (14:20-14:45 e 19:45-21:00) e backup prima di ogni pubblicazione, come da HANDOFF.

## 6. Rischi

| Rischio | Contromisura |
|---|---|
| Gioco non divertente | Fase 1 minima, prova con Lani prima di spendere altro |
| Gioco che sostituisce lo studio | Tetto di 3 al giorno contato dal server; Family Link sopra a tutto; da rivedere con l'uso vero |
| Il blocco in orizzontale non funziona come previsto | Prova su "ACE Prova" prima del Samsung di Lani |
| Troppa grafica da produrre | Un'unica figurina intera per personaggio, movimento da trasformazioni |
| Privacy delle compagne | Solo disegni senza volto, nessuna foto, descrizioni date dal signore |
| Peso/lentezza di ACE | `lazy()`, cartella separata, nessuna libreria di motore |
| Distrarre dallo sprint in corso | Parte solo quando il nucleo di ACE è stabile (APK sul Samsung di Lani, flusso foto) |

## 7. Prossimo passo

L'ambiente di prova viene prima (`docs/10-ambiente-di-prova.md`). Poi si apre il ramo `gioco` e si costruisce il solo motore con i test, prima di qualunque grafica.
