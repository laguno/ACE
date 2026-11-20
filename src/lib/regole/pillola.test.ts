import { describe, expect, it } from 'vitest';
import { componiPillola, type CartaPillola } from './pillola';
import { massimoPerVerifica, votoDaCarta } from './fsrs';

const carta = (id: string, argomento: string, ripetizioni = 1, materia_id = 'storia'): CartaPillola => ({
  id,
  materia_id,
  argomento,
  ripetizioni,
  prossima_revisione: '2026-11-20',
});

describe('pillola', () => {
  it('al massimo le carte previste, nessuna se non ce ne sono', () => {
    expect(componiPillola([])).toEqual([]);
    const tante = Array.from({ length: 30 }, (_, i) => carta(`c${i}`, i % 2 ? 'A' : 'B'));
    expect(componiPillola(tante)).toHaveLength(12);
  });

  it('due carte vicine non sono dello stesso argomento, se si può', () => {
    const p = componiPillola([carta('1', 'A'), carta('2', 'A'), carta('3', 'A'), carta('4', 'B'), carta('5', 'B'), carta('6', 'C')]);
    expect(p.map((c) => c.argomento).slice(0, 3)).toEqual(['A', 'B', 'C']);
  });

  it('se in cima c\'è un solo argomento ne pesca un altro', () => {
    const solo = Array.from({ length: 12 }, (_, i) => carta(`a${i}`, 'A'));
    const p = componiPillola([...solo, carta('b', 'B')]);
    expect(new Set(p.map((c) => c.argomento)).size).toBe(2);
    expect(p).toHaveLength(12);
  });

  it('le carte nuove vanno a blocco all\'inizio', () => {
    const p = componiPillola([carta('v1', 'A'), carta('n1', 'B', 0), carta('v2', 'C'), carta('n2', 'B', 0)]);
    expect(p.slice(0, 2).map((c) => c.id).sort()).toEqual(['n1', 'n2']);
  });

  it('stesso argomento in materie diverse conta come diverso', () => {
    const p = componiPillola([carta('1', 'Ripasso', 1, 'storia'), carta('2', 'Ripasso', 1, 'storia'), carta('3', 'Ripasso', 1, 'geografia')]);
    expect(p.map((c) => c.materia_id)).toEqual(['storia', 'geografia', 'storia']);
  });
});

describe('voto della flash card', () => {
  it('non sapevo è sbagliata, con sovrastima se era sicura', () => {
    expect(votoDaCarta('non_sapevo', 'sicura')).toEqual({ voto: 1, giusta: false, sovrastima: true });
    expect(votoDaCarta('non_sapevo', 'non_lo_so').sovrastima).toBe(false);
  });
  it('quasi è Difficile; sapevo segue la sicurezza', () => {
    expect(votoDaCarta('quasi', 'sicura').voto).toBe(2);
    expect(votoDaCarta('sapevo', 'sicura').voto).toBe(3);
    expect(votoDaCarta('sapevo', 'forse').voto).toBe(2);
  });
});

describe('intervallo con verifica in calendario', () => {
  it('la carta torna prima della verifica', () => {
    expect(massimoPerVerifica('2026-11-20', '2026-11-27')).toBe(6);
    expect(massimoPerVerifica('2026-11-20', '2026-11-21')).toBe(1);
  });
  it('senza verifica o verifica passata: massimo normale', () => {
    expect(massimoPerVerifica('2026-11-20', null)).toBe(120);
    expect(massimoPerVerifica('2026-11-20', '2026-11-10')).toBe(120);
  });
});

describe('ripasso cumulativo', () => {
  const g = (s: string) => new Date(`${s}T12:00:00`);
  it('vale solo la vigilia della verifica, fatto nel giorno previsto', async () => {
    const { ripassoCumulativo } = await import('./index');
    expect(ripassoCumulativo(g('2026-11-25'), g('2026-11-24'), g('2026-11-24'))).toBe(true);
    expect(ripassoCumulativo(g('2026-11-25'), g('2026-11-24'), g('2026-11-23'))).toBe(false);
    expect(ripassoCumulativo(g('2026-11-27'), g('2026-11-24'), g('2026-11-24'))).toBe(false);
  });
});
