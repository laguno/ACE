import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { finto } from './finto';

// Tabellina dei passi (18/11): contatore sempre in vista, elenco chiuso, i tocchi portano dove si fa.
// La risposta della funzione è finta: i conti veri li prova supabase/functions/_prove/app.test.ts.
const voce = (id: string, testo: string, valore: number, presi: number, dove: object, gruppo = 'ogni-giorno') => ({ id, gruppo, testo, come: 'Cosa fare', valore, presi, dove });
const TABELLINA = {
  giorno: '2026-11-09',
  presi: 10,
  disponibili: 20,
  voci: [
    voce('compito:c1', 'Compiti di Inglese', 10, 10, { schermata: 'Oggi', ancora: 'compiti' }),
    voce('dieci_minuti', 'Dieci minuti di allenamento', 10, 0, { schermata: 'Oggi', ancora: 'dieci-minuti' }),
    voce('gesto:letto', 'Letto fatto', 2, 0, { schermata: 'Regole', ancora: 'blocco-casa' }, 'casa'),
  ],
  storico: [
    { giorno: '2026-11-09', ora: '16:10', testo: 'Compiti fatti: Inglese', passi: 10 },
    { giorno: '2026-11-08', ora: '20:30', testo: 'Cartella pronta', passi: 5 },
  ],
};

test('contatore sempre in vista, cosa manca e già presi, il gesto porta alle regole', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-09T07:10:00+01:00'));
  await finto(page, { movimenti_passi: [], compiti: [], fogli_firma: [], serate: [], impegni_famiglia: [] }, { tabellina: TABELLINA });
  await page.goto('/');
  await expect(page.locator('.tabellina-conto')).toHaveText('Oggi hai preso 10 passi su 20 disponibili');
  const elenco = page.locator('.tabellina details');
  await expect(elenco).not.toHaveAttribute('open');
  // 23/11: i passi in più stanno sempre in vista, fuori dall'elenco chiuso
  await expect(page.getByText('Letto fatto')).toBeVisible();

  await page.getByText('Guarda cosa manca').click();
  // il compito già preso non manca più: resta solo tra i presi
  await expect(page.locator('.tabellina-voci li')).toHaveCount(2);
  await expect(page.locator('.tabellina-data')).toHaveText(['Oggi', 'Ieri']);
  await expect(page.getByText('Compiti fatti: Inglese')).toBeVisible();
  expect((await new AxeBuilder({ page }).include('.tabellina').analyze()).violations).toEqual([]);

  await page.getByRole('button', { name: /Letto fatto/ }).click();
  await expect(page.getByRole('heading', { name: 'Come si fanno i passi' })).toBeVisible();
  await expect(page.locator('[data-ancora="blocco-casa"]')).toBeInViewport();
  await page.getByRole('button', { name: 'Torna a Oggi' }).click();
  await expect(page.getByRole('heading', { name: 'Buongiorno, Lani' })).toBeVisible();
});

test('senza risposta del server la tabellina non compare', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-09T07:10:00+01:00'));
  await finto(page, { movimenti_passi: [], compiti: [], fogli_firma: [], serate: [], impegni_famiglia: [] });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Buongiorno, Lani' })).toBeVisible();
  await expect(page.locator('.tabellina')).toHaveCount(0);
});

test('area genitori: stessa tabellina, con chi ha dato i passi e senza collegamenti', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-09T18:00:00+01:00'));
  const conChi = { ...TABELLINA, storico: [{ giorno: '2026-11-09', ora: '17:00', testo: 'Gesto di casa: letto', passi: 2, chi: 'Papà' }, ...TABELLINA.storico] };
  await finto(
    page,
    { profili: [{ id: 'lani', ruolo: 'genitore', nome: 'Papà' }], movimenti_passi: [], compiti: [], fogli_firma: [], serate: [], impegni_famiglia: [], gesti_casa: [], sgridate: [], note: [], voti: [], verifiche: [], richieste_foto: [], partite: [], assenze: [], popup_coda: [], impostazioni: [] },
    { tabellina: conChi },
  );
  await page.goto('/');
  const t = page.locator('.tabellina');
  await expect(t.locator('.tabellina-conto')).toHaveText('Oggi Lani ha preso 10 passi su 20 disponibili');
  // area genitori: una sola freccia (la "::after" di ".ga summary" sarebbe la seconda)
  const riassunto = t.locator('.tabellina-dettagli > summary');
  await expect(riassunto.locator('svg')).toHaveCount(1);
  expect(await riassunto.evaluate((e) => getComputedStyle(e, '::after').content)).toBe('none');
  await t.getByText('Guarda cosa manca').click();
  await expect(t.getByText('17:00 · da Papà')).toBeVisible();
  await expect(t.getByRole('button', { name: /Letto fatto/ })).toHaveCount(0);
  expect((await new AxeBuilder({ page }).include('.tabellina').analyze()).violations).toEqual([]);
});
