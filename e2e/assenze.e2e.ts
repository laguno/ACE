import { expect, test } from '@playwright/test';
import { finto } from './finto';

// Genitori: "Lani a casa" sposta i compiti alla lezione dopo della materia (orario dalle lezioni
// di Nuvola) e rende "da recuperare" la verifica di quel giorno; "Sposta verifica" la rimette in
// calendario, anche "settimana prossima", e rifà il piano di ripasso.
const LUNEDI = new Date('2026-11-23T18:00:00+01:00');
const dati = () => ({
  profili: [{ id: 'lani', ruolo: 'genitore', nome: 'Papà' }],
  materie: [
    { id: 'geografia', nome: 'Geografia' },
    { id: 'spagnolo', nome: 'Spagnolo' },
  ],
  // orario: geografia martedì e venerdì, spagnolo martedì
  lezioni: [
    { data: '2026-11-17', ora: 1, materia_id: 'geografia' },
    { data: '2026-11-17', ora: 2, materia_id: 'spagnolo' },
    { data: '2026-11-20', ora: 1, materia_id: 'geografia' },
  ],
  compiti: [
    { id: 'c1', materia_id: 'geografia', testo: 'Cartina', scadenza: '2026-11-24', fatto_il: null },
    { id: 'c2', materia_id: 'spagnolo', testo: 'Verbi', scadenza: '2026-11-24', fatto_il: '2026-11-22T17:00:00Z' },
  ],
  verifiche: [{ id: 'v1', materia_id: 'spagnolo', tipo: 'verifica', data: '2026-11-24', recupero_vago: false, data_spostata: null }],
  assenze: [],
  voti: [],
  note: [],
  gesti_casa: [],
  sgridate: [],
  richieste_foto: [],
  serate: [],
  movimenti_passi: [],
  impostazioni: [],
});

test('Lani a casa: compito alla lezione dopo, verifica da recuperare, poi settimana prossima', async ({ page }) => {
  await page.clock.setFixedTime(LUNEDI);
  const { t } = await finto(page, dati());
  await page.goto('/');
  const casa = page.locator('form', { has: page.getByRole('heading', { name: 'Lani a casa' }) });
  await casa.getByLabel('Dal', { exact: true }).fill('2026-11-24');
  await casa.getByLabel('Al', { exact: true }).fill('2026-11-24');
  await casa.getByRole('button', { name: 'Segna Lani a casa' }).click();
  await expect(page.getByRole('status')).toHaveText('Lani a casa: martedì 24/11. Un compito spostato alla lezione dopo.');
  expect(t.assenze.map((a) => a.giorno)).toEqual(['2026-11-24']);
  // geografia di martedì va a venerdì 27; quello già fatto resta dov'è
  expect(t.compiti.find((c) => c.id === 'c1')?.scadenza_spostata).toBe('2026-11-27');
  expect(t.compiti.find((c) => c.id === 'c2')?.scadenza_spostata).toBeUndefined();
  await expect(casa).toContainText('A casa martedì 24/11');

  await page.reload();
  const verifiche = page.locator('.carta', { has: page.getByRole('heading', { name: 'Verifiche' }) });
  await expect(verifiche).toContainText('Da recuperare: era martedì 24/11, Lani a casa');
  await verifiche.getByRole('button', { name: 'Sposta verifica' }).click();
  await verifiche.getByRole('button', { name: 'Settimana prossima' }).click();
  await expect(page.getByRole('status')).toHaveText('Spagnolo: settimana prossima. Piano di ripasso rifatto.');
  expect(t['rpc/sposta_verifica']).toHaveLength(1);
  expect(t['rpc/sposta_verifica'][0]).toMatchObject({ p_id: 'v1', p_data: '2026-11-30', p_vago: true });
});

test('Sposta verifica senza assenza: nuova data scelta dal genitore', async ({ page }) => {
  await page.clock.setFixedTime(LUNEDI);
  const { t } = await finto(page, { ...dati(), verifiche: [{ id: 'v2', materia_id: 'geografia', tipo: 'verifica', data: '2026-11-27', recupero_vago: false, data_spostata: null }] });
  await page.goto('/');
  const verifiche = page.locator('.carta', { has: page.getByRole('heading', { name: 'Verifiche' }) });
  await expect(verifiche).toContainText('venerdì 27/11');
  await verifiche.getByRole('button', { name: 'Sposta verifica' }).click();
  await verifiche.getByLabel('Nuova data: Geografia').fill('2026-12-04');
  await verifiche.getByRole('button', { name: 'Salva' }).click();
  await expect(page.getByRole('status')).toHaveText('Geografia: venerdì 4/12. Piano di ripasso rifatto.');
  expect(t['rpc/sposta_verifica']).toHaveLength(1);
  expect(t['rpc/sposta_verifica'][0]).toMatchObject({ p_id: 'v2', p_data: '2026-12-04', p_vago: false });
});
