import { expect, test } from '@playwright/test';
import { finto } from './finto';

// Sprint 2: lunedì 11 gennaio 2027, 20:00, dopo l'arrivo di R-Evolution (periodo.r_evolution_da).
const LUNEDI_SERA = new Date('2027-01-11T20:00:00+01:00');

const dati = (impegni: { titolo: string; inizio: string; tutto_il_giorno: boolean }[] = []) => ({
  materie: [],
  compiti: [],
  lezioni: [],
  fogli_firma: [],
  impostazioni: [],
  impegni_famiglia: impegni,
  serate: [] as Record<string, unknown>[],
  movimenti_passi: [],
});

test('dieci minuti: si sceglie, si avvia, si spunta solo in fondo', async ({ page }) => {
  await page.clock.install({ time: LUNEDI_SERA });
  const { chiamate, t } = await finto(page, dati());
  await page.goto('/');
  await page.getByRole('button', { name: 'Sera' }).click();

  const carta = page.locator('.carta', { has: page.getByRole('heading', { name: 'Dieci minuti' }) });
  await expect(carta.getByText(/^Dieci minuti: oggi .+\. Pronta\?$/)).toBeVisible();
  await carta.getByRole('radio', { name: 'Respirazione guidata' }).check();
  await carta.getByRole('button', { name: 'Avvia il timer' }).click();
  await expect.poll(() => t.serate[0]).toMatchObject({ data: '2027-01-11', dieci_minuti_esercizio: 'respiro' });
  await expect(carta.getByRole('button', { name: 'Vai fino in fondo' })).toBeDisabled();
  await page.screenshot({ path: 'e2e/risultati/dieci-minuti.png', fullPage: true });

  await page.clock.runFor(10 * 60 * 1000);
  await carta.getByRole('button', { name: 'Fatto' }).click();
  await expect(carta.getByText('Fatto: respirazione guidata. Bart approva.')).toBeVisible();
  await expect.poll(() => t.serate[0]?.dieci_minuti_il).toBeTruthy();
  await expect.poll(() => chiamate).toEqual([{ tipo: 'serata', id: '2027-01-11' }]);
});

test('dieci minuti: prima di R-Evolution non ci sono', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-12-14T20:00:00+01:00') });
  await finto(page, dati());
  await page.goto('/');
  await page.getByRole('button', { name: 'Sera' }).click();
  await expect(page.getByRole('heading', { name: /^Pronta per/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Dieci minuti' })).toHaveCount(0);
});
