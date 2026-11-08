import { expect, test } from '@playwright/test';
import { finto } from './finto';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('prova-accoglienza', '1'));
  await page.clock.setFixedTime(new Date('2026-11-23T07:10:00+01:00'));
});

test('Lani: benvenuta in tre passi, poi Oggi; la seconda volta non torna', async ({ page }) => {
  await finto(page, { impostazioni: [], verifiche: [], movimenti_passi: [], fogli_firma: [], impegni_famiglia: [] });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Ciao, Lani!' })).toBeVisible();
  await page.screenshot({ path: 'e2e/risultati/benvenuta.png' });
  await page.getByRole('button', { name: 'Avanti' }).click();
  await expect(page.getByText('I passi ti fanno camminare, le chiavi aprono i forzieri.')).toBeVisible();
  await page.getByRole('button', { name: 'Avanti' }).click();
  await page.getByRole('button', { name: 'Inizia' }).click();
  await expect(page.getByRole('heading', { name: 'Buongiorno, Lani' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Buongiorno, Lani' })).toBeVisible();
});

test('genitori: le quattro cose con lo stato vero', async ({ page }) => {
  await finto(page, {
    profili: [{ id: 'lani', ruolo: 'genitore', nome: 'Mamma' }],
    sync_log: [{ fonte: 'nuvola', esito: 'ok', iniziato_il: '2026-11-22T13:30:00Z' }],
    forzieri: [{ n: 1, premio: 'Bici' }, ...Array.from({ length: 8 }, (_, i) => ({ n: i + 2, premio: null }))],
    voti: [], impostazioni: [], note: [], serate: [], movimenti_passi: [],
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Prepariamo ACE' })).toBeVisible();
  await expect(page.locator('.avvio li').nth(0)).toHaveClass('fatto');
  await expect(page.getByText('(ne mancano 8)', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Scegli i premi' }).click();
  await expect(page.getByText('8 forzieri ancora senza premio.', { exact: false })).toBeVisible();
});
