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

test('il popup è un dialog vero: Esc lo chiude e lo segna come visto, la pagina dietro non si tocca', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-09T16:00:00+01:00'));
  const { t } = await finto(page, coda());
  await page.goto('/');
  const d = page.getByRole('dialog');
  await expect(d).toContainText('Nota disciplinare in Storia');
  await expect(d).toBeFocused();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('main, nav'))).toBe(false);
  await page.keyboard.press('Escape');
  await expect(d).toHaveCount(0);
  expect(t.popup_coda.find((p) => p.id === 'p1')?.mostrato_il).toBeTruthy();
});

// Pulsanti con il gesto, come nelle bozze (critique del 10/11): bagno, lucchetto, enigma
const uno = (p: Record<string, unknown>) => ({ popup_coda: [{ id: 'x', priorita: 3, posa: 'lani-detective', figurina: null, mostrato_il: null, creato_il: '2026-11-24T15:00:00Z', ...p }] });

test('bagno: "Vado a sistemare"', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-24T16:00:00+01:00'));
  await finto(page, uno({ priorita: 1, situazione: 'bagno_mamma', posa: 'mamma-arrabbiata', titolo: 'Bagno da sistemare', testo: '−1. Ora: asciugamani appesi.' }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Vado a sistemare' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('lucchetto: la fila delle chiavi, prese e mancanti, e "Ho capito"', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-24T16:00:00+01:00'));
  await finto(page, { ...uno({ situazione: 'forziere_lucchetto', chiave: 'forziere:2:lucchetto', posa: 'papa-dispiaciuto', titolo: 'Servono chiavi', testo: 'Sei arrivata al forziere, ma servono 2 chiavi in più.' }), chiavi_totali: [{ chiavi: 2 }] });
  await page.goto('/');
  const fila = page.getByRole('img', { name: /chiavi su/ });
  await expect(fila).toBeVisible();
  const servono = (await fila.getAttribute('aria-label'))!.match(/(\d+) chiavi su (\d+)/)!;
  expect(Number(servono[1])).toBe(2);
  await expect(fila.locator('img')).toHaveCount(Number(servono[2]));
  await page.getByRole('button', { name: 'Ho capito' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('enigma: "Prova" porta su Astra al biglietto', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-24T16:00:00+01:00'));
  await finto(page, {
    ...uno({ situazione: 'enigma_comparso', chiave: 'forziere:1:enigma', titolo: 'Un biglietto', testo: 'Un biglietto vicino al forziere. Riesci a decifrarlo?' }),
    forzieri_lani: Array.from({ length: 9 }, (_, i) => ({ n: i + 1, stato: i === 0 ? 'enigma' : 'chiuso', enigma: i === 0 ? 'Rotonda e calda, con il pomodoro sopra' : null, premio: null, tentativi_enigma: 0, enigma_risolto_il: null })),
    saldo_passi: [{ passi: 300 }],
    chiavi_totali: [{ chiavi: 1 }],
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Prova' }).click();
  await expect(page.getByText('Rotonda e calda, con il pomodoro sopra')).toBeVisible();
});
