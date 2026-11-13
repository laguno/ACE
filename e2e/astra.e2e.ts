import { expect, test } from '@playwright/test';
import { finto } from './finto';

// Lunedì 30 novembre 2026: Lani ha 300 passi (tappa 3 in corso, mancano 125 al forziere 1).
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
  // Astra scende da sola fino a "Sei qui" e la testata si compatta: in cima il motto c'è
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.getByText('Ogni giorno, passino passino.')).toBeVisible();
  await expect(page.getByText('300 passi')).toBeAttached();
  await expect(page.getByText('Sei qui: mancano 125')).toBeVisible();
  await expect(page.locator('.tappa', { hasText: 'Sei qui' })).toContainText('Tappa 3');
  await expect(page.getByText('Il calendario è qui')).toBeVisible();
  await expect(page.getByLabel("Chiavi dell'ultima settimana: 1 su 3")).toBeVisible();
  await expect(page.getByText('Hai 1 chiave: il prossimo forziere ne vuole 2.')).toBeAttached();
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

test('biglietto con griglia: blocco a larghezza fissa dentro i 360 px, aiutino dopo un errore', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.clock.setFixedTime(LUNEDI);
  const d = dati();
  d.forzieri_lani[0].enigma = 'Colonna e riga, come a battaglia navale.\n```\n   A B C D E F\n1  H U R N A A\n2  K K F P Q D\n```\nA1 B1\nUltima riga.';
  await finto(page, d, { enigma: { giusta: false, rimasti: 2, passi: 0, aiutino: 'Li porti in partita.' } });
  await page.goto('/');
  await page.getByRole('button', { name: 'Astra' }).click();
  await page.getByRole('button', { name: 'Forziere 1' }).click();
  const blocco = page.locator('.biglietto-blocco');
  await expect(blocco).toContainText('1  H U R N A A');
  expect(await blocco.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/mono|Menlo|Consolas/i);
  expect(await blocco.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await expect(page.locator('.biglietto-aiutino')).toHaveCount(0);
  await page.getByLabel("Cosa c'è nel forziere?").fill('un pallone');
  await page.getByRole('button', { name: 'Prova' }).click();
  await expect(page.getByText('Non è questo. Ti restano 2 tentativi.')).toBeVisible();
  await expect(page.locator('.biglietto-aiutino')).toHaveText('Aiutino: Li porti in partita.');
  await page.locator('.biglietto').screenshot({ path: 'e2e/risultati/biglietto-360.png' });
});

test('arrivata senza chiavi: lucchetto', async ({ page }) => {
  await page.clock.setFixedTime(LUNEDI);
  await finto(page, dati(425, 1));
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

// Revisione di Jarvis: Lani non deve mai coprire un'etichetta, in nessuna posizione del percorso.
for (const passi of [0, 130, 300, 420, 700, 950, 1600, 2300, 3100, 5000, 7000]) {
  test(`Lani non copre etichette (${passi} passi)`, async ({ page }) => {
    await page.clock.setFixedTime(LUNEDI);
    await finto(page, dati(passi, 3));
    await page.goto('/');
    await page.getByRole('button', { name: 'Astra' }).click();
    const lani = page.locator('.lani-sentiero');
    if ((await lani.count()) === 0) return; // in cima Lani non è sul sentiero
    const l = (await lani.boundingBox())!;
    const larghezza = page.viewportSize()!.width;
    expect(l.x).toBeGreaterThanOrEqual(0);
    expect(l.x + l.width).toBeLessThanOrEqual(larghezza);
    const etichette = page.locator('.tappe .forziere, .tappe .qui, .tappe .bandiera, .tappe .traguardo');
    for (const e of await etichette.all()) {
      const b = await e.boundingBox();
      if (!b) continue;
      const tocca = l.x < b.x + b.width && b.x < l.x + l.width && l.y < b.y + b.height && b.y < l.y + l.height;
      expect(tocca, `Lani copre: ${await e.textContent()}`).toBe(false);
    }
  });
}

test('a 360 px la testata si compatta quando si scende', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.clock.setFixedTime(new Date('2026-11-10T16:00:00+01:00'));
  await finto(page, dati(1600));
  await page.goto('/');
  await page.getByRole('button', { name: 'Astra' }).click();
  await page.waitForTimeout(500); // Astra scende da sola fino a Sei qui
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('body')).not.toHaveClass(/astra-scesa/);
  const alta = (await page.locator('.astra-testata').boundingBox())!.height;
  await page.evaluate(() => window.scrollTo(0, 600));
  await expect(page.locator('body')).toHaveClass(/astra-scesa/);
  const bassa = (await page.locator('.astra-testata').boundingBox())!.height;
  expect(bassa).toBeLessThan(alta - 40);
});
