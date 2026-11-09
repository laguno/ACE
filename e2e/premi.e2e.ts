import { expect, test } from '@playwright/test';
import { finto } from './finto';

// Immagini dei premi: le URL le dà solo la funzione "premi"; il client mostra quello che riceve.
// Prima dello sblocco il server non manda l'immagine vera: qui si controlla che il client non la
// chieda né la mostri, e che cambi quando l'enigma è risolto.
const LUNEDI = new Date('2026-11-30T15:00:00+01:00');
const svg = (colore: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="${colore}"/></svg>`)}`;
const SAGOMA = svg('gray');
const VERA = svg('hotpink');

function dati(stato = 'enigma') {
  return {
    saldo_passi: [{ passi: 300 }],
    chiavi_totali: [{ chiavi: 1 }],
    settimane: [],
    forzieri_lani: [
      { n: 1, stato, enigma: 'Niente rete e niente palla…', premio: stato === 'aperto' ? 'Pigiama party' : null, tentativi_enigma: 0, enigma_risolto_il: null, aiutino: null },
      ...Array.from({ length: 8 }, (_, i) => ({ n: i + 2, stato: 'chiuso', enigma: null, premio: null, tentativi_enigma: 0, enigma_risolto_il: null })),
    ],
    figurine: [],
    popup_coda: [] as Record<string, unknown>[],
  };
}

async function apriForziere(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Astra' }).click();
  await page.getByRole('button', { name: 'Forziere 1' }).click();
}

test('forziere con enigma: la sagoma con "Indovini cos’è?", poi indovinato: l’immagine vera', async ({ page }) => {
  await page.clock.setFixedTime(LUNEDI);
  const funzioni: Record<string, unknown> = {
    premi: { immagini: [{ n: 1, sbloccato: false, manca: false, sagoma: SAGOMA, vera: null }] },
    enigma: { giusta: true, rimasti: 0, passi: 20 },
  };
  await finto(page, dati(), funzioni);
  await apriForziere(page);
  const figura = page.locator('.premio-figura');
  await expect(figura.getByRole('img', { name: 'La sagoma del premio' })).toHaveAttribute('src', SAGOMA);
  await expect(figura).toContainText('Indovini cos’è?');
  await expect(page.locator(`img[src="${VERA}"]`)).toHaveCount(0);
  // il server ora sblocca: risponde con l'immagine vera
  funzioni.premi = { immagini: [{ n: 1, sbloccato: true, manca: false, sagoma: SAGOMA, vera: VERA }] };
  await page.getByLabel("Cosa c'è nel forziere?").fill('pigiama party');
  await page.getByRole('button', { name: 'Prova' }).click();
  await expect(figura.getByRole('img', { name: 'Il premio del forziere' })).toHaveAttribute('src', VERA);
  await expect(figura).toContainText('Hai indovinato!');
});

test('premio cambiato e immagine non ancora rifatta: il pacco regalo', async ({ page }) => {
  await page.clock.setFixedTime(LUNEDI);
  await finto(page, dati(), { premi: { immagini: [{ n: 1, sbloccato: false, manca: true, sagoma: null, vera: null }] } });
  await apriForziere(page);
  await expect(page.getByRole('img', { name: 'Un regalo a sorpresa' })).toBeVisible();
});

test('forziere aperto: l’immagine vera nel popup', async ({ page }) => {
  await page.clock.setFixedTime(LUNEDI);
  const d = dati('aperto');
  d.popup_coda = [
    { id: 'p1', chiave: 'forziere:1:aperto', priorita: 3, situazione: 'forziere_aperto', posa: 'lani-sorpresa', titolo: 'Forziere aperto', testo: 'Dentro c’è: Pigiama party.', figurina: null, mostrato_il: null, creato_il: '2026-11-30T13:00:00Z' },
  ];
  await finto(page, d, { premi: { immagini: [{ n: 1, sbloccato: true, manca: false, sagoma: SAGOMA, vera: VERA }] } });
  await page.goto('/');
  const popup = page.getByRole('dialog');
  await expect(popup.getByRole('img', { name: 'Il premio del forziere' })).toHaveAttribute('src', VERA);
});
