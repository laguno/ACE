// Taratura del percorso col simulatore vero (stesso codice delle Edge Functions, su PGlite).
// Prende il posto di simula_passi.py/.mjs, che con i numeri scritti a mano sovrastimava di circa
// 900 passi (misurato il 13/11). npm run simula: per ogni totale in TOTALI e ogni impegno, SEMI anni
// simulati; scrive docs/simulazione/taratura.md. Criterio di docs/01: cima con impegno 70/75/80/90%
// circa 4/40/86/100 su 100, e chi bara (furbetta) non deve andare meglio di chi fa l'80%.
process.env.TZ = 'Europe/Rome';
import { mkdirSync, writeFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, test, vi } from 'vitest';
import * as R from '../../src/lib/regole/index.ts';
import { PROFILI, simula, type Profilo } from './simula.ts';

/** Arrotondamento al pari (come Python), per rifare esattamente i costi decisi il 13/11. */
const alPari = (x: number) => {
  const f = Math.floor(x);
  const r = x - f;
  return r > 0.5 ? f + 1 : r < 0.5 ? f : f % 2 ? f + 1 : f;
};

/** 27 tappe che crescono in linea retta, multipli di 5, la prima in proporzione a 130 su 7.700. */
function costiPercorso(totale: number): number[] {
  const n = R.CONFIG.percorso.costi_tappe.length;
  const prima = 5 * Math.round((130 * totale) / 7700 / 5);
  const passo = (totale - n * prima) / ((n * (n - 1)) / 2);
  const costi = Array.from({ length: n }, (_, i) => 5 * alPari((prima + passo * i) / 5));
  costi[n - 1] += totale - costi.reduce((a, b) => a + b, 0);
  return costi;
}

test('i costi del config sono quelli della formula', () => {
  expect(costiPercorso(R.CONFIG.percorso.totale_passi)).toEqual(R.CONFIG.percorso.costi_tappe);
});

beforeAll(() => vi.useFakeTimers({ toFake: ['Date'] }));
afterAll(() => vi.useRealTimers());

const mediana = <T,>(xs: T[], n = xs.length) => [...xs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))[Math.floor(n / 2)];

test.skipIf(!process.env.TARATURA)('taratura del totale', { timeout: 36_000_000 }, async () => {
  const totali = (process.env.TOTALI ?? String(R.CONFIG.percorso.totale_passi)).split(',').map(Number);
  const semi = Number(process.env.SEMI ?? 10);
  const accesa = process.env.ACCESA ?? R.CONFIG.periodo.r_evolution_prevista;
  const profili: Profilo[] = [
    ...[0.7, 0.75, 0.8, 0.9].map((p, i) => ({ nome: `${Math.round(p * 100)}%`, descrizione: '', seme: 100 + i * 7, impegno: () => p })),
    PROFILI.find((x) => x.nome === 'furbetta')!,
  ];
  const originale = { ...R.CONFIG.percorso };
  const righe = [
    `# Taratura del percorso (simulatore vero)`,
    ``,
    `${semi} anni simulati per riga, R-Evolution accesa dal ${accesa}, partite il sabato e metà dei mercoledì. Rigenerare con \`npm run simula\` (variabili TOTALI, SEMI, ACCESA).`,
    ``,
    `| Totale | Profilo | Cima | Data mediana della cima | Passi a fine anno (mediana) |`,
    `|---|---|---|---|---|`,
  ];
  try {
    for (const totale of totali) {
      Object.assign(R.CONFIG.percorso, { totale_passi: totale, costi_tappe: costiPercorso(totale) });
      for (const p of profili) {
        const fine: number[] = [];
        const cime: string[] = [];
        for (let k = 0; k < semi; k++) {
          const r = await simula({ ...p, seme: p.seme + k * 1000, rEvolutionDa: accesa }, (t) => vi.setSystemTime(t));
          fine.push(r.giorni.at(-1)?.saldo ?? 0);
          if (r.cima) cime.push(r.cima);
        }
        righe.push(`| ${totale} | ${p.nome} | ${Math.round((100 * cime.length) / semi)}% | ${mediana(cime, semi) ?? '-'} | ${mediana(fine)} |`);
      }
    }
  } finally {
    Object.assign(R.CONFIG.percorso, originale);
  }
  mkdirSync('docs/simulazione', { recursive: true });
  writeFileSync('docs/simulazione/taratura.md', righe.join('\n') + '\n');
});
