import { describe, expect, it } from 'vitest';
import {
  CONFIG,
  bandierina,
  chiaviSettimana,
  giornoDiScuola,
  moltiplicatoreRimonta,
  passiCompito,
  passiGestiCasa,
  passiQuiz,
  passiVoto,
  posizione,
  soglieTappe,
  statoForziere,
  studioConta,
} from './index';

describe('percorso', () => {
  it('27 tappe per 7.200 passi, sempre più care', () => {
    const c = CONFIG.percorso.costi_tappe;
    expect(c).toHaveLength(27);
    expect(c.reduce((a, b) => a + b, 0)).toBe(7200);
    for (let i = 1; i < c.length; i++) expect(c[i]).toBeGreaterThanOrEqual(c[i - 1]);
  });

  it('i forzieri cadono alle soglie approvate', () => {
    const s = soglieTappe();
    expect(CONFIG.forzieri.map((f) => s[f.tappa - 1])).toEqual([405, 915, 1515, 2220, 3020, 3920, 4915, 6010, 7200]);
  });

  it('posizione: a 725 passi è alla tappa 4 e mancano 10 passi', () => {
    expect(posizione(725)).toMatchObject({ tappeFatte: 4, mancanoPassi: 10, inCima: false });
    expect(posizione(7200).inCima).toBe(true);
  });
});

describe('forzieri', () => {
  it('enigma all’ultima tappa prima del forziere, poi lucchetto se mancano chiavi', () => {
    expect(statoForziere(2, 800, 3)).toBe('enigma'); // 5 tappe fatte su 6
    expect(statoForziere(2, 600, 3)).toBe('lontano'); // 4 tappe fatte
    expect(statoForziere(2, 915, 3)).toBe('mancano_chiavi');
    expect(statoForziere(2, 915, 4)).toBe('aperto');
    expect(statoForziere(9, 100, 0)).toBe('lontano');
  });
});

describe('passi delle azioni', () => {
  it('compiti in anticipo valgono il 30% in più', () => {
    expect(passiCompito(new Date(2026, 10, 26), new Date(2026, 10, 25))).toBe(10);
    expect(passiCompito(new Date(2026, 10, 26), new Date(2026, 10, 24))).toBe(13);
  });

  it('quiz a scalare', () => {
    expect(passiQuiz(1, 9, 10)).toBe(10);
    expect(passiQuiz(1, 8, 10)).toBe(6);
    expect(passiQuiz(2, 10, 10)).toBe(6);
    expect(passiQuiz(3, 5, 10)).toBe(2);
    expect(passiQuiz(4, 10, 10)).toBe(1);
    expect(passiQuiz(7, 3, 10)).toBe(1);
  });

  it('studio facoltativo solo con i compiti spuntati e fino a 4 per tipo', () => {
    expect(studioConta('flashcard', 0, false)).toBe(false);
    expect(studioConta('flashcard', 3, true)).toBe(true);
    expect(studioConta('video', 4, true)).toBe(false);
  });

  it('gesti di casa con tetto 6', () => {
    expect(passiGestiCasa(['letto'])).toBe(2);
    expect(passiGestiCasa(['letto', 'scrivania', 'vestiti', 'lavastoviglie'])).toBe(6);
  });

  it('voti: nessun voto toglie passi', () => {
    expect(passiVoto({ voto: 4 })).toBe(0);
    expect(passiVoto({ voto: 9 })).toBe(30);
    expect(passiVoto({ voto: 7, precedente: 6 })).toBe(25);
    expect(passiVoto({ voto: 6, precedente: 5, precedenteInsufficiente: true })).toBe(35);
  });
});

describe('chiavi della settimana', () => {
  const base = { passiPossibili: 100, passiFatti: 100, cosePossibili: 20, coseFatte: 20, note: 0 };
  it('tre chiavi con quasi tutto e nessuna nota', () => expect(chiaviSettimana(base)).toBe(3));
  it('una nota lascia al massimo una chiave', () => expect(chiaviSettimana({ ...base, note: 1 })).toBe(1));
  it('sotto il 70% nessuna chiave', () => expect(chiaviSettimana({ ...base, passiFatti: 69 })).toBe(0));
  it('due chiavi senza note ma non tutto fatto', () => expect(chiaviSettimana({ ...base, coseFatte: 17 })).toBe(2));
});

describe('bandierina e rimonta', () => {
  it('si ferma in vacanza e arriva in cima l’ultimo giorno', () => {
    expect(giornoDiScuola(new Date(2026, 11, 25))).toBe(false);
    expect(bandierina(new Date(2026, 11, 23))).toBe(bandierina(new Date(2027, 0, 6)));
    expect(bandierina(new Date(2027, 5, 4))).toBe(7200);
    expect(bandierina(new Date(2026, 10, 22))).toBe(0);
  });

  it('rimonta ×1,25 solo se indietro di oltre una tappa e mezza e con almeno una chiave', () => {
    expect(moltiplicatoreRimonta(1000, 1500, 1)).toBe(1.25);
    expect(moltiplicatoreRimonta(1000, 1500, 0)).toBe(1);
    expect(moltiplicatoreRimonta(1000, 1300, 2)).toBe(1);
  });
});
