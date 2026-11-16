# Installazione in famiglia

ACE non passa dagli store: su iPhone e iPad è un'app web aggiunta alla schermata Home, su Android un APK di famiglia.

## iPhone e iPad (Lani e genitori)

1. Aprire l'indirizzo di ACE con **Safari** (non Chrome).
2. Toccare **Condividi** (il quadrato con la freccia), poi **Aggiungi alla schermata Home**, poi **Aggiungi**.
3. Aprire ACE dall'icona sulla Home ed entrare con il proprio accesso.
4. Quando ACE chiede di inviare notifiche, rispondere **Consenti**. Su iPhone le notifiche arrivano **solo** se ACE è aperta dall'icona della Home (iOS 16.4 o successivo).

## Android: l'APK di ACE (telefono di Lani, Samsung; anche i telefoni dei genitori)

Perché un APK e non "Installa app" di Chrome: in Family Link un'app installata da Chrome conta il tempo su Chrome, e Chrome dovrebbe restare "sempre consentito", cioè internet senza limiti. L'APK è un'app vera (`it.messori.ace`) che apre ACE da sola, a tutto schermo, e si aggiorna da sola.

**Prima su un telefono dei genitori**, con la lista "Prova del guscio" qui sotto; solo dopo su quello di Lani, la sera dopo le 21 o il giorno dopo.

1. Copiare l'APK (`C:\progetti\ace\apk\ace-<versione>.apk`) sul telefono: cavo USB nella cartella Download, oppure Google Drive del genitore.
2. **Family Link** (dal telefono del genitore): Lani → Controlli → Limiti dei contenuti → (Google Play / App) → **App da origini sconosciute: attivo**, solo per l'installazione. Le **Opzioni sviluppatore** restano spente.
3. Sul telefono di Lani: app Archivio (I miei file) → Download → toccare l'APK → consentire l'installazione da quella app → **Installa**. Play Protect può avvisare che l'app non è conosciuta: "Installa comunque".
4. **Subito dopo**, in Family Link: App da origini sconosciute **spento**.
5. Aprire ACE ed entrare con l'accesso di Lani (una volta sola: la sessione resta aperta come oggi).
6. Toccare "Attiva i promemoria" e rispondere **Consenti**. Alla prima foto di una pagina, consentire la **fotocamera**.
7. Impostazioni → App → ACE → Batteria → **Senza restrizioni**; Assistenza dispositivo → Batteria → Limiti utilizzo in background: ACE non deve stare tra le app in sospensione.
8. Togliere l'icona vecchia di ACE installata da Chrome: tenere premuta l'icona → Disinstalla (toglie solo il collegamento, i dati stanno su Supabase). Se ci sono due icone ACE, la vecchia è quella che in Impostazioni → App risulta "Chrome" o non compare come app.
9. Family Link: Lani → Limiti delle app → **ACE: Sempre consentita**; **Chrome: limite normale** (non più sempre consentito).

**Prova del guscio** (telefono del genitore, poi di Lani)
- [ ] ACE si apre a tutto schermo con lo splash rosa, la barra di stato rosa con le icone chiare, niente barra di Chrome; il telefono girato resta in verticale.
- [ ] Chiudere ACE del tutto (anche dalle app recenti) e riaprirla: si resta dentro.
- [ ] Foto a più scatti: "Un'altra pagina" (chiede la fotocamera la prima volta), "Dalla galleria" con più foto, "Ho finito": le pagine arrivano.
- [ ] Notifica di prova via FCM (la manda Claude dal server): arriva anche con ACE chiusa, con l'icona piccola del pallone.
- [ ] Toccando la notifica si apre ACE.

Senza APK (o per l'altro telefono Android dei genitori) resta il modo di prima: Chrome → menu ⋮ → **Installa app**, notifiche via browser.

## Accessi

- **Lani**: la sua Gmail personale e una password lunga; la sessione resta aperta, niente PIN. Non usa la mail della scuola.
- **Genitori**: il proprio accesso; sui dispositivi di Lani la parte genitori è protetta dal PIN condiviso.

## Primo avvio dei genitori

1. Collegare Nuvola: le credenziali le inserisce il signore come segreti di Supabase, non nell'app.
2. Scegliere i premi dei 9 forzieri (modificabili finché il loro enigma non compare).
3. Controllare gesti di casa, orari della chiusura serale e calendari di famiglia da mostrare.
4. Installare ACE sulla Home di tutti i telefoni.

## Prova in famiglia: lista dei controlli

Prima il telefono Android di Lani, poi l'iPad. La fanno i genitori (Lani vede l'app solo a sorpresa, finita). Per ogni riga ok / no, con una foto dello schermo quando qualcosa non va. Le anteprime dei rami hanno un altro indirizzo e chiedono di rifare l'accesso: la prova si fa su `ace-passino.vercel.app`.

**Installazione e accesso**
- [ ] ACE si installa sulla Home e si apre a tutto schermo, senza la barra di Chrome.
- [ ] L'icona sulla Home è quella giusta, con il nome ACE.
- [ ] Chiudendo e riaprendo l'app (anche il giorno dopo) si resta dentro.

**Notifiche push**
- [ ] ACE chiede il permesso e la richiesta si accetta.
- [ ] Arriva una notifica dell'elenco (7:00; 14:45 se ci sono compiti nuovi; ora della chiusura; sollecito 45 minuti dopo).
- [ ] Toccando la notifica si apre ACE.
- [ ] Con l'app chiusa la notifica arriva lo stesso.

**Tema scuro di sistema acceso** (Samsung: Impostazioni → Schermo → Modalità scura)
- [ ] Le schermate restano chiare e leggibili: niente testi scuri su fondo scuro, niente colori invertiti.
- [ ] Gli avatar mantengono il contorno bianco, senza riquadri strani.

**Ogni schermata, scorrendo fino in fondo** (Oggi mattina e pomeriggio, Sera, Studio, Flash card, Quiz, Astra, Figurina, Album, area Genitori)
- [ ] L'ultima carta si legge tutta: la barra in basso non copre niente.
- [ ] Niente scorrimento di lato.
- [ ] Ogni pulsante si tocca bene con il pollice.
- [ ] I testi lunghi (compiti, argomenti) vanno a capo dentro le carte.

**Le cose che fa Lani**
- [ ] Spunta un compito: "Annulla" per 5 secondi, poi la spunta resta.
- [ ] Sera: cartella, borsa e fogli si spuntano; la barra di avanzamento sale.
- [ ] Studio: una sessione di flash card (si gira dopo 7 secondi) e un quiz arrivano in fondo.
- [ ] Lampadina "Non ho capito" su un compito: arriva una spiegazione.
- [ ] Astra: si vede dove è Lani; Figurina e Album si aprono e si torna indietro.

**Parte genitori**
- [ ] Dal telefono di Lani "Genitori" chiede il PIN; con il PIN giusto si entra.
- [ ] Settimana: un gesto di casa e una sgridata (poi toglierli da Correzioni o lasciarli e cancellarli prima del 23/11).
- [ ] Premi: cambiare un premio di un forziere chiuso; il pulsante di un forziere con l'enigma comparso è spento.
- [ ] Da fotografare: una foto da un genitore (la richiesta si chiude, nessun passo a Lani).
- [ ] Altro → Stato di ACE: Nuvola e calendario "ok" con l'ora dell'ultimo giro; nessun errore strano.
- [ ] Vetrina: popup, animazioni e notifiche si vedono tutti (solo esempi, non scrive niente).

Dopo il telefono, ripetere sull'iPad installazione, notifiche e scorrimento. I passi, le spunte e le serate scritte durante la prova si tolgono dal database prima del 23/11.

## Se il telefono di Lani cambia

Con un iPhone, il controllo del telefono passa da Family Link a Tempo di utilizzo di Apple: aggiungere ACE alla Home e consentire le notifiche anche lì.
