import { describe, expect, it } from 'vitest';
import { coloreMateria, GETTONI, MATERIE } from './colori';

const luce = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrasto = (a: string, b: string) => {
  const [x, y] = [luce(a), luce(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

describe('colori di ACE v2', () => {
  it('il segno di ogni gettone regge 4,5:1 sul suo fondo', () => {
    for (const [nome, g] of Object.entries(GETTONI)) expect(contrasto(g.segno, g.fondo), nome).toBeGreaterThanOrEqual(4.5);
  });
  it('il testo di ogni materia regge 4,5:1 sul suo fondo', () => {
    for (const [nome, m] of Object.entries(MATERIE)) expect(contrasto(m.testo, m.fondo), nome).toBeGreaterThanOrEqual(4.5);
  });
  it('riconosce i nomi di Nuvola', () => {
    expect(coloreMateria('Arte e immagine')).toEqual(MATERIE.arte);
    expect(coloreMateria('Scienze motorie e sportive')).toEqual(MATERIE['educazione fisica']);
    expect(coloreMateria('Scienze')).toEqual(MATERIE.scienze);
    expect(coloreMateria('Lingua inglese')).not.toEqual(MATERIE.inglese); // nome non previsto: neutro
    expect(coloreMateria(null).testo).toBeTruthy();
  });
});
