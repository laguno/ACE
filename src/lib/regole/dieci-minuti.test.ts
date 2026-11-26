import { describe, expect, it } from 'vitest';
import {
  CARTE,
  DIECI,
  carta,
  durataTotale,
  esercizioInVista,
  eserciziDellaSessione,
  esitoRecord,
  faseA,
  fumetto,
  mescola,
  mostraRecord,
  recordDellaCarta,
  riscaldamentoDi,
  scaletta,
  segnale,
  suCosa,
  usciteInSettimana,
} from './dieci-minuti.ts';

const D = DIECI.durate;
const fasi = scaletta();
const sempre = (x: number) => () => x;

describe('dieci minuti: scaletta comune a tutte le carte', () => {
  it('1 minuto di riscaldamento, 8 blocchi da 40" + 20", 1 minuto di record: dieci minuti', () => {
    expect(fasi).toHaveLength(1 + 2 * D.blocchi + 1);
    expect(fasi[0]).toEqual({ tipo: 'riscaldamento', da: 0, a: 60 });
    expect(fasi[1]).toEqual({ tipo: 'lavoro', da: 60, a: 100, blocco: 0 });
    expect(fasi[2]).toEqual({ tipo: 'pausa', da: 100, a: 120, blocco: 0 });
    expect(fasi.at(-1)).toEqual({ tipo: 'record', da: 540, a: 600 });
    expect(durataTotale(fasi)).toBe(600);
  });

  it('dura quanto conta il server per i passi (config-gioco dieci_minuti.secondi)', async () => {
    const { CONFIG } = await import('./index.ts');
    expect(durataTotale(fasi)).toBe(CONFIG.dieci_minuti.secondi);
  });

  it('la fase si calcola dai secondi passati (anche dopo lo schermo spento)', () => {
    expect(faseA(fasi, 0)).toEqual({ fase: fasi[0], mancano: 60 });
    expect(faseA(fasi, 59.2)?.mancano).toBe(1);
    expect(faseA(fasi, 305)?.fase).toMatchObject({ tipo: 'lavoro', blocco: 4 });
    expect(faseA(fasi, 599.9)?.fase.tipo).toBe('record');
    expect(faseA(fasi, 600)).toBeNull();
  });

  it('le durate vengono dal config', () => {
    expect(durataTotale(scaletta({ ...D, riscaldamento: 10, blocchi: 2, lavoro: 5, pausa: 3, record: 7 }))).toBe(10 + 2 * 8 + 7);
  });
});

describe('dieci minuti: le sette carte', () => {
  it('sette carte numerate da 1 a 7, nomi di al massimo quattro parole', () => {
    expect(CARTE.map((c) => c.n)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const nomi = CARTE.flatMap((c) => [c.nome, ...c.esercizi.map((e) => e.nome), ...riscaldamentoDi(c).map((e) => e.nome)]);
    for (const n of nomi) expect(n.split(/\s+/).length, n).toBeLessThanOrEqual(4);
  });

  it('pesanti 1, 2, 5; leggere 3, 4, 6, 7', () => {
    expect(CARTE.filter((c) => c.peso === 'pesante').map((c) => c.n)).toEqual([1, 2, 5]);
    expect(CARTE.filter((c) => c.peso === 'leggera').map((c) => c.n)).toEqual([3, 4, 6, 7]);
  });

  it('nessuna sedia al muro, niente lani in divisa', () => {
    const tutto = JSON.stringify(DIECI).toLowerCase();
    expect(tutto).not.toMatch(/sedia/);
    expect(tutto).not.toMatch(/lani-(festeggia|divisa|stanca)/);
  });

  it('i trick della carta 4 hanno tre righe di "Come si fa"', () => {
    const c = carta(4)!;
    expect(c.esercizi).toHaveLength(9);
    for (const t of c.esercizi) expect(t.come).toHaveLength(3);
  });

  it('riscaldamento uguale per tutte, la carta 4 tiene il suo con la palla', () => {
    expect(riscaldamentoDi(carta(1)!)).toBe(DIECI.riscaldamento);
    expect(riscaldamentoDi(carta(7)!)).toBe(DIECI.riscaldamento);
    expect(riscaldamentoDi(carta(4)!).map((e) => e.id)).toEqual(['palleggio-base', 'bagher-base']);
  });
});

describe('dieci minuti: esercizi degli 8 blocchi', () => {
  it('con meno di 8 esercizi si ripetono in ordine fisso', () => {
    expect(eserciziDellaSessione(carta(1)!).map((e) => e.id)).toEqual(['squat', 'affondi', 'affondi-laterali', 'salti-stella', 'ponte-glutei', 'squat', 'affondi', 'affondi-laterali']);
    expect(eserciziDellaSessione(carta(7)!).map((e) => e.id)).toEqual(['respirazione', 'scansione', 'allungamento-dolce', 'respirazione', 'scansione', 'allungamento-dolce', 'respirazione', 'scansione']);
  });

  it('carte 3 e 4: otto diversi in ordine casuale', () => {
    for (const n of [3, 4]) {
      const s = eserciziDellaSessione(carta(n)!);
      expect(s).toHaveLength(8);
      expect(new Set(s.map((e) => e.id)).size).toBe(8);
    }
    const a = eserciziDellaSessione(carta(4)!, false, sempre(0)).map((e) => e.id);
    const b = eserciziDellaSessione(carta(4)!, false, sempre(0.99)).map((e) => e.id);
    expect(a).not.toEqual(b);
  });

  it('carta 3 col visore: Beat Saber per tutti i blocchi e la combo più lunga; senza, la palla e le prese di fila', () => {
    expect(new Set(eserciziDellaSessione(carta(3)!, true).map((e) => e.id))).toEqual(new Set(['beat-saber']));
    expect(recordDellaCarta(carta(3)!, true)).toMatchObject({ tipo: 'numero', su: 'Combo più lunga' });
    expect(recordDellaCarta(carta(3)!)).toMatchObject({ tipo: 'numero', su: 'Prese di fila' });
  });

  it('il visore conta solo nella carta 3', () => {
    expect(eserciziDellaSessione(carta(1)!, true)[0].id).toBe('squat');
  });

  it('mescola non cambia il mazzo di partenza', () => {
    const m = [1, 2, 3, 4];
    mescola(m, sempre(0));
    expect(m).toEqual([1, 2, 3, 4]);
  });
});

describe('dieci minuti: record', () => {
  it('ogni carta ha il suo; la Calma nessuno', () => {
    expect(recordDellaCarta(carta(1)!)).toMatchObject({ tipo: 'numero', su: 'Squat in 30 secondi' });
    expect(recordDellaCarta(carta(2)!)).toMatchObject({ su: 'Secondi di plank' });
    expect(recordDellaCarta(carta(5)!)).toMatchObject({ su: 'Secondi su una gamba' });
    expect(recordDellaCarta(carta(6)!)).toMatchObject({ tipo: 'scelta', valori: ['Ginocchia', 'Caviglie', 'Punte', 'Oltre'] });
    expect(recordDellaCarta(carta(7)!)).toBeNull();
  });

  it('carta 4: il record è su uno dei trick della sessione; le altre sull\'esercizio del config', () => {
    const s = eserciziDellaSessione(carta(4)!);
    expect(s.map((e) => e.nome)).toContain(suCosa(carta(4)!.record!, s));
    expect(suCosa(carta(2)!.record!, [])).toBe('Secondi di plank');
  });

  it('carta 6: si mostra la parola', () => {
    expect(mostraRecord(carta(6)!.record!, 2)).toBe('Punte');
    expect(mostraRecord(carta(1)!.record!, 14)).toBe('14');
  });

  it('si festeggia solo quando batte il migliore', () => {
    expect(esitoRecord(undefined, 5)).toBe('primo');
    expect(esitoRecord(5, 6)).toBe('battuto');
    expect(esitoRecord(5, 5)).toBe('resta');
    expect(esitoRecord(5, 2)).toBe('resta');
  });
});

describe('dieci minuti: schermo, segnali e fumetti', () => {
  const s = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  it('il blocco nel lavoro, il prossimo nella pausa e alla fine del riscaldamento', () => {
    expect(esercizioInVista(fasi[1], 30, s)).toEqual({ esercizio: 'a', prossimo: false });
    expect(esercizioInVista(fasi[2], 10, s)).toEqual({ esercizio: 'b', prossimo: true });
    expect(esercizioInVista(fasi[0], 15, s)).toEqual({ esercizio: 'a', prossimo: true });
    expect(esercizioInVista(fasi[0], 40, s)).toBeNull();
    expect(esercizioInVista(fasi.at(-2)!, 10, s)).toBeNull();
  });

  it('"3, 2, 1" alla fine di ogni fase, "cambio" all\'inizio della successiva, avviso a 10"', () => {
    expect(segnale(fasi[1], 40)).toBe('cambio');
    expect(segnale(fasi[1], 10)).toBe('avviso');
    expect(segnale(fasi[1], 3)).toBe('conto');
    expect(segnale(fasi[0], 60)).toBeNull();
    expect(segnale(fasi.at(-1)!, 2)).toBeNull();
  });

  it('il fumetto segue la fase e la carta', () => {
    expect(fumetto(fasi[1], 30)).toBe(DIECI.fumetti.lavoro);
    expect(fumetto(fasi[1], 30, carta(4))).toBe('Vai, tocchi puliti!');
    expect(fumetto(fasi[1], 3, carta(4))).toBe(DIECI.fumetti.cambio);
    expect(fumetto(fasi.at(-1)!, 30, carta(7), false)).toBe(DIECI.fumetti.calma);
    expect(fumetto(fasi.at(-1)!, 30, carta(1))).toBe(DIECI.fumetti.record);
    expect(fumetto(null, 0)).toBe(DIECI.fumetti.fine);
  });
});

describe('dieci minuti: mazzo della settimana (spicchi spenti)', () => {
  it('conta solo le carte uscite da lunedì a oggi', () => {
    const giorni = [
      { data: '2026-11-22', carta: 3 }, // domenica della settimana prima
      { data: '2026-11-23', carta: 1 }, // lunedì
      { data: '2026-11-24', carta: 6 },
      { data: '2026-11-25', carta: 4 }, // mercoledì, oggi
    ];
    expect(usciteInSettimana(giorni, '2026-11-25').sort()).toEqual([1, 4, 6]);
    expect(usciteInSettimana(giorni, '2026-11-23')).toEqual([1]);
    expect(usciteInSettimana(giorni, '2026-11-22')).toEqual([3]);
  });
});

describe('sfondi', () => {
  const luce = (rgb: number[]) => {
    const [r, g, b] = rgb.map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  it('il testo bianco sulla base nera al 50% ha contrasto almeno 4,5 su ogni fondo', () => {
    const temi = CARTE.flatMap((c) => (c.tema ? [c.tema] : []));
    expect(temi.length).toBeGreaterThan(0);
    for (const tema of temi) {
      const base = [1, 3, 5].map((i) => parseInt(tema.fondo.slice(i, i + 2), 16) * 0.5);
      expect(1.05 / (luce(base) + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
