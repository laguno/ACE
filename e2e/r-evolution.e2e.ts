import { expect, test } from '@playwright/test';
import { finto } from './finto';

// Sprint 2: la voce R-Evolution compare nella barra da periodo.r_evolution_da.
const dati = () => ({
  partite: [
    { id: 'p1', data: '2027-01-16', avversaria: 'Volley Bibbiano', set_nostri: 3, set_loro: 1 },
    { id: 'p2', data: '2027-01-09', avversaria: 'Pallavolo Montecchio', set_nostri: 2, set_loro: 3 },
  ],
  serate: [],
  movimenti_passi: [
    { motivo: 'partita', passi: 10, giorno: '2027-01-16', moltiplicatore: 1 },
    { motivo: 'partita_vinta', passi: 15, giorno: '2027-01-16', moltiplicatore: 1 },
  ],
  compiti: [],
  impegni_famiglia: [],
});

test('R-Evolution: partite con il risultato e passi presi in campo', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-18T10:00:00+01:00'));
  await finto(page, dati());
  await page.goto('/');
  await page.getByRole('button', { name: 'R-Evolution' }).click();
  await expect(page.getByRole('heading', { name: 'In campo' })).toBeVisible();
  await expect(page.getByText('Volley Bibbiano')).toBeVisible();
  await expect(page.getByText('3-1')).toHaveClass(/vinta/);
  await expect(page.getByText('2-3')).toHaveClass(/persa/);
  await page.screenshot({ path: 'e2e/risultati/r-evolution.png', fullPage: true });
});

test('R-Evolution: prima di gennaio la voce non c’è', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-14T10:00:00+01:00'));
  await finto(page, dati());
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Astra' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'R-Evolution' })).toHaveCount(0);
});

test('barra a cinque voci: a 360 px nessuna etichetta esce dal suo pulsante', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.clock.setFixedTime(new Date('2027-01-18T10:00:00+01:00'));
  await finto(page, dati());
  await page.goto('/');
  const voci = page.locator('.barra button');
  await expect(voci).toHaveCount(5);
  for (const b of await voci.all()) expect(await b.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
  await page.locator('.barra').screenshot({ path: 'e2e/risultati/barra-360.png' });
});
