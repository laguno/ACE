import { expect, test } from '@playwright/test';
import { finto } from './finto';

// Sprint 2: dieci minuti al mattino in Oggi, dalle 6 alle 13 (config dieci_minuti.finestra), da
// quando i genitori accendono R-Evolution. Menu dalla tabella esercizi_dieci_minuti.
const LUNEDI_MATTINA = new Date('2027-01-11T07:30:00+01:00');
const ACCESA = [{ chiave: 'r_evolution_da', valore: '2027-01-07' }];

const dati = (impostazioni: Record<string, unknown>[] = ACCESA) => ({
  materie: [],
  compiti: [],
  lezioni: [],
  verifiche: [],
  fogli_firma: [],
  impostazioni,
  impegni_famiglia: [],
  serate: [] as Record<string, unknown>[],
  movimenti_passi: [],
  esercizi_dieci_minuti: [
    { id: 'plank', nome: 'Plank e varianti', tipo: 'forza_riflessi', creato_il: '2026-11-13T10:00:00Z' },
    { id: 'respiro', nome: 'Respirazione guidata', tipo: 'recupero', creato_il: '2026-11-13T10:00:01Z' },
    { id: 'corda', nome: 'Salti con la corda', tipo: 'forza_riflessi', creato_il: '2026-11-14T10:00:00Z' },
  ],
});

const carta = (page: import('@playwright/test').Page) => page.locator('.carta', { has: page.getByRole('heading', { name: 'Dieci minuti' }) });

test('dieci minuti al mattino: si sceglie dal menu, si avvia, si spunta solo in fondo', async ({ page }) => {
  await page.clock.install({ time: LUNEDI_MATTINA });
  const { chiamate, t } = await finto(page, dati(), { passi: { passi: 10 } });
  await page.goto('/');
  const c = carta(page);
  await expect(c.getByText(/^Dieci minuti: oggi .+\. Si parte entro le 13:00\. Pronta\?$/)).toBeVisible();
  await expect(c.getByRole('radio')).toHaveCount(3);
  await c.getByRole('radio', { name: 'Salti con la corda' }).check();
  await c.getByRole('button', { name: 'Avvia il timer' }).click();
  await expect.poll(() => t.serate[0]).toMatchObject({ data: '2027-01-11', dieci_minuti_esercizio: 'corda' });
  await expect(c.getByRole('button', { name: 'Vai fino in fondo' })).toBeDisabled();
  await page.screenshot({ path: 'e2e/risultati/dieci-minuti.png', fullPage: true });

  await page.clock.runFor(10 * 60 * 1000 + 5000);
  await c.getByRole('button', { name: 'Fatto' }).click();
  await expect(c.getByText('Fatto: salti con la corda. Bart approva.')).toBeVisible();
  await expect.poll(() => t.serate[0]?.dieci_minuti_il).toBeTruthy();
  await expect.poll(() => chiamate).toEqual([{ tipo: 'dieci_minuti', id: '2027-01-11' }]);
});

test('dieci minuti: dopo le 13 non si avviano più', async ({ page }) => {
  await page.clock.install({ time: new Date('2027-01-11T13:30:00+01:00') });
  await finto(page, dati());
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'R-Evolution' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Dieci minuti' })).toHaveCount(0);
});

test('dieci minuti: con R-Evolution spenta non ci sono', async ({ page }) => {
  await page.clock.install({ time: LUNEDI_MATTINA });
  await finto(page, dati([]));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Buongiorno, Lani' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Dieci minuti' })).toHaveCount(0);
});

test('dieci minuti: se il server non li conta, niente "Bart approva" e lo dice', async ({ page }) => {
  await page.clock.install({ time: LUNEDI_MATTINA });
  await finto(page, dati());
  await page.goto('/');
  const c = carta(page);
  await c.getByRole('button', { name: 'Avvia il timer' }).click();
  await page.clock.runFor(10 * 60 * 1000 + 5000);
  await c.getByRole('button', { name: 'Fatto' }).click();
  await expect(c.getByRole('alert')).toHaveText("Questa volta non li ho potuti contare: l'ora del telefono non torna. Domani si riprova.");
  await expect(c.getByText(/Bart approva/)).toHaveCount(0);
});
