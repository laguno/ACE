import { expect, test } from '@playwright/test';
import { finto } from './finto';

// Frasi nei momenti: una al giorno al massimo, mai nei rimproveri; con una verifica domani la frase
// si tiene per la sera.
const FRASI = [
  { testo: 'Affrettati lentamente.', autore: 'motto latino', momento: 'apertura' },
  { testo: 'Volere è potere.', autore: 'proverbio', momento: 'inizio_settimana' },
  { testo: 'Ripetere giova.', autore: 'motto latino', momento: 'verifica' },
  { testo: 'Un passo alla volta si fa tanta strada.', autore: 'proverbio', momento: 'chiusura' },
  { testo: 'Chi semina raccoglie.', autore: 'proverbio', momento: 'tappa' },
];
const base = () => ({
  frasi: FRASI,
  verifiche: [] as Record<string, unknown>[],
  impostazioni: [{ chiave: 'ora_chiusura', valore: { 0: '20:00', 1: '20:30', 2: '20:30', 3: '20:30', 4: '20:30' } }],
  movimenti_passi: [],
  fogli_firma: [],
  impegni_famiglia: [],
  serate: [],
  compiti: [],
  lezioni: [],
  materie: [],
  saldo_passi: [{ passi: 0 }],
  popup_coda: [] as Record<string, unknown>[],
});

test('martedì mattina: la frase dell’apertura, con l’autore', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-01T07:10:00+01:00'));
  await finto(page, base());
  await page.goto('/');
  const frase = page.locator('.frase-giorno');
  await expect(frase.locator('blockquote')).toHaveText('Affrettati lentamente.');
  await expect(frase.locator('figcaption')).toHaveText('motto latino');
  await frase.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'e2e/risultati/frase-oggi.png' });
});

test('lunedì mattina: la frase dell’inizio settimana', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-30T07:10:00+01:00'));
  await finto(page, base());
  await page.goto('/');
  await expect(page.locator('.frase-giorno blockquote')).toHaveText('Volere è potere.');
});

test('verifica domani: niente frase al mattino, la sera quella della verifica', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-01T07:10:00+01:00'));
  const d = base();
  d.verifiche = [{ id: 'v1', tipo: 'verifica', data: '2026-12-02', materia_id: null }];
  await finto(page, d);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Buongiorno, Lani' })).toBeVisible();
  await expect(page.locator('.frase-giorno')).toHaveCount(0);
  await page.getByRole('button', { name: 'Sera' }).click();
  await expect(page.locator('.frase-giorno blockquote')).toHaveText('Ripetere giova.');
});

test('una sola frase al giorno: dopo l’apertura la Sera resta senza', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-01T07:10:00+01:00'));
  await finto(page, base());
  await page.goto('/');
  await expect(page.locator('.frase-giorno blockquote')).toHaveText('Affrettati lentamente.');
  await page.getByRole('button', { name: 'Sera' }).click();
  await expect(page.getByRole('heading', { name: /^Pronta per/ })).toBeVisible();
  await expect(page.locator('.frase-giorno')).toHaveCount(0);
});

test('popup della tappa con la frase; il rimprovero mai', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-01T15:00:00+01:00'));
  const d = base();
  d.popup_coda = [
    { id: 'p1', priorita: 3, situazione: 'tappa', posa: 'lani-festeggia', titolo: 'Tappa 3', testo: 'Sei alla tappa 3.', figurina: null, mostrato_il: null, creato_il: '2026-12-01T13:00:00Z' },
  ];
  await finto(page, d);
  await page.goto('/');
  const popup = page.getByRole('dialog');
  await expect(popup.locator('.frase-giorno blockquote')).toHaveText('Chi semina raccoglie.');
  await page.screenshot({ path: 'e2e/risultati/frase-popup.png' });
});

test('popup di un rimprovero: nessuna frase', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-01T15:00:00+01:00'));
  const d = base();
  d.frasi = [...FRASI, { testo: 'Non dovrebbe vedersi.', autore: 'prova', momento: 'bagno_mamma' }];
  d.popup_coda = [
    { id: 'p2', priorita: 1, situazione: 'bagno_mamma', posa: 'mamma-arrabbiata', titolo: 'Bagno da sistemare', testo: 'Bagno: −1. Asciugamani appesi.', figurina: null, mostrato_il: null, creato_il: '2026-12-01T13:00:00Z' },
  ];
  await finto(page, d);
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').locator('.frase-giorno')).toHaveCount(0);
});
