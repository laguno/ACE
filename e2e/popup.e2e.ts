import { expect, test } from '@playwright/test';
import { finto } from './finto';

function coda() {
  return {
    popup_coda: [
      { id: 'p3', priorita: 4, posa: 'lani-pensierosa', titolo: 'Verifica in arrivo', testo: 'Verifica di Matematica: giovedì 12.', figurina: null, mostrato_il: null, creato_il: '2026-11-09T10:00:00Z' },
      { id: 'p1', priorita: 1, posa: 'mamma-arrabbiata', titolo: 'Nota', testo: 'Nota disciplinare in Storia. −20, e salta la seconda chiave. Stasera ne parliamo.', figurina: null, mostrato_il: null, creato_il: '2026-11-09T11:00:00Z' },
      { id: 'p2', priorita: 3, posa: 'lani-contenta', titolo: 'Tappa raggiunta', testo: 'Tappa 3! Alla prossima: 160 passi.', figurina: 'Nuova figurina: Lani contenta. Album 2/64.', mostrato_il: null, creato_il: '2026-11-09T09:00:00Z' },
      { id: 'vecchio', priorita: 1, posa: 'papa-arrabbiato', titolo: 'Vecchio', testo: 'Troppo vecchio.', figurina: null, mostrato_il: null, creato_il: '2026-11-01T09:00:00Z' },
    ],
  };
}

test('un popup per apertura, il più importante, poi segnato come visto', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-09T16:00:00+01:00'));
  const { t } = await finto(page, coda());
  await page.goto('/');
  await expect(page.getByRole('dialog')).toContainText('Nota disciplinare in Storia');
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.getByRole('button', { name: 'Ok' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(t.popup_coda.find((p) => p.id === 'p1')?.mostrato_il).toBeTruthy();
  expect(t.popup_coda.find((p) => p.id === 'p2')?.mostrato_il).toBeNull();
});

test('dopo le 21 il rimprovero aspetta: si vede la tappa, con la figurina', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-09T21:15:00+01:00'));
  await finto(page, coda());
  await page.goto('/');
  await expect(page.getByRole('dialog')).toContainText('Tappa 3! Alla prossima: 160 passi.');
  await expect(page.getByText('Nuova figurina: Lani contenta. Album 2/64.')).toBeVisible();
});
