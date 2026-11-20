import { describe, expect, it } from 'vitest';
import * as M from './index';

const barreVuote: M.Barre = { barre: [], totale: '' };
const problema = (metodo: string, n = 3, risposta = '12'): M.Problema => ({
  metodo,
  perche_metodo: 'perché sì',
  testo: `Problema di ${metodo}`,
  passaggi: Array.from({ length: n }, (_, i) => ({ cosa: `passo ${i + 1}`, calcolo: '1 + 1', risultato: i === n - 1 ? risposta : String(i) })),
  risposta,
  unita: '',
  barre: barreVuote,
});

describe('risposte scritte a mano', () => {
  it('legge virgola, migliaia, frazioni, due punti, percentuali e unità', () => {
    expect(M.numero('2,5')).toBe(2.5);
    expect(M.numero('1.500')).toBe(1500);
    expect(M.numero('1.500,25')).toBe(1500.25);
    expect(M.numero('3/4')).toBe(0.75);
    expect(M.numero('12 : 4')).toBe(3);
    expect(M.numero('30%')).toBe(30);
    expect(M.numero('15 cm')).toBe(15);
    expect(M.numero('24 m²')).toBe(24);
    expect(M.numero('-3')).toBe(-3);
    expect(M.numero('ciao')).toBeNull();
    expect(M.numero('3/0')).toBeNull();
  });

  it('accetta lo stesso numero scritto in modi diversi', () => {
    expect(M.giusta('0,75', '3/4')).toBe(true);
    expect(M.giusta('0,67', '2/3')).toBe(true);
    expect(M.giusta('6/8', '3/4')).toBe(true);
    expect(M.giusta(' 12 ', '12')).toBe(true);
    expect(M.giusta('12 €', '12')).toBe(true);
    expect(M.giusta('13', '12')).toBe(false);
    expect(M.giusta('0,7', '2/3')).toBe(false);
  });

  it('una risposta vuota non è mai giusta, le parole si confrontano senza spazi', () => {
    expect(M.giusta('', '0')).toBe(false);
    expect(M.giusta('   ', 'acuto')).toBe(false);
    expect(M.giusta('Acuto', 'acuto')).toBe(true);
    expect(M.giusta('x = 5', 'x=5')).toBe(true);
    expect(M.giusta('dodici', '12')).toBe(false);
  });
});

describe('esempi che si svuotano', () => {
  const e = (metodo: string, livello: number, giusto: boolean): M.Esito => ({ metodo, livello, giusto, metodo_giusto: null });

  it('si parte dall\'esempio completo e si sale di un vuoto a ogni problema giusto', () => {
    expect(M.livelli([])).toEqual({});
    expect(M.livelli([e('frazioni', 0, true)])).toEqual({ frazioni: 1 });
    expect(M.livelli([e('frazioni', 0, true), e('frazioni', 1, true), e('frazioni', 2, true)])).toEqual({ frazioni: 3 });
  });

  it('i metodi vanno ognuno per conto suo', () => {
    expect(M.livelli([e('frazioni', 0, true), e('aree', 0, true), e('frazioni', 1, true)])).toEqual({ frazioni: 2, aree: 1 });
  });

  it('uno sbagliato resta al livello, due di fila fanno tornare un passo indietro', () => {
    const base = [e('aree', 0, true), e('aree', 1, true)];
    expect(M.livelli([...base, e('aree', 2, false)])).toEqual({ aree: 2 });
    expect(M.livelli([...base, e('aree', 2, false), e('aree', 2, false)])).toEqual({ aree: 1 });
    expect(M.livelli([...base, e('aree', 2, false), e('aree', 2, true), e('aree', 3, false)])).toEqual({ aree: 3 });
  });

  it('non va oltre il problema intero né sotto l\'esempio', () => {
    const tanti = Array.from({ length: 9 }, (_, i) => e('x', i, true));
    expect(M.livelli(tanti).x).toBe(M.LIVELLO_MASSIMO);
    expect(M.livelli([e('x', 0, false), e('x', 0, false)])).toEqual({});
  });

  it('un giusto a un livello già passato non fa salire', () => {
    expect(M.livelli([e('x', 0, true), e('x', 1, true), e('x', 0, true)])).toEqual({ x: 2 });
  });

  it('i vuoti non superano i passaggi; al massimo è il problema intero', () => {
    const p = problema('x', 3);
    expect(M.vuoti(p, 0)).toBe(0);
    expect(M.vuoti(p, 2)).toBe(2);
    expect(M.vuoti(p, 4)).toBe(3);
    expect(M.intero(p, 2)).toBe(false);
    expect(M.intero(p, 3)).toBe(true);
  });
});

describe('serie mescolata', () => {
  it('mai due dello stesso metodo di fila, quando si può', () => {
    const serie = M.mescola([problema('a'), problema('a'), problema('a'), problema('b'), problema('b'), problema('c')]);
    expect(serie).toHaveLength(6);
    for (let i = 1; i < serie.length; i++) expect(serie[i].metodo).not.toBe(serie[i - 1].metodo);
  });

  it('con un metodo solo li tiene tutti, nello stesso ordine', () => {
    const p = [problema('a', 2, '1'), problema('a', 2, '2')];
    expect(M.mescola(p)).toEqual(p);
  });

  it('la scelta del metodo c\'è con almeno due metodi e non negli esempi', () => {
    const s = [problema('a'), problema('b')];
    expect(M.metodi(s)).toEqual(['a', 'b']);
    expect(M.sceltaMetodo(s, 1)).toBe(true);
    expect(M.sceltaMetodo(s, 0)).toBe(false);
    expect(M.sceltaMetodo([problema('a')], 2)).toBe(false);
  });
});

describe('controllo di quello che scrive l\'IA', () => {
  it('scarta i problemi storti', () => {
    expect(M.problemaValido(problema('a'))).toBe(true);
    expect(M.problemaValido(problema('a', 1))).toBe(false);
    expect(M.problemaValido(problema('a', 5))).toBe(false);
    expect(M.problemaValido({ ...problema('a'), risposta: '13' })).toBe(false);
    expect(M.problemaValido({ ...problema('a'), testo: ' ' })).toBe(false);
    const barre = (parti: number): M.Barre => ({ barre: [{ nome: 'Anna', segmenti: [{ testo: '?', parti, incognita: true }] }], totale: '48' });
    expect(M.problemaValido({ ...problema('a'), barre: barre(3) })).toBe(true);
    expect(M.problemaValido({ ...problema('a'), barre: barre(0) })).toBe(false);
  });

  it('una serie vuole almeno 6 problemi e 2 metodi, ognuno con almeno 2 problemi', () => {
    const sei = [problema('a'), problema('a'), problema('a'), problema('b'), problema('b'), problema('b')];
    expect(M.serieValida(sei)).toHaveLength(6);
    expect(M.serieValida(sei.slice(0, 5))).toBeNull();
    expect(M.serieValida([...sei.slice(0, 3), problema('b'), problema('b'), problema('c')])).toBeNull();
    expect(M.serieValida([...sei, problema('c')])).toHaveLength(6);
    expect(M.serieValida(Array.from({ length: 6 }, () => problema('a')))).toBeNull();
  });
});
