# HANDOFF

> **Dal 9 al 13 novembre 2026 si lavora con l'account Claude aziendale.** Prima di tutto leggi `docs/piano-fino-a-venerdi.md` (piano di Jarvis approvato dal signore): paletti su dati, Lani, regole e costi, strumenti da installare, filoni A-J e rapporto di venerdì in `docs/rapporto-venerdi.md`. L'avviso dell'hook sull'account aziendale è atteso questa settimana: non toglierlo.

## Dove siamo

**Sprint 1 costruito**: tutte le 8 tappe unite a `main` (produzione su `ace-passino.vercel.app`). Manca solo la prova completa in famiglia sui dispositivi veri. Il gioco parte il 23/11/2026 (`periodo.inizio`): prima di allora niente passi di voti e note, popup, figurine né chiavi.

- Nuvola: `sync-nuvola` alle 14:30 e 19:30 (cron `0003`): compiti, verifiche, voti, note, lezioni; passi di voti e note dal 23/11.
- Calendario di famiglia: `sync-calendario` ogni ora (cron `0007`), 14 giorni, ricorrenze espanse, "privato" escluso.
- Oggi: mattina (tre cose, passi di ieri, In famiglia) e pomeriggio (compiti in ordine, il più lungo prima). Sera: compiti, cartella dall'orario + materiale del giorno, borsa dal calendario, fogli, Domani in famiglia. L'app si apre su Sera da un'ora prima della chiusura.
- Studio: `genera-studio` (lanciata da sync-nuvola) fa il piano di ripasso e, con Claude, 10-15 flash card e 8-10 domande per verifica (max 3 nuove a giro); Studio con sessioni, carte del giorno, quiz; lampadina "Non ho capito" (`spiega`). Video rimandati (manca l'elenco dei video).
- Astra: percorso con Sei qui, forzieri (stato aggiornato dal server dopo ogni passo: `_shared/forzieri.ts`), enigma (`enigma`: genera per i genitori, rispondi per Lani), chiavi della domenica 21:30 (`chiavi`, cron `0010`, con rimonta), Figurina e Album.
- Copione: popup accodati dal server (`_shared/popup.ts`, uno per evento) per voti, note, tappe, forzieri, chiavi, verifiche nuove; un popup per apertura; figurine sbloccate dalla prima comparsa; notifiche push ogni 15 minuti (`notifiche`, cron `0014`). Prima del 23/11 niente popup né figurine.
- Prima accensione: benvenuta di Lani (3 schermate, una volta per dispositivo) e avvio dei genitori (4 cose con lo stato vero).
- Genitori: settimana, gesti e sgridate (con popup del copione), premi ed enigmi, correzioni delle spunte, fogli, impostazioni e PIN.
- Grafica come le bozze (`design/*.html`) su Oggi, Pomeriggio, Sera, Astra, Figurina, Album, popup, Studio, Flash card e Quiz (Grafica 1-7b, tutto in `main`; flash card e quiz a tutto schermo, senza barra né "Genitori"). Kit in `src/kit.tsx`. Revisione UI applicata a tutte le schermate (anche Genitori): scala degli spazi 4/8/12/16/24/32, bordi 20/16/32, titoli 30/26/20/17, raggi 16/24/32/999, ombre `--ombra`, `--ombra-alta`, `--ombra-etichetta`. Mancano Benvenuta e Genitori-avvio. Foto di confronto con `npm run confronto` (in `docs/confronto/`). Niente config di Prettier: se serve, `--single-quote --print-width 180`.
- Prove: `npm test` (129), `npm run prova:schema` (35), `npm run prova:schermate` (Playwright, 40, Supabase finto). Le foto di `npm run confronto` sono stabili (movimento ridotto): servono per i confronti prima e dopo; la Sera alterna due foto anche senza cambiamenti.

## Ultima sessione (9 novembre 2026)

Ramo `grafica` (passi 1-5 e ritocchi di Jarvis) e poi `grafica-2` uniti a `main` con tutte le prove verdi. In `grafica-2`: Studio (Lani pensierosa, carte delle verifiche con "fra N giorni", pallini e pulsante, Le tue carte; "Materiali" della bozza rimandato), Flash card e Quiz (testata "← Studio" con barra, esiti affiancati, regole dei passi dal config, "Giusto!"). Pallini delle sessioni come le bozze anche nel Pomeriggio. Correzioni di Jarvis (7b): esiti visibili e disattivati finché la carta non si gira, tutto schermo, regola del quiz in percentuale. Lista dei controlli della prova in famiglia in `docs/07-installazione.md`.

Poi la revisione UI approvata (ramo `revisione-ui-2`, 17 commit): harden (popup in `<dialog>`, contrasti, focus, nome del forziere, barra del quiz), CSS pulito con le foto identiche pixel per pixel, regole 1-4, note di ogni schermata (Sera con la firma in alto, Genitori con 4 schede più Altro e foglio dell'app al posto di prompt/confirm, Oggi con la pillola di Bart, Astra con la testata che si compatta, Album con le figurine da prendere raccolte per momento, Figurina "come prima"), copione aggiornato (il testo non ripete il titolo, singolare e plurale con `{n:una:# più}`, "Evviva!" su forziere e cima, regola corta del quiz per Lani e completa nella Vetrina). In chiusura: bagno "−1. Ora: asciugamani appesi…", nota di merito confermata nella forma nuova, funzioni del copione ripubblicate; separazione degli account (vedi Attenzione).

## Decisioni prese

| Data | Chi | Decisione |
|---|---|---|
| 7/11 | signore | Storno delle spunte corrette: movimento opposto esatto, non malus, solo prima delle chiavi della domenica; l'imbroglio voluto è la sgridata "balla −10" |
| 7/11 | signore | Compito rifatto dopo uno storno: 10 passi base senza anticipo, motivo `compito_rifatto`, una volta sola, prima delle chiavi |
| 7/11 | signore | Lani entra con la sua Gmail (`leilani.messori4@gmail.com`) e password lunga, sessione persistente, niente PIN |
| 7/11 | signore | Ogni genitore ha il suo account; un PIN condiviso (hash bcrypt) protegge l'area genitori sui dispositivi di Lani |
| 7/11 | signore | R-Evolution nascosta nello sprint 1 (barra a 4 voci); arriverà con un popup di annuncio |
| 7/11 | signore | Icona provvisoria: pallone su fucsia; alternative Lani che saluta e il passo, sceglie Lani alla prima prova |
| 7/11 | signore | Vercel: progetto `ace`, indirizzo `ace-passino.vercel.app`, `noindex`, anteprime sui push e produzione dal merge su `main`; protezione delle anteprime tolta (8/11) |
| 7/11 | signore | Fogli da firmare: Lani segna "L'ho dato" (`dato_il`), i passi arrivano con la conferma del genitore |
| 7/11 | signore | Config: `video_frazione_minima_vista` 0.95 (regola del 95% di Jarvis) |
| 7/11 | Jarvis | Schema `0001` approvato con correzione: ore delle spunte di Lani messe dal server (`timbra_ora`), `flashcard_giri.iniziato_il` |
| 8/11 | signore | Lani non prova l'app prima: sorpresa ad app finita. Le prove sui dispositivi le fanno i genitori |
| 8/11 | signore | Il lunedì Lani va a scuola con la borsa di pallavolo (pulmino Revolution da scuola) e la cartellina di tecnologia; niente "diario e astuccio" fisso |
| 8/11 | signore | Claude lavora da solo con prove automatiche; può pubblicare funzioni e applicare migrazioni (permesso aggiunto) |
| 9/11 | Jarvis + signore | Riservatezza di `popup_coda` e figurine: va bene così |
| 9/11 | Jarvis + signore | Confermate (già fatte e ricontrollate nel codice il 9/11): studio facoltativo a caselle `tipo:AAAA-MM-GG:1..4` per flash card, video e quiz; enigma con tentativo atomico (`tenta_enigma`, 0016); `voto_corretto` con la sola differenza; "Annulla" per 5 secondi; figurine dei forzieri (prima le 4 di Leo, poi le altre non prese, senza serie nera; la cima dà lani-cima); nota di merito nel copione (con test); obiettivo 7,35; pg_net in extensions (0015); Sonnet 5.5 per genera-studio ed enigma, Opus 5.5 per spiega; push ai genitori alla prima sincronizzazione fallita di fila |
| 9/11 | Jarvis + signore | Venerdì e sabato: chiusura solo se il giorno dopo c'è una partita (breve, solo borsa, 20:30 o mezz'ora prima dello sport). Corretto il caso dello sport senza partita il giorno dopo: niente chiusura |
| 9/11 | signore | In questo repository i commit sono di `Alessandro Messori <shin.sekai3@gmail.com>` (config locale, dai prossimi commit; la storia non si riscrive) |
| 9/11 | signore | Protezione delle password trapelate: la accende il signore dal pannello, se il piano la prevede |
| 9/11 | signore | Frasi nei momenti: al massimo una al giorno, la prende il primo momento che la chiede (di solito il mattino; con una verifica domani si tiene per la Sera). Foto delle pagine: +2 a Lani per richiesta solo se la foto l'ha caricata lei; le foto dei genitori chiudono la richiesta senza passi |
| 9/11 | signore | Passi che salgono nell'app, non solo nella Vetrina: su Oggi e Astra, se il saldo è cambiato dall'ultima volta che Lani l'ha visto, il numero va dal vecchio al nuovo in circa un secondo con un "+N" che svanisce; ultimo saldo visto nel database (vale su telefono e iPad); niente animazione con prefers-reduced-motion |
| 9/11 | signore + Jarvis | Revisione UI approvata tutta (harden, CSS pulito, regole 1-4, note di ogni schermata). Testi: il popup non ripete il titolo; "Evviva!" su forziere e cima; Sera "Chiudi tutto e Bart va a dormire."; Studio "Finiti i compiti, flash card e quiz valgono passi" nella prima carta; quiz per Lani "Quasi tutte giuste al primo colpo: 10 passi."; "C'è un errore in questa carta"; Figurina "come prima"; Album "In arrivo con… (n)"; singolare e plurale giusti. Il popup del voto insufficiente resta com'è |

## Scelte di Claude approvate (revisione di Jarvis, 8/11, approvata dal signore)

- Voti e note danno passi solo dal 23/11 (`periodo.inizio`); i voti di prima contano solo come "precedente".
- Verifica = evento di tipo VERIFICA/Compito in classe o con "verifica/interrogazione/prova" nel nome; materia dal nome o dal docente con una materia sola (2 su 16 restano senza materia). Voti: "7½" = 7,5, "+" e "−" = ±0,25; giudizi saltati.
- Borsa: la sera prima di un allenamento o partita di Lani (titolo con Lani/Leilani, senza "assente"); "la porti a scuola" se inizia prima delle 16 in un giorno di scuola. Voci fisse: divisa, ginocchiere, scarpe, borraccia.
- Chiusura: base dom 20:00, lun-gio 20:30 (`impostazioni.ora_chiusura`); venerdì e sabato niente, salvo partita il giorno dopo: chiusura breve con la sola borsa alle 20:30 (`ora_chiusura_breve`); con sport dopo le 17 si chiude mezz'ora prima. App su Sera da un'ora prima.
- Compiti in ordine di "peso" stimato dal testo (pagine ed esercizi negli intervalli).
- Spunte di Lani: "Annulla" per 5 secondi dopo ogni spunta (compiti, cartella, borsa, fogli), prima dell'invio; dopo, la correzione è dei genitori.
- Piano di ripasso: con 4+ giorni rilettura, flash card e mappa, quiz, quiz sugli errori; con 3 si toglie la mappa, con 2 rilettura e quiz, con 1 solo quiz; niente sessioni nei giorni di partita. Quiz breve della sera prima = domande sbagliate dell'ultimo tentativo (max 5).
- Astra: mondo dalla tappa (1-7 colline, 8-14 montagne, 15-21 nuvole, 22-27 spazio), non dal mese. Note che tolgono la seconda chiave: disciplinari e didattiche (non merito né altro). Obiettivo liceo 7,35 (`impostazioni.obiettivo_media`). Figurine dei forzieri: prima leo-tennis, leo-copertina, leo-dispiaciuto, leo-partita-persa, poi le altre non ancora sbloccate (no serie nera; detective, sorpresa, leo-gamer e bart-festeggia arrivano nel loro momento); la cima dà lani-cima. Serie nera = pose arrabbiate e dispettose. Tentativi dell'enigma (3) aggiunti a `config.enigma`.
- Copione: popup più vecchi di 3 giorni non si mostrano; variante "voto_7_senza_ripasso" e "verifica_nuova_una" (il copione ha solo la forma con {n}); nota di merito: "Nota di merito in {materia}: +50. Questa va sul frigo." (mamma-festeggia). Notifiche: 7:00, 14:45 se ci sono compiti nuovi per domani, all'ora della chiusura, sollecito 45 minuti dopo se mancano compiti o cartella, riepilogo ai genitori domenica 21:45.
- Revisione di Jarvis, fatto: studio facoltativo a caselle (`flashcard:AAAA-MM-GG:1..4`, niente quinta neanche con invii simultanei); enigma con tentativo atomico (`tenta_enigma`); voto corretto dal docente = movimento `voto_corretto` con la differenza (riferimento id del voto + nuovo valore); avviso push ai genitori alla prima sincronizzazione fallita di fila (Nuvola e calendario, `_shared/push.ts`); modelli: Sonnet 5.5 per genera-studio ed enigma, Opus 5.5 per spiega; pg_net nello schema extensions (0015). Obiettivo liceo 7,35. Protezione delle password trapelate: la accende il signore.
- Flash card: sapevo raddoppia l'intervallo, quasi torna domani, non sapevo riparte da 1; 12 carte del giorno a giro.

## Prossimo passo

Ordine dei lavori fino al 23/11 (Jarvis, 9/11, approvato dal signore):

1. ~~Vetrina~~ fatta (9/11): scheda Vetrina nell'area genitori (`src/Vetrina.tsx`, popup da `PopupVista`), foto di ogni popup in `docs/confronto/vetrina/`. "Passi che salgono" non esiste nell'app: da decidere se farla.
2. ~~Revisione con Impeccable~~ fatta (9/11): rapporto in `docs/revisione-ui.md` (critique 27/40, audit 14/20), contesto in `PRODUCT.md`. Impeccable installato nel progetto (`.claude/skills/`, `.claude/agents/`, fuori dal repo), telemetria spenta, hook tolti da `.claude/settings.local.json`. Approvata e applicata il 9/11 (vedi Ultima sessione).
3. ~~Grafica di Benvenuta e Genitori-avvio~~ e **passi che salgono**: fatti nel ramo `grafica-3` (9/11), tutte le prove verdi. Saldo visto in `0018_saldo_visto.sql` (`saldo_visto`, `vedi_saldo()`), contatore in `src/Contapassi.tsx`, pillola del saldo nella testata di Oggi. 0018 applicata e `grafica-3` unito a `main` il 9/11.
4. ~~Debiti prima dell'avvio~~ fatti nel ramo `debiti` (9/11), prove verdi (142 unitarie, 59 schema, 59 schermate). 0019-0021 applicate, funzioni `passi` e `sync-nuvola` pubblicate, `debiti` unito a `main` il 9/11.
   - PIN: `controlla_pin` (0019) dice sbagliato, bloccato, manca, non genitore; messaggio a parte per gli errori del server.
   - Frasi: `frase_del_giorno` (0020). La prima richiesta del giorno prende il momento. Mattina (apertura, il lunedì inizio settimana) salvo verifica domani, che si tiene la frase per la Sera; Sera a chiusura finita; popup di tappa, lucchetto e cima se la frase del giorno non è ancora uscita. Frasi di famiglia nelle Impostazioni.
   - Da fotografare: richieste solo da pagine scritte nel compito o nella verifica (la mappa dei libri per il solo argomento non c'è ancora); push ai genitori; +2 a Lani per richiesta solo se la foto è sua, le foto dei genitori chiudono la richiesta senza passi.
5. ~~Premi~~ inseriti il 9/11 (lista del signore; il 7 poi cambiato in "Biglietti per una partita di pallavolo femminile di Serie A", enigma svuotato). Gli enigmi nel database sono ancora la prima versione, da sostituire. Genitori: controllare orari e materiale nelle Impostazioni.
5b. **Enigmi a tipi e immagini dei premi** (approvati dal signore il 9/11), ramo `enigmi`, prove verdi (164 unitarie, 70 schema, 63 schermate):
   - `data/enigmi.json` (9 tipi in salita, regole, esempi), `src/lib/enigmi` (parti meccaniche fatte dal codice), funzione `enigma` a tipi con risolutore di controllo (3 giri, poi push), aiutino dopo il primo errore, premio fermo a enigma comparso anche sulla tabella (0022), biglietto a larghezza fissa, esempi nella Vetrina.
   - **Bozza dei 9 enigmi in `docs/enigmi-bozza.md`: la controllano il signore e Jarvis** (3 domande in fondo). Dopo l'ok Claude li salva nel database (enigma, soluzione, aiutino, parola).
   - Immagini: bucket privato `premi` (0023), funzione `premi` con URL firmati (sagoma prima, vera con enigma risolto o forziere aperto), pacco regalo se il premio è cambiato (`immagine_per`). Originali in `C:\progetti\ace\asset\premi\pronte\`, fuori dal repo.
   - **Da pubblicare, in quest'ordine** (bloccato dal controllo automatico): `npx supabase db push --remote --yes` (0022-0023); `npx supabase functions deploy enigma --use-api --yes` e `... deploy premi --use-api --yes`; caricare le 18 immagini con `npx supabase storage cp --remote --experimental <file> ss:///premi/<nome>` (nella radice del bucket: `premio-N.webp`, `premio-N-sagoma.webp`); `update forzieri set immagine_per = premio` (le 9 immagini sono dei premi attuali, la 7 è già quella dei biglietti); prova di sicurezza sul database vero (Lani non legge `storage.objects` del bucket `premi`); poi unire `enigmi` a `main`. Prima della 0022 non unire: Astra chiede la colonna `aiutino`.
6. **Prova in famiglia**, prima su Android Chrome (il telefono di Lani è un Motorola: Home, push, tema scuro di sistema acceso, scorrimento fino in fondo su ogni schermata), poi l'iPad. Lista dei controlli in `docs/07-installazione.md`.
7. Dal 23/11: controllare i primi passi, popup e figurine; il 29/11 alle 21:30 le prime chiavi (`sync_log` fonte chiavi).

Poi: entro fine novembre il riscatto della serie nera. A inizio dicembre uno script che esporta i passi veri per giorno e per motivo in CSV: la simulazione la fa Jarvis (Python non è su questo PC). Dopo l'avvio: video, umore del giorno, "Materiali" in Studio.

Altri debiti: `spiega`, borsa, enigma e push provati solo con le prove (serve un accesso di Lani); protezione delle password trapelate da accendere (Auth, dashboard: la accende il signore).

## In attesa di

- Signore: sull'iPad rifare l'accesso su `ace-passino.vercel.app` quando vorrà provare (le anteprime hanno un'altra origine).

## Attenzione

- **Account**: ACE si apre con l'account personale, `claude-personal` (`C:\Users\messori\.local\bin\claude-personal.cmd`, accanto a `claude.exe`, imposta `CLAUDE_CONFIG_DIR=%USERPROFILE%\.claude-personal`). `~/.claude` resta all'account aziendale. In `.claude-personal` sono stati copiati `settings.json` e la cartella del progetto (`projects/C--progetti-ace-app`, memoria compresa); niente è stato cancellato da `~/.claude`: lo fa il signore dopo aver verificato. L'hook SessionStart del progetto (`.claude/settings.json` → `.claude/hooks/controlla-account.mjs`) avvisa, solo su Windows e senza bloccare, se ACE è aperta senza `.claude-personal`. Al primo avvio con `claude-personal` serve un nuovo accesso.
- Iscrizioni chiuse in Supabase Auth: i nuovi utenti si creano dalla dashboard, con "Auto Confirm User" attivo.
- Gli avvisi di Supabase su `forzieri_lani` (vista security definer) e sulle 8 funzioni RPC (con `vedi_saldo`, `controlla_pin`, `frase_del_giorno`) sono voluti: vedi i commenti nello schema.
- `db push` sempre con `--remote --yes`; funzioni con `npx supabase functions deploy <nome> --use-api --yes`. Comandi composti (con `&&` o `|`) passano dal controllo automatico: `git push` e i deploy vanno lanciati da soli.
- Schema `0001`-`0021` applicati (0022-0023 nel ramo `enigmi`, da applicare): le modifiche nuove vanno in `0024` e successive. Cron attivi: sync-nuvola, sync-calendario, chiavi, notifiche. Le migrazioni con "cron" nel nome non girano su PGlite.
- Segreti: `NUVOLA_UTENTE`, `NUVOLA_PASSWORD`, `CRON_SEGRETO` (anche nel Vault come `cron_segreto`), `GOOGLE_CALENDAR_ICS_URL`, `ANTHROPIC_API_KEY`, `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`. La chiave VAPID pubblica serve anche al client.
- Nuvola: `/alunni` dà più schede; si usa anno più recente e id più alto (10928). Compiti, voti e lezioni non hanno id: chiavi costruite in `src/lib/nuvola`.
- Supabase rifiuta UPDATE e DELETE senza WHERE anche dentro le funzioni (safeupdate); PGlite no.
- Dati di prova sul database vero: ripulirli sempre (oggi `movimenti_passi`, spunte e `serate` sono a zero).
- Python non è installato su questo PC: `npm run simula` non parte.

## Come verificare

- `npm test`, `npm run prova:schema`, `npm run prova:schermate`, `npx tsc -p .`, `npm run build`.
- Supabase: `sync_log` (esiti delle sincronizzazioni), `cron.job`, avvisi di sicurezza, `schema_migrations` allineata.
