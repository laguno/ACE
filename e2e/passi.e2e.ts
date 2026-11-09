import { expect, test } from '@playwright/test';
import { finto } from './finto';

// Passi che salgono: se il saldo è cambiato dall'ultima volta che Lani l'ha visto, il numero va dal
// vecchio al nuovo con un "+N" che svanisce; la volta dopo è fermo. Il saldo visto lo tiene il server.
const MATTINA = new Date('2026-11-30T07:10:00+01:00');
const POMERIGGIO = new Date('2026-11-30T15:00:00+01:00');
const base = (visti?: number) => ({
  saldo_passi: [{ passi: 300 }],
  ...(visti === undefined ? {} : { saldo_visto: [{ passi: visti }] }),
  chiavi_totali: [{ chiavi: 0 }],
  settimane: [],
  forzieri_lani: Array.from({ length: 9 }, (_, i) => ({ n: i + 1, stato: 'chiuso', enigma: null, premio: null, tentativi_enigma: 0, enigma_risolto_il: null })),
  figurine: [],
  verifiche: [],
  impostazioni: [],
  movimenti_passi: [],
  fogli_firma: [],
  impegni_famiglia: [],
  serate: [],
  compiti: [],
});

test('Oggi: il saldo sale da 250 a 300 con +50, poi Astra è fermo', async ({ page }) => {
  await page.clock.setFixedTime(MATTINA);
  await finto(page, base(250));
  await page.goto('/');
  const saldo = page.locator('.testata .saldo');
  await expect(saldo.getByText('+50')).toBeVisible();
  await expect(saldo.locator('b')).toHaveText('300');
  await expect(saldo.getByText('300 passi')).toBeAttached();
  await page.screenshot({ path: 'e2e/risultati/passi-oggi.png' });
  await page.getByRole('button', { name: 'Astra' }).click();
  await expect(page.locator('.astra-saldi .saldo b')).toHaveText('300');
  await expect(page.locator('.contapassi-delta')).toHaveCount(0);
});

test('Astra: il saldo scende con −20', async ({ page }) => {
  await page.clock.setFixedTime(POMERIGGIO);
  const { t } = await finto(page, { ...base(320), saldo_visto: [{ passi: 320 }] });
  await page.goto('/');
  // Oggi ha già visto 320; poi arriva uno storno e Lani apre Astra
  await expect(page.locator('.testata .saldo b')).toHaveText('300');
  t.saldo_visto = [{ passi: 320 }];
  await page.getByRole('button', { name: 'Astra' }).click();
  await expect(page.locator('.astra-saldi').getByText('−20')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'e2e/risultati/passi-astra.png' });
  await expect(page.locator('.astra-saldi .saldo b')).toHaveText('300');
});

test('la prima volta niente animazione', async ({ page }) => {
  await page.clock.setFixedTime(MATTINA);
  await finto(page, base());
  await page.goto('/');
  await expect(page.locator('.testata .saldo b')).toHaveText('300');
  await expect(page.locator('.contapassi-delta')).toHaveCount(0);
});

test('movimento ridotto: subito il numero nuovo, niente +N', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(MATTINA);
  await finto(page, base(250));
  await page.goto('/');
  await expect(page.locator('.testata .saldo b')).toHaveText('300');
  await expect(page.locator('.contapassi-delta')).toHaveCount(0);
});
