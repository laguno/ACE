// Rete lenta: mai una schermata vuota, prima lo sticker di Lani poi la schermata (critique del 10/11).
import { expect, test } from '@playwright/test';
import { finto } from './finto';

test('rete lenta: Lani vede l\'attesa, poi Oggi', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-09T07:10:00+01:00'));
  await finto(page, { compiti: [], verifiche: [], impegni_famiglia: [], impostazioni: [], serate: [], movimenti_passi: [], fogli_firma: [] });
  // ogni lettura del Supabase finto arriva 1,5 s dopo (le route aggiunte dopo hanno la precedenza)
  await page.route('https://finto.supabase.test/rest/**', async (r) => {
    await new Promise((ok) => setTimeout(ok, 1500));
    await r.fallback();
  });
  await page.goto('/');
  await expect(page.locator('.attesa[aria-busy="true"] img')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Buongiorno/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.attesa')).toHaveCount(0);
});
