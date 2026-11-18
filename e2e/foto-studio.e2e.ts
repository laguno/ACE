import { expect, test } from '@playwright/test';
import { carica, finto } from './finto';

// Genitori: aggiungere foto a una richiesta già chiusa da Lani (Scienze), con i dati veri di Nuvola
// del 18/11: la prova chiede pag. 100-107 e 110-117, la richiesta ne ha solo quattro.
// Si prova: pagine caricate e mancanti, campo a mano ben disegnato, popup di caricamento con la
// percentuale, popup "Preparo i quiz" con la percentuale, fotocamera che si apre davvero.
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64',
);
const PAGINE_PROBABILI = 'pag. 100-107, 110-117 (vol. A). Alle pag. 116-117 studia solo i 5 tipi di reazioni con la definizione. Ripassa anche le mappe di pag. 114-115 sul registro.';
const dati = () => ({
  profili: [{ id: 'lani', ruolo: 'genitore', nome: 'Papà' }],
  materie: [{ id: 'scienze', nome: 'Scienze' }],
  richieste_foto: [{ id: 'r1', motivo: 'compito', materia_id: 'scienze', pagine: '100, 107, 110, 117', stato: 'fatta', creato_il: '2026-11-18T13:00:00Z' }],
  foto_pagine: [
    { id: 'f1', richiesta_id: 'r1', percorso_storage: 'r1/1-0.jpg', caricata_il: '2026-11-18T19:10:00Z', pagine_viste: '100, 101, 102, 103, 104, 105, 106', studio_il: null },
    { id: 'f2', richiesta_id: 'r1', percorso_storage: 'r1/2-0.jpg', caricata_il: '2026-11-18T19:11:00Z', pagine_viste: '114, 115', studio_il: null },
  ],
  verifiche: [{ id: 'v1', materia_id: 'scienze', tipo: 'verifica', data: '2026-11-19', recupero_vago: false, data_spostata: null, pagine_probabili: PAGINE_PROBABILI }],
  compiti: [],
  impostazioni: [{ chiave: 'ora_chiusura', valore: { 3: '20:30' } }],
  movimenti_passi: [],
  fogli_firma: [],
  impegni_famiglia: [],
  serate: [],
  sessioni_ripasso: [],
  flashcard: [],
  voti: [],
  note: [],
  gesti_casa: [],
  sgridate: [],
  assenze: [],
});

test('genitori: richiesta chiusa, pagine mancanti, campo a mano, caricamento e quiz con percentuale', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-18T21:20:00+01:00'));
  const { t } = await finto(page, dati(), { 'foto-studio': { carte: 8, domande: 6, restano: 0 } });
  // il caricamento e la funzione impiegano un po': la percentuale si deve vedere
  await page.route('https://finto.supabase.test/storage/v1/object/foto-pagine/**', async (r) => {
    await new Promise((ok) => setTimeout(ok, 700));
    await r.fallback();
  });
  await page.route('https://finto.supabase.test/functions/v1/foto-studio', async (r) => {
    await new Promise((ok) => setTimeout(ok, 700));
    await r.fallback();
  });
  await page.goto('/');
  const riga = page.getByRole('list', { name: 'Aggiungi foto' }).getByRole('listitem').filter({ hasText: 'Scienze' });
  await expect(riga).toContainText('Chiusa da Lani');

  // mancano le pagine della PROVA (100-107, 110-117), non solo le quattro della richiesta
  await expect(riga).toContainText('Mancano: 107, 110, 111, 112, 113, 116, 117');

  // campo a mano: disegnato (bordo, altezza da dito), non il campo nudo del browser
  const campo = riga.getByLabel('Pagine già caricate');
  const stile = await campo.evaluate((e) => {
    const s = getComputedStyle(e);
    return { bordo: parseFloat(s.borderTopWidth), alto: e.getBoundingClientRect().height, raggio: parseFloat(s.borderTopLeftRadius) };
  });
  expect(stile.bordo).toBeGreaterThanOrEqual(2);
  expect(stile.alto).toBeGreaterThanOrEqual(44);
  expect(stile.raggio).toBeGreaterThanOrEqual(8);
  await campo.fill('110-113');
  await riga.getByRole('button', { name: 'Segna' }).click();
  await expect(riga).toContainText('Mancano: 107, 116, 117');

  // carico una foto: popup con barra e percentuale
  await carica(page, riga.getByLabel('Galleria: Scienze: pagine 100, 107, 110, 117'), { name: 'p.jpg', mimeType: 'image/jpeg', buffer: JPEG });
  const popup = page.getByRole('dialog', { name: 'Carico le foto' });
  await expect(popup).toBeVisible();
  await expect(popup.getByRole('progressbar')).toBeVisible();
  await expect(popup).toContainText('%');
  await expect(popup).toBeHidden();
  expect(t.caricate).toHaveLength(1);
  expect(t.foto_pagine).toHaveLength(3);

  // "Ho finito" su richiesta chiusa: popup "Preparo i quiz" con percentuale, nessuna chiamata ai passi
  await riga.getByRole('button', { name: 'Ho finito' }).click();
  const quiz = page.getByRole('dialog', { name: 'Preparo i quiz' });
  await expect(quiz).toBeVisible();
  await expect(quiz).toContainText('%');
  await expect(quiz).toBeHidden();
  await expect(page.getByRole('status')).toContainText('Foto aggiunte: Scienze');
});

test('genitori: la fotocamera si apre davvero (non la galleria) e lo scatto si carica', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-18T21:20:00+01:00'));
  // una fotocamera finta: un video da una tela
  await page.addInitScript(() => {
    const tela = document.createElement('canvas');
    tela.width = 320;
    tela.height = 240;
    const ctx = tela.getContext('2d')!;
    let n = 0;
    // la tela cambia di continuo, come una vera fotocamera: così il video ha dei fotogrammi
    setInterval(() => {
      ctx.fillStyle = `hsl(${(n += 20) % 360} 80% 50%)`;
      ctx.fillRect(0, 0, 320, 240);
    }, 50);
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: async () => tela.captureStream(5) }, configurable: true });
  });
  const { t } = await finto(page, dati(), { 'foto-studio': { restano: 0 } });
  await page.goto('/');
  const riga = page.getByRole('list', { name: 'Aggiungi foto' }).getByRole('listitem').filter({ hasText: 'Scienze' });
  let galleriaAperta = false;
  page.on('filechooser', () => (galleriaAperta = true));
  await riga.getByRole('button', { name: /Aggiungi|Un'altra pagina/ }).first().click();
  const camera = page.getByRole('dialog', { name: 'Fotocamera' });
  await expect(camera).toBeVisible();
  expect(galleriaAperta).toBe(false);
  await camera.getByRole('button', { name: 'Scatta' }).click();
  await expect(camera).toBeHidden();
  await page.getByRole('dialog', { name: 'Che pagine sono?' }).getByRole('button', { name: 'Carica' }).click();
  await expect.poll(() => t.caricate?.length ?? 0).toBe(1);
  // l'altro pulsante apre la galleria
  const scelta = page.waitForEvent('filechooser');
  await riga.getByRole('button', { name: 'Dalla galleria' }).click();
  expect((await scelta).isMultiple()).toBe(true);
});
