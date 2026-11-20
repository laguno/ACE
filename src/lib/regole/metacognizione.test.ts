import { describe, expect, it } from 'vitest';
import { CONFIG, giorno } from './index';
import * as D from './metacognizione';

const M = CONFIG.metacognizione;
const ora = (hhmm: string, g = '2026-11-24') => new Date(`${g}T${hhmm}:00+01:00`).toISOString();
const voce = (stima: number, da: string, a: string | null, g = '2026-11-24') => ({ minuti_stimati: stima, iniziata_il: ora(da, g), finita_il: a ? ora(a, g) : null, giorno: g });

describe('piano del giorno', () => {
  it('stima: minuti interi tra 1 e il massimo', () => {
    expect(D.stimaValida(15)).toBe(true);
    expect(D.stimaValida(0)).toBe(false);
    expect(D.stimaValida(7.5)).toBe(false);
    expect(D.stimaValida(M.piano.minuti_max + 1)).toBe(false);
    for (const m of M.piano.minuti_possibili) expect(D.stimaValida(m)).toBe(true);
  });

  it('minuti veri solo per le voci iniziate e finite, almeno 1', () => {
    expect(D.minutiVeri(voce(20, '15:00', '15:26'))).toBe(26);
    expect(D.minutiVeri(voce(20, '15:00', '15:00'))).toBe(1);
    expect(D.minutiVeri(voce(20, '15:00', null))).toBeNull();
    expect(D.minutiVeri({ iniziata_il: null, finita_il: null })).toBeNull();
    // fine prima dell'inizio: dato rotto, non si conta
    expect(D.minutiVeri(voce(20, '15:30', '15:00'))).toBeNull();
  });

  it('totale stimato', () => {
    expect(D.totaleStimato([{ minuti_stimati: 10 }, { minuti_stimati: 25 }])).toBe(35);
    expect(D.totaleStimato([])).toBe(0);
  });

  it('tendenza: niente sotto il minimo di voci finite', () => {
    const poche = Array.from({ length: M.piano.tendenza_voci_min - 1 }, () => voce(10, '15:00', '15:20'));
    expect(D.tendenzaTempo([...poche, voce(10, '16:00', null)], giorno('2026-11-25'))).toBeNull();
  });

  it('tendenza: di più, di meno, giusto', () => {
    const n = M.piano.tendenza_voci_min;
    const oggi = giorno('2026-11-25');
    const di = (fine: string) => Array.from({ length: n }, () => voce(20, '15:00', fine));
    expect(D.tendenzaTempo(di('15:30'), oggi)).toMatchObject({ verso: 'di_piu', voci: n, stimati: 20 * n, veri: 30 * n });
    expect(D.tendenzaTempo(di('15:10'), oggi)?.verso).toBe('di_meno');
    expect(D.tendenzaTempo(di('15:21'), oggi)?.verso).toBe('giusto');
  });

  it('tendenza: le voci vecchie escono', () => {
    const n = M.piano.tendenza_voci_min;
    const vecchie = Array.from({ length: n }, () => voce(20, '15:00', '15:40', '2026-11-01'));
    expect(D.tendenzaTempo(vecchie, giorno('2026-11-25'))).toBeNull();
  });
});

describe('voto previsto', () => {
  it('mezzi voti tra il minimo e il massimo', () => {
    expect(D.votoPrevistoValido(7.5)).toBe(true);
    expect(D.votoPrevistoValido(7.25)).toBe(false);
    expect(D.votoPrevistoValido(M.voto_previsto.voto_max + 0.5)).toBe(false);
    expect(D.votoPrevistoValido(M.voto_previsto.voto_min - 0.5)).toBe(false);
    expect(D.votiPossibili()[0]).toBe(M.voto_previsto.voto_min);
    expect(D.votiPossibili().at(-1)).toBe(M.voto_previsto.voto_max);
    expect(D.votiPossibili().every(D.votoPrevistoValido)).toBe(true);
  });

  it('si prevede fino al giorno prima; si chiede negli ultimi giorni', () => {
    expect(D.siPuoPrevedere('2026-11-30', giorno('2026-11-29'))).toBe(true);
    expect(D.siPuoPrevedere('2026-11-30', giorno('2026-11-30'))).toBe(false);
    const g = M.voto_previsto.chiedi_da_giorni_prima;
    expect(D.chiediPrevisione('2026-11-30', giorno('2026-11-29'))).toBe(true);
    expect(D.chiediPrevisione('2026-11-30', new Date(giorno('2026-11-30').getTime() - g * 864e5))).toBe(true);
    expect(D.chiediPrevisione('2026-11-30', new Date(giorno('2026-11-30').getTime() - (g + 1) * 864e5))).toBe(false);
    expect(D.chiediPrevisione('2026-11-30', giorno('2026-11-30'))).toBe(false);
  });

  it('abbina il voto alla verifica: stessa materia, dal giorno della verifica in poi', () => {
    const verifiche = [{ id: 'v1', materia_id: 'mate', data: '2026-11-30', tipo: 'verifica' }];
    const m = D.abbinaVoti(verifiche, [
      { id: 'prima', materia_id: 'mate', data: '2026-11-28', voto: 5 },
      { id: 'altra', materia_id: 'storia', data: '2026-12-01', voto: 9 },
      { id: 'giusto', materia_id: 'mate', data: '2026-12-03', voto: 7.5 },
    ]);
    expect(m.get('v1')?.id).toBe('giusto');
  });

  it('abbina: niente voto oltre la finestra, niente orale per una scritta', () => {
    const verifiche = [{ id: 'v1', materia_id: 'mate', data: '2026-11-30', tipo: 'verifica' }];
    const tardi = new Date(giorno('2026-11-30').getTime() + (M.voto_previsto.voto_entro_giorni + 1) * 864e5);
    const iso = `${tardi.getFullYear()}-${String(tardi.getMonth() + 1).padStart(2, '0')}-${String(tardi.getDate()).padStart(2, '0')}`;
    expect(D.abbinaVoti(verifiche, [{ id: 't', materia_id: 'mate', data: iso, voto: 8 }]).size).toBe(0);
    expect(D.abbinaVoti(verifiche, [{ id: 'o', materia_id: 'mate', data: '2026-11-30', voto: 8, tipo: 'orale' }]).size).toBe(0);
    expect(D.abbinaVoti(verifiche, [{ id: 's', materia_id: 'mate', data: '2026-11-30', voto: 8, tipo: 'scritto' }]).get('v1')?.id).toBe('s');
    expect(D.abbinaVoti(verifiche, [{ id: 'g', materia_id: 'mate', data: '2026-11-30', voto: 8, tipo: 'scritto/grafico' }]).get('v1')?.id).toBe('g');
    const interrogazione = [{ id: 'i1', materia_id: 'mate', data: '2026-11-30', tipo: 'interrogazione' }];
    expect(D.abbinaVoti(interrogazione, [{ id: 's', materia_id: 'mate', data: '2026-11-30', voto: 8, tipo: 'scritto' }]).size).toBe(0);
    expect(D.abbinaVoti(interrogazione, [{ id: 'o', materia_id: 'mate', data: '2026-11-30', voto: 8, tipo: 'orale' }]).get('i1')?.id).toBe('o');
  });

  it('abbina: due verifiche vicine, un voto ciascuna, alla più recente prima del voto', () => {
    const verifiche = [
      { id: 'a', materia_id: 'mate', data: '2026-11-23' },
      { id: 'b', materia_id: 'mate', data: '2026-11-30' },
    ];
    const m = D.abbinaVoti(verifiche, [
      { id: 'va', materia_id: 'mate', data: '2026-11-25', voto: 6 },
      { id: 'vb', materia_id: 'mate', data: '2026-12-01', voto: 8 },
      { id: 'vc', materia_id: 'mate', data: '2026-12-02', voto: 9 },
    ]);
    expect(m.get('a')?.id).toBe('va');
    expect(m.get('b')?.id).toBe('vb');
  });

  it('passi solo se la previsione è vicina al voto vero', () => {
    const s = M.voto_previsto.scarto_max;
    expect(D.passiPrevisione(7, 7)).toBe(M.voto_previsto.passi);
    expect(D.passiPrevisione(7, 7 + s)).toBe(M.voto_previsto.passi);
    expect(D.passiPrevisione(7, 7 + s + 0.5)).toBe(0);
    expect(D.passiPrevisione(9, 5)).toBe(0);
  });

  it('tendenza: niente con poche verifiche, poi alta, bassa o giusta', () => {
    const n = M.voto_previsto.tendenza_verifiche_min;
    const coppie = (p: number, v: number) => Array.from({ length: n }, () => ({ previsto: p, vero: v }));
    expect(D.tendenzaPrevisioni(coppie(8, 6).slice(1))).toBeNull();
    expect(D.tendenzaPrevisioni(coppie(8, 6))).toMatchObject({ verso: 'alta', verifiche: n, scartoMedio: 2, differenzaMedia: 2 });
    expect(D.tendenzaPrevisioni(coppie(6, 8))?.verso).toBe('bassa');
    expect(D.tendenzaPrevisioni(coppie(7, 7.5))?.verso).toBe('giusta');
    // errori opposti: in media giusta, ma lo scarto resta
    const misto = [...coppie(8, 6), ...coppie(6, 8)];
    expect(D.tendenzaPrevisioni(misto)).toMatchObject({ verso: 'giusta', scartoMedio: 2 });
  });
});

describe('micro-lezione della settimana', () => {
  it('una a settimana dall\'inizio, poi ricomincia', () => {
    const inizio = giorno(CONFIG.periodo.inizio);
    const piu = (g: number) => new Date(inizio.getTime() + g * 864e5);
    expect(D.lezioneDellaSettimana(inizio, 8)).toBe(0);
    expect(D.lezioneDellaSettimana(piu(6), 8)).toBe(0);
    expect(D.lezioneDellaSettimana(piu(7), 8)).toBe(1);
    expect(D.lezioneDellaSettimana(piu(7 * 8), 8)).toBe(0);
    expect(D.lezioneDellaSettimana(piu(-7), 8)).toBe(7);
    expect(D.lezioneDellaSettimana(piu(3), 0)).toBe(0);
  });
});

describe('riepilogo della domenica', () => {
  const base: D.DatiRiepilogo = { ripassi: { fatti: 3, previsti: 4 }, giriCarte: 1, pillole: null, sicure: null, previsioni: [], piano: [], lezioneLetta: false };

  it('senza dati dei blocchi B e C: niente righe inventate', () => {
    const r = D.riepilogoSettimana(base);
    expect(r.map((x) => x.chiave)).toEqual(['ripassi', 'carte', 'lezione']);
    expect(r[0]).toMatchObject({ valore: '3 su 4' });
    expect(r[1].testo).toBe('giro di flash card');
    expect(r[2].valore).toBe('Non ancora');
  });

  it('con pillole, carte sicure, previsioni e piano', () => {
    const r = D.riepilogoSettimana({
      ...base,
      pillole: { fatte: 4, previste: 5 },
      sicure: { sicure: 20, sbagliate: 3 },
      previsioni: [{ previsto: 7, vero: 7.5 }, { previsto: 8, vero: 6.5 }],
      piano: [voce(20, '15:00', '15:30'), voce(10, '16:00', '16:05'), voce(15, '17:00', null)],
      lezioneLetta: true,
    });
    const per = Object.fromEntries(r.map((x) => [x.chiave, x]));
    expect(per.pillole.valore).toBe('4 su 5');
    expect(per.sicure.valore).toBe('15%');
    expect(per.previsioni.valore).toBe('1');
    expect(per.previsioni.testo).toContain('previsto 7, preso 7½');
    expect(per.piano).toMatchObject({ valore: '35 min' });
    expect(per.piano.testo).toContain('30 stimati, su 2 cose');
    expect(per.lezione.valore).toBe('Letta');
  });

  it('quota sicure ma sbagliate', () => {
    expect(D.quotaSicureSbagliate(0, 0)).toBeNull();
    expect(D.quotaSicureSbagliate(10, 2)).toBe(0.2);
    expect(D.quotaSicureSbagliate(5, 9)).toBe(1);
    const r = D.riepilogoSettimana({ ...base, sicure: { sicure: 0, sbagliate: 0 } });
    expect(r.find((x) => x.chiave === 'sicure')?.valore).toBe('–');
  });
});
