import type { Config } from './index';

// "Come si fanno i passi": la pagina di Astra (per Lani) e le regole complete dei genitori.
// Ogni numero arriva dal config passato: nessun valore scritto qui (prova in come-passi.test.ts).
// Testi proposti in docs/05-copione.md ("Come si fanno i passi"), da approvare dal signore.

export type Voce = { testo: string; valore: string };
export type Blocco = { id: string; titolo: string; posa: string; cartella?: string; riga?: string; voci: Voce[]; dettagli: string[] };

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
  const unGesto = Object.values(gesti.voci)[0];
  const blocchi: Blocco[] = [
    {
      id: 'ogni-giorno',
      titolo: 'Ogni giorno',
      posa: 'lani-buongiorno',
      voci: [
        { testo: 'Compiti per domani fatti', valore: piu(o.compiti) },
        { testo: 'Cartella pronta la sera', valore: piu(o.cartella) },
        { testo: 'Borsa pronta per allenamento o partita', valore: piu(o.borsa) },
        { testo: 'Foglio da firmare consegnato', valore: piu(o.fogli) },
        { testo: 'Ripasso prima di una verifica', valore: piu(o.ripasso) },
        { testo: 'Foto delle pagine che ACE ti chiede', valore: piu(p.foto_compito) },
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
        { testo: 'Giro di flash card', valore: piu(f.flashcard_giro) },
        { testo: 'Video visto fino in fondo', valore: piu(f.video_completo) },
        { testo: 'Quiz al primo tentativo', valore: piu(quiz[0][1][0]) },
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
        ...(Object.entries(v).filter(([k]) => /^\d/.test(k)) as [string, number][]).reverse().map(([k, n]) => ({ testo: `Voto da ${k.replace('-', ' o ')}`, valore: piu(n) })),
        { testo: 'Voto migliore del precedente, almeno 6', valore: piu(v.migliorato_almeno_6) },
        { testo: 'Sufficienza dopo un’insufficienza', valore: piu(v.recupero_dopo_insufficienza) },
        { testo: 'Enigma del forziere risolto', valore: piu(p.enigma_risolto) },
        { testo: 'Nota di merito', valore: piu(p.nota_merito) },
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
        { testo: 'Dieci minuti di allenamento', valore: piu(o.dieci_minuti) },
        { testo: 'Partita giocata', valore: piu(p.partite.giocata) },
        { testo: 'Partita vinta, in più', valore: piu(p.partite.vinta_in_piu) },
        { testo: 'In panchina tutta la partita', valore: piu(p.partite.panchina) },
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
      voci: [{ testo: 'Scrivania, lavastoviglie, letto, vestiti', valore: piu(unGesto) }],
      dettagli: [`Al massimo ${piu(gesti.tetto_giornaliero)} al giorno.`],
    },
    {
      id: 'meno',
      titolo: 'Cosa fa perdere passi',
      posa: 'papa-ci-pensiamo',
      voci: [
        { testo: 'Nota disciplinare', valore: meno(p.malus.nota_disciplinare) },
        { testo: 'Tre note per dimenticanza', valore: meno(p.malus.note_dimenticanza_ogni_3) },
        { testo: 'Bagno in disordine dopo la doccia', valore: meno(p.malus.bagno) },
        ...(opzioni.rEvolution ? [{ testo: 'Gesto antisportivo in campo', valore: meno(p.malus.antisportivo) }] : []),
        { testo: 'Balla o imbroglio', valore: meno(p.malus.balla_o_imbroglio) },
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
