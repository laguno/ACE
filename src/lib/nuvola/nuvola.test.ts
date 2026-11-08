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
});
