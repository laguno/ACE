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
  it('cruciverba: la colonna dell’esempio fa la parola nascosta', () => {
    const e = es(7) as unknown as { enigma: string; nascosta: string; voci: { parola: string }[] };
    expect(E.leggiCruciverba(blocchi(e.enigma)[0], e.voci.map((v) => v.parola))).toBe(e.nascosta);
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

describe('componi: il biglietto dal testo dell’IA', () => {
  const base = { soluzione: 'x / y', aiutino: 'Un aiuto.', parola: 'Cinema' };
  const rng = () => E.casuale(5);
  it('codice: cifra il messaggio e aggiunge la striscia', () => {
    const b = E.componi('codice', { ...base, presentazione: 'Un messaggio.', messaggio: 'Luci spente e schermo gigante', domanda: 'Cosa c’è?' }, rng());
    expect(b.enigma).toContain('MVDJ TQFOUF F TDIFSNP HJHBOUF');
    expect(b.enigma).toContain(E.striscia());
    expect(b.parola).toBe('CINEMA');
  });
  it('acrostico: rifiuta le iniziali sbagliate', () => {
    expect(() => E.componi('acrostico', { ...base, nascosta: 'ONDE', righe: ['Ogni', 'Nel', 'Di', 'Alla'] }, rng())).toThrow();
    expect(E.componi('acrostico', { ...base, nascosta: 'ONDE', righe: ['Ogni', 'Nel', 'Di', 'E'] }, rng()).enigma.split('\n')).toHaveLength(4);
  });
  it('matematico: due parole, calcoli numerati che tornano', () => {
    const b = E.componi('matematico', { ...base, parole: ['crema', 'viso'], finale: 'Fine.' }, rng());
    const calcoli = b.enigma.split('\n').filter((r) => /^\d+\) /.test(r)).map((r) => r.replace(/^\d+\) /, ''));
    expect(calcoli.map((c) => String.fromCharCode(64 + E.risolviCalcolo(c))).join('')).toBe('CREMAVISO');
    expect(b.enigma).toContain('Seconda parola');
  });
  it('anagramma: lettere mescolate e indizi numerati', () => {
    const b = E.componi('anagramma', { ...base, voci: [{ parola: 'tasca', indizio: 'Mani.' }, { parola: 'felpa', indizio: 'Calda.' }] }, rng());
    expect(b.enigma).toContain('due parole');
    expect(b.enigma).toContain('2) Calda.');
  });
  it('griglia: coordinate che rileggono il messaggio', () => {
    const b = E.componi('griglia', { ...base, messaggio: 'Corti per il muro', finale: 'Fine.' }, rng());
    const [, g, resto] = b.enigma.split('```');
    const coordinate = resto.trim().split('\n')[0].split(' / ').map((p) => p.split(' '));
    expect(E.leggiGriglia(g.trim(), coordinate)).toBe('CORTI PER IL MURO');
  });
  it('cima: tabella e parole dei forzieri nel biglietto; senza parole si ferma', () => {
    const parole = ['PIGIAMA', 'CINEMA', 'PANTALONCINI', 'SKINCARE', 'FELPA', 'PALLAVOLO', 'PARTITA', 'LIBRERIA'];
    const b = E.componi('cima', { ...base, parola: 'Gardaland', candidate: ['LUNAPARK', 'MONTAGNE'], finale: 'Russe.' }, rng(), parole);
    expect(b.enigma).toContain('1ª lettera: forziere');
    expect(b.enigma).toContain('PIGIAMA, CINEMA'); // le parole chiave nel biglietto (v4)
    expect(() => E.componi('cima', { ...base, candidate: ['MONTAGNE'] }, rng(), [])).toThrow();
  });
  it('cruciverba: colonna allineata che dà la parola, definizioni con la lunghezza, mai oltre 25 caratteri', () => {
    const voci = ['PANCHINA', 'LAVAGNA', 'RETE', 'TAPPETO', 'DIARIO', 'TAVOLO', 'CODA'].map((parola) => ({ parola, indizio: 'Indizio.' }));
    const b = E.componi('cruciverba', { ...base, nascosta: 'PARTITA', voci, finale: 'Fine.' }, rng());
    const [, g] = b.enigma.split('```');
    const righe = g.trim().split('\n');
    expect(new Set(g.split('\n').filter(Boolean).map((r) => r.indexOf('#'))).size).toBe(1);
    expect(E.leggiCruciverba(g.replace(/^\n|\n$/g, ''), voci.map((v) => v.parola))).toBe('PARTITA');
    expect(Math.max(...righe.map((r) => r.length))).toBeLessThanOrEqual(25);
    expect(b.enigma).toContain('1) Indizio. (8)');
    // una parola senza la lettera, o il numero sbagliato di parole: si rigenera
    expect(() => E.componi('cruciverba', { ...base, nascosta: 'PARTITA', voci: voci.map((v, i) => (i === 6 ? { ...v, parola: 'CANE' } : v)), finale: '' }, rng())).not.toThrow(); // CANE ha la A
    expect(() => E.componi('cruciverba', { ...base, nascosta: 'PARTITA', voci: voci.map((v, i) => (i === 6 ? { ...v, parola: 'BUIO' } : v)), finale: '' }, rng())).toThrow();
    expect(() => E.componi('cruciverba', { ...base, nascosta: 'PARTITA', voci: voci.slice(1), finale: '' }, rng())).toThrow();
  });
  it('indovinello senza testo: errore', () => {
    expect(() => E.componi('indovinello', { ...base }, rng())).toThrow();
  });
});

import { readFileSync } from 'node:fs';

describe('migrazione 0028: gli enigmi v4 salvati tornano', () => {
  const sql = readFileSync('supabase/migrations/0028_enigmi_v4.sql', 'utf8').replace(/\r\n/g, '\n');
  const forzieri = sql
    .split('update forzieri set ')
    .slice(1)
    .map((u) => ({
      n: Number(u.match(/where n = (\d)/)![1]),
      enigma: u.match(/enigma = '([\s\S]*?)',\n {2}soluzione/)![1].replace(/''/g, "'"),
      parola: u.match(/parola = '([A-Z]+)'/)![1],
    }));
  const blocco = (t: string) => t.split('```')[1].replace(/^\n|\n$/g, '');

  it('nove forzieri, parole chiave diverse', () => {
    expect(forzieri.map((f) => f.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(new Set(forzieri.map((f) => f.parola)).size).toBe(9);
  });
  it('7: il cruciverba dà PARTITA, e nel biglietto non ci sono parole del premio', () => {
    const f = forzieri[6];
    const parole = ['PANCHINA', 'LAVAGNA', 'RETE', 'TAPPETO', 'DIARIO', 'TAVOLO', 'CODA'];
    expect(E.leggiCruciverba(blocco(f.enigma), parole)).toBe('PARTITA');
    expect(f.enigma).not.toMatch(/partit|pallavol|serie a|bigliett/i);
  });
  it('9: la tabella della cima compone MONTAGNE dalle parole chiave salvate', () => {
    const parole = forzieri.slice(0, 8).map((f) => f.parola);
    const lettere = blocco(forzieri[8].enigma)
      .split('\n')
      .map((r) => {
        const [, f, p] = r.match(/forziere (\d+), la (\d+)ª/)!;
        return parole[Number(f) - 1][Number(p) - 1];
      });
    expect(lettere.join('')).toBe(forzieri[8].parola);
    expect(forzieri[8].enigma).toContain(parole.join(', '));
  });
});
