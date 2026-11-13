import { expect, test } from '@playwright/test';
import { finto } from './finto';

// Sprint 2: la voce R-Evolution compare nella barra da quando i genitori la accendono
// (impostazione r_evolution_da).
const ACCESA = [{ chiave: 'r_evolution_da', valore: '2027-01-07' }];
const dati = (impostazioni: Record<string, unknown>[] = ACCESA) => ({
  impostazioni,
  partite: [
    { id: 'p3', data: '2027-01-17', avversaria: 'Foxes Volley', set_nostri: 3, set_loro: 0, approvata_il: null },
    { id: 'p1', data: '2027-01-16', avversaria: 'Volley Bibbiano', set_nostri: 3, set_loro: 1, approvata_il: '2027-01-16T20:00:00Z' },
    { id: 'p2', data: '2027-01-09', avversaria: 'Pallavolo Montecchio', set_nostri: 2, set_loro: 3, approvata_il: '2027-01-09T20:00:00Z' },
  ],
  classifiche: [
    {
      cid: 93436,
      campionato: 'Under 13',
      girone: 'U13 Femminile girone C',
      squadra: '13R-EVOLUT. POLO DIGITALE',
      aggiornata_il: '2027-01-18T05:15:00Z',
      righe: [
        { pos: 1, squadra: '13R-EVOLUT. POLO DIGITALE', punti: 12, giocate: 4, vinte: 4, perse: 0, set_fatti: 12, set_subiti: 0 },
        { pos: 2, squadra: 'DENTI ALBINETANA PANTHERS', punti: 8, giocate: 4, vinte: 3, perse: 1, set_fatti: 9, set_subiti: 6 },
      ],
    },
  ],
  serate: [],
  movimenti_passi: [
    { motivo: 'partita', passi: 10, giorno: '2027-01-16', moltiplicatore: 1 },
    { motivo: 'partita_vinta', passi: 15, giorno: '2027-01-16', moltiplicatore: 1 },
  ],
  compiti: [],
  impegni_famiglia: [],
});

test('R-Evolution: classifica, partite con il risultato e passi presi in campo', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-18T10:00:00+01:00'));
  await finto(page, dati());
  await page.goto('/');
  await page.getByRole('button', { name: 'R-Evolution' }).click();
  await expect(page.getByRole('heading', { name: 'In campo' })).toBeVisible();
  await expect(page.getByText('+25 passi presi in campo.')).toBeVisible();

  const classifica = page.locator('.carta', { has: page.getByRole('heading', { name: 'Classifica Under 13' }) });
  await expect(classifica.getByRole('row', { name: /13R-EVOLUT\. POLO DIGITALE/ })).toHaveClass(/lani/);
  await expect(classifica.getByRole('row', { name: /DENTI ALBINETANA/ })).not.toHaveClass(/lani/);
  await expect(classifica.getByText('U13 Femminile girone C, dal portale FIPAV. Aggiornata il 18 gennaio.')).toBeVisible();

  await expect(page.getByText('Volley Bibbiano')).toBeVisible();
  await expect(page.getByText('3-1')).toHaveClass(/vinta/);
  await expect(page.getByText('2-3')).toHaveClass(/persa/);
  // quella da approvare si vede ma non conta tra le giocate
  await expect(page.getByText('17 gennaio, da approvare')).toBeVisible();
  await expect(page.locator('.numeri dd').first()).toHaveText('2');
  await page.screenshot({ path: 'e2e/risultati/r-evolution.png', fullPage: true });
});

test('R-Evolution: Lani segna la partita, va da approvare e non chiama i passi', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-23T21:00:00+01:00'));
  const { t, chiamate } = await finto(page, { ...dati(), partite: [] });
  await page.goto('/');
  await page.getByRole('button', { name: 'R-Evolution' }).click();
  const carta = page.locator('.carta', { has: page.getByRole('heading', { name: 'Segna la partita' }) });
  await carta.getByLabel('Contro').fill('Arbor Itarca');
  await carta.getByLabel('Set nostri').selectOption('3');
  await carta.getByLabel('Set loro').selectOption('3');
  await carta.getByRole('button', { name: 'Manda da approvare' }).click();
  await expect(page.getByRole('status')).toHaveText('Nella pallavolo non c’è il pareggio: controlla i set.');
  await carta.getByLabel('Set loro').selectOption('2');
  await carta.getByLabel('Sono entrata in campo').uncheck();
  await carta.getByRole('button', { name: 'Manda da approvare' }).click();
  await expect(page.getByRole('status')).toHaveText('Partita 3-2 segnata. I passi arrivano quando mamma o papà la approvano.');
  expect(t.partite[0]).toMatchObject({ data: '2027-01-23', avversaria: 'Arbor Itarca', set_nostri: 3, set_loro: 2, in_campo: false });
  expect(t.partite[0].approvata_il).toBeUndefined();
  await expect(page.getByText('23 gennaio, da approvare')).toBeVisible();
  expect(chiamate).toEqual([]);
});

test('R-Evolution spenta: la voce non c’è', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-18T10:00:00+01:00'));
  await finto(page, dati([]));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Astra' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'R-Evolution' })).toHaveCount(0);
});

test('barra a cinque voci: a 360 px nessuna etichetta esce dal suo pulsante', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.clock.setFixedTime(new Date('2027-01-18T10:00:00+01:00'));
  await finto(page, dati());
  await page.goto('/');
  const voci = page.locator('.barra button');
  await expect(voci).toHaveCount(5);
  for (const b of await voci.all()) expect(await b.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
  await page.locator('.barra').screenshot({ path: 'e2e/risultati/barra-360.png' });
});

test("annuncio il giorno dell'accensione: Vediamo porta su R-Evolution", async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-07T16:00:00+01:00'));
  const d = dati();
  await finto(page, {
    ...d,
    popup_coda: [{ id: 'a1', chiave: 'r_evolution:2027-01-07', priorita: 4, situazione: 'r_evolution_accesa', posa: 'lani-divisa', titolo: 'Arriva R-Evolution', testo: 'Da oggi anche la pallavolo fa camminare Astra: dieci minuti al mattino, le tue partite e le classifiche del campionato.', figurina: null, mostrato_il: null, creato_il: '2027-01-07T15:00:00Z' }],
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Arriva R-Evolution' })).toBeVisible();
  await page.getByRole('button', { name: 'Vediamo' }).click();
  await expect(page.getByRole('heading', { name: 'In campo' })).toBeVisible();
});

test('segna la partita: giorno e avversaria proposti dal calendario di famiglia', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-18T10:00:00+01:00'));
  await finto(page, { ...dati(), impegni_famiglia: [{ titolo: 'Partita Lani: FOXES VOLLEY vs U14R-EVOLUTION', inizio: '2027-01-16T17:45:00Z' }] });
  await page.goto('/');
  await page.getByRole('button', { name: 'R-Evolution' }).click();
  await expect(page.getByLabel('Contro')).toHaveValue('FOXES VOLLEY');
  await expect(page.getByLabel('Giorno')).toHaveValue('2027-01-16');
});
