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
- Prima accensione: benvenuta di Lani e avvio dei genitori, come le bozze. Passi che salgono su Oggi e Astra (`vedi_saldo`). Frasi nei momenti (`frase_del_giorno`), PIN (`controlla_pin`), Da fotografare (richieste da `sync-nuvola`, bucket `foto-pagine`).
- Forzieri: enigmi a tipi (`data/enigmi.json`, `src/lib/enigmi`, funzione `enigma` con risolutore di controllo), aiutino dopo il primo errore, premio fermo a enigma comparso; immagini dei premi nel bucket privato `premi` (funzione `premi`, URL firmati: sagoma prima, vera con enigma risolto o forziere aperto).
- Genitori: settimana, gesti e sgridate (con popup del copione), premi ed enigmi, correzioni delle spunte, fogli, impostazioni e PIN.
- Grafica come le bozze (`design/*.html`) su Oggi, Pomeriggio, Sera, Astra, Figurina, Album, popup, Studio, Flash card e Quiz (Grafica 1-7b, tutto in `main`; flash card e quiz a tutto schermo, senza barra né "Genitori"). Kit in `src/kit.tsx`. Revisione UI applicata a tutte le schermate (anche Genitori): scala degli spazi 4/8/12/16/24/32, bordi 20/16/32, titoli 30/26/20/17, raggi 16/24/32/999, ombre `--ombra`, `--ombra-alta`, `--ombra-etichetta`. Foto di confronto con `npm run confronto` (in `docs/confronto/`). Niente config di Prettier: se serve, `--single-quote --print-width 180`.
- Prove: `npm test` (164), `npm run prova:schema` (70), `npm run prova:schermate` (Playwright, 63, Supabase finto). Le foto di `npm run confronto` sono stabili (movimento ridotto): servono per i confronti prima e dopo; la Sera alterna due foto anche senza cambiamenti.

## Ultima sessione (9 novembre 2026, pomeriggio)

Rami `grafica-3` (Benvenuta, Genitori-avvio, passi che salgono), `debiti` (PIN, frasi nei momenti, Da fotografare) ed `enigmi` (enigmi a tipi, immagini dei premi) uniti a `main` con tutte le prove verdi e le foto di confronto rigenerate. Migrazioni 0018-0023 applicate; funzioni `passi`, `sync-nuvola`, `enigma` e `premi` pubblicate; 18 immagini nel bucket `premi`. I 9 premi inseriti (il 7 cambiato in "Biglietti per una partita di pallavolo femminile di Serie A"). Prova sul database vero con l'identità di Lani: non vede file del bucket `premi`, righe di `forzieri` né premi. Nessuna chiamata vera all'IA.

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
| 9/11 | signore + Jarvis | Enigmi a tipi, uno per forziere e in salita (indovinello, codice, acrostico, matematico, anagramma, griglia, logica, rebus, cima); risolutore di controllo prima di salvare; aiutino dopo il primo errore. Immagini dei premi: sagoma da subito, vera con enigma risolto o forziere aperto, solo da bucket privato con URL firmati; premio cambiato = pacco regalo finché non arriva l'immagine nuova |
| 9/11 | signore | Premi dei 9 forzieri scelti (il 7: biglietti per una partita di Serie A, senza cena) |
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

Il piano della settimana è `docs/piano-fino-a-venerdi.md` (filoni A-J, rapporto di venerdì). In più, fino al 23/11:

1. **Enigmi**: la bozza dei 9 in `docs/enigmi-bozza.md` la controllano il signore e Jarvis (3 domande in fondo: parole chiave della cima nel biglietto o nell'aiutino; gatta senza bocca del 3 e "baffo" del 6; cima da rifare se cambia un premio). Dopo l'ok si salvano nel database (enigma, soluzione, aiutino, parola). Fino ad allora nel database c'è la prima versione e il 7 è vuoto.
2. Genitori: controllare orari e materiale nelle Impostazioni.
3. **Prova in famiglia**, prima su Android Chrome (Motorola di Lani: Home, push, tema scuro, scorrimento fino in fondo), poi l'iPad. Lista in `docs/07-installazione.md`.
4. Dal 23/11: primi passi, popup e figurine; il 29/11 alle 21:30 le prime chiavi (`sync_log` fonte chiavi). Primo giro di `sync-nuvola` con le richieste di foto: controllare `sync_log` e `richieste_foto` (solo conteggi).

Poi: riscatto della serie nera entro fine novembre; a inizio dicembre il CSV dei passi per la taratura (la simulazione la fa Jarvis). Dopo l'avvio: video, umore del giorno, "Materiali" in Studio, pagine probabili dalla mappa dei libri per le verifiche con il solo argomento.

Altri debiti: `spiega`, borsa, enigma, foto e push provati solo con le prove (serve un accesso di Lani); protezione delle password trapelate da accendere (la accende il signore).

## In attesa di

- Signore: sull'iPad rifare l'accesso su `ace-passino.vercel.app` quando vorrà provare (le anteprime hanno un'altra origine).

## Attenzione

- **Account**: ACE si apre con l'account personale, `claude-personal` (`C:\Users\messori\.local\bin\claude-personal.cmd`, accanto a `claude.exe`, imposta `CLAUDE_CONFIG_DIR=%USERPROFILE%\.claude-personal`). `~/.claude` resta all'account aziendale. In `.claude-personal` sono stati copiati `settings.json` e la cartella del progetto (`projects/C--progetti-ace-app`, memoria compresa); niente è stato cancellato da `~/.claude`: lo fa il signore dopo aver verificato. L'hook SessionStart del progetto (`.claude/settings.json` → `.claude/hooks/controlla-account.mjs`) avvisa, solo su Windows e senza bloccare, se ACE è aperta senza `.claude-personal`. Al primo avvio con `claude-personal` serve un nuovo accesso.
- Storage: `npx supabase storage cp --workdir C:\progetti\ace\app --remote --experimental --yes <file> ss:///<bucket>/<nome>` lanciato dalla cartella del file (con un percorso `C:\...` la CLI risponde "Unsupported operation"). Immagini dei premi: `premio-N.webp` e `premio-N-sagoma.webp` nella radice del bucket `premi`; dopo un'immagine nuova, `immagine_per = premio` per quel forziere.
- Iscrizioni chiuse in Supabase Auth: i nuovi utenti si creano dalla dashboard, con "Auto Confirm User" attivo.
- Gli avvisi di Supabase su `forzieri_lani` (vista security definer) e sulle 8 funzioni RPC (con `vedi_saldo`, `controlla_pin`, `frase_del_giorno`) sono voluti: vedi i commenti nello schema.
- `db push` sempre con `--remote --yes`; funzioni con `npx supabase functions deploy <nome> --use-api --yes`. Comandi composti (con `&&` o `|`) passano dal controllo automatico: `git push` e i deploy vanno lanciati da soli.
- Schema `0001`-`0023` applicati: le modifiche vanno in `0024` e successive. Cron attivi: sync-nuvola, sync-calendario, chiavi, notifiche. Le migrazioni con "cron" nel nome non girano su PGlite.
- Segreti: `NUVOLA_UTENTE`, `NUVOLA_PASSWORD`, `CRON_SEGRETO` (anche nel Vault come `cron_segreto`), `GOOGLE_CALENDAR_ICS_URL`, `ANTHROPIC_API_KEY`, `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`. La chiave VAPID pubblica serve anche al client.
- Nuvola: `/alunni` dà più schede; si usa anno più recente e id più alto (10928). Compiti, voti e lezioni non hanno id: chiavi costruite in `src/lib/nuvola`.
- Supabase rifiuta UPDATE e DELETE senza WHERE anche dentro le funzioni (safeupdate); PGlite no.
- Dati di prova sul database vero: ripulirli sempre (oggi `movimenti_passi`, spunte e `serate` sono a zero).
- Python non è installato su questo PC: `npm run simula` non parte.

## Come verificare

- `npm test`, `npm run prova:schema`, `npm run prova:schermate`, `npx tsc -p .`, `npm run build`.
- Supabase: `sync_log` (esiti delle sincronizzazioni), `cron.job`, avvisi di sicurezza, `schema_migrations` allineata.
