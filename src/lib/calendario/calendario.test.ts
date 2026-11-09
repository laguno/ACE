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

describe('chiusura e momento della giornata', async () => {
  const { oraChiusura, momento } = await import('./index');
  const allenamento = (inizio: string) => ({ titolo: 'Allenamento Pallavolo Leilani U-13', inizio });
  it('martedì: allenamento alle 18:30, si chiude alle 18:00', () => {
    expect(oraChiusura('20:30', [allenamento('2026-11-10T17:30:00Z')])).toBe('18:00');
  });
  it('lunedì: allenamento alle 15, resta la chiusura delle 20:30', () => {
    expect(oraChiusura('20:30', [allenamento('2026-11-09T14:00:00Z')])).toBe('20:30');
  });
  it('giovedì con partita alle 19:45: chiusura alle 19:15', () => {
    expect(oraChiusura('20:30', [{ titolo: 'Partita Lani: FOXES', inizio: '2026-11-12T18:45:00Z' }])).toBe('19:15');
  });
  it('venerdì: niente chiusura, salvo partita il giorno dopo (chiusura breve)', () => {
    expect(oraChiusura(null, [])).toBeNull();
    expect(oraChiusura(null, [], '20:30')).toBe('20:30');
    // venerdì con allenamento alle 18:30 e partita sabato: mezz'ora prima dell'allenamento
    expect(oraChiusura(null, [allenamento('2026-11-13T17:30:00Z')], '20:30')).toBe('18:00');
    // venerdì con allenamento alle 18:30 ma senza partita sabato: niente chiusura
    expect(oraChiusura(null, [allenamento('2026-11-13T17:30:00Z')])).toBeNull();
  });
  it('momento: mattina, pomeriggio, sera da un’ora prima', () => {
    expect(momento('07:10', '20:30')).toBe('mattina');
    expect(momento('15:00', '20:30')).toBe('pomeriggio');
    expect(momento('19:30', '20:30')).toBe('sera');
    expect(momento('17:05', '18:00')).toBe('sera');
    expect(momento('21:00', null)).toBe('pomeriggio');
  });
});
