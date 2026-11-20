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
  const mancanti = riga.getByRole('group', { name: 'Pagine mancanti' }).getByRole('button');
  await expect(mancanti).toHaveText(['107', '110', '111', '112', '113', '116', '117']);

  // le pagine mancanti sono chip da dito: toccata, la pagina "c'è già" e la chip sparisce
  const chip = riga.getByRole('button', { name: 'Pagina 110: già caricata' });
  expect((await chip.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  for (const p of [110, 111, 112, 113]) await riga.getByRole('button', { name: `Pagina ${p}: già caricata` }).click();
  await expect(mancanti).toHaveText(['107', '116', '117']);
  expect(t.foto_pagine[1].pagine_viste).toBe('114, 115, 110, 111, 112, 113');

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
  // l'esito si vede sempre: quante carte e domande, poi "Ok"
  const esito = page.getByRole('dialog', { name: 'Quiz pronti' });
  await expect(esito).toContainText('Ho aggiunto 8 carte e 6 domande');
  // "Ok" è un pulsante dell'app, non quello nudo del browser: pieno, tondo, da dito
  const ok = esito.getByRole('button', { name: 'Ok' });
  const stile = await ok.evaluate((e) => {
    const s = getComputedStyle(e);
    return { alto: e.getBoundingClientRect().height, raggio: parseFloat(s.borderTopLeftRadius), sfondo: s.backgroundColor };
  });
  expect(stile.alto).toBeGreaterThanOrEqual(44);
  expect(stile.raggio).toBeGreaterThanOrEqual(22);
  expect(stile.sfondo).not.toBe('rgba(0, 0, 0, 0)');
  await ok.click();
  await expect(page.getByRole('status')).toContainText('Foto aggiunte: Scienze');
  // la richiesta resta in lista: il pulsante non resta bloccato su "Chiudo…"
  await expect(riga.getByRole('button', { name: 'Ho finito' })).toBeEnabled();
  await expect(riga.getByRole('button', { name: 'Chiudo…' })).toHaveCount(0);
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

test('genitori: se la funzione dei quiz fallisce, lo si dice e le foto restano', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-18T21:20:00+01:00'));
  const { t } = await finto(page, dati(), {});
  await page.route('https://finto.supabase.test/functions/v1/foto-studio', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{"errore":"errore del server"}' }));
  await page.goto('/');
  const riga = page.getByRole('list', { name: 'Aggiungi foto' }).getByRole('listitem').filter({ hasText: 'Scienze' });
  await riga.getByRole('button', { name: 'Ho finito' }).click();
  const esito = page.getByRole('dialog', { name: 'Quiz non creati' });
  await expect(esito).toContainText('Le foto sono salvate');
  await esito.getByRole('button', { name: 'Ok' }).click();
  await expect(riga.getByRole('button', { name: 'Ho finito' })).toBeEnabled();
  expect(t.foto_pagine).toHaveLength(2);
});

test('genitori: nessuna prova in arrivo, lo si dice', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-18T21:20:00+01:00'));
  await finto(page, dati(), { 'foto-studio': { carte: 0, domande: 0, motivo: 'nessuna verifica in arrivo per la materia' } });
  await page.goto('/');
  const riga = page.getByRole('list', { name: 'Aggiungi foto' }).getByRole('listitem').filter({ hasText: 'Scienze' });
  await riga.getByRole('button', { name: 'Ho finito' }).click();
  await expect(page.getByRole('dialog', { name: 'Niente di nuovo' })).toContainText('non c’è una prova in arrivo');
});

test('genitori: sulla card resta il riepilogo dei quiz già pronti, senza "Ho finito" da ripremere', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-18T21:20:00+01:00'));
  const d = dati();
  d.foto_pagine = d.foto_pagine.map((f) => ({ ...f, studio_il: '2026-11-18T21:07:00Z' }));
  const carte = Array.from({ length: 5 }, (_, i) => ({ id: `c${i}`, verifica_id: 'v1', fonte: 'foto', fronte: `d${i}`, retro: 'r' }));
  const finta = { ...d, flashcard: carte, quiz: [{ id: 'q1', verifica_id: 'v1', domande: [{ testo: 'a', richiesta_foto: 'r1' }, { testo: 'b', richiesta_foto: 'r1' }, { testo: 'c' }] }] };
  await finto(page, finta, {});
  await page.goto('/');
  const riga = page.getByRole('list', { name: 'Aggiungi foto' }).getByRole('listitem').filter({ hasText: 'Scienze' });
  await expect(riga).toContainText('Quiz pronti: 2/2 foto elaborate, 5 carte e 2 domande dalle foto.');
  // già tutto elaborato: niente "Ho finito" da ripremere per sbaglio
  await expect(riga.getByRole('button', { name: 'Ho finito' })).toHaveCount(0);
  await expect(riga.getByRole('button', { name: 'Aggiungi' }).or(riga.getByRole('button', { name: "Un'altra pagina" })).first()).toBeVisible();
});

test('genitori: foto non ancora elaborate, lo dice la card', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-18T21:20:00+01:00'));
  await finto(page, dati(), {});
  await page.goto('/');
  const riga = page.getByRole('list', { name: 'Aggiungi foto' }).getByRole('listitem').filter({ hasText: 'Scienze' });
  await expect(riga).toContainText('Foto non ancora elaborate: tocca Ho finito.');
  await expect(riga.getByRole('button', { name: 'Ho finito' })).toBeVisible();
});

// restyling dell'Oggi dei genitori (20/11): una riga per materia, le richieste vecchie in "Archivio foto"
test('genitori: una riga per materia, chiuse senza prova in archivio', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-18T21:20:00+01:00'));
  const d = dati();
  d.materie.push({ id: 'tecnologia', nome: 'Tecnologia' });
  d.richieste_foto.push(
    { id: 'r2', motivo: 'compito', materia_id: 'scienze', pagine: '20', stato: 'scaduta', creato_il: '2026-11-10T13:00:00Z' },
    { id: 'r3', motivo: 'compito', materia_id: 'tecnologia', pagine: '40', stato: 'fatta', creato_il: '2026-11-12T13:00:00Z' },
    { id: 'r4', motivo: 'compito', materia_id: 'tecnologia', pagine: '44', stato: 'fatta', creato_il: '2026-11-14T13:00:00Z' },
  );
  await finto(page, d);
  await page.goto('/');
  const vive = page.getByRole('list', { name: 'Aggiungi foto' }).getByRole('listitem');
  await expect(vive).toHaveCount(1);
  await expect(vive.first()).toContainText('Scienze: pagine 20, 100–107, 110–117');
  const archivio = page.getByText('Archivio foto (2)');
  await expect(archivio).toBeVisible();
  await expect(page.getByRole('list', { name: 'Archivio foto' })).toBeHidden();
  await page.screenshot({ path: 'e2e/risultati/genitori-oggi-foto.png', fullPage: true });
  await archivio.click();
  await expect(page.getByRole('list', { name: 'Archivio foto' }).getByRole('listitem')).toHaveCount(2);
});
