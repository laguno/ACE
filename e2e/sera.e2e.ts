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
    impostazioni: [{ chiave: 'materiale_cartella', valore: { 1: ['Cartellina di tecnologia'] } }],
    impegni_famiglia: [
      { titolo: 'Allenamento Pallavolo Leilani U-13', inizio: '2026-11-09T14:00:00Z', tutto_il_giorno: false },
      { titolo: 'Tennis Leonardo', inizio: '2026-11-09T16:30:00Z', tutto_il_giorno: false },
      { titolo: 'Tennis Leonardo', inizio: '2026-11-10T16:30:00Z', tutto_il_giorno: false },
    ],
    serate: [],
    movimenti_passi: [],
  };
}

test.beforeEach(async ({ page }) => {
  // orologio finto: le spunte partono dopo i 5 secondi dell'Annulla, che qui si fanno scorrere
  await page.clock.install({ time: DOMENICA_SERA });
});

test('la sera mostra compiti, cartella del lunedì e fogli', async ({ page }) => {
  await finto(page, dati());
  await page.goto('/');
  await page.getByRole('button', { name: 'Sera' }).click();

  await expect(page.getByRole('heading', { name: 'Pronta per lunedì?' })).toBeVisible();
  await expect(page.getByText('0 su 5')).toBeVisible();
  await expect(page.getByText('Pag 12 es 3')).toBeVisible();
  await expect(page.getByText('Per mercoledì')).toHaveCount(0);
  await expect(page.getByText('Lady si è sdraiata sul quaderno di Matematica.')).toBeVisible();

  const cartella = page.locator('.carta', { has: page.getByRole('heading', { name: 'Cartella' }) });
  await expect(cartella.getByRole('checkbox')).toHaveCount(4);
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
  await expect(page.getByText('1 su 5')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Annulla' })).toBeVisible();
  expect(t.compiti[0].fatto_il).toBeNull(); // non ancora inviata
  await page.clock.runFor(5100);
  await expect.poll(() => t.compiti[0].fatto_il).not.toBeNull();

  const cartella = page.locator('.carta', { has: page.getByRole('heading', { name: 'Cartella' }) });
  for (const voce of ['Italiano', 'Tecnologia', 'Matematica']) await cartella.getByRole('checkbox', { name: voce, exact: typeof voce === 'string' }).check();
  expect(t.serate).toHaveLength(0); // la cartella è pronta solo con l'ultima voce
  await cartella.getByRole('checkbox', { name: 'Cartellina di tecnologia' }).check();
  await expect(page.getByText('2 su 5')).toBeVisible();
  await page.clock.runFor(5100);
  await expect.poll(() => t.serate[0]).toMatchObject({ data: '2026-11-08' });

  await page.getByRole('button', { name: "L'ho dato" }).click();
  await page.clock.runFor(5100);
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
  await page.clock.runFor(5100);
  await expect(page.getByRole('alert')).toHaveText('Spunta non salvata. Riprova.');
  await expect(page.getByRole('checkbox', { name: /Pag 12 es 3/ })).not.toBeChecked();
});

test('borsa dal calendario: domani allenamento alle 15, la porti a scuola', async ({ page }) => {
  const { chiamate, t } = await finto(page, dati());
  await page.goto('/');
  await page.getByRole('button', { name: 'Sera' }).click();

  const borsa = page.locator('.carta', { has: page.getByRole('heading', { name: 'Borsa' }) });
  await expect(borsa.getByText('Allenamento domani alle 15:00: la porti a scuola.')).toBeVisible();
  await expect(page.getByText('Domani in famiglia: Tennis Leonardo alle 17:30.', { exact: false })).toBeVisible();
  for (const voce of ['Divisa', 'Ginocchiere', 'Scarpe', 'Borraccia']) await borsa.getByRole('checkbox', { name: voce }).check();
  await expect(page.getByText('1 su 5')).toBeVisible();
  await page.clock.runFor(5100);
  await expect.poll(() => t.serate[0]?.borsa_il).toBeTruthy();
  await expect.poll(() => chiamate).toEqual([{ tipo: 'serata', id: '2026-11-08' }]);
});

test('senza allenamenti domani la borsa non c’è', async ({ page }) => {
  const d = dati();
  d.impegni_famiglia = [];
  await finto(page, d);
  await page.goto('/');
  await page.getByRole('button', { name: 'Sera' }).click();
  await expect(page.getByRole('heading', { name: 'Pronta per lunedì?' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Borsa' })).toHaveCount(0);
  await expect(page.getByText('0 su 4')).toBeVisible();
});

test('venerdì con partita sabato: chiusura breve con la sola borsa', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-13T20:00:00+01:00'));
  const d = dati();
  d.impegni_famiglia = [{ titolo: 'Partita Lani U13: SCANDIANO vs R-EVOLUTION', inizio: '2026-11-14T17:30:00Z', tutto_il_giorno: false }];
  (d as Record<string, unknown>).impostazioni = [{ chiave: 'ora_chiusura_breve', valore: '20:30' }];
  await finto(page, d);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Sera' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: 'Pronta per sabato?' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Borsa' })).toBeVisible();
  await expect(page.getByText('Partita domani alle 18:30.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Compiti per domani' })).toHaveCount(0);
  await expect(page.getByText('0 su 1')).toBeVisible();
});

test('Annulla entro 5 secondi: la spunta non parte', async ({ page }) => {
  const { chiamate, t } = await finto(page, dati());
  await page.goto('/');
  await page.getByRole('button', { name: 'Sera' }).click();
  await page.getByRole('checkbox', { name: /Pag 12 es 3/ }).check();
  await page.clock.runFor(3000);
  await page.getByRole('button', { name: 'Annulla' }).click();
  await expect(page.getByRole('checkbox', { name: /Pag 12 es 3/ })).not.toBeChecked();
  await page.clock.runFor(5000);
  expect(t.compiti[0].fatto_il).toBeNull();
  expect(chiamate).toEqual([]);
});
