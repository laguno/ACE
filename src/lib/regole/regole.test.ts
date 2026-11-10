import { describe, expect, it } from 'vitest';
import {
  CONFIG,
  bandierina,
  cartellaConta,
  compitoInTempo,
  giorno,
  giornoRoma,
  giroValido,
  iso,
  lunedi,
  passiNuovoGesto,
  passiSgridata,
  prossimoGiornoDiScuola,
  ripassoInTempo,
  videoValido,
  chiaviSettimana,
  giornoDiScuola,
  moltiplicatoreRimonta,
  passiCompito,
  passiCompitoRifatto,
  passiGestiCasa,
  passiQuiz,
  passiVoto,
  passiVotiMateria,
  passiFoto,
  passiNota,
  malusDimenticanze,
  posizione,
  soglieTappe,
  statoForziere,
  storno,
  studioConta,
} from './index';
import * as R from './index';

describe('percorso', () => {
  it('27 tappe per 7.200 passi, sempre più care', () => {
    const c = CONFIG.percorso.costi_tappe;
    expect(c).toHaveLength(27);
    expect(c.reduce((a, b) => a + b, 0)).toBe(7200);
    for (let i = 1; i < c.length; i++) expect(c[i]).toBeGreaterThanOrEqual(c[i - 1]);
  });

  it('i forzieri cadono alle soglie approvate', () => {
    const s = soglieTappe();
    expect(CONFIG.forzieri.map((f) => s[f.tappa - 1])).toEqual([405, 915, 1515, 2220, 3020, 3920, 4915, 6010, 7200]);
  });

  it('posizione: a 725 passi è alla tappa 4 e mancano 10 passi', () => {
    expect(posizione(725)).toMatchObject({ tappeFatte: 4, mancanoPassi: 10, inCima: false });
    expect(posizione(7200).inCima).toBe(true);
  });
});

describe('forzieri', () => {
  it('enigma all’ultima tappa prima del forziere, poi lucchetto se mancano chiavi', () => {
    expect(statoForziere(2, 800, 3)).toBe('enigma'); // 5 tappe fatte su 6
    expect(statoForziere(2, 600, 3)).toBe('lontano'); // 4 tappe fatte
    expect(statoForziere(2, 915, 3)).toBe('mancano_chiavi');
    expect(statoForziere(2, 915, 4)).toBe('aperto');
    expect(statoForziere(9, 100, 0)).toBe('lontano');
  });
});

describe('passi delle azioni', () => {
  it('compiti in anticipo valgono il 30% in più', () => {
    expect(passiCompito(new Date(2026, 10, 26), new Date(2026, 10, 25))).toBe(10);
    expect(passiCompito(new Date(2026, 10, 26), new Date(2026, 10, 24))).toBe(13);
  });

  it('quiz a scalare', () => {
    expect(passiQuiz(1, 9, 10)).toBe(10);
    expect(passiQuiz(1, 8, 10)).toBe(6);
    expect(passiQuiz(2, 10, 10)).toBe(6);
    expect(passiQuiz(3, 5, 10)).toBe(2);
    expect(passiQuiz(4, 10, 10)).toBe(1);
    expect(passiQuiz(7, 3, 10)).toBe(1);
  });

  it('studio facoltativo solo con i compiti spuntati e fino a 4 per tipo', () => {
    expect(studioConta('flashcard', 0, false)).toBe(false);
    expect(studioConta('flashcard', 3, true)).toBe(true);
    expect(studioConta('video', 4, true)).toBe(false);
  });

  it('gesti di casa con tetto 6', () => {
    expect(passiGestiCasa(['letto'])).toBe(2);
    expect(passiGestiCasa(['letto', 'scrivania', 'vestiti', 'lavastoviglie'])).toBe(6);
  });

  it('voti: nessun voto toglie passi', () => {
    expect(passiVoto({ voto: 4 })).toBe(0);
    expect(passiVoto({ voto: 9 })).toBe(30);
    expect(passiVoto({ voto: 7, precedente: 6 })).toBe(25);
    expect(passiVoto({ voto: 6, precedente: 5, precedenteInsufficiente: true })).toBe(35);
  });
});

describe('chiavi della settimana', () => {
  const base = { passiPossibili: 100, passiFatti: 100, cosePossibili: 20, coseFatte: 20, note: 0 };
  it('tre chiavi con quasi tutto e nessuna nota', () => expect(chiaviSettimana(base)).toBe(3));
  it('una nota lascia al massimo una chiave', () => expect(chiaviSettimana({ ...base, note: 1 })).toBe(1));
  it('sotto il 70% nessuna chiave', () => expect(chiaviSettimana({ ...base, passiFatti: 69 })).toBe(0));
  it('due chiavi senza note ma non tutto fatto', () => expect(chiaviSettimana({ ...base, coseFatte: 17 })).toBe(2));
});

describe('bandierina e rimonta', () => {
  it('si ferma in vacanza e arriva in cima l’ultimo giorno', () => {
    expect(giornoDiScuola(new Date(2026, 11, 25))).toBe(false);
    expect(bandierina(new Date(2026, 11, 23))).toBe(bandierina(new Date(2027, 0, 6)));
    expect(bandierina(new Date(2027, 5, 4))).toBe(7200);
    expect(bandierina(new Date(2026, 10, 22))).toBe(0);
  });

  it('rimonta ×1,25 solo se indietro di oltre una tappa e mezza e con almeno una chiave', () => {
    expect(moltiplicatoreRimonta(1000, 1500, 1)).toBe(1.25);
    expect(moltiplicatoreRimonta(1000, 1500, 0)).toBe(1);
    expect(moltiplicatoreRimonta(1000, 1300, 2)).toBe(1);
  });
});

describe('correzione delle spunte', () => {
  const saldo = (ms: Array<{ passi: number; moltiplicatore: number }>) =>
    ms.reduce((a, m) => a + Math.round(m.passi * m.moltiplicatore), 0);

  it('lo storno annulla esattamente i passi della spunta, anche con la rimonta', () => {
    const m = { passi: 13, moltiplicatore: 1.25 };
    expect(saldo([m, storno(m, false)!])).toBe(0);
  });

  it('dopo le chiavi della domenica non si storna più', () => {
    expect(storno({ passi: 10, moltiplicatore: 1 }, true)).toBeNull();
  });
});

describe('compito rifatto dopo uno storno', () => {
  const base = { stornato: true, giaRifatto: false, chiaviSettimanaGiaDate: false };
  it('ridà i passi base, senza bonus anticipo', () => expect(passiCompitoRifatto(base)).toBe(CONFIG.passi.obbligatori.compiti));
  it('una sola volta per compito', () => expect(passiCompitoRifatto({ ...base, giaRifatto: true })).toBe(0));
  it('non dopo le chiavi della domenica', () => expect(passiCompitoRifatto({ ...base, chiaviSettimanaGiaDate: true })).toBe(0));
  it('niente se il compito non era stato stornato', () => expect(passiCompitoRifatto({ ...base, stornato: false })).toBe(0));
});

describe('controlli della funzione dei passi', () => {
  it('giorno a Roma anche quando il server è in UTC', () => {
    // 23:30 UTC del 23/11 = 00:30 del 24/11 a Roma
    expect(iso(giornoRoma('2026-11-23T23:30:00Z'))).toBe('2026-11-24');
    expect(iso(lunedi(giorno('2026-11-29')))).toBe('2026-11-23');
  });

  it('compito spuntato dopo la scadenza: niente passi', () => {
    expect(compitoInTempo(giorno('2026-11-24'), giorno('2026-11-24'))).toBe(true);
    expect(compitoInTempo(giorno('2026-11-24'), giorno('2026-11-25'))).toBe(false);
  });

  it('cartella solo la sera prima di scuola, ripasso prima della verifica', () => {
    expect(cartellaConta(giorno('2026-11-23'))).toBe(true); // lunedì sera
    expect(cartellaConta(giorno('2026-11-27'))).toBe(false); // venerdì sera
    expect(cartellaConta(giorno('2026-12-23'))).toBe(false); // vigilia delle vacanze
    expect(ripassoInTempo(giorno('2026-11-27'), giorno('2026-11-26'))).toBe(true);
    expect(ripassoInTempo(giorno('2026-11-27'), giorno('2026-11-27'))).toBe(false);
  });

  it('i compiti per domani del venerdì scadono lunedì', () => {
    expect(iso(prossimoGiornoDiScuola(giorno('2026-11-27')))).toBe('2026-11-30');
  });

  it('giro di flash card valido solo con 7 secondi a carta', () => {
    const inizio = new Date('2026-11-24T15:00:00Z');
    expect(giroValido(inizio, new Date('2026-11-24T15:01:10Z'), 10)).toBe(true);
    expect(giroValido(inizio, new Date('2026-11-24T15:01:09Z'), 10)).toBe(false);
  });

  it('video valido solo se visto almeno al 95%', () => {
    expect(videoValido(true, 285, 300)).toBe(true);
    expect(videoValido(true, 284, 300)).toBe(false);
    expect(videoValido(false, 300, 300)).toBe(false);
    expect(videoValido(true, 300, null)).toBe(false);
  });

  it('gesti di casa: il tetto vale anche dato un gesto alla volta', () => {
    expect(passiNuovoGesto(0, 'letto')).toBe(2);
    expect(passiNuovoGesto(6, 'lavastoviglie')).toBe(0);
    expect(passiNuovoGesto(5, 'letto')).toBe(1);
    expect(passiNuovoGesto(9, 'letto')).toBe(0);
    // quattro gesti uno dopo l'altro: 2 + 2 + 2 + 0, mai oltre il tetto
    let dati = 0;
    for (const v of ['letto', 'scrivania', 'vestiti', 'lavastoviglie'] as const) dati += passiNuovoGesto(dati, v);
    expect(dati).toBe(6);
  });

  it('riscatto della serie nera: sette giorni fatti bene di fila', () => {
    const bene = { compitiInScadenza: 2, compitiInTempo: 2, cartella: true, sgridate: 0, note: 0 };
    expect(R.giornoFattoBene(bene)).toBe(true);
    expect(R.giornoFattoBene({ ...bene, compitiInScadenza: 0, compitiInTempo: 0 })).toBe(true); // niente compiti: basta la cartella
    expect(R.giornoFattoBene({ ...bene, compitiInTempo: 1 })).toBe(false);
    expect(R.giornoFattoBene({ ...bene, cartella: false })).toBe(false);
    expect(R.giornoFattoBene({ ...bene, sgridate: 1 })).toBe(false);
    expect(R.giornoFattoBene({ ...bene, note: 1 })).toBe(false);
    const n = R.CONFIG.figurine.riscatto_giorni_di_fila;
    expect(R.riscattoFatto(Array(n).fill(true))).toBe(true);
    expect(R.riscattoFatto(Array(n - 1).fill(true))).toBe(false);
    // un giorno storto fa ripartire il conto
    expect(R.riscattoFatto([...Array(n - 1).fill(true), false, ...Array(n - 1).fill(true)])).toBe(false);
    expect(R.riscattoFatto([false, ...Array(n).fill(true)])).toBe(true);
  });

  it('gesti di casa: la stessa voce due volte nello stesso giorno vale una volta', () => {
    expect(passiNuovoGesto(2, 'letto', true)).toBe(0);
    expect(passiNuovoGesto(2, 'scrivania', false)).toBe(2);
  });

  it('sgridate', () => {
    expect(passiSgridata('bagno')).toBe(-1);
    expect(passiSgridata('balla')).toBe(-10);
  });
});

describe('voti e note da Nuvola', () => {
  const P = CONFIG.passi;
  it('voti di una materia: confronto con il precedente e recupero', () => {
    expect(passiVotiMateria([7.5, 5, 6, 9])).toEqual([
      P.voti['7'],
      0,
      P.voti.migliorato_almeno_6 + P.voti.recupero_dopo_insufficienza,
      P.voti['9-10'] + P.voti.migliorato_almeno_6,
    ]);
  });
  it('note: merito e disciplinare, le altre zero', () => {
    expect(passiNota('merito')).toBe(P.nota_merito);
    expect(passiNota('disciplinare')).toBe(P.malus.nota_disciplinare);
    expect(passiNota('didattica')).toBe(0);
    expect(passiNota('altro')).toBe(0);
  });
  it('dimenticanze: malus sulla terza, sesta...', () => {
    expect(malusDimenticanze(['a', 'b'])).toEqual([]);
    expect(malusDimenticanze(['a', 'b', 'c', 'd', 'e', 'f', 'g'])).toEqual(['c', 'f']);
  });
});

describe('piano di ripasso e ripetizione', async () => {
  const { pianoRipasso, prossimaRevisione, giorno: g } = await import('./index');
  it('quattro sessioni nei quattro giorni prima', () => {
    expect(pianoRipasso(g('2026-11-16'), g('2026-11-09'))).toEqual([
      { numero: 1, data: '2026-11-12', tipo: 'rilettura_flashcard' },
      { numero: 2, data: '2026-11-13', tipo: 'flashcard_mappa' },
      { numero: 3, data: '2026-11-14', tipo: 'quiz' },
      { numero: 4, data: '2026-11-15', tipo: 'quiz_errori' },
    ]);
  });
  it('con due giorni: rilettura e quiz; verifica domani: solo quiz', () => {
    expect(pianoRipasso(g('2026-11-12'), g('2026-11-10')).map((s) => s.tipo)).toEqual(['rilettura_flashcard', 'quiz']);
    expect(pianoRipasso(g('2026-11-12'), g('2026-11-11'))).toEqual([{ numero: 1, data: '2026-11-11', tipo: 'quiz' }]);
    expect(pianoRipasso(g('2026-11-12'), g('2026-11-12'))).toEqual([]);
  });
  it('salta i giorni con la partita', () => {
    const p = pianoRipasso(g('2026-11-16'), g('2026-11-09'), ['2026-11-14']);
    expect(p.map((s) => s.data)).toEqual(['2026-11-11', '2026-11-12', '2026-11-13', '2026-11-15']);
  });
  it('intervalli: sapevo raddoppia, quasi domani, non sapevo da capo', () => {
    expect(prossimaRevisione(1, 'sapevo', g('2026-11-09'))).toEqual({ intervallo: 2, data: '2026-11-11' });
    expect(prossimaRevisione(4, 'sapevo', g('2026-11-09'))).toEqual({ intervallo: 8, data: '2026-11-17' });
    expect(prossimaRevisione(4, 'quasi', g('2026-11-09'))).toEqual({ intervallo: 4, data: '2026-11-10' });
    expect(prossimaRevisione(4, 'non_sapevo', g('2026-11-09'))).toEqual({ intervallo: 1, data: '2026-11-10' });
  });
});

describe('conteggio della settimana', async () => {
  const { contaSettimana, chiaviSettimana, mondo } = await import('./index');
  const P = CONFIG.passi.obbligatori;
  it('possibili e fatti dalle cose obbligatorie, il resto non conta', () => {
    const s = contaSettimana({
      compiti: 6,
      sereCartella: 5,
      sereBorsa: 2,
      fogli: 0,
      sessioni: 2,
      note: 0,
      movimenti: [
        ...Array(6).fill({ motivo: 'compito', passi: P.compiti }),
        ...Array(5).fill({ motivo: 'cartella', passi: P.cartella }),
        { motivo: 'borsa', passi: P.borsa },
        { motivo: 'ripasso', passi: P.ripasso },
        { motivo: 'flashcard', passi: 3 },
        { motivo: 'storno', passi: -10 },
      ],
    });
    expect(s.passiPossibili).toBe(6 * P.compiti + 5 * P.cartella + 2 * P.borsa + 2 * P.ripasso);
    expect(s.coseFatte).toBe(13);
    expect(s.cosePossibili).toBe(15);
    expect(chiaviSettimana(s)).toBe(2); // 13/15 < 95%
  });
  it('mondi ogni 7 tappe, la cima resta nello spazio', () => {
    expect([0, 6, 7, 14, 21, 26, 27].map(mondo)).toEqual([0, 0, 1, 2, 3, 3, 3]);
  });
});

describe('caselle dello studio facoltativo', async () => {
  const { caselleStudio } = await import('./index');
  it('quattro caselle al giorno per tipo', () => {
    expect(caselleStudio('flashcard', '2026-11-24')).toEqual([
      'flashcard:2026-11-24:1',
      'flashcard:2026-11-24:2',
      'flashcard:2026-11-24:3',
      'flashcard:2026-11-24:4',
    ]);
  });
});

describe('foto di un compito richiesta da ACE', () => {
  it('passi a Lani solo se l’ha caricata lei e la richiesta era di ACE', () => {
    expect(passiFoto({ richiestaDaAce: true, caricataDaLani: true })).toBe(CONFIG.passi.foto_compito);
    expect(passiFoto({ richiestaDaAce: true, caricataDaLani: false })).toBe(0);
    expect(passiFoto({ richiestaDaAce: false, caricataDaLani: true })).toBe(0);
  });
});
