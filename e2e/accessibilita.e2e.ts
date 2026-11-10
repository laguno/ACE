// Accessibilità con axe su ogni schermata (casi di e2e/casi.ts), a 390 px, tema chiaro e scuro.
// Zero violazioni (filone G): fa parte delle prove normali; npm run axe le lancia da sole.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { apri, CASI } from './casi';

for (const [nome, caso] of Object.entries(CASI))
  for (const tema of ['light', 'dark'] as const)
    test(`axe ${nome} (${tema})`, async ({ browser }, info) => {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'it-IT', timezoneId: 'Europe/Rome', reducedMotion: 'reduce', colorScheme: tema });
      const p = await ctx.newPage();
      await apri(p, caso);
      const { violations } = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
      await info.attach('axe', { body: JSON.stringify(violations.map((v) => ({ id: v.id, impatto: v.impact, nodi: v.nodes.length, esempio: v.nodes[0]?.target }))), contentType: 'application/json' });
      await ctx.close();
      expect(violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([]);
    });
