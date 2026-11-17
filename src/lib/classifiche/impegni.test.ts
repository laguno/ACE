import { describe, expect, it } from 'vitest';
import config from '../../../data/config-gioco.json' with { type: 'json' };
import { tipoImpegno, avversariaDelTitolo } from '../calendario';
import { impegniFipav } from './index';

// 17/11: le partite nel calendario dell'app arrivano solo dalla FIPAV.
const [U13, U14] = config.classifiche.campionati;
const gara = (cid: number, numero: number, inizio: string, casa: string, ospite: string) => ({ cid, numero, inizio, casa, ospite, set_casa: null, set_ospite: null });

describe('partite FIPAV come impegni di famiglia', () => {
  const gare = [
    gara(U13.cid, 1236, '2026-12-13T08:00:00Z', 'FOXES VOLLEY', U13.squadra),
    gara(U14.cid, 863, '2026-11-21T15:00:00Z', U14.squadra, 'ARBOR ITARCA'),
    gara(U14.cid, 900, '2026-11-22T15:00:00Z', 'FOXES VOLLEY', 'ARBOR ITARCA'), // non è nostra
  ];

  it('una riga per partita nostra, con titolo che l’app riconosce come partita di Lani', () => {
    const r = impegniFipav(gare, config.classifiche.campionati, new Set());
    expect(r).toEqual([
      { id: 'fipav:93436:1236', inizio: '2026-12-13T08:00:00Z', titolo: `Partita Lani U13: FOXES VOLLEY vs ${U13.squadra}` },
      { id: 'fipav:93399:863', inizio: '2026-11-21T15:00:00Z', titolo: `Partita Lani U14: ${U14.squadra} vs ARBOR ITARCA` },
    ]);
    expect(r.map((i) => tipoImpegno(i.titolo))).toEqual(['partita', 'partita']);
    expect(r.map((i) => avversariaDelTitolo(i.titolo))).toEqual(['FOXES VOLLEY', 'ARBOR ITARCA']);
  });

  it('il giorno "[LANI ASSENTE]" (ora di Roma) la partita non c’è', () => {
    expect(impegniFipav(gare, config.classifiche.campionati, new Set(['2026-12-13'])).map((i) => i.id)).toEqual(['fipav:93399:863']);
  });
});
