import { describe, expect, it } from 'vitest';
import * as N from './index';

describe('normalizzazione di Nuvola', () => {
  it('materie: id stabile e abbreviazioni del copione', () => {
    expect(N.materiaId('ARTE E IMMAGINE')).toBe('arte_e_immagine');
    expect(N.materiaId("ATTIVITA' PERSONALIZZATA")).toBe('attivita_personalizzata');
    expect(N.materiaId('ATTIVITÀ ALTERNATIVA')).toBe('attivita_alternativa');
    expect(N.materia('MATEMATICA')).toEqual({ id: 'matematica', nome: 'Matematica', abbreviazione: 'Mate' });
    expect(N.materia('STORIA').abbreviazione).toBe('Storia');
  });

  it('voti: mezzi, più e meno; i giudizi si saltano', () => {
    expect(N.votoNumero('7½')).toBe(7.5);
    expect(N.votoNumero('9')).toBe(9);
    expect(N.votoNumero('6+')).toBe(6.25);
    expect(N.votoNumero('7-')).toBe(6.75);
    expect(N.votoNumero('Buono')).toBeNull();
    expect(N.votoNumero('11')).toBeNull();
  });

  it('note: tipologie di Nuvola', () => {
    expect(N.tipoNota('NOTA DIDATTICA')).toBe('didattica');
    expect(N.tipoNota('NOTA DISCIPLINARE')).toBe('disciplinare');
    expect(N.tipoNota('AlTRO TIPO DI NOTA')).toBe('altro');
  });

  it('note: la nota di merito scritta nel testo di un "altro tipo di nota"', () => {
    const testo = 'NOTA DI MERITO: \nGli alunni hanno partecipato molto positivamente all’incontro.';
    expect(N.tipoNota('AlTRO TIPO DI NOTA', testo)).toBe('merito');
    expect(N.tipoNota('AlTRO TIPO DI NOTA', '  nota di merito: brava')).toBe('merito');
    expect(N.tipoNota('AlTRO TIPO DI NOTA', 'Comunicazione: nota di merito della classe a settembre')).toBe('altro');
    expect(N.tipoNota('AlTRO TIPO DI NOTA', null)).toBe('altro');
    // la tipologia di Nuvola vince sul testo
    expect(N.tipoNota('NOTA DISCIPLINARE', 'nota di merito')).toBe('disciplinare');
    expect(N.note([{ id: 15247, data: '2026-11-18T00:00:00+01:00', tipologia: 'AlTRO TIPO DI NOTA', descrizione: testo, materia: 'INGLESE' }])[0].tipo).toBe('merito');
  });

  it('verifiche: dal tipo o dal nome, non le gite', () => {
    expect(N.eVerifica({ tipo: 'Avviso', nome: 'Verifica di Geografia: Unione Europea' })).toBe(true);
    expect(N.eVerifica({ tipo: 'VERIFICA', nome: 'ARTE e IMMAGINE' })).toBe(true);
    expect(N.eVerifica({ tipo: 'Avviso', nome: 'Prova comune: comprensione del testo' })).toBe(true);
    expect(N.eVerifica({ tipo: 'Avviso', nome: 'Interrogazione sui testi per le vacanze' })).toBe(true);
    expect(N.eVerifica({ tipo: 'Avviso', nome: 'Divieto deodoranti spray' })).toBe(false);
    expect(N.eVerifica({ tipo: 'Uscita didattica', nome: 'Uscita presso la Biblioteca' })).toBe(false);
  });

  it('materia di una verifica: nome, poi docente con una materia sola', () => {
    const docenti = N.mappaDocenti([
      { docente: 'ARCURI', materia: 'MATEMATICA' },
      { docente: 'ARCURI', materia: 'SCIENZE' },
      { docente: 'MARTINO', materia: 'SPAGNOLO' },
    ]);
    expect(N.materiaEvento('Verifica di storia della musica: il Medioevo', null, docenti)).toBe('musica');
    expect(N.materiaEvento('Verifica di geometria sui poligoni', 'ARCURI', docenti)).toBe('matematica');
    expect(N.materiaEvento('Verifica scritta unità 5', 'MARTINO', docenti)).toBe('spagnolo');
    expect(N.materiaEvento('Verifica unità 3', 'ARCURI', docenti)).toBeNull();
  });

  it('compiti: chiave stabile anche se il testo cambia, doppioni numerati', () => {
    const c = {
      materia: 'MATEMATICA',
      idArgomento: 603062,
      dataAssegnazione: '2026-11-05T00:00:00+01:00',
      dataConsegna: '2026-11-10T00:00:00+01:00',
      descrizioneCompito: ['Pag 12 es 3'],
    };
    const [a, b] = N.compiti([c, { ...c, descrizioneCompito: ['Pag 13'] }]);
    expect(a).toEqual({
      nuvola_id: '603062-2026-11-10',
      materia_id: 'matematica',
      testo: 'Pag 12 es 3',
      assegnato_il: '2026-11-05',
      scadenza: '2026-11-10',
    });
    expect(b.nuvola_id).toBe('603062-2026-11-10-1');
    expect(N.compiti([{ ...c, descrizioneCompito: ['Altro testo'] }])[0].nuvola_id).toBe(a.nuvola_id);
  });

  it('voti: chiave per materia e giorno, giudizi fuori', () => {
    const v = N.voti([
      { materia: 'ITALIANO', voti: [{ data: '2026-09-21T00:00:00+02:00', valutazione: '7½' }, { data: '2026-09-21T00:00:00+02:00', valutazione: '6' }] },
      { materia: 'RELIGIONE', voti: [{ data: '2026-10-01T00:00:00+02:00', valutazione: 'Buono' }] },
    ]);
    expect(v).toEqual([
      { nuvola_id: 'italiano-2026-09-21-0', materia_id: 'italiano', data: '2026-09-21', voto: 7.5 },
      { nuvola_id: 'italiano-2026-09-21-1', materia_id: 'italiano', data: '2026-09-21', voto: 6 },
    ]);
  });

  it('peso: "20%" diventa 20, il resto null', () => {
    expect(N.pesoNumero('20%')).toBe(20);
    expect(N.pesoNumero('100%')).toBe(100);
    expect(N.pesoNumero('12,5%')).toBe(12.5);
    expect(N.pesoNumero('0%')).toBe(0);
    for (const x of ['', null, undefined, 'alto', '150%', '-5%']) expect(N.pesoNumero(x)).toBeNull();
  });

  it('voti dal dettaglio: peso, fa_media e tipo (risposta vera di Nuvola, Inglese 2026)', () => {
    const v = N.voti([
      {
        materia: 'INGLESE',
        voti: [
          { data: '2026-11-05T00:00:00+01:00', valutazione: '9', faMedia: true, peso: '20%', tipologia: 'ORALE' },
          { data: '2026-11-04T00:00:00+01:00', valutazione: '5½', faMedia: true, peso: '50%', tipologia: 'ORALE' },
          { data: '2026-10-14T00:00:00+02:00', valutazione: '8', faMedia: false, peso: '100%', tipologia: 'SCRITTO' },
        ],
      },
    ]);
    expect(v).toEqual([
      { nuvola_id: 'inglese-2026-11-05-0', materia_id: 'inglese', data: '2026-11-05', voto: 9, peso: 20, fa_media: true, tipo: 'orale' },
      { nuvola_id: 'inglese-2026-11-04-0', materia_id: 'inglese', data: '2026-11-04', voto: 5.5, peso: 50, fa_media: true, tipo: 'orale' },
      { nuvola_id: 'inglese-2026-10-14-0', materia_id: 'inglese', data: '2026-10-14', voto: 8, peso: 100, fa_media: false, tipo: 'scritto' },
    ]);
  });

  it('voti dal solo elenco: niente chiavi di peso, per non azzerare quelle già salvate', () => {
    const [r] = N.voti([{ materia: 'INGLESE', voti: [{ data: '2026-11-05T00:00:00+01:00', valutazione: '9' }] }]);
    expect(Object.keys(r)).toEqual(['nuvola_id', 'materia_id', 'data', 'voto']);
  });
});

describe('lezioni e orario', () => {
  it('lezioni: una riga per argomento, con ora e materia', () => {
    const l = N.lezioni([
      {
        ore: [
          { numeroOra: 1, giorno: '2026-11-06T00:00:00+01:00', argomenti: [{ id: 603437, materia: 'MUSICA', nomeArgomento: 'Rondò' }] },
        ],
      },
    ]);
    expect(l).toEqual([{ nuvola_id: '603437-1', data: '2026-11-06', ora: 1, materia_id: 'musica', argomento: 'Rondò' }]);
  });

  it('orario: ultimo giorno uguale, in ordine di ora, senza doppioni', () => {
    const r = [
      { data: '2026-11-02', ora: 1, materia_id: 'storia' }, // lunedì vecchio
      { data: '2026-11-09', ora: 3, materia_id: 'inglese' },
      { data: '2026-11-09', ora: 1, materia_id: 'matematica' },
      { data: '2026-11-09', ora: 2, materia_id: 'matematica' },
      { data: '2026-11-10', ora: 1, materia_id: 'arte_e_immagine' }, // martedì
    ];
    expect(N.materieDelGiorno(r, 1)).toEqual(['matematica', 'inglese']);
    expect(N.materieDelGiorno(r, 3)).toEqual([]);
  });
});

describe('peso dei compiti', () => {
  it('il più lungo pesa di più', () => {
    const t = ['le battute del dialogo, pagina 16', 'pagine 36–38, esercizi 1–8', 'pagina 345 e problemi 380–382', 'pagine 340–352 e la scheda'];
    const ordinati = [...t].sort((a, b) => N.peso(b) - N.peso(a));
    expect(ordinati[0]).toBe('pagine 340–352 e la scheda');
    expect(ordinati.at(-1)).toBe('le battute del dialogo, pagina 16');
  });
});

describe('pagine da fotografare', () => {
  it.each([
    ['pagine 340–352 e la scheda', '340–352'],
    ['pagina 345 e problemi 380–382', '345'],
    ['pagine 36-38, esercizi 1–8', '36–38'],
    ['Studiare pag. 12, 14 e 16', '12, 14, 16'],
    ['p. 40 es. 3', '40'],
    ['pagg. 20 - 22 e pag 30', '20–22, 30'],
    ['le battute del dialogo, pagina 16', '16'],
    ['ripassare il capitolo sui verbi', null],
    ['es 1-8 del quaderno', null],
  ])('%s', (testo, atteso) => expect(N.pagine(testo)).toBe(atteso));
});
