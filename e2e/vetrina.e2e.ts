import { expect, test, type Page } from '@playwright/test';
import { finto } from './finto';
import { POPUP } from '../src/lib/copione';

const PAPA = [{ id: 'lani', ruolo: 'genitore', nome: 'Papà' }]; // il finto entra sempre con id 'lani'

async function apriVetrina(page: Page) {
  const scritture: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('finto.supabase.test') && !['GET', 'HEAD', 'OPTIONS'].includes(r.method())) scritture.push(`${r.method()} ${r.url()}`);
  });
  await page.clock.setFixedTime(new Date('2026-11-10T18:00:00+01:00'));
  await finto(page, { profili: PAPA, voti: [], impostazioni: [], note: [], serate: [], movimenti_passi: [] });
  await page.goto('/');
  await page.getByRole('button', { name: 'Altro' }).click();
  await page.getByRole('button', { name: /^Vetrina/ }).click();
  return scritture;
}

test('vetrina: tutti i popup del copione e le notifiche, senza scrivere niente', async ({ page }) => {
  const scritture = await apriVetrina(page);
  for (const g of ['Animazioni', 'Lodi', 'Rimproveri', 'Nota di merito', 'Tappe', 'Forzieri', 'Lucchetto', 'Enigma', 'Chiavi della domenica', 'Verifiche', 'Notifiche'])
    await expect(page.getByRole('heading', { name: g, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Altri', exact: true })).toHaveCount(0);
  for (const chiave of Object.keys(POPUP)) await expect(page.getByRole('button', { name: new RegExp(`\\(${chiave}\\)$`) })).toHaveCount(1);
  // segnaposto tutti riempiti
  await expect(page.locator('main')).not.toContainText('{');

  await page.getByRole('button', { name: 'Guarda: Forziere che si apre, con i coriandoli' }).click();
  const popup = page.getByRole('dialog');
  await expect(popup).toContainText('Forziere aperto');
  await expect(popup).toContainText('una serata al cinema');
  await expect(popup).toContainText('Album 13/64');
  await expect(page.locator('.coriandoli')).toBeAttached();
  await popup.getByRole('button', { name: 'Evviva!' }).click();
  await expect(popup).toHaveCount(0);

  // passi che salgono: fermo finché non si guarda, poi da 725 a 755 con +30
  const saldo = page.locator('.vetrina-saldo');
  await expect(saldo.locator('b')).toHaveText('725');
  await page.getByRole('button', { name: 'Guarda: Passi che salgono' }).click();
  await expect(saldo.getByText('+30')).toBeVisible();
  await expect(saldo.locator('b')).toHaveText('755');
  await saldo.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'e2e/risultati/vetrina-passi.png' });

  await page.getByRole('button', { name: /\(nota_disciplinare\)$/ }).click();
  await expect(page.locator('.bollino-malus')).toHaveText('−20');
  await page.getByRole('button', { name: 'Ok' }).click();

  await expect(page.getByText('Oggi verifica di tecnologia, borsa di pallavolo')).toBeVisible();
  expect(scritture).toEqual([]);
});

// Foto di ogni popup com'è davvero, per il signore e Jarvis: solo con npm run confronto.
test('vetrina: foto di ogni popup', async ({ page }) => {
  test.skip(!process.env.CONFRONTO, 'solo con npm run confronto');
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await apriVetrina(page);
  for (const chiave of Object.keys(POPUP)) {
    await page.getByRole('button', { name: new RegExp(`\\(${chiave}\\)$`) }).click();
    await page.getByRole('dialog').waitFor();
    await page.waitForTimeout(150);
    await page.screenshot({ path: `docs/confronto/vetrina/${chiave}.png` });
    await page.getByRole('dialog').getByRole('button').click();
  }
});
