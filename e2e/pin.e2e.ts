import { expect, test, type Page } from '@playwright/test';
import { finto } from './finto';

// Cancello dell'area genitori sui dispositivi di Lani: "PIN non giusto" solo se il PIN è sbagliato.
async function apri(page: Page, risposta: { status: number; body: unknown }) {
  await page.clock.setFixedTime(new Date('2026-11-30T07:10:00+01:00'));
  await finto(page, { verifiche: [], impostazioni: [], movimenti_passi: [], fogli_firma: [], impegni_famiglia: [], serate: [], saldo_passi: [{ passi: 0 }] });
  // la sessione del genitore tenuta a parte: la stessa finta di Lani basta per arrivare al PIN
  await page.addInitScript(() => localStorage.setItem('ace-genitore', localStorage.getItem('ace-sessione') ?? ''));
  await page.route('https://finto.supabase.test/rest/v1/rpc/controlla_pin', (r) =>
    r.fulfill({ status: risposta.status, contentType: 'application/json', body: JSON.stringify(risposta.body) }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Genitori' }).click();
  await page.getByLabel('PIN').fill('1234');
  await page.getByRole('button', { name: 'Apri' }).click();
}

const CASI: [string, { status: number; body: unknown }, string][] = [
  ['sbagliato', { status: 200, body: 'sbagliato' }, 'PIN non giusto. Riprova.'],
  ['bloccato', { status: 200, body: 'bloccato' }, 'Troppi tentativi sbagliati'],
  ['manca', { status: 200, body: 'manca' }, 'Il PIN non è ancora impostato'],
  ['errore del server', { status: 500, body: { message: 'giù' } }, 'Non riesco a controllare il PIN adesso'],
];

for (const [nome, risposta, testo] of CASI)
  test(`PIN: ${nome}`, async ({ page }) => {
    await apri(page, risposta);
    await expect(page.getByRole('alert')).toContainText(testo);
    if (nome !== 'sbagliato') await expect(page.getByRole('alert')).not.toContainText('PIN non giusto');
    await expect(page.getByLabel('PIN')).toHaveValue('');
  });

test('PIN giusto: si apre l’area genitori, con "Chiudi l’area"', async ({ page }) => {
  await apri(page, { status: 200, body: 'ok' });
  await expect(page.getByRole('button', { name: 'Chiudi l’area' })).toBeVisible();
  await expect(page.getByLabel('PIN')).toHaveCount(0);
});

// dal 16/11: aperta 10 minuti dall'ultima azione, anche uscendo dall'app; poi di nuovo il PIN
test('PIN: l’area resta aperta 10 minuti dall’ultima azione, poi si richiude', async ({ page }) => {
  await apri(page, { status: 200, body: 'ok' });
  await expect(page.getByRole('heading', { name: 'Oggi', level: 1 })).toBeVisible();
  // l'app esce e torna dopo 9 minuti (anche ricaricata): ancora aperta
  await page.clock.setFixedTime(new Date('2026-11-30T07:19:00+01:00'));
  await page.reload();
  await page.getByRole('button', { name: 'Genitori' }).click();
  await expect(page.getByRole('heading', { name: 'Oggi', level: 1 })).toBeVisible();
  await page.getByRole('navigation', { name: 'Sezioni genitori' }).getByRole('button', { name: 'Settimana' }).click();
  // 9 minuti dopo l'ultimo tocco: ancora aperta
  await page.clock.setFixedTime(new Date('2026-11-30T07:28:00+01:00'));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByRole('heading', { name: 'Settimana', level: 1 })).toBeVisible();
  // più di 10 minuti senza toccare: torna il PIN
  await page.clock.setFixedTime(new Date('2026-11-30T07:39:30+01:00'));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByLabel('PIN')).toBeVisible();
});

test('PIN: "Chiudi l’area" blocca subito', async ({ page }) => {
  await apri(page, { status: 200, body: 'ok' });
  await page.getByRole('button', { name: 'Chiudi l’area' }).click();
  await expect(page.getByRole('navigation', { name: 'Sezioni genitori' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Genitori' }).click();
  await expect(page.getByLabel('PIN')).toBeVisible();
});
