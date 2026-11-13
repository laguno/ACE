// Simulatore dell'anno: in npm test gira un profilo per 4 settimane (così non marcisce); con
// ANNO=1 (npm run simula:anno) tutti i profili per tutto l'anno, con i rapporti in docs/simulazione.
process.env.TZ = 'Europe/Rome';
import { mkdirSync, writeFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, test, vi } from 'vitest';
import { csv, PROFILI, rapporto, simula } from './simula.ts';

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
});
afterAll(() => {
  vi.useRealTimers();
});
const orologio = (t: Date) => vi.setSystemTime(t);

test('4 settimane del profilo normale: invarianti e passi', { timeout: 120_000 }, async () => {
  const r = await simula(PROFILI[1], orologio, '2026-11-23', '2026-12-20');
  expect(r.giorni).toHaveLength(28);
  expect(r.giorni.at(-1)?.saldo).toBeGreaterThan(0);
  expect(r.settimane).toHaveLength(4);
  // il database segue l'orologio finto: i movimenti hanno i giorni simulati
  expect(Object.keys(r.giorni[1].motivi).length).toBeGreaterThan(0);
  // R-Evolution accesa dal giorno previsto: dieci minuti e partite danno passi col codice vero
  const motivi = new Set(r.giorni.flatMap((g) => Object.keys(g.motivi)));
  expect(motivi).toContain('dieci_minuti');
  expect(motivi).toContain('partita');
});

test.skipIf(!process.env.ANNO)('anno intero, tutti i profili', { timeout: 3_600_000 }, async () => {
  mkdirSync('docs/simulazione', { recursive: true });
  const righe: string[] = [];
  for (const p of PROFILI) {
    const r = await simula(p, orologio);
    writeFileSync(`docs/simulazione/${p.nome}.md`, rapporto(r));
    writeFileSync(`docs/simulazione/${p.nome}.csv`, csv(r));
    const chiavi = r.settimane.map((s) => s.chiavi);
    righe.push(`${p.nome}: cima ${r.cima ?? 'no'}, passi ${r.giorni.at(-1)?.saldo}, chiavi ${chiavi.reduce((a, b) => a + b, 0)} (media ${(chiavi.reduce((a, b) => a + b, 0) / chiavi.length).toFixed(2)}), forzieri ${r.forzieri.filter((f) => f.aperto).length}`);
  }
  console.log(righe.join('\n'));
});
