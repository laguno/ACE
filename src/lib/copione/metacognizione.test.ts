import { describe, expect, it } from 'vitest';
import config from '../../../data/config-gioco.json';
import manifest from '../../../data/manifest.json';
import { MICRO_LEZIONI, PIANO, PREVISIONE } from './metacognizione';

const parole = (s: string) => s.trim().split(/\s+/).length;
const EMOJI = /\p{Extended_Pictographic}/u;
const RIMPROVERO = /\b(male|pigra|sbagli sempre|vergogna|devi)\b/i;

describe('copione della metacognizione', () => {
  it.each(MICRO_LEZIONI.map((l) => [l.id, l] as const))('lezione %s: titolo <= 4 parole, testo <= 25, posa vera, niente emoji', (_, l) => {
    expect(parole(l.titolo)).toBeLessThanOrEqual(config.popup.titolo_parole_max);
    expect(parole(l.testo)).toBeLessThanOrEqual(config.popup.parole_max);
    expect(parole(l.prova)).toBeLessThanOrEqual(config.popup.parole_max);
    expect(EMOJI.test(l.titolo + l.testo + l.prova)).toBe(false);
    expect(JSON.stringify(manifest)).toContain(l.posa);
  });

  it('lezioni con id diversi', () => {
    expect(new Set(MICRO_LEZIONI.map((l) => l.id)).size).toBe(MICRO_LEZIONI.length);
  });

  it('frasi di tendenza: brevi, senza rimproveri', () => {
    const frasi = [...Object.values(PIANO.tendenza), ...Object.values(PREVISIONE.tendenza), PREVISIONE.vicina, PREVISIONE.aiuto];
    for (const f of frasi) {
      expect(parole(f)).toBeLessThanOrEqual(config.popup.parole_max);
      expect(f).not.toMatch(RIMPROVERO);
      expect(EMOJI.test(f)).toBe(false);
    }
    expect(PIANO.confronto(20, 26)).toBe('Stima 20 min, vero 26 min.');
    expect(PREVISIONE.confronto('7½', '8')).toBe('Previsto 7½, preso 8.');
  });
});
