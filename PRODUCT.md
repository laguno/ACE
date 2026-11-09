# Product

## Register

product

## Platform

web

## Users

Lani, 12 anni, seconda media, pallavolista. Usa ACE sul telefono (Android) e sull'iPad, nei tre momenti della giornata: la mattina prima di uscire (le tre cose da ricordare), il pomeriggio per i compiti e il ripasso, la sera per preparare cartella e borsa. Il lavoro da fare su ogni schermata è uno solo e concreto: spuntare quello che ha fatto, studiare 15 minuti, vedere quanto manca alla prossima tappa.

Gli utenti secondari sono i genitori, Alessandro e Lucrezia: usano l'area genitori (dietro un PIN sui dispositivi di Lani) per segnare gesti e sgridate, scegliere i premi, correggere le spunte e controllare la settimana.

## Product Purpose

ACE accompagna Lani verso il Liceo Scientifico Sportivo: tiene insieme compiti (da Nuvola), verifiche con il piano di ripasso, la preparazione della sera e il calendario di famiglia, e trasforma la costanza in un gioco a percorso ("Astra") con passi, tappe, forzieri e figurine. È un'app solo familiare, non un prodotto pubblico. Successo vuol dire che Lani la apre da sola ogni giorno, chiude la sera senza dimenticanze e arriva alle verifiche con il ripasso già fatto.

## Positioning

L'unica app che sa cosa deve fare Lani oggi, nell'ordine giusto, e glielo dice con la voce di casa.

## Brand Personality

Affettuosa, vivace, chiara. Parla in italiano di casa, dà del tu, non usa parole da adulti e non umilia mai: loda il gesto e non la persona, sui voti brutti guarda avanti con il piano, il rimprovero riguarda il fatto e dice la cosa da fare subito. Popup brevi (titolo di 4 parole al massimo, testo di 25 al massimo), niente emoji, numeri veri. Il tono visivo è quello del kit "zucchero filato" di `design/Stile.html`: la famiglia disegnata come sticker è il cuore emotivo dell'app.

## Anti-references

Non deve sembrare un registro elettronico o un gestionale scolastico (tabelle grigie, densità, linguaggio burocratico), né un'app per bambini piccoli (eccessi infantili, testi gridati), né un'app di produttività per adulti fredda e neutra. Niente meccaniche che mettono ansia: niente classifiche, niente conti alla rovescia minacciosi, niente rimproveri nelle notifiche.

## Design Principles

1. **Le bozze comandano.** `design/*.html` e `design/Stile.html` sono la fonte autorevole: sticker grandi degli avatar che sbordano dalle testate e dai popup, riquadri colorati con le icone Phosphor, pillole, sfondo che cambia con il momento (mattina azzurro, pomeriggio lilla, sera lilla scuro, Astra viola) sono scelte volute, non difetti.
2. **Una cosa alla volta.** Ogni schermata ha un compito principale e lo mette in cima; un popup per apertura.
3. **La costanza si vede.** Ogni spunta ha una conseguenza visibile (passi, barra, tappa), ma i numeri del gioco li decide il server, mai Lani.
4. **Calore senza rumore.** Il carattere viene dalla famiglia disegnata e dai colori del kit, non da animazioni o decorazioni in più.
5. **Lani non si sente controllata.** I genitori correggono e premiano dalla loro area; davanti a Lani resta solo quello che la aiuta.

## Accessibility & Inclusion

Mobile first a 390 px (prova anche a 360 px), bersagli tattili di almeno 44 px, contrasto di almeno 4,5:1 sul testo, `prefers-reduced-motion` rispettato (coriandoli ed entrate spenti). Tema chiaro sempre, anche con il tema scuro di sistema acceso (`color-scheme: light only`). Testi in italiano semplice, adatti a una dodicenne.
