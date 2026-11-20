# ACE — Piano per fare della pallavolo un gioco vero

Scritto il 20/11/2026 sera, alla fine della sessione dei giri 1-3 del redesign. Questo è il documento di partenza per la prossima sessione: dentro ci sono lo stato, cosa non va, le due funzioni nuove (selezione dei personaggi e mossa finale) e il prompt da incollare.
Report visivo dell'audit (privato del signore): https://claude.ai/artifact/VM8gegDzcXZnp9JzfabeB4

---

## 1. Dove siamo

Ramo `gioco`, worktree `C:\progetti\ace\app-gioco`, ultimo commit `12499db` pubblicato su GitHub. Il ramo non è unito a `main` ed è **37+ commit indietro**.

Cosa funziona, provato dal signore su Chrome Android tra il 20/11 e il 21/11:

- **Partita.** Dura 1:30 contro la CPU. Ci sono il salto e la schiacciata (pulsante e tasto K). La schiacciata si accende quando è possibile (`puoSchiacciare`) e ha un "perdono" di 8 tic.
- **Personaggi.** Hanno l'altezza in cm presa dalla config. Il rapporto delle altezze a schermo è giusto entro ±3%.
- **Comandi.**
  - Una croce unica a sinistra, che segue il dito.
  - Salta e Schiaccia grandi a destra, con le etichette.
  - Nessun pulsante copre i giocatori (sovrapposizione misurata: 0 px²).
- **Resa.**
  - Disegno interpolato tra un passo e l'altro.
  - Densità dei pixel al massimo 2; sfondo e campo disegnati una volta sola, fuori schermo.
  - Campo e rete in prospettiva, sfondo con un parallasse di 6 px.
- **Effetti e interfaccia.**
  - Effetti: ombra e scia della palla, schiacciata con pausa di 4 frame, tremolio a trauma² e scintille, vibrazione.
  - Pillola "Lani N · N Leo" col tempo sotto; "Punto!" se segna Lani, "Punto di Leo" se segna Leo.
  - Pausa (pulsante, P o Esc) con Continua, Schermo intero ed Esci; pausa automatica quando si cambia app.
  - Schermo intero e orientamento orizzontale chiesti al primo tocco nel browser.
- **Giudizio del signore.** "Molto meglio i pulsanti". La palla è "un pelo troppo grande" (già ridotta del 15%).

---

## 2. Cosa non va e cosa manca per un gioco vero

Ordinato per gravità dentro ogni area. Le righe dei file si riferiscono a `12499db` e vanno ricontrollate.

### 2.1 Regole e fisica (motore)
1. **La palla attraversa i personaggi.** Il contatto è solo un cerchio alle mani (`motore/index.ts`, funzione `cerchio` e contatto in `passo`). Il corpo non esiste: la palla attraversa il 60-70% basso delle figure. Serve:
   - un corpo a capsula dai piedi alla testa, con bagher automatico che manda la palla in alto verso la rete (vy minima +9);
   - le mani alla cima vera della testa (`cm*uPerCm`, senza lo scarto che oggi mette il cerchio di Leo 25 unità sopra la testa);
   - il punto solo se la palla tocca terra fuori dalla capsula.
2. **Tocco nella metà bassa del cerchio.** Spinge la palla verso terra: è un punto perso senza colpa. Il proprio tocco non deve mai mandarla in giù, salvo la schiacciata.
3. **La CPU è troppo forte.** Una giocatrice simulata con il doppio del suo errore perde 9 partite su 10. `ERRORE_CPU = 40` è scritto a mano in `Gioco.tsx:24`: va nella config, con dei livelli. Il livello giusto per Lani lo decide il signore.
4. **Non c'è il servizio.** La palla cade da sola dopo 1 s. Serve un servizio con un tocco, con un limite di tempo dopo cui parte da solo.
5. **La schiacciata non chiude.** Ci sono 6,7 schiacciate per punto. La CPU ne sbaglia troppo poche, oppure la difesa è troppo facile: va ritarata insieme al punto 1.
6. **Il "perdono" della schiacciata.** A volte rischiaccia una palla già lontana, che cambia direzione in aria: va limitato alla palla ancora vicina.
7. **Regole da verificare con un test:** palla fuori campo, tocco della rete, quattro tocchi, palla sotto la rete. Se mancano, decidere quali servono (domanda al signore).

### 2.2 Personaggi
1. **Una sola immagine per personaggio, con oggetti estranei.** `lani-battuta` ha un pallone in mano, `leo-tennis` racchetta e pallina. Servono pose nuove disegnate dal signore con Gemini: ferma, salto/schiacciata, bagher. Requisiti:
   - stessi margini e piedi alla stessa riga;
   - niente oggetti in mano, sfondo trasparente;
   - per ogni personaggio selezionabile.
2. **Gli altri sei personaggi** (papa, mamma, nonno, allenatore, bart, lady) hanno solo pose frontali o di fuori gioco. Finché non arrivano le pose, si usa la posa più adatta, ribaltata verso la rete, e l'elenco delle immagini sta nella config.
3. **Animazione.** La posa va scelta dallo stato del motore (a terra, in aria, schiaccia, bagher recente), più squash al tocco e un rimbalzo della corsa più ampio.
4. **Espressioni.** Posa `festeggia` o `partita-persa` a fine partita. Le immagini esistono già per lani, leo e bart.

### 2.3 Interfaccia
1. **Schermata d'inizio.** Diventa la selezione dei personaggi (§3.1), poi "Pronta?" con il conto 3-2-1.
2. **Fine partita.** Oggi mostra solo il punteggio. Deve dire chi ha vinto, avere una frase di casa (copione, testi approvati dal signore) e i pulsanti Rigioca, Cambia personaggi ed Esci.
3. **Palla al servizio dietro la pillola.** Si risolve con un servizio più basso o con la pillola che si fa trasparente quando la palla le passa dietro.
4. **Prima partita.** Tre suggerimenti brevi sui pulsanti, una volta sola (localStorage in try/catch).
5. **Sfondo.** È verticale (1072×1920), ingrandito 2,3 volte. Uno sfondo orizzontale, se il signore lo disegna.

### 2.4 Sensazione
1. **Suoni.** Non ce n'è nessuno. Servono suoni brevi con Web Audio, generati, senza file: tocco, bagher, schiacciata, rete, punto, fine, conto 3-2-1. Partono dopo il primo tocco e c'è un interruttore nel menu Pausa.
2. **Vibrazione nell'app ACE Prova.** Manca il permesso VIBRATE. Serve `@capacitor/haptics`, che è una **dipendenza nuova: chiedere**.
3. **Tocchi normali.** Hanno poco riscontro: aggiungere squash della palla e un piccolo lampo.
4. **Fine partita.** Rallentatore sull'ultimo punto.

### 2.5 Telefono e prove
1. **Mai provati su un telefono vero:** 120 Hz, pausa al cambio di app, schermo intero, Samsung di Lani.
2. **ACE Prova apre la radice e non `#gioco`.** Serve un APK con `-UrlProva .../#gioco`, oppure un collegamento al gioco nella build locale.
3. **Manifest PWA.** Ha `orientation: 'portrait'` (`vite.config.ts:161`): va verificato installando l'app dalla schermata Home.
4. **Script di prova.** Gli script Playwright stanno nella scratchpad di una sessione e si perdono. Vanno portati in `scripts/prova-gioco/`, almeno la foto delle pose e `copre` per la sovrapposizione pulsanti/giocatori, e lanciati con `npm run prova:gioco`.

### 2.6 Codice
1. **`Gioco.tsx` ha 946 righe** e contiene resa, comandi, HUD, effetti e ciclo. Prima delle funzioni nuove va diviso, senza cambiare il comportamento, in:
   - `gioco/resa/` (campo, figure, palla, effetti);
   - `gioco/comandi.ts`;
   - `gioco/Hud.tsx`;
   - `Gioco.tsx` (ciclo e stato).
2. **Il motore resta com'è nell'impostazione.** Puro, deterministico, 55 test.

### 2.7 Prodotto (dopo, non in questa sessione)
1. Voce del gioco nell'app vera, tetto di `partite_al_giorno` contato dal server (docs/09 Fase 2), unione con `main` e pubblicazione: decisioni del signore.
2. **Regola di ACE Prova** ("mai indietro rispetto a `main`"). Il ramo `gioco` va unito con `gioco-con-tabellina` (vedi `scripts/allinea-main.mjs` in quel ramo) **solo quando il signore lo dice**. Il 20/11 aveva detto "mai merge".

---

## 3. Funzioni nuove

### 3.1 Selezione dei personaggi (giocatore 1 e CPU)

- **Quando compare.** Prima schermata del gioco, in orizzontale 844×390, dopo "Gira il telefono".
- **Disposizione.** Due colonne: a sinistra "Tu" (viola), a destra "CPU" (granata o fucsia). In mezzo la griglia degli 8 personaggi: lani, leo, papa, mamma, nonno, allenatore, bart, lady. Ogni scheda mostra la figurina, il nome, l'altezza in cm e il nome della mossa finale.
- **Come si sceglie.**
  - Si tocca una scheda: va al giocatore 1, poi la scelta passa alla CPU.
  - Per la CPU c'è anche il pulsante "A caso".
  - "Gioca" si attiva quando sono scelti entrambi.
  - Lo stesso personaggio da tutte e due le parti è ammesso: la CPU viene disegnata con un alone.
  - L'ultima scelta viene ricordata (localStorage in try/catch).
  - Tastiera: frecce, Invio, Esc.
- **Dati.** Un nuovo blocco `pallavolo.personaggi` in `data/config-gioco.json`, con un id per personaggio: `{ nome, cm, immagini: { ferma, salto, bagher }, finisher: { nome, tipo } }`. `altezze_cm` resta per compatibilità oppure si sposta lì dentro, con tutti gli usi aggiornati. Le immagini mancanti si sostituiscono con una posa esistente.
- **Motore.** Non cambia per la selezione: riceve già `cm: [n, n]` in `nuovaPartita`. Riceverà anche il tipo di finisher per lato (§3.2).
- **File.** Nuovo componente `src/gioco/Selezione.tsx` con `selezione.css`. `Gioco.tsx` decide quale schermata mostrare.
- **Fatto vuol dire:**
  - si scelgono entrambi;
  - la partita parte con quei due personaggi, alle altezze giuste e girati verso la rete;
  - "Cambia personaggi" a fine partita riporta alla schermata;
  - c'è un test per la lettura della config e per la scelta "a caso", deterministica col seme;
  - ci sono le foto a 844×390.

### 3.2 Mossa finale (finisher) con la barra

- **Barra.** Ogni lato ne ha una, **sotto il proprio nome** nella pillola in alto: Lani sotto "Lani", la CPU sotto il suo nome.
  - Si riempie **dal viola chiaro al viola scuro** (gradiente lungo la carica).
  - Quando è piena, **fiamme** animate le girano intorno: particelle nel canvas o un livello CSS, con solo transform e opacity.
  - Con `prefers-reduced-motion` si vede un bagliore fermo al posto delle fiamme.
- **Pulsante speciale.**
  - Compare solo a barra piena, **sopra i pulsanti normali di destra**, sopra Salta e Schiaccia.
  - Ha lo **stesso aspetto della barra piena**: viola scuro con le fiamme intorno.
  - È grande almeno 88 px, ha un'icona Phosphor, l'etichetta col nome della mossa e un'etichetta accessibile.
  - Si attiva anche col tasto L da tastiera.
  - Non copre i giocatori: rifare `copre`, il risultato deve essere 0 px².
- **Carica: regole nel motore puro, numeri nella config.** Nuovo blocco `pallavolo.finisher` con:
  - `max`;
  - `carica_tocco` (palla rimandata oltre la rete);
  - `carica_schiacciata`;
  - `carica_punto`;
  - `carica_punto_subito` (piccola, consola chi perde il punto);
  - `durata` (tic di effetto).

  Nello stato: `Stato.carica: [number, number]`. La carica si azzera all'uso e non si perde quando si segna.
- **Uso.**
  - Nuovo comando `speciale: boolean` in `Comandi`, valido solo a barra piena.
  - L'effetto arma il **prossimo tocco** del giocatore (`Stato.armato: [boolean, boolean]`) per un massimo di N tic.
  - La CPU (`ia`) lo usa con il suo errore.
  - Evento per la resa: `Stato.tocco.speciale` (oppure `Stato.finisher = { lato, tipo, tic } | null`) per lo schermo, la vibrazione lunga e il nome della mossa in grande.
- **Una mossa diversa per personaggio.** Sono parametri, non codice a parte. Tutte vanno **difendibili e bilanciate**: un vantaggio, non un punto sicuro. Solo + - * / e sqrt, niente trigonometria. Proposte da confermare col signore, sia i nomi sia gli effetti:

| Personaggio | Nome proposto | Effetto (parametri) |
|---|---|---|
| Lani | Schiacciata fulminante | schiacciata più veloce del 40% e più ripida, scia viola |
| Leo | Dritto di tennis | palla tesa e bassa appena sopra la rete, veloce |
| Papà | Bomba dall'alto | palla altissima che ricade quasi verticale vicino alla linea di fondo |
| Mamma | Palla furba | pallonetto corto che cade subito dietro la rete |
| Nonno | Colpo dell'esperienza | palla lenta che cambia velocità a metà (rallenta, poi accelera) |
| Allenatore | Fischio! | la CPU avversaria resta ferma per 1 s (comandi spenti) |
| Bart | Scatto del cane | per 3 s velocità di corsa e salto +30% |
| Lady | Dispetto | palla che inverte vx una volta a metà volo |

- **Resa.** Hit-stop più lungo (8 frame), il nome della mossa in grande per 1 s col colore del personaggio, scia di fiamme sulla palla, vibrazione di 120 ms, tremolio grande secondo la tabella della skill game-feel.
- **Test, uno per regola:**
  - la carica sale per ogni tipo di evento;
  - "speciale" a barra non piena non fa niente;
  - l'attivazione azzera la carica e arma il tocco;
  - ogni tipo di mossa produce l'effetto atteso;
  - la CPU la usa;
  - la partita resta deterministica (stesso seme, stessa partita).
- **Fatto vuol dire:**
  - la barra si riempie giocando e passa dal viola chiaro allo scuro;
  - a barra piena compaiono fiamme e pulsante;
  - premuto il pulsante, il tocco successivo fa la mossa del personaggio scelto;
  - la CPU la usa ogni tanto;
  - test verdi, foto di barra vuota, a metà e piena, del pulsante e della mossa.

---

## 4. Ordine dei lavori

Ogni fase finisce con prove verdi e un commit. Le fasi segnate "in parallelo" hanno file posseduti separati.

**Fase 0 · Orchestratore, 5 minuti.** `git status` e le domande bloccanti (§5), una alla volta. Si comincia senza aspettare le risposte non bloccanti.

**Fase 1 · In parallelo:**
- **OPUS-A, motore** (`src/gioco/motore/*`):
  - collisione con corpo, mani e punto (§2.1 punti 1, 2, 6);
  - carica e mossa finale (§3.2), con i tipi in un'unione `TipoFinisher`;
  - `nuovaPartita(seme, durata, cm, reteCm, finisher: [TipoFinisher, TipoFinisher])`;
  - `ERRORE_CPU` letto da un parametro (la resa lo passa dalla config).
  - Test.
- **SONNET-C, config, selezione e documenti** (`data/config-gioco.json`, `src/gioco/Selezione.tsx`, `src/gioco/selezione.css`, `docs/09`, `docs/11`):
  - blocchi `pallavolo.personaggi`, `pallavolo.finisher` e `pallavolo.cpu_errore` (livelli);
  - schermata di selezione come componente autonomo con la sua prova;
  - script Playwright portati in `scripts/prova-gioco/`.
- **OPUS-B, resa** (`src/gioco/Gioco.tsx`, `src/gioco/gioco.css`, nuovi `src/gioco/resa/*`):
  - prima la divisione di `Gioco.tsx` senza cambiare il comportamento (foto prima e dopo uguali);
  - poi barra con fiamme, pulsante speciale, effetti della mossa;
  - collegamento della schermata di selezione e figure prese dalla config dei personaggi.
  - Scrive contro il contratto (§4.1) finché OPUS-A non ha finito.

**Fase 2 · SONNET-D, verifica:**
- `npx vitest run`, `npx tsc --noEmit -p .`, `npx eslint src/gioco src/main.tsx`, `npm run build`;
- "Campo di pallavolo" in 0 file di `dist/assets`;
- `copre` a 0 px²;
- foto: selezione, barra vuota, a metà e piena, pulsante speciale, una mossa;
- una partita intera.

**Fase 3 · Orchestratore.** Diff, build sulla 5188, avviso al signore. HANDOFF, commit, push del solo `gioco`.

**Dopo, nelle sessioni successive:** servizio e difficoltà della CPU (decisione del signore), pose nuove (quando arrivano), suoni, schermate "Pronta?" e fine partita con i testi del copione, haptics nell'APK, prova sul Samsung di Lani.

### 4.1 Contratto tra motore e resa (fissarlo prima di lanciare gli agenti)

```ts
type TipoFinisher = 'fulmine' | 'dritto' | 'bomba' | 'furba' | 'esperienza' | 'fischio' | 'scatto' | 'dispetto';
type Comandi = { sx: boolean; dx: boolean; salta: boolean; schiaccia: boolean; speciale: boolean };
// Stato aggiunge:
carica: [number, number];             // 0..M.caricaMax (o dalla config passata a nuovaPartita)
armato: [number, number];             // tic rimasti al tocco speciale armato, 0 = no
finisher: { lato: Lato; tipo: TipoFinisher; tic: number } | null; // ultima mossa partita
// nuovaPartita(seme, durata, cm, reteCm, finisher, opzioni?: { erroreCpu?: number; carica?: {...} })
// ia(s, lato, errore) usa anche `speciale`.
// puoSpeciale(s, lato): boolean  → per accendere il pulsante.
```

Se i numeri della carica arrivano dalla config, `nuovaPartita` li riceve in `opzioni` e il motore non importa la config.

---

## 5. Decisioni del signore (da chiedere una alla volta)

Bloccanti per la Fase 1:
1. Nomi ed effetti delle 8 mosse finali (tabella §3.2): vanno bene così?
2. La CPU: la sceglie il giocatore, oppure è sempre "a caso"? Proposta: tutte e due.

Non bloccanti (si chiedono quando servono):
3. Quanto deve vincere Lani contro la CPU (livello di `cpu_errore`).
4. Pose nuove con Gemini: per quali personaggi, e quando.
5. `@capacitor/haptics` (dipendenza nuova).
6. Testi di "Pronta?", della fine partita e dei suggerimenti della prima partita (copione).
7. Regole da aggiungere: fuori campo, rete, quattro tocchi.

---

## 6. Prompt per la nuova sessione

Da incollare così com'è in una sessione nuova di Claude Code, aperta in `C:\progetti\ace\app-gioco`.

```
# Gioco di pallavolo di ACE: selezione dei personaggi, mossa finale e collisioni

Lavori in C:\progetti\ace\app-gioco (worktree git, ramo `gioco`). React + TypeScript + Vite, disegno su Canvas.
Prima di tutto leggi, in quest'ordine: HANDOFF.md (sezione "Ramo gioco"), docs/11-piano-gioco-vero.md (il piano: è la fonte di questo lavoro), CLAUDE.md, docs/09-gioco-pallavolo.md, src/gioco/motore/index.ts (misure in `M`), il blocco `pallavolo` di data/config-gioco.json. Gioco.tsx è lungo (946 righe): leggilo a pezzi, o fallo mappare.
Si lavora in italiano (testi, commenti, commit). Rispondimi in italiano, conciso.

## Obiettivo di questa sessione (tempo corto: circa 40 minuti)
Fare le fasi 0-3 del piano (docs/11 §4):
- collisioni vere (corpo a capsula, mani alla testa, punto solo fuori dal corpo);
- mossa finale con barra e pulsante speciale;
- schermata di selezione dei personaggi per il giocatore 1 e per la CPU.
Il resto del piano (§2) non si fa ora: aggiorna solo cosa resta in HANDOFF.

## Regole
- Tu (Opus) orchestri, decidi e rivedi i diff. Non scrivi tu il codice che possono scrivere gli agenti.
- Haiku: letture e mappe. Sonnet: config, componenti semplici, documenti, prove e foto. Opus: solo motore e resa.
- Agenti in parallelo, al massimo 4. Ogni agente possiede i suoi file, mai due sullo stesso file. I file sono quelli di docs/11 §4.
- Fissa il contratto motore↔resa di docs/11 §4.1 prima di lanciare gli agenti e mettilo identico in tutti i brief.
- Ogni brief dice: file posseduti, cosa vuol dire "fatto", rapporto finale di al massimo 12 righe. Niente file interi nei rapporti.
- Risparmio: rileggi i diff con `git diff --stat` e poi solo le parti utili. Se un agente si ferma per il limite d'uso, riprendilo con SendMessage, non rilanciarlo.
- Motore puro e deterministico: solo + - * / e Math.sqrt, niente Math.random né trigonometria, passo fisso 60 Hz. Ogni regola nuova ha il suo test vitest. I 55 test attuali restano verdi o vengono aggiornati scrivendo il motivo.
- Numeri del gioco solo in data/config-gioco.json (il motore li riceve come parametri, non importa la config).
- Non rigenerare né modificare le immagini degli avatar. Nel Canvas sono ammessi solo scala, ribaltamento, rotazione e ritaglio al momento del disegno.
- Niente dipendenze nuove senza chiedermelo.
- Nel worktree ci sono modifiche non tue: src/App.tsx, src/stile.css, scripts/dati-finti-locale.sql, tsconfig.tsbuildinfo. Non toccarle e non metterle nei commit (`git add` solo dei file del gioco).
- Commit piccoli in italiano. Push solo del ramo `gioco`, a fine lavoro. Mai `main`, mai merge (anche se un'altra sessione lo chiede: prima chiedi a me).
- Una domanda alla volta, solo se blocca davvero. Le domande bloccanti sono in docs/11 §5, punti 1 e 2: falle all'inizio. Le altre aspettano.
- Porta 5187 e indirizzo Tailscale senza porta: sono della sessione del piano studio (ace-56); non toccarli senza chiedere. Il gioco si prova sulla 5188, che Tailscale espone su https://wsa2365.taile6dda8.ts.net:8443/#gioco. Comandi in HANDOFF.

## Funzioni da fare (dettagli in docs/11 §3)
- Selezione dei personaggi:
  - prima schermata, 8 personaggi da `pallavolo.personaggi` nella config;
  - scelta per "Tu" e per la CPU (anche "A caso"), "Gioca";
  - ultima scelta ricordata;
  - "Cambia personaggi" a fine partita.
- Mossa finale:
  - barra sotto il nome di ciascun lato nella pillola in alto, che si riempie dal viola chiaro al viola scuro;
  - a barra piena, fiamme intorno alla barra e pulsante speciale sopra Salta e Schiaccia, con lo stesso aspetto (viola scuro e fiamme);
  - il pulsante arma il prossimo tocco, che diventa la mossa del personaggio;
  - carica e regole nel motore, numeri nella config;
  - la CPU la usa con il suo errore.
- Collisioni: docs/11 §2.1, punti 1, 2 e 6.

## Fatto vuol dire
- Selezione: funziona per il giocatore 1 e per la CPU; la partita parte con i due personaggi scelti, alle altezze giuste e girati verso la rete.
- Barra: si riempie dal viola chiaro allo scuro sotto il nome; a barra piena compaiono le fiamme e il pulsante speciale sopra i pulsanti di destra.
- Mossa: parte al tocco successivo, diversa per ogni personaggio; la CPU la usa ogni tanto.
- Collisioni: la palla non attraversa più i personaggi, che la ribattono col corpo (bagher); il proprio tocco non manda mai la palla a terra.
- Pulsanti: nessuno copre giocatori o palla (`copre`: 0 px²).
- Verifiche: `npx vitest run`, `npx tsc --noEmit -p .`, `npx eslint src/gioco src/main.tsx` e `npm run build` puliti; "Campo di pallavolo" in 0 file di dist/assets.
- Chiusura: build di prova sulla 5188 avviata, HANDOFF aggiornato, commit piccoli, push del solo `gioco`.

Alla fine dimmi: l'elenco dei commit, cosa hai verificato e come, cosa resta di docs/11, le decisioni che aspettano me.
```
