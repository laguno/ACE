import { expect, test } from '@playwright/test';
import { carica, finto } from './finto';

// Da fotografare: le richieste aperte nel Pomeriggio di Lani e nella settimana dei genitori.
// Ogni scatto va nel bucket e in foto_pagine; "Ho finito" chiede i passi alla funzione (tipo foto).
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

test('Lani: più scatti uno alla volta, contatore, poi "Ho finito" dà +2 e chiude', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-01T15:00:00+01:00'));
  const { t, chiamate } = await finto(page, base(), { passi: { passi: 2 } });
  await page.goto('/');
  const carta = page.locator('.carta', { has: page.getByRole('heading', { name: 'Da fotografare' }) });
  await expect(carta).toContainText('Italiano: pagine 340–352');
  // prova "+N dopo il gesto" (VALORE_DOPO_IL_GESTO in spunte.tsx): prima della foto il valore non si vede
  await expect(carta).not.toContainText('+2 ciascuna');
  const camera = carta.getByLabel('Fotocamera: Italiano: pagine 340–352');
  // come sul Samsung: la fotocamera restituisce uno scatto per volta
  await carica(page, camera, { name: 'p1.jpg', mimeType: 'image/jpeg', buffer: JPEG });
  await expect(carta).toContainText('1 pagina');
  await expect(carta.locator('.miniature img')).toHaveCount(1);
  expect(chiamate).toEqual([]);
  await carta.getByRole('button', { name: "Un'altra pagina" }).isEnabled();
  await carica(page, camera, { name: 'p2.jpg', mimeType: 'image/jpeg', buffer: JPEG });
  await expect(carta).toContainText('2 pagine');
  await carica(page, carta.getByLabel('Galleria: Italiano: pagine 340–352'), [
    { name: 'p3.jpg', mimeType: 'image/jpeg', buffer: JPEG },
    { name: 'p4.jpg', mimeType: 'image/jpeg', buffer: JPEG },
  ]);
  await expect(carta).toContainText('4 pagine');
  await expect(carta.locator('.miniature img')).toHaveCount(4);
  expect(t.foto_pagine).toHaveLength(4);
  expect(chiamate).toEqual([]);
  await carta.getByRole('button', { name: 'Ho finito' }).click();
  await expect(carta.getByRole('status')).toHaveText('Foto salvata: +2.');
  await expect(carta).toContainText('+2 ciascuna'); // dopo il gesto il valore compare
  await expect(carta).not.toContainText('pagine 340–352');
  expect(t.caricate[0].percorso).toMatch(/^foto-pagine\/r1\/\d+-0\.jpg$/);
  expect(t.foto_pagine[0]).toMatchObject({ richiesta_id: 'r1', materia_id: 'italiano', pagine: '340–352' });
  expect(chiamate).toEqual([{ tipo: 'foto', id: 'r1' }]);
});

test('Lani esce a metà: le foto restano e al ritorno si continua', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-01T15:00:00+01:00'));
  const { chiamate } = await finto(page, {
    ...base(),
    foto_pagine: [
      { id: 'f1', richiesta_id: 'r1', percorso_storage: 'r1/1-0.jpg', caricata_il: '2026-12-01T13:10:00Z' },
      { id: 'f2', richiesta_id: 'r1', percorso_storage: 'r1/2-0.jpg', caricata_il: '2026-12-01T13:11:00Z' },
    ],
  });
  await page.goto('/');
  const carta = page.locator('.carta', { has: page.getByRole('heading', { name: 'Da fotografare' }) });
  await expect(carta).toContainText('2 pagine');
  await expect(carta.getByRole('button', { name: "Un'altra pagina" })).toBeVisible();
  await carica(page, carta.getByLabel('Fotocamera: Italiano: pagine 340–352'), { name: 'p3.jpg', mimeType: 'image/jpeg', buffer: JPEG });
  await expect(carta).toContainText('3 pagine');
  expect(chiamate).toEqual([]);
});

// dal 16/11 la foto la fa Lani; i genitori la possono fare dalle 20 (o dalla scadenza), senza passi
test('genitori: foto mancante in Oggi (Da sapere), dopo le 20', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-01T20:30:00+01:00'));
  const { t, chiamate } = await finto(page, {
    ...base(),
    profili: [{ id: 'lani', ruolo: 'genitore', nome: 'Papà' }],
    voti: [],
    note: [],
    gesti_casa: [],
    sgridate: [],
  });
  await page.goto('/');
  const carta = page.getByRole('list', { name: 'Da sapere' }).getByRole('listitem').filter({ hasText: 'Foto: Italiano' });
  await expect(carta).toContainText('Lani non prende i passi');
  await carica(page, carta.getByLabel('Galleria: Italiano: pagine 340–352'), [
    { name: 'a.jpg', mimeType: 'image/jpeg', buffer: JPEG },
    { name: 'b.jpg', mimeType: 'image/jpeg', buffer: JPEG },
  ]);
  await expect(carta).toContainText('2 pagine');
  await carta.getByRole('button', { name: 'Ho finito' }).click();
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

test('Lani: ACE propone le pagine, contatore 3/13, "Ho finito" prepara i quiz con la percentuale', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-01T15:00:00+01:00'));
  const dati = { ...base(), verifiche: [{ id: 'v1', materia_id: 'italiano', tipo: 'verifica', data: '2026-12-03', recupero_vago: false, data_spostata: null, pagine_probabili: 'pag. 340-345' }] };
  const { t } = await finto(page, dati, { passi: { passi: 2 }, 'foto-studio': { carte: 8, domande: 6, restano: 0 } });
  const chiamateStudio: unknown[] = [];
  await page.route('https://finto.supabase.test/functions/v1/foto-studio', async (r) => {
    chiamateStudio.push(r.request().postDataJSON());
    await new Promise((ok) => setTimeout(ok, 600));
    await r.fallback();
  });
  await page.goto('/');
  const carta = page.locator('.carta', { has: page.getByRole('heading', { name: 'Da fotografare' }) });
  const scheda = page.getByRole('dialog', { name: 'Che pagine sono?' });
  const campo = scheda.getByLabel('Numeri di pagina delle foto');

  // due foto in galleria: ACE propone le prime due pagine che mancano
  await carta.getByLabel('Galleria: Italiano: pagine 340–352').setInputFiles([
    { name: 'a.jpg', mimeType: 'image/jpeg', buffer: JPEG },
    { name: 'b.jpg', mimeType: 'image/jpeg', buffer: JPEG },
  ]);
  await expect(campo).toHaveValue('340, 341');
  await scheda.getByRole('button', { name: 'Carica' }).click();
  await expect(carta).toContainText('2/13 pagine');
  await expect(carta).toContainText('Mancano: 342, 343');
  await expect(carta.locator('.pagine-pallini i.c-e')).toHaveCount(2);
  await expect(carta.locator('.pagine-pallini i.manca')).toHaveCount(11);

  // una foto: la proposta è la prossima che manca; la correggo a mano
  await carta.getByLabel('Fotocamera: Italiano: pagine 340–352').setInputFiles({ name: 'c.jpg', mimeType: 'image/jpeg', buffer: JPEG });
  await expect(campo).toHaveValue('342');
  await campo.fill('350');
  await scheda.getByRole('button', { name: 'Carica' }).click();
  await expect(carta).toContainText('3/13 pagine');
  expect(t.foto_pagine.map((f: { pagine_viste: string }) => f.pagine_viste)).toEqual(['340', '341', '350']);

  // annullo: non si carica niente
  await carta.getByLabel('Fotocamera: Italiano: pagine 340–352').setInputFiles({ name: 'd.jpg', mimeType: 'image/jpeg', buffer: JPEG });
  await scheda.getByRole('button', { name: 'Annulla' }).click();
  expect(t.foto_pagine).toHaveLength(3);

  await carta.getByRole('button', { name: 'Ho finito' }).click();
  const popup = page.getByRole('dialog', { name: 'Preparo i quiz' });
  await expect(popup).toBeVisible();
  await expect(popup).toContainText('%');
  await expect(popup).toBeHidden();
  expect(chiamateStudio).toEqual([{ richiesta_id: 'r1' }]);
  await expect(carta.getByRole('status')).toHaveText('Foto salvata: +2.');
});
