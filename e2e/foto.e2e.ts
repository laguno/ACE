import { expect, test } from '@playwright/test';
import { finto } from './finto';

// Da fotografare: le richieste aperte nel Pomeriggio di Lani e nella settimana dei genitori.
// "Fotografa" carica nel bucket, scrive foto_pagine e chiede i passi alla funzione (tipo foto).
const RICHIESTA = { id: 'r1', motivo: 'compito', materia_id: 'italiano', pagine: '340–352', stato: 'aperta', creato_il: '2026-12-01T13:00:00Z' };
// un JPEG minuscolo (1×1) per il campo file
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64',
);
const base = () => ({
  materie: [{ id: 'italiano', nome: 'Italiano' }],
  richieste_foto: [{ ...RICHIESTA }],
  compiti: [],
  verifiche: [],
  impostazioni: [{ chiave: 'ora_chiusura', valore: { 2: '20:30' } }],
  movimenti_passi: [],
  fogli_firma: [],
  impegni_famiglia: [],
  serate: [],
  sessioni_ripasso: [],
  flashcard: [],
  saldo_passi: [{ passi: 0 }],
});

test('Lani: Fotografa nel pomeriggio, +2 e la richiesta sparisce', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-01T15:00:00+01:00'));
  const { t, chiamate } = await finto(page, base(), { passi: { passi: 2 } });
  await page.goto('/');
  const carta = page.locator('.carta', { has: page.getByRole('heading', { name: 'Da fotografare' }) });
  await expect(carta).toContainText('Italiano: pagine 340–352');
  await expect(carta).toContainText('+2 ciascuna');
  await carta.getByLabel('Foto: Italiano: pagine 340–352').setInputFiles({ name: 'pagina.jpg', mimeType: 'image/jpeg', buffer: JPEG });
  await expect(carta.getByRole('status')).toHaveText('Foto salvata: +2.');
  await expect(carta).not.toContainText('pagine 340–352');
  expect(t.caricate[0].percorso).toMatch(/^foto-pagine\/r1\/\d+-0\.jpg$/);
  expect(t.foto_pagine[0]).toMatchObject({ richiesta_id: 'r1', materia_id: 'italiano', pagine: '340–352' });
  expect(chiamate).toContainEqual({ tipo: 'foto', id: 'r1' });
});

test('genitori: Da fotografare nella settimana', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-01T18:00:00+01:00'));
  const { t, chiamate } = await finto(page, {
    ...base(),
    profili: [{ id: 'lani', ruolo: 'genitore', nome: 'Papà' }],
    voti: [],
    note: [],
    gesti_casa: [],
    sgridate: [],
  });
  await page.goto('/');
  const carta = page.locator('.carta', { has: page.getByRole('heading', { name: 'Da fotografare' }) });
  await expect(carta).toContainText('Per un compito');
  await carta.getByLabel('Foto: Italiano: pagine 340–352').setInputFiles([
    { name: 'a.jpg', mimeType: 'image/jpeg', buffer: JPEG },
    { name: 'b.jpg', mimeType: 'image/jpeg', buffer: JPEG },
  ]);
  await expect(page.getByRole('status')).toContainText('Foto salvata: Italiano: pagine 340–352.');
  expect(t.caricate).toHaveLength(2);
  expect(t.foto_pagine).toHaveLength(2);
  expect(chiamate).toContainEqual({ tipo: 'foto', id: 'r1' });
});

test('niente richieste aperte: niente carta', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-01T15:00:00+01:00'));
  await finto(page, { ...base(), richieste_foto: [{ ...RICHIESTA, stato: 'fatta' }] });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /^Compiti per/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Da fotografare' })).toHaveCount(0);
});
