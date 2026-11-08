import { expect, test } from '@playwright/test';
import { finto } from './finto';

const PAPA = [{ id: 'lani', ruolo: 'genitore', nome: 'Papà' }]; // il finto entra sempre con id 'lani'

function dati() {
  return {
    profili: PAPA,
    voti: [{ voto: 7 }, { voto: 6.5 }],
    impostazioni: [
      { chiave: 'obiettivo_media', valore: 7.35 },
      { chiave: 'ora_chiusura', valore: { 1: '20:30' } },
      { chiave: 'materiale_cartella', valore: { 1: ['Cartellina di tecnologia'] } },
    ],
    note: [],
    serate: [],
    movimenti_passi: [],
    gesti_casa: [],
    sgridate: [],
    forzieri: Array.from({ length: 9 }, (_, i) => ({ n: i + 1, premio: null, enigma: null, soluzione: null, stato: 'chiuso' })),
    compiti: [{ id: 'c1', testo: 'Pag 12', fatto_il: '2026-11-09T15:00:00Z', materia_id: null }],
    fogli_firma: [{ id: 'f1', titolo: 'Gita del benessere', scadenza: '2026-12-03', dato_il: '2026-11-09T19:00:00Z', consegnato_il: null }],
  };
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-10T18:00:00+01:00'));
  page.on('dialog', (d) => d.accept(d.type() === 'prompt' ? 'ha detto di aver studiato' : undefined));
});

test('settimana: gesti di casa e sgridate chiamano i passi', async ({ page }) => {
  const { t, chiamate } = await finto(page, dati());
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Genitori' })).toBeVisible();
  await expect(page.locator('.numeri')).toContainText('6,75');
  await page.getByRole('button', { name: 'Scrivania in ordine +2' }).click();
  await expect(page.getByRole('status')).toContainText('Scrivania in ordine');
  expect(t.gesti_casa[0]).toMatchObject({ voce: 'scrivania' });
  await page.getByRole('button', { name: 'Balla −10' }).click();
  await expect.poll(() => t.sgridate[0]).toMatchObject({ tipo: 'balla', nota: 'ha detto di aver studiato' });
  await expect.poll(() => chiamate.map((c) => c.tipo)).toEqual(['gesto', 'sgridata']);
  await page.screenshot({ path: 'e2e/risultati/genitori.png', fullPage: true });
});

test('premi: salva il premio e chiede l’enigma', async ({ page }) => {
  const { t } = await finto(page, dati(), { enigma: { enigma: 'Ho due ruote…', soluzione: 'bici' } });
  await page.goto('/');
  await page.getByRole('button', { name: 'Premi' }).click();
  await expect(page.getByText('9 forzieri ancora senza premio.', { exact: false })).toBeVisible();
  const primo = page.locator('.carta', { hasText: 'Forziere 1' });
  await primo.getByLabel('Premio').fill('Una bici nuova');
  await primo.getByRole('button', { name: 'Salva e crea l’enigma' }).click();
  await expect(page.getByRole('status')).toHaveText('Forziere 1: premio salvato ed enigma pronto.');
  expect(t.forzieri[0].premio).toBe('Una bici nuova');
});

test('correzioni e fogli', async ({ page }) => {
  const { t, chiamate } = await finto(page, dati());
  await page.goto('/');
  await page.getByRole('button', { name: 'Correzioni' }).click();
  await page.getByRole('button', { name: 'Togli' }).click();
  await expect(page.getByRole('status')).toContainText('Spunta tolta');
  expect(t.compiti[0].fatto_il).toBeNull();
  await page.getByRole('button', { name: 'Fogli' }).click();
  await expect(page.getByText('Lani dice di averlo dato')).toBeVisible();
  await page.getByRole('button', { name: 'Firmato' }).click();
  await expect.poll(() => chiamate).toContainEqual({ tipo: 'foglio', id: 'f1' });
  expect(t.fogli_firma[0].consegnato_il).toBeTruthy();
});
