import { expect, test } from '@playwright/test';
import { finto } from './finto';

// Domenica 8 novembre 2026, 20:30: la sera prepara lunedì 9.
const DOMENICA_SERA = new Date('2026-11-08T20:30:00+01:00');

function dati() {
  return {
    materie: [
      { id: 'italiano', nome: 'Italiano' },
      { id: 'tecnologia', nome: 'Tecnologia' },
      { id: 'matematica', nome: 'Matematica' },
    ],
    compiti: [
      { id: 'c1', testo: 'Pag 12 es 3', scadenza: '2026-11-09', fatto_il: null, materia_id: 'matematica', creato_il: '1' },
      { id: 'c2', testo: 'Leggere pag 40', scadenza: '2026-11-09', fatto_il: null, materia_id: 'italiano', creato_il: '2' },
      { id: 'c3', testo: 'Per mercoledì', scadenza: '2026-11-11', fatto_il: null, materia_id: 'italiano', creato_il: '3' },
    ],
    lezioni: [
      { data: '2026-10-26', ora: 1, materia_id: 'italiano' },
      { data: '2026-10-26', ora: 3, materia_id: 'tecnologia' },
      { data: '2026-10-26', ora: 5, materia_id: 'matematica' },
      { data: '2026-10-27', ora: 1, materia_id: 'storia' },
    ],
    fogli_firma: [{ id: 'f1', titolo: 'Gita del benessere', scadenza: '2026-12-03', dato_il: null, consegnato_il: null }],
    impostazioni: [{ chiave: 'materiale_cartella', valore: { 1: ['Borsa di pallavolo: il pulmino ti prende a scuola', 'Cartellina di tecnologia'] } }],
    serate: [],
    movimenti_passi: [],
  };
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(DOMENICA_SERA);
});

test('la sera mostra compiti, cartella del lunedì e fogli', async ({ page }) => {
  await finto(page, dati());
  await page.goto('/');
  await page.getByRole('button', { name: 'Sera' }).click();

  await expect(page.getByRole('heading', { name: 'Pronta per lunedì?' })).toBeVisible();
  await expect(page.getByText('0 su 4')).toBeVisible();
  await expect(page.getByText('Pag 12 es 3')).toBeVisible();
  await expect(page.getByText('Per mercoledì')).toHaveCount(0);
  await expect(page.getByText('Lady si è sdraiata sul quaderno di Matematica.')).toBeVisible();

  const cartella = page.locator('.carta', { has: page.getByRole('heading', { name: 'Cartella' }) });
  await expect(cartella.getByRole('checkbox')).toHaveCount(5);
  await expect(cartella.getByText('Storia')).toHaveCount(0);
  await expect(page.getByRole('button', { name: "L'ho dato" })).toBeVisible();
  await page.screenshot({ path: 'e2e/risultati/sera.png', fullPage: true });
});

test('spunte: subito visibili, salvate, e la funzione passi chiamata', async ({ page }) => {
  const { chiamate, t } = await finto(page, dati());
  await page.goto('/');
  await page.getByRole('button', { name: 'Sera' }).click();

  await page.getByRole('checkbox', { name: /Pag 12 es 3/ }).check();
  await expect(page.getByRole('checkbox', { name: /Pag 12 es 3/ })).toBeDisabled();
  await expect(page.getByText('1 su 4')).toBeVisible();
  expect(t.compiti[0].fatto_il).not.toBeNull();

  const cartella = page.locator('.carta', { has: page.getByRole('heading', { name: 'Cartella' }) });
  for (const voce of ['Italiano', 'Tecnologia', 'Matematica', /Borsa di pallavolo/]) await cartella.getByRole('checkbox', { name: voce, exact: typeof voce === 'string' }).check();
  expect(t.serate).toHaveLength(0); // la cartella è pronta solo con l'ultima voce
  await cartella.getByRole('checkbox', { name: 'Cartellina di tecnologia' }).check();
  await expect(page.getByText('2 su 4')).toBeVisible();
  expect(t.serate[0]).toMatchObject({ data: '2026-11-08' });

  await page.getByRole('button', { name: "L'ho dato" }).click();
  await expect(page.getByText('Dato, aspetta la firma')).toBeVisible();

  await expect.poll(() => chiamate).toEqual([
    { tipo: 'compito', id: 'c1' },
    { tipo: 'serata', id: '2026-11-08' },
    { tipo: 'foglio', id: 'f1' },
  ]);
});

test('salvataggio fallito: la spunta torna indietro', async ({ page }) => {
  await finto(page, dati());
  await page.route('https://finto.supabase.test/rest/v1/compiti*', (r) =>
    r.request().method() === 'PATCH' ? r.fulfill({ status: 500, body: '{}' }) : r.fallback(),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Sera' }).click();
  await page.getByRole('checkbox', { name: /Pag 12 es 3/ }).check();
  await expect(page.getByRole('alert')).toHaveText('Spunta non salvata. Riprova.');
  await expect(page.getByRole('checkbox', { name: /Pag 12 es 3/ })).not.toBeChecked();
});
