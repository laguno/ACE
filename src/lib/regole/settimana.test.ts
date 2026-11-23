import { describe, expect, it } from 'vitest';
import { CONFIG, giorno } from './index';
import { calcolaSettimana, prossimeCose, type DatiSettimana } from './settimana';

const O = CONFIG.passi.obbligatori;
// settimana di prova: lunedì 23 novembre 2026, R-Evolution accesa dal 16/11
const base = (extra: Partial<DatiSettimana> = {}): DatiSettimana => ({
  lunedi: giorno('2026-11-23'),
  compiti: [],
  sessioni: [],
  fogli: [],
  sportIl: [],
  assenze: [],
  rEvolutionDa: '2026-11-16',
  movimenti: [],
  note: 0,
  ...extra,
});
const riga = (s: ReturnType<typeof calcolaSettimana>, voce: string) => s.righe.find((r) => r.voce === voce)!;

describe('settimana in corso', () => {
  it('cartella: le cinque sere prima di scuola (domenica-giovedì)', () => {
    const s = calcolaSettimana(base());
    const c = riga(s, 'cartella');
    expect(c.possibili).toBe(5);
    expect(c.caselle.map((x) => x.possibili)).toEqual([1, 1, 1, 1, 0, 0, 1]);
  });

  it('borsa: solo la domenica e il giovedì sera, se il giorno dopo c\'è sport', () => {
    // sport lun 23, mar 24, ven 27, sab 28 e lunedì dopo 30
    const s = calcolaSettimana(base({ sportIl: ['2026-11-23', '2026-11-24', '2026-11-27', '2026-11-28', '2026-11-30'] }));
    const b = riga(s, 'borsa');
    // giovedì sera (venerdì 27) e domenica sera (lunedì 30); il lunedì 23 era la sera di prima
    expect(b.caselle.map((x) => x.possibili)).toEqual([0, 0, 0, 1, 0, 0, 1]);
  });

  it('dieci minuti: sette giorni possibili, ne contano sei; il primo saltato è il jolly', () => {
    const movimenti = ['24', '25', '26', '27', '28', '29'].map((g) => ({ motivo: 'dieci_minuti', riferimento: `dieci_minuti:2026-11-${g}`, passi: O.dieci_minuti }));
    const s = calcolaSettimana(base({ movimenti, oggi: giorno('2026-11-30') }));
    const d = riga(s, 'dieci_minuti');
    expect(d.possibili).toBe(CONFIG.dieci_minuti.giorni_a_settimana);
    expect(d.fatte).toBe(6);
    expect(d.caselle[0].stato).toBe('jolly');
    expect(d.passiFatti).toBe(6 * O.dieci_minuti);
  });

  it('dieci minuti tutti e sette: per le chiavi contano sei', () => {
    const movimenti = ['23', '24', '25', '26', '27', '28', '29'].map((g) => ({ motivo: 'dieci_minuti', riferimento: `dieci_minuti:2026-11-${g}`, passi: O.dieci_minuti }));
    const d = riga(calcolaSettimana(base({ movimenti })), 'dieci_minuti');
    expect([d.possibili, d.fatte]).toEqual([6, 6]);
  });

  it('una spunta stornata non conta più', () => {
    const movimenti = [
      { motivo: 'cartella', riferimento: 'serata:2026-11-23', passi: O.cartella },
      { motivo: 'cartella', riferimento: 'serata:2026-11-24', passi: O.cartella },
      { motivo: 'storno', riferimento: 'cartella:serata:2026-11-24', passi: -O.cartella },
    ];
    const c = riga(calcolaSettimana(base({ movimenti, oggi: giorno('2026-11-26') })), 'cartella');
    expect(c.fatte).toBe(1);
    expect(c.caselle[1].stato).toBe('persa');
  });

  it('i compiti contano nella settimana della scadenza, anche fatti prima; il rifatto conta una volta', () => {
    const compiti = [
      { id: 'a', scadenza: '2026-11-24' },
      { id: 'b', scadenza: '2026-11-25' },
      { id: 'c', scadenza: '2026-11-28' }, // sabato: niente scuola, non conta
    ];
    const movimenti = [
      { motivo: 'compito', riferimento: 'a', passi: 13 }, // fatto in anticipo, la settimana prima
      { motivo: 'compito', riferimento: 'b', passi: O.compiti },
      { motivo: 'storno', riferimento: 'compito:b', passi: -O.compiti },
      { motivo: 'compito_rifatto', riferimento: 'b', passi: O.compiti },
    ];
    const c = riga(calcolaSettimana(base({ compiti, movimenti })), 'compiti');
    expect([c.possibili, c.fatte, c.passiFatti]).toEqual([2, 2, 13 + O.compiti]);
  });

  it('assenza: le cose di quel giorno escono dal conto', () => {
    const s = calcolaSettimana(base({ compiti: [{ id: 'a', scadenza: '2026-11-24' }], assenze: ['2026-11-24'] }));
    expect(riga(s, 'compiti').possibili).toBe(0);
    // la cartella di lunedì sera (per martedì, a casa) non conta
    expect(riga(s, 'cartella').caselle[0].possibili).toBe(0);
    expect(riga(s, 'dieci_minuti').caselle[1].possibili).toBe(0);
  });

  it('barre, soglie e chiavi come la domenica', () => {
    const compiti = [{ id: 'a', scadenza: '2026-11-24' }];
    const tutto = calcolaSettimana(base({ compiti }));
    expect(tutto.sogliaPassi).toBe(Math.ceil(CONFIG.chiavi_settimana.soglia_passi_prima * tutto.passiPossibili));
    expect(tutto.chiavi).toBe(0);
    const movimenti = [
      { motivo: 'compito', riferimento: 'a', passi: O.compiti },
      ...['23', '24', '25', '26', '29'].map((g) => ({ motivo: 'cartella', riferimento: `serata:2026-11-${g}`, passi: O.cartella })),
      ...['23', '24', '25', '26', '27', '28'].map((g) => ({ motivo: 'dieci_minuti', riferimento: `dieci_minuti:2026-11-${g}`, passi: O.dieci_minuti })),
    ];
    const fatta = calcolaSettimana(base({ compiti, movimenti }));
    expect([fatta.percentualePassi, fatta.percentualeCose, fatta.chiavi]).toEqual([100, 100, 3]);
    expect(calcolaSettimana(base({ compiti, movimenti, note: 1 })).chiavi).toBe(1);
  });

  it('prossime cose: da oggi in avanti, al massimo tre', () => {
    const s = calcolaSettimana(base({ compiti: [{ id: 'a', scadenza: '2026-11-25' }], oggi: giorno('2026-11-25') }));
    const p = prossimeCose(s, giorno('2026-11-25'));
    expect(p.length).toBe(3);
    expect(p.every((x) => x.giorno >= '2026-11-25')).toBe(true);
    expect(p[0]).toMatchObject({ voce: 'compiti', giorno: '2026-11-25' });
  });
});
