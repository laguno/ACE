import { describe, expect, it } from 'vitest';
import { FRASI_BALLA, notaBalla } from './comune';

describe('notaBalla: il testo libero della balla per il popup di Lani', () => {
  it('maiuscola, spazi in ordine, senza il punto finale (il copione aggiunge ". −10. ...")', () => {
    expect(notaBalla('  hai detto   di aver studiato.  ')).toEqual({ nota: 'Hai detto di aver studiato' });
  });
  it('vuoto, oltre 80 caratteri, oltre 16 parole: non va', () => {
    expect(notaBalla('  ')).toHaveProperty('errore');
    expect(notaBalla('x'.repeat(81))).toHaveProperty('errore');
    expect(notaBalla('a b c d e f g h i l m n o p q r s')).toHaveProperty('errore');
  });
  it('le frasi pronte stanno nei limiti', () => {
    for (const [, perLani] of FRASI_BALLA) expect(notaBalla(perLani)).toEqual({ nota: perLani });
  });
});
