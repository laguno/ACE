import { describe, expect, it } from 'vitest';
import { contieneRisultato, controllaAiuto, normalizza, testoDiLani, tettoRaggiunto, TUTOR } from '.';

describe('tutor: testo di Lani', () => {
  it('spazi puliti, troppo corto null, tagliato al massimo', () => {
    expect(testoDiLani('  ho   diviso\n per 4 ', 3, 500)).toBe('ho diviso per 4');
    expect(testoDiLani(' no ', 3, 500)).toBeNull();
    expect(testoDiLani(42, 3, 500)).toBeNull();
    expect(testoDiLani('a'.repeat(600), 3, 500)).toHaveLength(500);
  });
  it('tetto da config', () => {
    expect(tettoRaggiunto(TUTOR.chiamate_al_giorno - 1)).toBe(false);
    expect(tettoRaggiunto(TUTOR.chiamate_al_giorno)).toBe(true);
  });
});

describe('tutor: il risultato del compito non passa', () => {
  it('normalizza: accenti, virgola decimale, spazi attorno ai simboli', () => {
    expect(normalizza('  È  3 / 4 = 0,75 ')).toBe('e 3/4=0.75');
  });
  it('numeri per intero: 5 non è in 45 né in 1,5', () => {
    expect(contieneRisultato('Fa 5.', ['5'])).toBe(true);
    expect(contieneRisultato('Pagina 45, metà di 1,5', ['5'])).toBe(false);
    expect(contieneRisultato('il risultato è 0,75', ['0.75'])).toBe(true);
    expect(contieneRisultato('3 / 4 della torta', ['3/4'])).toBe(true);
    expect(contieneRisultato('13/45', ['3/4'])).toBe(false);
    expect(contieneRisultato('x = 12', ['x=12'])).toBe(true);
  });
  it('parole e frasi intere, senza accenti né maiuscole', () => {
    expect(contieneRisultato('La capitale è Parigi.', ['parigi'])).toBe(true);
    expect(contieneRisultato('Il soggetto è "il gatto"', ['Il Gatto'])).toBe(true);
    expect(contieneRisultato('gattone', ['gatto'])).toBe(false);
    expect(contieneRisultato('qualsiasi cosa', ['', '  '])).toBe(false);
  });
  it('indizi con il risultato scartati; spiegazione col risultato: da rifare', () => {
    const r = controllaAiuto({ spiegazione: 'Con 2/6 si semplifica in 1/3.', indizi: ['Cerca un divisore comune.', 'Dividi per 2: ottieni 3/4.', 'Prova con 2.'], risultati: ['3/4', '0,75'] });
    expect(r).toEqual({ va: true, indizi: ['Cerca un divisore comune.', 'Prova con 2.'], scartati: 1 });
    expect(controllaAiuto({ spiegazione: 'Viene 0,75.', indizi: ['a'], risultati: ['0.75'] }).va).toBe(false);
    expect(controllaAiuto({ spiegazione: 'ok', indizi: ['fa 3/4'], risultati: ['3/4'] }).va).toBe(false);
    expect(controllaAiuto({ spiegazione: 'ok', indizi: ['leggi bene'], risultati: [] })).toEqual({ va: true, indizi: ['leggi bene'], scartati: 0 });
  });
});
