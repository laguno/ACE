import { expect, test } from '@playwright/test';
import { finto } from './finto';

// Lunedì 30 novembre 2026: Lani ha 300 passi (tappa 3 in corso, mancano 105 al forziere 1).
const LUNEDI = new Date('2026-11-30T15:00:00+01:00');

function dati(passi = 300, chiavi = 1) {
  return {
    saldo_passi: [{ passi }],
    chiavi_totali: [{ chiavi }],
    settimane: [{ inizio: '2026-11-23', chiavi }],
    forzieri_lani: [
      { n: 1, stato: 'enigma', enigma: 'Ho le ruote ma non corro...\nIndizio cifrato: CJDJ', premio: null, tentativi_enigma: 0, enigma_risolto_il: null },
      ...Array.from({ length: 8 }, (_, i) => ({ n: i + 2, stato: 'chiuso', enigma: null, premio: null, tentativi_enigma: 0, enigma_risolto_il: null })),
    ],
    materie: [
      { id: 'matematica', nome: 'Matematica' },
      { id: 'italiano', nome: 'Italiano' },
    ],
    voti: [
      { materia_id: 'matematica', data: '2026-10-01', voto: 6 },
      { materia_id: 'matematica', data: '2026-11-20', voto: 8 },
      { materia_id: 'italiano', data: '2026-10-05', voto: 7.5 },
    ],
    impostazioni: [{ chiave: 'obiettivo_media', valore: 7.35 }],
    figurine: [{ posa: 'lani-contenta', sbloccata_il: '2026-11-24T10:00:00Z' }],
  };
}

test('percorso: sei qui, forzieri, bandierina, chiavi della settimana', async ({ page }) => {
  await page.clock.setFixedTime(LUNEDI);
  await finto(page, dati());
  await page.goto('/');
  await page.getByRole('button', { name: 'Astra' }).click();
  await expect(page.getByText('Colline di caramelle')).toBeVisible();
  await expect(page.getByText('Ogni giorno, passino passino.')).toBeVisible();
  await expect(page.getByText('300 passi')).toBeAttached();
  await expect(page.getByText('1 chiave', { exact: true })).toBeAttached();
  await expect(page.getByText('Sei qui: mancano 105')).toBeVisible();
  await expect(page.locator('.tappa', { hasText: 'Sei qui' })).toContainText('Tappa 3');
  await expect(page.getByText('Il calendario è qui')).toBeVisible();
  await expect(page.getByLabel("Chiavi dell'ultima settimana: 1 su 3")).toBeVisible();
  await expect(page.getByRole('button', { name: /Forziere \d/ })).toHaveCount(9);
  await page.screenshot({ path: 'e2e/risultati/astra.png' });
});

test('forziere con enigma: risposta giusta, +20', async ({ page }) => {
  await page.clock.setFixedTime(LUNEDI);
  await finto(page, dati(), { enigma: { giusta: true, rimasti: 0, passi: 20 } });
  await page.goto('/');
  await page.getByRole('button', { name: 'Astra' }).click();
  await page.getByRole('button', { name: 'Forziere 1' }).click();
  await expect(page.getByText('Ho le ruote ma non corro...')).toBeVisible();
  await expect(page.getByText('3 tentativi · +20 passi se indovini')).toBeVisible();
  await page.getByLabel("Cosa c'è nel forziere?").fill('la bici');
  await page.getByRole('button', { name: 'Prova' }).click();
  await expect(page.getByText('Indovinato! +20 passi.')).toBeVisible();
});

test('arrivata senza chiavi: lucchetto', async ({ page }) => {
  await page.clock.setFixedTime(LUNEDI);
  await finto(page, dati(420, 1));
  await page.goto('/');
  await page.getByRole('button', { name: 'Astra' }).click();
  await page.getByRole('button', { name: 'Forziere 1' }).click();
  await expect(page.getByText('Servono 2 chiavi: ne hai 1.')).toBeVisible();
  await expect(page.getByText('I passi ti fanno camminare, le chiavi aprono i forzieri.')).toBeVisible();
});

test('figurina e album', async ({ page }) => {
  await page.clock.setFixedTime(LUNEDI);
  await finto(page, dati());
  await page.goto('/');
  await page.getByRole('button', { name: 'Astra' }).click();
  await page.getByRole('button', { name: 'La tua figurina' }).click();
  await expect(page.getByRole('heading', { name: 'Lani, n. 9' })).toBeVisible();
  await expect(page.locator('.numeri')).toContainText('7,17');
  await expect(page.locator('.medie li', { hasText: 'Matematica' })).toContainText('7,0');
  await expect(page.getByLabel('in salita')).toBeVisible();
  await page.getByRole('button', { name: 'Torna ad Astra' }).click();
  await page.getByRole('button', { name: 'Album' }).click();
  await expect(page.getByText('1 di 64')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Serie nera' })).toBeVisible();
  await page.screenshot({ path: 'e2e/risultati/album.png' });
});
