import { describe, expect, it } from 'vitest';
import { riassuntoClassifica, type RigaClassifica } from './index';

const riga = (pos: number, squadra: string, punti: number): RigaClassifica => ({ pos, squadra, punti, giocate: 3, vinte: 0, perse: 0, set_fatti: 0, set_subiti: 0 });
const girone = [riga(1, 'FOXES VOLLEY', 9), riga(2, 'U14R-EVOLUTION', 8), riga(3, 'ARBOR ITARCA', 6), riga(4, 'ALTRA', 6)];

describe('riassunto della classifica per il popup della partita', () => {
  it('prime nel girone', () => {
    expect(riassuntoClassifica([riga(1, 'U14R-EVOLUTION', 9), riga(2, 'FOXES VOLLEY', 6)], 'U14R-EVOLUTION')).toBe('Siete prime nel girone, continuate così.');
  });
  it('seconde a un punto, ignorando maiuscole e spazi', () => {
    expect(riassuntoClassifica(girone, ' u14r-evolution ')).toBe('Siete seconde, a un punto dalla prima.');
  });
  it('più punti di distanza', () => {
    expect(riassuntoClassifica(girone, 'ALTRA')).toBe('Siete quarte, a 3 punti dalla prima.');
  });
  it('a pari punti con la prima', () => {
    expect(riassuntoClassifica([riga(1, 'FOXES VOLLEY', 9), riga(2, 'U14R-EVOLUTION', 9)], 'U14R-EVOLUTION')).toBe('Siete seconde, a pari punti con la prima.');
  });
  it('oltre il decimo posto e squadra assente', () => {
    expect(riassuntoClassifica([riga(1, 'A', 20), riga(11, 'NOI', 2)], 'NOI')).toBe('Siete in 11ª posizione, a 18 punti dalla prima.');
    expect(riassuntoClassifica(girone, 'NESSUNA')).toBe('');
  });
});
