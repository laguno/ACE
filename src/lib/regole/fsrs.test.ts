import { describe, expect, it } from 'vitest';
import { daRiprendere, intervallo, ricordo, ripassa, votoDa, votoDaEsito } from './fsrs';

describe('voto da risposta e sicurezza', () => {
  it('sbagliata è Di nuovo; sovrastima solo se era sicura', () => {
    expect(votoDa(false, 'sicura')).toEqual({ voto: 1, sovrastima: true });
    expect(votoDa(false, 'forse')).toEqual({ voto: 1, sovrastima: false });
    expect(votoDa(false, 'non_lo_so')).toEqual({ voto: 1, sovrastima: false });
  });
  it('giusta e sicura è Bene, giusta con dubbio è Difficile', () => {
    expect(votoDa(true, 'sicura').voto).toBe(3);
    expect(votoDa(true, 'forse').voto).toBe(2);
    expect(votoDa(true, 'non_lo_so').voto).toBe(2);
  });
  it('esiti di oggi', () => {
    expect([votoDaEsito('sapevo'), votoDaEsito('quasi'), votoDaEsito('non_sapevo')]).toEqual([3, 2, 1]);
  });
});

describe('FSRS', () => {
  it('con ritenzione 0,9 l\'intervallo è circa la stabilità', () => {
    expect(ricordo(10, 10)).toBeCloseTo(0.9, 5);
    expect(intervallo(10)).toBe(10);
    expect(intervallo(0.2)).toBe(1);
    expect(intervallo(10_000)).toBe(120);
  });

  it('carta nuova: Bene torna dopo 3 giorni, Di nuovo domani', () => {
    expect(ripassa(null, 3, '2026-11-19').prossima).toBe('2026-11-22');
    expect(ripassa(null, 1, '2026-11-19').prossima).toBe('2026-11-20');
  });

  it('ripassi giusti allungano l\'intervallo, non oltre il massimo', () => {
    let { stato, giorni } = ripassa(null, 3, '2026-11-01');
    let giorno = '2026-11-01';
    const visti: number[] = [giorni];
    for (let i = 0; i < 6; i++) {
      const d = new Date(`${giorno}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + giorni);
      giorno = d.toISOString().slice(0, 10);
      ({ stato, giorni } = ripassa(stato, 3, giorno));
      visti.push(giorni);
    }
    for (let i = 1; i < visti.length; i++) expect(visti[i]).toBeGreaterThanOrEqual(visti[i - 1]);
    expect(Math.max(...visti)).toBeLessThanOrEqual(120);
    expect(stato.ripetizioni).toBe(7);
    expect(stato.cadute).toBe(0);
  });

  it('Difficile allunga meno di Bene', () => {
    const base = ripassa(null, 3, '2026-11-01').stato;
    expect(ripassa(base, 2, '2026-11-04').giorni).toBeLessThan(ripassa(base, 3, '2026-11-04').giorni);
  });

  it('una caduta abbassa la stabilità e si conta', () => {
    const base = ripassa(ripassa(null, 3, '2026-11-01').stato, 3, '2026-11-04').stato;
    const dopo = ripassa(base, 1, '2026-11-20');
    expect(dopo.stato.stabilita).toBeLessThan(base.stabilita);
    expect(dopo.stato.cadute).toBe(1);
    expect(dopo.giorni).toBe(1);
  });

  it('il massimo accorcia l\'intervallo (verifica in calendario)', () => {
    const base = ripassa(ripassa(null, 3, '2026-11-01').stato, 3, '2026-11-04').stato;
    expect(ripassa(base, 3, '2026-11-15', 2).giorni).toBeLessThanOrEqual(2);
  });

  it('la difficoltà resta tra 1 e 10', () => {
    let s = ripassa(null, 1, '2026-11-01').stato;
    for (let i = 0; i < 20; i++) s = ripassa(s, 1, '2026-11-02').stato;
    expect(s.difficolta).toBeLessThanOrEqual(10);
    expect(s.difficolta).toBeGreaterThanOrEqual(1);
  });

  it('tre cadute: da riprendere insieme', () => {
    let s = ripassa(null, 3, '2026-11-01').stato;
    expect(daRiprendere(s)).toBe(false);
    for (const g of ['2026-11-04', '2026-11-05', '2026-11-06']) s = ripassa(s, 1, g).stato;
    expect(daRiprendere(s)).toBe(true);
  });
});
