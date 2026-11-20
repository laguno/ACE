import { describe, expect, it } from 'vitest';
import { CONFIG, pianoRipasso } from '../regole';
import { fasceInCampo, orarioChiusura, orarioNotifica, orarioSollecito, seraPiena, type RegoleSilenzio } from './index';

// Numeri dal config vero: se il signore li cambia, cambiano anche qui
const S: RegoleSilenzio = CONFIG.notifiche;
const { margine_prima_minuti: PRIMA, margine_dopo_minuti: DOPO, durata_allenamento_minuti: ALL, durata_partita_minuti: PAR } = S.sport;
const ora = (base: string, minuti: number) => {
  const [h, m] = base.split(':').map(Number);
  const t = h * 60 + m + minuti;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

const allenamento = (inizio: string, fine: string | null = null) => ({ titolo: 'Allenamento Pallavolo Leilani U-13', inizio: `2026-11-24T${inizio}:00+01:00`, fine: fine && `2026-11-24T${fine}:00+01:00` });
const partitaFipav = (inizio: string) => ({ titolo: 'Partita Lani U14: FOXES vs U14R-EVOLUTION', inizio: `2026-11-25T${inizio}:00+01:00`, fine: null });

describe('silenzio delle notifiche: numeri nel config', () => {
  it('le soglie stanno in config-gioco.json e il tetto resta 3 al giorno più 1 sollecito', () => {
    expect(CONFIG.notifiche.max_al_giorno).toBe(3);
    expect(CONFIG.notifiche.solleciti).toBe(1);
    expect(S.silenzio_lani_dalle).toMatch(/^\d\d:\d\d$/);
    expect(S.allenamento_tardo_dalle).toMatch(/^\d\d:\d\d$/);
    expect(S.passo_cron_minuti).toBeGreaterThan(0);
  });
});

describe('fasceInCampo', () => {
  it('allenamento con la fine: dal margine prima alla fine più il margine dopo', () => {
    expect(fasceInCampo([allenamento('18:30', '20:00')], S)).toEqual([{ da: ora('18:30', -PRIMA), a: ora('20:00', DOPO) }]);
  });
  it('senza fine: durata del config (partita FIPAV e allenamento diversi)', () => {
    expect(fasceInCampo([partitaFipav('16:00')], S)).toEqual([{ da: ora('16:00', -PRIMA), a: ora('16:00', PAR + DOPO) }]);
    expect(fasceInCampo([allenamento('17:30')], S)).toEqual([{ da: ora('17:30', -PRIMA), a: ora('17:30', ALL + DOPO) }]);
  });
  it('impegni di famiglia e partite "[LANI ASSENTE]" non fanno silenzio', () => {
    expect(fasceInCampo([{ titolo: 'Tennis Leonardo', inizio: '2026-11-24T17:00:00+01:00' }, { titolo: '[LANI ASSENTE] Partita U13: X vs Y', inizio: '2026-11-24T18:00:00+01:00' }], S)).toEqual([]);
  });
  it('torneo di tutto il giorno: tutto il giorno; ordinate per inizio', () => {
    expect(fasceInCampo([{ titolo: 'Partita Lani: torneo', inizio: '2026-11-28T00:00:00+01:00', tutto_il_giorno: true }], S)).toEqual([{ da: '00:00', a: '24:00' }]);
    const f = fasceInCampo([allenamento('19:00', '20:00'), allenamento('15:00', '16:00')], S);
    expect(f.map((x) => x.da)).toEqual([ora('15:00', -PRIMA), ora('19:00', -PRIMA)]);
  });
  it('una partita che finisce dopo mezzanotte si ferma a fine giornata', () => {
    expect(fasceInCampo([{ titolo: 'Partita Lani: lontano', inizio: '2026-11-24T22:30:00+01:00', fine: '2026-11-25T01:00:00+01:00' }], S)[0].a).toBe('24:00');
  });
});

describe('orarioNotifica', () => {
  const fasce = fasceInCampo([allenamento('14:30', '16:00')], S);
  it('fuori dal campo resta dov\'è', () => {
    expect(orarioNotifica('07:00', fasce, S)).toBe('07:00');
  });
  it('durante l\'allenamento si sposta alla fine della fascia', () => {
    expect(orarioNotifica('14:45', fasce, S)).toBe(ora('16:00', DOPO));
  });
  it('fasce di fila: si sposta fino alla fine dell\'ultima', () => {
    const due = fasceInCampo([allenamento('14:30', '16:00'), allenamento(ora('16:00', DOPO), '17:30')], S);
    expect(orarioNotifica('14:45', due, S)).toBe(ora('17:30', DOPO));
  });
  it('mai dalle 21:00: né prevista lì, né spostata lì da una partita', () => {
    expect(orarioNotifica(S.silenzio_lani_dalle, [], S)).toBeNull();
    expect(orarioNotifica('21:30', [], S)).toBeNull();
    expect(orarioNotifica('19:15', fasceInCampo([{ titolo: 'Partita Lani: X', inizio: '2026-11-24T19:00:00+01:00' }], S), S)).toBeNull();
  });
});

describe('orarioSollecito', () => {
  it('sera libera con chiusura alle 19:30: i minuti del config dopo', () => {
    expect(orarioSollecito('19:30', [], S)).toBe(ora('19:30', S.sollecito_dopo_minuti));
  });
  it('chiusura alle 20:30: oltre le 21 non va, si anticipa all\'ultimo giro prima del silenzio', () => {
    expect(orarioSollecito('20:30', [], S)).toBe(ora(S.silenzio_lani_dalle, -S.passo_cron_minuti));
  });
  it('martedì con allenamento alle 18:30 (chiusura alle 18:00): il rientro è già nel silenzio, niente sollecito', () => {
    const fasce = fasceInCampo([allenamento('18:30', '20:00')], S);
    expect(ora('20:00', DOPO) >= S.silenzio_lani_dalle).toBe(true);
    expect(orarioSollecito('18:00', fasce, S)).toBeNull();
  });
  it('partita la sera: in campo fino a tardi, niente sollecito', () => {
    const fasce = fasceInCampo([{ titolo: 'Partita Lani U13: X vs Y', inizio: '2026-11-26T19:00:00+01:00' }], S);
    expect(orarioSollecito('18:30', fasce, S)).toBeNull();
  });
  it('chiusura già all\'ultimo giro o dopo: niente sollecito anticipato', () => {
    expect(orarioSollecito(ora(S.silenzio_lani_dalle, -S.passo_cron_minuti), [], S)).toBeNull();
  });
});

describe('seraPiena e ripasso serale', () => {
  it('partita (anche FIPAV del pomeriggio) o allenamento dalle 17: sera piena; allenamento presto no', () => {
    expect(seraPiena(partitaFipav('16:00'), S)).toBe(true);
    expect(seraPiena(allenamento(S.allenamento_tardo_dalle), S)).toBe(true);
    expect(seraPiena(allenamento('18:30'), S)).toBe(true);
    expect(seraPiena(allenamento('15:00'), S)).toBe(false);
    expect(seraPiena({ titolo: 'Cena dai nonni', inizio: '2026-11-24T19:30:00+01:00' }, S)).toBe(false);
  });
  it('pianoRipasso salta le sere piene: con un allenamento tardo il martedì la sessione va il lunedì', () => {
    const impegni = [allenamento('18:30')];
    const occupati = impegni.filter((i) => seraPiena(i, S)).map((i) => i.inizio.slice(0, 10));
    const piano = pianoRipasso(new Date(2026, 10, 25), new Date(2026, 10, 23), occupati);
    expect(piano.map((p) => p.data)).toEqual(['2026-11-23']);
  });
});

describe('orarioChiusura (scelta del signore del 20/11)', () => {
  it("fuori dal campo: all'ora della chiusura", () => expect(orarioChiusura('20:30', [], S)).toBe('20:30'));
  it('allenamento del pomeriggio: dopo il rientro, come le altre notifiche', () => {
    const fasce = fasceInCampo([allenamento('17:00', '18:30')], S);
    expect(orarioChiusura('17:30', fasce, S)).toBe(ora('18:30', DOPO));
  });
  it("allenamento tardo: il rientro è nel silenzio, si anticipa all'ultimo giro prima del campo", () => {
    const fasce = fasceInCampo([allenamento('18:30', '20:00')], S);
    expect(orarioChiusura('18:00', fasce, S)).toBe(ora('18:30', -PRIMA - S.passo_cron_minuti));
  });
  it('partita la sera, senza ora di fine', () => {
    const fasce = fasceInCampo([partitaFipav('19:00')], S);
    expect(orarioChiusura('18:30', fasce, S)).toBe(ora('19:00', -PRIMA - S.passo_cron_minuti));
  });
});
