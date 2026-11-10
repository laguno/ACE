// Icone centrate nei loro riquadri, su tutte le schermate (segnalazione del signore, 10/11: in Oggi
// le icone stavano in alto di 10 px perché una regola dei testi accanto rendeva flex anche il riquadro).
import { expect, test } from '@playwright/test';
import { apri, CASI } from './casi';

for (const [nome, caso] of Object.entries(CASI))
  test(`icone centrate: ${nome}`, async ({ page }) => {
    await apri(page, caso);
    const storte = await page.evaluate(() =>
      [...document.querySelectorAll('.riquadro')].flatMap((q) => {
        const a = q.getBoundingClientRect();
        const svg = q.querySelector('svg');
        if (!svg) return [];
        const s = svg.getBoundingClientRect();
        const dx = s.x + s.width / 2 - (a.x + a.width / 2);
        const dy = s.y + s.height / 2 - (a.y + a.height / 2);
        return Math.abs(dx) > 1 || Math.abs(dy) > 1 || Math.round(a.width) !== Math.round(a.height) ? [`${q.className}: ${a.width}×${a.height}, scarto ${dx.toFixed(1)}/${dy.toFixed(1)}`] : [];
      }),
    );
    expect(storte).toEqual([]);
  });
