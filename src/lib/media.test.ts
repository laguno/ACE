import { describe, expect, it } from 'vitest';
import { mediaGenerale, mediaPesata } from './media';

// Voti veri di Inglese di Lani (Nuvola, 19/11/2026): 9 al 20%, 5½ al 50%, 8 al 100%.
const inglese = [
  { materia_id: 'inglese', voto: 9, peso: 20, fa_media: true },
  { materia_id: 'inglese', voto: 5.5, peso: 50, fa_media: true },
  { materia_id: 'inglese', voto: 8, peso: 100, fa_media: true },
];

describe('media pesata', () => {
  it('pesa ogni voto: Inglese fa 7,38 e non 7,50', () => {
    expect(mediaPesata(inglese)).toBeCloseTo(1255 / 170, 10);
    expect(mediaPesata(inglese)).toBeCloseTo(7.3824, 4);
  });

  it('un voto che non fa media resta fuori', () => {
    expect(mediaPesata([...inglese, { voto: 2, peso: 100, fa_media: false }])).toBeCloseTo(1255 / 170, 10);
  });

  it('voto non ancora sincronizzato: peso 100 e fa media (stessa media semplice di prima)', () => {
    expect(mediaPesata([{ voto: 7 }, { voto: 8, peso: null, fa_media: null }, { voto: '6' }])).toBe(7);
  });

  it('peso 0, nessun voto o nessuno che fa media: null', () => {
    expect(mediaPesata([])).toBeNull();
    expect(mediaPesata([{ voto: 9, peso: 0 }])).toBeNull();
    expect(mediaPesata([{ voto: 9, fa_media: false }])).toBeNull();
  });

  it('voti come stringhe (numeric di Postgres) si sommano come numeri', () => {
    expect(mediaPesata([{ voto: '9.0', peso: '20.00' }, { voto: '5.5', peso: '50.00' }, { voto: '8.0', peso: '100.00' }])).toBeCloseTo(7.3824, 4);
  });
});

describe('media generale', () => {
  it('è la media delle medie per materia, non quella di tutti i voti', () => {
    const matematica = [{ materia_id: 'matematica', voto: 8, peso: 100, fa_media: true }];
    const g = mediaGenerale([...inglese, ...matematica]);
    expect(g).toBeCloseTo((1255 / 170 + 8) / 2, 10);
    // con la media di tutti i voti verrebbe un'altra cifra: (9+5,5+8+8)/4 = 7,625
    expect(g).not.toBeCloseTo(7.625, 3);
  });

  it('salta le materie senza voti che fanno media', () => {
    expect(mediaGenerale([...inglese, { materia_id: 'arte', voto: 3, fa_media: false }])).toBeCloseTo(1255 / 170, 10);
    expect(mediaGenerale([])).toBeNull();
  });
});
