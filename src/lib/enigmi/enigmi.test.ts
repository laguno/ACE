import { describe, expect, it } from 'vitest';
import * as E from './index';

describe('enigmi: parti meccaniche', () => {
  it('codice segreto: avanti di una, Z torna ad A, accenti tolti', () => {
    expect(E.cifra('Luci spente, Zorro è qui!')).toBe('MVDJ TQFOUF, APSSP F RVJ!');
    expect(E.cifra(E.cifra('ciao'), -1)).toBe('CIAO');
  });

  it('striscia: sopra la lettera del biglietto, sotto quella vera', () => {
    const r = E.striscia().split('\n');
    expect(r[0].startsWith('B C D')).toBe(true);
    expect(r[2].startsWith('A B C')).toBe(true);
    expect(r[4].endsWith('A')).toBe(true); // Z del biglietto non c'è: A viene da Z
    expect(Math.max(...r.map((x) => x.length))).toBeLessThanOrEqual(25);
  });

  it('ogni calcolo fa proprio il valore della lettera, per tutte le lettere e tutti i tipi', () => {
    const rng = E.casuale(7);
    for (let v = 1; v <= 26; v++)
      for (const t of ['potenza', 'frazione', 'percentuale', 'radice'] as const) expect(E.risolviCalcolo(E.calcolo(v, rng, t))).toBe(v);
  });

  it('codice matematico: i calcoli ridanno la parola', () => {
    const c = E.calcoli('Crema viso', E.casuale(3));
    expect(c.map((x) => String.fromCharCode(64 + E.risolviCalcolo(x))).join('')).toBe('CREMAVISO');
  });

  it('anagramma: stesse lettere, ordine diverso', () => {
    const a = E.anagramma('cappuccio', E.casuale(1));
    expect(E.stesseLettere(a, 'CAPPUCCIO')).toBe(true);
    expect(a.replace(/ /g, '')).not.toBe('CAPPUCCIO');
  });

  it('griglia: le coordinate rileggono il messaggio, e ogni lettera del messaggio è in una casella sola', () => {
    const g = E.griglia('Corti per il muro', E.casuale(9));
    expect(E.leggiGriglia(g.griglia, g.coordinate)).toBe('CORTI PER IL MURO');
    const celle = g.griglia.split('\n').slice(1).flatMap((r) => r.slice(3).split(' '));
    for (const c of new Set('CORTIPELMU')) expect(celle.filter((x) => x === c)).toHaveLength(1);
    expect(Math.max(...g.griglia.split('\n').map((r) => r.length))).toBeLessThanOrEqual(25);
  });

  it('acrostico: iniziali delle righe', () => {
    expect(E.iniziali(['Fa caldo', 'Indossi', '«Ogni»', 'che', 'Capelli', 'ora'])).toBe('FIOCCO');
  });

  it('cima: una lettera da ciascun forziere compone la parola, senza usare due volte lo stesso', () => {
    const parole = ['PIGIAMA', 'CINEMA', 'PANTALONCINI', 'SKINCARE', 'FELPA', 'PALLAVOLO', 'PARTITA', 'LIBRERIA'];
    const r = E.cima(parole, ['LUNAPARK', 'MONTAGNE'])!;
    expect(r.parola).toBe('MONTAGNE'); // LUNAPARK non si può: nessuna U
    expect(new Set(r.mappa.map((m) => m.forziere)).size).toBe(8);
    expect(r.mappa.map((m) => parole[m.forziere - 1][m.posizione - 1]).join('')).toBe('MONTAGNE');
    expect(E.cima(parole, ['ZZZZZZZZ'])).toBeNull();
  });
});

import TIPI from '../../../data/enigmi.json';

describe('data/enigmi.json: gli esempi tornano', () => {
  const es = (n: number) => TIPI.tipi.find((t) => t.forziere === n)!.esempio as Record<string, unknown> & { enigma: string };
  const blocchi = (testo: string) => testo.split('```').filter((_, i) => i % 2 === 1).map((b) => b.trim());

  it('nove tipi diversi, uno per forziere, difficoltà in salita', () => {
    expect(TIPI.tipi.map((t) => t.forziere)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(new Set(TIPI.tipi.map((t) => t.tipo)).size).toBe(9);
    expect(TIPI.tipi.map((t) => t.difficolta)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
  it('codice: il messaggio decifrato è italiano e la striscia è quella del codice', () => {
    const [msg, str] = blocchi(es(2).enigma);
    expect(E.cifra(msg, -1)).toBe('DUE RUOTE NUOVE E UN CAMPANELLO');
    expect(str).toBe(E.striscia());
  });
  it('acrostico: le iniziali fanno la parola nascosta', () => {
    expect(E.iniziali(es(3).enigma.split('\n'))).toBe(es(3).nascosta);
  });
  it('matematico: i calcoli fanno la parola', () => {
    const righe = blocchi(es(4).enigma)[0].split('\n').map((r) => r.replace(/^\d+\) /, ''));
    expect(righe.map((r) => String.fromCharCode(64 + E.risolviCalcolo(r))).join('')).toBe(es(4).parola);
  });
  it('anagramma: l’ultima parola mescolata è il premio', () => {
    const righe = blocchi(es(5).enigma)[0].split('\n');
    expect(E.stesseLettere(righe.at(-1)!.replace(/^\d+\) /, ''), es(5).parola as string)).toBe(true);
  });
  it('griglia: le coordinate rileggono il messaggio', () => {
    const [g] = blocchi(es(6).enigma);
    const coord = es(6).enigma.split('```')[2].trim().split('\n')[0].split(' / ').map((p) => p.split(' '));
    expect(E.leggiGriglia(g, coord)).toBe('ROTONDO E NUOVO'); // la prima riga (le colonne) si salta
  });
  it('cima: la tabella compone la parola dalle parole dei forzieri', () => {
    const e = es(9) as unknown as { enigma: string; parola: string; parole_dei_forzieri: string[] };
    const righe = blocchi(e.enigma)[0].split('\n');
    const lettere = righe.map((r) => {
      const [, f, p] = r.match(/forziere (\d+), la (\d+)ª/)!;
      return e.parole_dei_forzieri[Number(f) - 1][Number(p) - 1];
    });
    expect(lettere.join('')).toBe(e.parola);
  });
});
