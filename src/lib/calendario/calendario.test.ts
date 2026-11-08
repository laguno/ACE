import { describe, expect, it } from 'vitest';
import { oraRoma, serveBorsa, tipoImpegno } from './index';

describe('calendario di famiglia', () => {
  it('riconosce allenamenti e partite di Lani', () => {
    expect(tipoImpegno('Allenamento Pallavolo Leilani U-13')).toBe('allenamento');
    expect(tipoImpegno('Partita Lani: FOXES VOLLEY vs U14R-EVOLUTION')).toBe('partita');
    expect(tipoImpegno('[LANI ASSENTE] Partita U13: 13R-EVOLUT. vs FORTLAND')).toBe('famiglia');
    expect(tipoImpegno('Tennis Leonardo')).toBe('famiglia');
    expect(tipoImpegno('Battesimo di Irene')).toBe('famiglia');
  });

  it('borsa solo se domani c’è un impegno sportivo di Lani', () => {
    expect(serveBorsa(['Tennis Leonardo', 'Allenamento Pallavolo Leilani U-13'])).toBe(true);
    expect(serveBorsa(['Tennis Leonardo'])).toBe(false);
    expect(serveBorsa([])).toBe(false);
  });

  it('ora italiana', () => {
    expect(oraRoma('2026-11-09T14:00:00Z')).toBe('15:00');
  });
});
