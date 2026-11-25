import { expect, test } from '@playwright/test';
import { finto } from './finto';

// Dieci minuti in Oggi (sprint 2; dal 23/11 dalle 6:00, ultimo avvio 21:20), da quando i genitori accendono
// R-Evolution. Dal 25/11 a carte: Lani gira la ruota, il server fissa la carta del giorno, poi VIA.
const LUNEDI_MATTINA = new Date('2027-01-11T07:30:00+01:00');
const MERCOLEDI = new Date('2027-01-13T17:00:00+01:00');
const ACCESA = [{ chiave: 'r_evolution_da', valore: '2027-01-07' }];

const dati = (altro: Record<string, Record<string, unknown>[]> = {}, impostazioni: Record<string, unknown>[] = ACCESA) => ({
  materie: [],
  compiti: [],
  lezioni: [],
  verifiche: [],
  fogli_firma: [],
  impostazioni,
  impegni_famiglia: [],
  serate: [] as Record<string, unknown>[],
  movimenti_passi: [],
  carte_del_giorno: [] as Record<string, unknown>[],
  ...altro,
});

const fascia = (page: import('@playwright/test').Page) => page.getByRole('region', { name: 'Dieci minuti' });

test('dieci minuti: si gira la ruota, esce la carta, riaprendo resta la stessa', async ({ page }) => {
  await page.clock.install({ time: MERCOLEDI });
  // lunedì e martedì già uscite la 1 e la 6: spicchi spenti
  const { t } = await finto(
    page,
    dati({
      carte_del_giorno: [
        { data: '2027-01-11', carta: 1 },
        { data: '2027-01-12', carta: 6 },
      ],
      ruota: [{ data: '2027-01-13', carta: 2 }],
    }),
  );
  await page.goto('/');
  const f = fascia(page);
  await expect(f.getByText('LA CARTA DI OGGI')).toBeVisible();
  await expect(f.getByText('Già uscite questa settimana: spente.')).toBeVisible();
  await expect(f.locator('.ruota-disco .spenta')).toHaveCount(2);
  await expect(f.getByRole('button', { name: 'VIA' })).toHaveCount(0);
  await page.screenshot({ path: 'e2e/risultati/dieci-ruota.png', fullPage: true });

  await f.getByRole('button', { name: 'GIRA LA RUOTA' }).click();
  await page.clock.runFor(3500);
  await expect(f.getByText('CORE D’ACCIAIO'.replace('’', "'"))).toBeVisible();
  await expect(f.getByText('CARTA 2')).toBeVisible();
  await expect(f.getByRole('button', { name: 'VIA' })).toBeVisible();
  expect(t.carte_del_giorno.find((x) => x.data === '2027-01-13')).toMatchObject({ carta: 2 });
  await page.screenshot({ path: 'e2e/risultati/dieci-carta.png', fullPage: true });

  await page.reload();
  await expect(fascia(page).getByText('CARTA 2')).toBeVisible();
  await expect(fascia(page).getByRole('button', { name: 'GIRA LA RUOTA' })).toHaveCount(0);
});

test('dieci minuti: dopo l\'ultimo avvio delle 21:20 non si avviano più', async ({ page }) => {
  await page.clock.install({ time: new Date('2027-01-11T21:40:00+01:00') });
  await finto(page, dati());
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'R-Evolution' })).toBeVisible();
  await expect(fascia(page)).toHaveCount(0);
});

test('dieci minuti: con R-Evolution spenta non ci sono', async ({ page }) => {
  await page.clock.install({ time: LUNEDI_MATTINA });
  await finto(page, dati({}, []));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Buongiorno, Lani' })).toBeVisible();
  await expect(fascia(page)).toHaveCount(0);
});

test('dieci minuti: se il server non li conta, niente "il coach approva" e lo dice', async ({ page }) => {
  await page.clock.install({ time: LUNEDI_MATTINA });
  await finto(page, dati({ carte_del_giorno: [{ data: '2027-01-11', carta: 7 }] }));
  await page.goto('/');
  const f = fascia(page);
  await f.getByRole('button', { name: 'VIA' }).click();
  await page.clock.fastForward(10 * 60 * 1000 + 6000);
  await page.getByRole('button', { name: 'SEGNA FATTO' }).click();
  await expect(f.getByRole('alert')).toHaveText("Questa volta non li ho potuti contare: l'ora del telefono non torna. Domani si riprova.");
  await expect(f.getByText(/Il coach approva/)).toHaveCount(0);
});

test('dieci minuti: fatti prima delle carte (giorno del passaggio), niente ruota', async ({ page }) => {
  await page.clock.install({ time: LUNEDI_MATTINA });
  await finto(page, dati({ serate: [{ data: '2027-01-11', dieci_minuti_da: '2027-01-11T06:00:00Z', dieci_minuti_il: '2027-01-11T06:11:00Z', dieci_minuti_esercizio: 'plank' }] }));
  await page.goto('/');
  const f = fascia(page);
  await expect(f.getByText('FATTI!')).toBeVisible();
  await expect(f.getByRole('button', { name: 'GIRA LA RUOTA' })).toHaveCount(0);
});
