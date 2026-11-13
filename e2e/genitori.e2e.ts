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
});

test('settimana: gesti di casa e sgridate chiamano i passi', async ({ page }) => {
  const { t, chiamate } = await finto(page, dati());
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'La settimana di Lani' })).toBeVisible();
  await expect(page.locator('.numeri')).toContainText('6,75');
  await page.getByRole('button', { name: 'Scrivania in ordine +2' }).click();
  await expect(page.getByRole('status')).toContainText('Scrivania in ordine');
  expect(t.gesti_casa[0]).toMatchObject({ voce: 'scrivania' });
  await page.getByRole('button', { name: 'Balla −10' }).click();
  // foglio dell'app al posto del prompt del browser: Segna resta spento finché il campo è vuoto
  const foglio = page.getByRole('dialog');
  await expect(foglio.getByRole('button', { name: 'Segna' })).toBeDisabled();
  await foglio.getByLabel('Che cosa non era vero').fill('ha detto di aver studiato');
  await foglio.getByRole('button', { name: 'Segna' }).click();
  await expect(foglio).toHaveCount(0);
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

test('frasi di famiglia: si aggiungono e si tolgono', async ({ page }) => {
  const { t } = await finto(page, { ...dati(), frasi: [{ id: 'x1', testo: 'Affrettati lentamente.', autore: 'motto latino', di_famiglia: false }] });
  await page.goto('/');
  await page.getByRole('button', { name: 'Altro' }).click();
  await page.getByRole('button', { name: /^Impostazioni/ }).click();
  const carta = page.locator('form', { has: page.getByRole('heading', { name: 'Frasi di famiglia' }) });
  // quelle della raccolta non compaiono qui
  await expect(carta).not.toContainText('Affrettati lentamente.');
  await carta.getByLabel('Frase').fill('Ogni giorno un pezzetto.');
  await carta.getByLabel('Di chi (facoltativo)').fill('papà');
  await carta.getByRole('button', { name: 'Aggiungi la frase' }).click();
  await expect(page.getByRole('status')).toContainText('Frase salvata');
  expect(t.frasi.find((f) => f.testo === 'Ogni giorno un pezzetto.')).toMatchObject({ autore: 'papà', di_famiglia: true });
  await expect(carta).toContainText('«Ogni giorno un pezzetto.»');
  await carta.getByRole('button', { name: 'Togli: Ogni giorno un pezzetto.' }).click();
  await expect(page.getByRole('status')).toHaveText('Frase tolta.');
  await expect(carta).not.toContainText('Ogni giorno un pezzetto.');
  expect(t.frasi).toHaveLength(1);
});

test('correzioni e fogli', async ({ page }) => {
  const { t, chiamate } = await finto(page, dati());
  await page.goto('/');
  await page.getByRole('button', { name: 'Correzioni' }).click();
  await page.getByRole('button', { name: 'Togli' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Togli' }).click();
  await expect(page.getByRole('status')).toContainText('Spunta tolta');
  expect(t.compiti[0].fatto_il).toBeNull();
  await page.getByRole('button', { name: 'Fogli' }).click();
  await expect(page.getByText('Lani dice di averlo dato')).toBeVisible();
  await page.getByRole('button', { name: 'Firmato' }).click();
  await expect.poll(() => chiamate).toContainEqual({ tipo: 'foglio', id: 'f1' });
  expect(t.fogli_firma[0].consegnato_il).toBeTruthy();
});

test('Stato di ACE: sincronizzazioni, chiavi ed errori (filone H)', async ({ page }) => {
  const d = {
    ...dati(),
    sync_log: [
      { fonte: 'nuvola', esito: 'ok', iniziato_il: '2026-11-10T13:30:00Z', finito_il: '2026-11-10T13:31:00Z' },
      { fonte: 'calendario', esito: 'errore', iniziato_il: '2026-11-10T16:05:00Z', finito_il: '2026-11-10T16:05:10Z' },
    ],
    settimane: [{ inizio: '2026-11-02', chiavi: 2 }],
    errori_client: [{ id: 1, creato_il: '2026-11-10T15:00:00Z', dove: 'Oggi', messaggio: 'Rete assente', origine: 'app' }],
  };
  await finto(page, d);
  await page.goto('/');
  await page.getByRole('button', { name: 'Altro' }).click();
  await page.getByRole('button', { name: /Stato di ACE/ }).click();
  await expect(page.getByRole('heading', { name: 'Stato di ACE' })).toBeVisible();
  await expect(page.getByText('ok, oggi alle 14:30')).toBeVisible();
  await expect(page.getByText(/non riuscita, oggi alle 17:05/)).toBeVisible();
  await expect(page.getByText('Prossima: oggi alle 19:30')).toBeVisible();
  await expect(page.getByText('2 chiavi nella settimana dal 2')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Errori degli ultimi 7 giorni: 1' })).toBeVisible();
  await expect(page.getByText('Rete assente')).toBeVisible();
});

const ACCESA = { chiave: 'r_evolution_da', valore: '2027-01-07' };

test('partita (sprint 2): un genitore la segna già approvata e chiama i passi', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-16T19:00:00+01:00'));
  const d = dati();
  const { t, chiamate } = await finto(page, { ...d, impostazioni: [...d.impostazioni, ACCESA], partite: [] }, { passi: { passi: 25 } });
  await page.goto('/');
  const carta = page.locator('.carta', { has: page.getByRole('heading', { name: 'Partita', exact: true }) });
  await carta.getByLabel('Contro').fill('Volley Bibbiano');
  await carta.getByLabel('Set di Lani').selectOption('3');
  await carta.getByLabel('Set loro').selectOption('1');
  await carta.getByRole('button', { name: 'Segna la partita' }).click();
  await expect(page.getByRole('status')).toContainText('Partita 3-1 con Volley Bibbiano');
  expect(t.partite[0]).toMatchObject({ data: '2027-01-16', avversaria: 'Volley Bibbiano', set_nostri: 3, set_loro: 1, in_campo: true });
  expect(t.partite[0].approvata_il).toBeTruthy();
  await expect.poll(() => chiamate.map((c) => c.tipo)).toEqual(['partita']);
  await page.screenshot({ path: 'e2e/risultati/genitori-partita.png', fullPage: true });
});

test('partita segnata da Lani: il genitore corregge e approva, oppure rifiuta', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-17T10:00:00+01:00'));
  const d = dati();
  const partite = [
    { id: 'p1', data: '2027-01-16', avversaria: 'Foxes Volley', set_nostri: 3, set_loro: 1, in_campo: true, approvata_il: null },
    { id: 'p2', data: '2027-01-16', avversaria: 'Arbor Itarca', set_nostri: 0, set_loro: 3, in_campo: true, approvata_il: null },
  ];
  const { t, chiamate } = await finto(page, { ...d, impostazioni: [...d.impostazioni, ACCESA], partite }, { passi: { passi: 10 } });
  await page.goto('/');
  const foxes = page.getByRole('form', { name: 'Partita con Foxes Volley' });
  await foxes.getByLabel('Set loro').selectOption('2');
  await foxes.getByLabel('Lani è entrata in campo').uncheck();
  await foxes.getByRole('button', { name: 'Approva' }).click();
  await expect(page.getByRole('status')).toHaveText('Partita 3-2 con Foxes Volley approvata: +10 passi.');
  expect(t.partite.find((p) => p.id === 'p1')).toMatchObject({ set_loro: 2, in_campo: false });
  expect(t.partite.find((p) => p.id === 'p1')?.approvata_il).toBeTruthy();
  await expect.poll(() => chiamate).toEqual([{ tipo: 'partita', id: 'p1' }]);
  await expect(foxes).toHaveCount(0);

  await page.getByRole('form', { name: 'Partita con Arbor Itarca' }).getByRole('button', { name: 'Rifiuta' }).click();
  await expect(page.getByRole('status')).toHaveText('Partita con Arbor Itarca rifiutata.');
  expect(t.partite.map((p) => p.id)).toEqual(['p1']);
  await expect(page.getByRole('heading', { name: 'Partite da approvare' })).toHaveCount(0);
});

test('Impostazioni (sprint 2): accendere R-Evolution e cambiare il menu dei dieci minuti', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-23T18:00:00+01:00'));
  const menu = [
    { id: 'plank', nome: 'Plank e varianti', tipo: 'forza_riflessi', creato_il: '2026-11-13T10:00:00Z' },
    { id: 'visore', nome: 'Riflessi con il visore', tipo: 'forza_riflessi', creato_il: '2026-11-13T10:00:01Z' },
    { id: 'respiro', nome: 'Respirazione guidata', tipo: 'recupero', creato_il: '2026-11-13T10:00:02Z' },
  ];
  const { t } = await finto(page, { ...dati(), esercizi_dieci_minuti: menu });
  await page.goto('/');
  await page.getByRole('button', { name: 'Altro' }).click();
  await page.getByRole('button', { name: /^Impostazioni/ }).click();

  await page.getByRole('button', { name: 'Accendi R-Evolution da oggi' }).click();
  await expect(page.getByRole('status')).toContainText('R-Evolution accesa');
  expect(t.impostazioni.find((i) => i.chiave === 'r_evolution_da')?.valore).toBe('2026-11-23');
  await expect(page.getByText(/^Accesa dal 23 novembre/)).toBeVisible();

  const carta = page.locator('form', { has: page.getByRole('heading', { name: 'Menu dei dieci minuti' }) });
  // l'unico esercizio di recupero non si toglie
  await expect(carta.getByRole('button', { name: 'Togli: Respirazione guidata' })).toBeDisabled();
  await carta.getByLabel('Esercizio nuovo').fill('Mobilità delle spalle');
  await carta.getByLabel('Tipo').selectOption('recupero');
  await carta.getByRole('button', { name: 'Aggiungi al menu' }).click();
  await expect(page.getByRole('status')).toHaveText('Esercizio aggiunto al menu.');
  expect(t.esercizi_dieci_minuti.find((e) => e.nome === 'Mobilità delle spalle')).toMatchObject({ tipo: 'recupero' });
  await carta.getByRole('button', { name: 'Togli: Riflessi con il visore' }).click();
  await expect(page.getByRole('status')).toHaveText('Esercizio tolto dal menu.');
  expect(t.esercizi_dieci_minuti.map((e) => e.id)).not.toContain('visore');
  await page.screenshot({ path: 'e2e/risultati/genitori-impostazioni-sprint2.png', fullPage: true });

  await page.getByRole('button', { name: 'Spegni R-Evolution' }).click();
  await expect(page.getByRole('status')).toContainText('R-Evolution spenta');
  expect(t.impostazioni.find((i) => i.chiave === 'r_evolution_da')).toBeUndefined();
});

test('partita: prima di R-Evolution non si vede', async ({ page }) => {
  await finto(page, dati());
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'La settimana di Lani' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Partita' })).toHaveCount(0);
});
