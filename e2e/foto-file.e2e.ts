import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';
import { finto } from './finto';

// Da fotografare con file veri, generati qui con sharp (niente foto vere): 12 MP, EXIF ruotato,
// PNG enorme, HEIC che Chromium non apre, file che non è una foto, più pagine, caricamento
// interrotto, niente rete, fotocamera negata; e un genitore che cancella una foto sbagliata.
// Le regole pure (misure, tipi, errori) hanno le loro prove in src/lib/foto.

const RICHIESTA = { id: 'r1', motivo: 'compito', materia_id: 'italiano', pagine: '340–352', stato: 'aperta', creato_il: '2026-12-01T13:00:00Z' };
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
const MB = 1024 * 1024;

/** Pagina di libro finta: righe scure su carta, con grana da fotocamera (sigma più alto = più pesante). */
async function pagina(w: number, h: number, sigma = 25) {
  const righe = Array.from({ length: 60 }, (_, i) => `<rect x="${w * 0.08}" y="${h * 0.06 + i * h * 0.014}" width="${w * (0.6 + ((i * 37) % 25) / 100)}" height="${h * 0.006}" fill="#222"/>`).join('');
  const grana = await sharp({ create: { width: w, height: h, channels: 4, background: '#0000', noise: { type: 'gaussian', mean: 128, sigma } } }).png().toBuffer();
  return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#f4efe4"/>${righe}</svg>`)).composite([{ input: grana, blend: 'overlay' }]);
}

async function apri(page: Page, funzioni = { passi: { passi: 2 } }) {
  await page.clock.setFixedTime(new Date('2026-12-01T15:00:00+01:00'));
  const f = await finto(page, base(), funzioni);
  await page.goto('/');
  const carta = page.locator('.carta', { has: page.getByRole('heading', { name: 'Da fotografare' }) });
  await expect(carta).toContainText('Italiano: pagine 340–352');
  return { ...f, carta, input: carta.getByLabel('Foto: Italiano: pagine 340–352') };
}

const kb = (n: number) => `${Math.round(n / 1024)} KB`;

test('12 MP orizzontale (4000×3000): JPEG 1600×1200, leggero', async ({ page }) => {
  const { t, carta, input } = await apri(page);
  const foto = await (await pagina(4000, 3000)).jpeg({ quality: 92 }).toBuffer();
  await input.setInputFiles({ name: 'IMG_0001.jpg', mimeType: 'image/jpeg', buffer: foto });
  await expect(carta.getByRole('status')).toHaveText('Foto salvata: +2.');
  const [c] = t.caricate as { percorso: string; tipo: string; byte: Buffer }[];
  expect(c.tipo).toBe('image/jpeg');
  expect(c.percorso).toMatch(/^foto-pagine\/r1\/\d+-0\.jpg$/);
  expect(await sharp(c.byte).metadata()).toMatchObject({ format: 'jpeg', width: 1600, height: 1200 });
  expect(c.byte.length).toBeLessThan(1.5 * MB);
  test.info().annotations.push({ type: 'peso', description: `12 MP pagina: ${kb(foto.length)} -> ${kb(c.byte.length)}` });
});

test('12 MP caso peggiore (tutto grana): resta sotto i 10 MB', async ({ page }) => {
  const { t, carta, input } = await apri(page);
  const foto = await sharp({ create: { width: 3000, height: 4000, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 40 } } }).jpeg({ quality: 92 }).toBuffer();
  await input.setInputFiles({ name: 'rumore.jpg', mimeType: 'image/jpeg', buffer: foto });
  await expect(carta.getByRole('status')).toHaveText('Foto salvata: +2.');
  const [c] = t.caricate as { byte: Buffer }[];
  expect(await sharp(c.byte).metadata()).toMatchObject({ width: 1200, height: 1600 });
  expect(c.byte.length).toBeLessThan(3 * MB);
  test.info().annotations.push({ type: 'peso', description: `12 MP grana: ${kb(foto.length)} -> ${kb(c.byte.length)}` });
});

test('EXIF ruotato (orientation 6): la foto arriva dritta', async ({ page }) => {
  const { t, carta, input } = await apri(page);
  // dritta: 600×800, rossa sopra e blu sotto; il telefono la salva girata con il tag "ruota di 90°"
  const dritta = await sharp({ create: { width: 600, height: 800, channels: 3, background: '#0000ff' } })
    .composite([{ input: { create: { width: 600, height: 400, channels: 3, background: '#ff0000' } }, top: 0, left: 0 }])
    .png()
    .toBuffer();
  const salvata = await sharp(dritta).rotate(-90).withMetadata({ orientation: 6 }).jpeg().toBuffer();
  expect(await sharp(salvata).metadata()).toMatchObject({ width: 800, height: 600, orientation: 6 });
  await input.setInputFiles({ name: 'girata.jpg', mimeType: 'image/jpeg', buffer: salvata });
  await expect(carta.getByRole('status')).toHaveText('Foto salvata: +2.');
  const [c] = t.caricate as { byte: Buffer }[];
  const m = await sharp(c.byte).metadata();
  expect(m).toMatchObject({ width: 600, height: 800 });
  expect(m.orientation ?? 1).toBe(1);
  const pixel = async (top: number) => [...(await sharp(c.byte).extract({ left: 300, top, width: 1, height: 1 }).raw().toBuffer())];
  const [rs, , bs] = await pixel(100);
  const [ri, , bi] = await pixel(700);
  expect(rs).toBeGreaterThan(200);
  expect(bs).toBeLessThan(60);
  expect(bi).toBeGreaterThan(200);
  expect(ri).toBeLessThan(60);
});

test('PNG enorme (6000×4000, oltre 10 MB): diventa un JPEG leggero', async ({ page }) => {
  const { t, carta, input } = await apri(page);
  const png = await (await pagina(6000, 4000, 12)).png().toBuffer();
  expect(png.length).toBeGreaterThan(10 * MB);
  await input.setInputFiles({ name: 'schermata.png', mimeType: 'image/png', buffer: png });
  await expect(carta.getByRole('status')).toHaveText('Foto salvata: +2.');
  const [c] = t.caricate as { tipo: string; byte: Buffer }[];
  expect(c.tipo).toBe('image/jpeg');
  expect(await sharp(c.byte).metadata()).toMatchObject({ format: 'jpeg', width: 1600, height: 1067 });
  test.info().annotations.push({ type: 'peso', description: `PNG 6000×4000: ${kb(png.length)} -> ${kb(c.byte.length)}` });
});

test('HEIC che il browser non apre: si carica l’originale, come HEIC', async ({ page }) => {
  const { t, carta, input, chiamate } = await apri(page);
  // Chromium non decodifica HEIC: bastano byte qualsiasi con il nome dell'iPad e senza tipo (come su Windows)
  await input.setInputFiles({ name: 'IMG_0002.HEIC', mimeType: '', buffer: Buffer.alloc(200_000, 7) });
  await expect(carta.getByRole('status')).toHaveText('Foto salvata: +2.');
  const [c] = t.caricate as { percorso: string; tipo: string; byte: Buffer }[];
  expect(c.percorso).toMatch(/^foto-pagine\/r1\/\d+-0\.heic$/);
  expect(c.tipo).toBe('image/heic');
  expect(c.byte.length).toBe(200_000);
  expect(chiamate).toEqual([{ tipo: 'foto', id: 'r1' }]);
});

test('HEIC oltre 10 MB: messaggio chiaro, niente caricamento', async ({ page }) => {
  const { t, carta, input, chiamate } = await apri(page);
  await input.setInputFiles({ name: 'IMG_0003.heic', mimeType: 'image/heic', buffer: Buffer.alloc(11 * MB, 7) });
  await expect(carta.getByRole('alert')).toHaveText('Foto troppo grande: massimo 10 MB.');
  expect(t.caricate).toBeUndefined();
  expect(chiamate).toEqual([]);
  await expect(carta).toContainText('pagine 340–352');
});

test('un file che non è una foto: rifiutato, e se è in mezzo ad altre non parte niente', async ({ page }) => {
  const { t, carta, input, chiamate } = await apri(page);
  const foto = await (await pagina(800, 600)).jpeg().toBuffer();
  await input.setInputFiles([
    { name: 'pagina.jpg', mimeType: 'image/jpeg', buffer: foto },
    { name: 'compiti.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 finto') },
  ]);
  await expect(carta.getByRole('alert')).toHaveText('Questo file non è una foto.');
  expect(t.caricate).toBeUndefined();
  expect(t.foto_pagine ?? []).toHaveLength(0);
  expect(chiamate).toEqual([]);
  // un JPEG rotto (tipo giusto, contenuto no) passa come originale: lo controlla lo Storage
});

test('più pagine in un colpo, con la stessa foto due volte: una sola chiamata ai passi', async ({ page }) => {
  const { t, carta, input, chiamate } = await apri(page);
  const a = await (await pagina(1200, 900)).jpeg().toBuffer();
  const b = await (await pagina(900, 1200)).jpeg().toBuffer();
  await input.setInputFiles([
    { name: 'a.jpg', mimeType: 'image/jpeg', buffer: a },
    { name: 'b.jpg', mimeType: 'image/jpeg', buffer: b },
    { name: 'a-di-nuovo.jpg', mimeType: 'image/jpeg', buffer: a },
  ]);
  await expect(carta.getByRole('status')).toHaveText('Foto salvata: +2.');
  expect((t.caricate as { percorso: string }[]).map((c) => c.percorso.replace(/\d{6,}/, 'T'))).toEqual(['foto-pagine/r1/T-0.jpg', 'foto-pagine/r1/T-1.jpg', 'foto-pagine/r1/T-2.jpg']);
  expect(t.foto_pagine).toHaveLength(3);
  // il +2 una volta per richiesta lo garantisce il server: prova in scripts/simulatore/foto.test.ts
  expect(chiamate).toEqual([{ tipo: 'foto', id: 'r1' }]);
});

test('caricamento interrotto a metà: le foto salvate restano, "Riprova", poi si chiude', async ({ page }) => {
  const { t, carta, input, chiamate } = await apri(page);
  let n = 0;
  await page.route('https://finto.supabase.test/storage/v1/object/foto-pagine/**', (r) =>
    ++n === 2 ? r.fulfill({ status: 500, contentType: 'application/json', body: '{"statusCode":"500","error":"Internal","message":"rotto"}' }) : r.fallback(),
  );
  const foto = await (await pagina(800, 600)).jpeg().toBuffer();
  const tre = ['1', '2', '3'].map((x) => ({ name: `${x}.jpg`, mimeType: 'image/jpeg', buffer: foto }));
  await input.setInputFiles(tre);
  await expect(carta.getByRole('alert')).toHaveText('Foto non caricata. Riprova.');
  // la prima è salvata (file e riga), niente passi, la richiesta resta aperta e il pulsante pronto
  expect(t.caricate).toHaveLength(1);
  expect(t.foto_pagine).toHaveLength(1);
  expect(chiamate).toEqual([]);
  expect(t.richieste_foto[0].stato).toBe('aperta');
  await expect(carta.getByRole('button', { name: 'Fotografa' })).toBeEnabled();
  // si riprova con le stesse foto: tutto salvato, una chiamata ai passi
  await input.setInputFiles(tre);
  await expect(carta.getByRole('status')).toHaveText('Foto salvata: +2.');
  await expect(carta.getByRole('alert')).toHaveCount(0);
  expect(t.caricate).toHaveLength(4);
  expect(chiamate).toEqual([{ tipo: 'foto', id: 'r1' }]);
});

test('niente rete: messaggio chiaro, poi con la rete si carica', async ({ page, context }) => {
  const { t, carta, input, chiamate } = await apri(page);
  const foto = await (await pagina(800, 600)).jpeg().toBuffer();
  // setOffline spegne navigator.onLine ma le richieste intercettate passerebbero: le si fa cadere
  let senzaRete = true;
  await page.route('https://finto.supabase.test/**', (r) => (senzaRete ? r.abort('internetdisconnected') : r.fallback()));
  await context.setOffline(true);
  await input.setInputFiles({ name: 'p.jpg', mimeType: 'image/jpeg', buffer: foto });
  await expect(carta.getByRole('alert')).toHaveText('Niente rete. Riprova quando torna.');
  expect(t.caricate ?? []).toHaveLength(0);
  expect(chiamate).toEqual([]);
  // rete caduta ma il telefono crede di essere in linea: lo dice l'errore di fetch
  const errori: string[] = [];
  page.on('console', (m) => m.type() === 'error' && m.text().startsWith('foto') && errori.push(m.text()));
  await context.setOffline(false);
  await input.setInputFiles({ name: 'p.jpg', mimeType: 'image/jpeg', buffer: foto });
  await expect.poll(() => errori.length).toBe(1);
  await expect(carta.getByRole('alert')).toHaveText('Niente rete. Riprova quando torna.');
  expect(t.caricate ?? []).toHaveLength(0);
  senzaRete = false;
  await input.setInputFiles({ name: 'p.jpg', mimeType: 'image/jpeg', buffer: foto });
  await expect(carta.getByRole('status')).toHaveText('Foto salvata: +2.');
});

test('fotocamera negata o scelta annullata: niente errori, niente caricamento', async ({ page }) => {
  const { t, carta, chiamate } = await apri(page);
  const errori: string[] = [];
  page.on('pageerror', (e) => errori.push(e.message));
  const [scelta] = await Promise.all([page.waitForEvent('filechooser'), carta.getByRole('button', { name: 'Fotografa' }).click()]);
  expect(scelta.isMultiple()).toBe(true);
  await scelta.setFiles([]);
  await expect(carta.getByRole('button', { name: 'Fotografa' })).toBeEnabled();
  await expect(carta.getByRole('alert')).toHaveCount(0);
  expect(t.caricate).toBeUndefined();
  expect(chiamate).toEqual([]);
  expect(errori).toEqual([]);
});

test('genitore: cancella una foto sbagliata (riga e file), Lani la ritrova da fotografare', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-01T18:00:00+01:00'));
  const { t, chiamate } = await finto(page, {
    ...base(),
    profili: [{ id: 'lani', ruolo: 'genitore', nome: 'Papà' }],
    richieste_foto: [{ ...RICHIESTA, stato: 'fatta' }],
    foto_pagine: [{ id: 'fp1', richiesta_id: 'r1', materia_id: 'italiano', pagine: '340–352', percorso_storage: 'r1/1.jpg', caricata_il: '2026-12-01T14:00:00Z' }],
    caricate: [{ percorso: 'foto-pagine/r1/1.jpg' }],
    compiti: [],
    voti: [],
    note: [],
    gesti_casa: [],
    sgridate: [],
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Correzioni' }).click();
  const carta = page.locator('.carta', { has: page.getByRole('heading', { name: 'Foto delle pagine' }) });
  await expect(carta).toContainText('Italiano: pagine 340–352');
  await expect(carta.getByRole('img', { name: 'Italiano: pagine 340–352' })).toHaveAttribute('src', /\/storage\/v1\/object\/sign\/foto-pagine\/r1\/1\.jpg\?token=/);
  // si può ancora cambiare idea
  await carta.getByRole('button', { name: 'Cancella la foto di Italiano: pagine 340–352' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Annulla' }).click();
  expect(t.foto_pagine).toHaveLength(1);
  await carta.getByRole('button', { name: 'Cancella la foto di Italiano: pagine 340–352' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancella' }).click();
  await expect(page.getByRole('status')).toHaveText('Foto cancellata. Lani la ritrova da fotografare.');
  expect(t.foto_pagine).toHaveLength(0);
  expect(t.cancellate).toEqual([{ percorso: 'foto-pagine/r1/1.jpg' }]);
  expect(t.caricate).toEqual([]);
  expect(t.richieste_foto[0].stato).toBe('fatta');
  expect(chiamate).toEqual([]);
  await expect(page.getByRole('heading', { name: 'Foto delle pagine' })).toHaveCount(0);
});
