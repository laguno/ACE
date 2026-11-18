import type { Config } from './index';

// "Come si fanno i passi": la pagina di Astra (per Lani) e le regole complete dei genitori.
// Ogni numero arriva dal config passato: nessun valore scritto qui (prova in come-passi.test.ts).
// Testi in docs/05-copione.md ("Come si fanno i passi"), approvati dal signore il 15/11; icone e
// spiegazioni di ogni voce (il glossario, gesti di casa uno per uno) approvate il 18/11.

/** Nome di un'icona Phosphor: la pagina la disegna in un riquadro colorato (ComePassi.tsx). */
export type Icona =
  | 'Notebook' | 'Backpack' | 'Handbag' | 'Signature' | 'ArrowsClockwise' | 'Camera'
  | 'Cards' | 'PlayCircle' | 'ListChecks'
  | 'Star' | 'TrendUp' | 'ArrowFatLineUp' | 'PuzzlePiece' | 'Certificate'
  | 'Timer' | 'Volleyball' | 'Trophy' | 'Armchair'
  | 'Desk' | 'ForkKnife' | 'Bed' | 'TShirt'
  | 'Warning' | 'NoteBlank' | 'Shower' | 'HandPalm' | 'ChatCircleSlash';
export type Voce = { testo: string; valore: string; icona?: Icona; spiega?: string };
export type Blocco = { id: string; titolo: string; posa: string; cartella?: string; riga?: string; voci: Voce[]; dettagli: string[] };

/** Gesti di casa, una riga per gesto (18/11): nome, icona e cosa vuol dire fatto. */
const GESTI: Record<string, { testo: string; icona: Icona; spiega: string }> = {
  scrivania: { testo: 'Scrivania in ordine', icona: 'Desk', spiega: 'Piano libero, libri e penne al loro posto.' },
  lavastoviglie: { testo: 'Lavastoviglie', icona: 'ForkKnife', spiega: 'La carichi o la svuoti senza che te lo chiedano.' },
  letto: { testo: 'Letto fatto', icona: 'Bed', spiega: 'Lenzuola tirate e cuscino a posto, prima di uscire.' },
  vestiti: { testo: 'Vestiti in ordine', icona: 'TShirt', spiega: 'Piegati nell’armadio o nel cesto, non sulla sedia.' },
};

const piu = (n: number) => `+${n}`;
const meno = (n: number) => `−${Math.abs(n)}`;
const cento = (x: number) => `${Math.round(x * 100)}%`;

export function blocchiPassi(c: Config, opzioni: { rEvolution: boolean }): Blocco[] {
  const p = c.passi;
  const o = p.obbligatori;
  const f = p.studio_facoltativo;
  const v = p.voti;
  const quiz = Object.entries(f.quiz.tentativi) as [string, number[]][];
  const gesti = p.gesti_casa;
  const blocchi: Blocco[] = [
    {
      id: 'ogni-giorno',
      titolo: 'Ogni giorno',
      posa: 'lani-buongiorno',
      voci: [
        { testo: 'Compiti per domani fatti', valore: piu(o.compiti), icona: 'Notebook', spiega: 'Tutti gli esercizi di Nuvola, poi la spunta in Pomeriggio.' },
        { testo: 'Cartella pronta la sera', valore: piu(o.cartella), icona: 'Backpack', spiega: 'Libri e quaderni di domani dentro, con la lista di Sera.' },
        { testo: 'Borsa pronta per allenamento o partita', valore: piu(o.borsa), icona: 'Handbag', spiega: 'Divisa, scarpe e borraccia, la sera prima.' },
        { testo: 'Foglio da firmare consegnato', valore: piu(o.fogli), icona: 'Signature', spiega: 'Lo dai a mamma o papà, poi lo riporti a scuola firmato.' },
        { testo: 'Ripasso prima di una verifica', valore: piu(o.ripasso), icona: 'ArrowsClockwise', spiega: 'La sessione di Studio nel giorno previsto.' },
        { testo: 'Foto delle pagine che ACE ti chiede', valore: piu(p.foto_compito), icona: 'Camera', spiega: 'Fotografi le pagine richieste, tutte in una volta.' },
      ],
      dettagli: [
        `Compiti fatti almeno ${p.compiti_anticipo.giorni_prima_min} giorni prima: ${Math.round(o.compiti * p.compiti_anticipo.moltiplicatore)} invece di ${o.compiti}. La serie in anticipo arriva al massimo a fine settimana.`,
        `Per la foto: ${piu(p.foto_compito)} una volta per richiesta, quante che siano le pagine.`,
      ],
    },
    {
      id: 'studio',
      titolo: 'Studio in più',
      posa: 'lani-concentrata',
      riga: `Solo dopo i compiti del giorno, al massimo ${f.max_al_giorno_per_tipo} al giorno per tipo.`,
      voci: [
        { testo: 'Giro di flash card', valore: piu(f.flashcard_giro), icona: 'Cards', spiega: `Leggi, pensi la risposta, giri la carta dopo ${f.flashcard_secondi_prima_di_girare} secondi.` },
        { testo: 'Video visto fino in fondo', valore: piu(f.video_completo), icona: 'PlayCircle', spiega: 'Lo guardi tutto, senza saltare.' },
        { testo: 'Quiz al primo tentativo', valore: piu(quiz[0][1][0]), icona: 'ListChecks', spiega: 'Più risposte giuste al primo giro, più passi.' },
      ],
      dettagli: [
        `Ogni flash card si gira dopo ${f.flashcard_secondi_prima_di_girare} secondi.`,
        `Quiz: con almeno il ${cento(f.quiz.soglia_giuste)} giusto, ${quiz.map(([t, [si]]) => `${t.replace('+', '')}° tentativo${t.endsWith('+') ? ' e dopo' : ''} ${piu(si)}`).join(', ')}; sotto, ${quiz.map(([, [, no]]) => piu(no)).join(', ')}.`,
      ],
    },
    {
      id: 'voti',
      titolo: 'Voti e traguardi',
      posa: 'lani-festeggia',
      voci: [
        ...(Object.entries(v).filter(([k]) => /^\d/.test(k)) as [string, number][]).reverse().map(([k, n], i) => ({ testo: `Voto da ${k.replace('-', ' o ')}`, valore: piu(n), icona: 'Star' as const, ...(i === 0 ? { spiega: 'Arrivano da soli da Nuvola.' } : {}) })),
        { testo: 'Voto migliore del precedente, almeno 6', valore: piu(v.migliorato_almeno_6), icona: 'TrendUp', spiega: 'Più alto dell’ultimo voto nella stessa materia.' },
        { testo: 'Sufficienza dopo un’insufficienza', valore: piu(v.recupero_dopo_insufficienza), icona: 'ArrowFatLineUp', spiega: 'Torni sopra il 6 dopo un voto sotto.' },
        { testo: 'Enigma del forziere risolto', valore: piu(p.enigma_risolto), icona: 'PuzzlePiece', spiega: `Lo trovi in Astra vicino al forziere: ${c.enigma.tentativi} tentativi.` },
        { testo: 'Nota di merito', valore: piu(p.nota_merito), icona: 'Certificate', spiega: 'La scrive un prof quando fai una cosa bella.' },
      ],
      dettagli: [
        'Un voto basso non toglie passi: si guarda avanti con il piano.',
        `Enigma: ${c.enigma.tentativi} tentativi.`,
        `Pagella del primo quadrimestre: ${piu(p.pagella_primo_quadrimestre.media_7)} con la media del 7, ${piu(p.pagella_primo_quadrimestre.media_7_5)} con il 7 e mezzo. Una materia che torna sufficiente: ${piu(p.materia_da_insufficiente_a_sufficiente_in_pagella)}.`,
      ],
    },
  ];
  if (opzioni.rEvolution)
    blocchi.push({
      id: 'r-evolution',
      titolo: 'R-Evolution',
      posa: 'lani-divisa',
      voci: [
        { testo: 'Dieci minuti di allenamento', valore: piu(o.dieci_minuti), icona: 'Timer', spiega: `Il timer di Oggi fino in fondo, dalle ${c.dieci_minuti.finestra.da} alle ${c.dieci_minuti.finestra.a}.` },
        { testo: 'Partita giocata', valore: piu(p.partite.giocata), icona: 'Volleyball', spiega: 'Dopo la partita rispondi a “Com’è andata?”.' },
        { testo: 'Partita vinta, in più', valore: piu(p.partite.vinta_in_piu), icona: 'Trophy', spiega: 'In più, se la squadra vince.' },
        { testo: 'In panchina tutta la partita', valore: piu(p.partite.panchina), icona: 'Armchair', spiega: 'Vale anche se resti in panchina.' },
      ],
      dettagli: [
        `I dieci minuti valgono solo finiti, dalle ${c.dieci_minuti.finestra.da} alle ${c.dieci_minuti.finestra.a}.`,
        `Vinta stando in panchina: ${piu(p.partite.panchina_vinta_in_piu)} in più.`,
      ],
    });
  blocchi.push(
    {
      id: 'casa',
      titolo: 'Gesti di casa',
      posa: 'mamma-pollice',
      riga: 'Li danno mamma e papà quando li notano, non si chiedono.',
      voci: Object.entries(gesti.voci).map(([voce, n]) => ({ ...(GESTI[voce] ?? { testo: voce }), valore: piu(n) })),
      dettagli: [`Al massimo ${piu(gesti.tetto_giornaliero)} al giorno.`],
    },
    {
      id: 'meno',
      titolo: 'Cosa fa perdere passi',
      posa: 'papa-ci-pensiamo',
      voci: [
        { testo: 'Nota disciplinare', valore: meno(p.malus.nota_disciplinare), icona: 'Warning', spiega: 'La scrive un prof per il comportamento.' },
        { testo: 'Tre note per dimenticanza', valore: meno(p.malus.note_dimenticanza_ogni_3), icona: 'NoteBlank', spiega: 'Ogni tre volte che a scuola manca qualcosa.' },
        { testo: 'Bagno in disordine dopo la doccia', valore: meno(p.malus.bagno), icona: 'Shower', spiega: 'Asciugamano appeso, niente vestiti per terra.' },
        ...(opzioni.rEvolution ? [{ testo: 'Gesto antisportivo in campo', valore: meno(p.malus.antisportivo), icona: 'HandPalm' as const, spiega: 'Con compagne, avversarie o arbitro.' }] : []),
        { testo: 'Balla o imbroglio', valore: meno(p.malus.balla_o_imbroglio), icona: 'ChatCircleSlash', spiega: 'Dire una cosa non vera, o spuntare una cosa non fatta.' },
      ],
      dettagli: ['Il saldo non va mai sotto zero. Una spunta sbagliata tolta da mamma o papà non è un castigo: si torna com’era.'],
    },
    {
      id: 'chiavi',
      titolo: 'Chiavi e forzieri',
      posa: 'mazzo-chiavi',
      cartella: 'oggetti',
      riga: 'Ogni domenica sera, da zero a tre chiavi. Le chiavi aprono i forzieri.',
      voci: [
        { testo: 'Prima chiave: passi di ogni giorno', valore: cento(c.chiavi_settimana.soglia_passi_prima) },
        { testo: 'Seconda chiave: nessuna nota', valore: 'zero note' },
        { testo: 'Terza chiave: cose fatte', valore: cento(c.chiavi_settimana.soglia_cose_terza) },
      ],
      dettagli: [
        `Prima chiave con almeno il ${cento(c.chiavi_settimana.soglia_passi_prima)} dei passi di ogni giorno; seconda se in più non ci sono note; terza con almeno il ${cento(c.chiavi_settimana.soglia_cose_terza)} delle cose fatte.`,
        'Lo studio in più dà passi, non chiavi.',
        `Forzieri: ${c.forzieri.map((z) => z.chiavi).join(', ')} chiavi.`,
      ],
    },
  );
  return blocchi;
}
