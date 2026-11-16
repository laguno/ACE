import { expect, test } from '@playwright/test';
import config from '../data/config-gioco.json' with { type: 'json' };
import { finto } from './finto';

// "Come si fanno i passi": da Astra (vicino al contapassi), con i numeri del config; R-Evolution
// solo se accesa; dettagli dietro "Come funziona". Genitori: versione completa in Altro.
const LUNEDI = new Date('2026-11-30T15:00:00+01:00');
const dati = (accesa: boolean) => ({
  saldo_passi: [{ passi: 300 }],
  chiavi_totali: [{ chiavi: 1 }],
  settimane: [],
  forzieri_lani: Array.from({ length: 9 }, (_, i) => ({ n: i + 1, stato: 'chiuso', enigma: null, premio: null, tentativi_enigma: 0, enigma_risolto_il: null })),
  impostazioni: accesa ? [{ chiave: 'r_evolution_da', valore: '2026-11-16' }] : [],
  figurine: [],
});

for (const accesa of [false, true]) {
  test(`Lani: Astra, Come si fanno i passi (R-Evolution ${accesa ? 'accesa' : 'spenta'})`, async ({ page }) => {
    await page.clock.setFixedTime(LUNEDI);
    await finto(page, dati(accesa));
    await page.goto('/');
    await page.getByRole('button', { name: 'Astra' }).click();
    await page.getByRole('button', { name: 'Come si fanno i passi' }).click();
    await expect(page.getByRole('heading', { name: 'Come si fanno i passi' })).toBeVisible();
    for (const t of ['Ogni giorno', 'Studio in più', 'Voti e traguardi', 'Gesti di casa', 'Cosa fa perdere passi', 'Chiavi e forzieri'])
      await expect(page.getByRole('heading', { name: t })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'R-Evolution' })).toHaveCount(accesa ? 1 : 0);
    const compiti = page.locator('li', { hasText: 'Compiti per domani fatti' });
    await expect(compiti.locator('.valore')).toHaveText(`+${config.passi.obbligatori.compiti}`);
    await expect(page.getByText('Li danno mamma e papà quando li notano, non si chiedono.')).toBeVisible();
    const dettaglio = page.getByText(`Ogni flash card si gira dopo ${config.passi.studio_facoltativo.flashcard_secondi_prima_di_girare} secondi.`);
    await expect(dettaglio).toBeHidden();
    await page.locator('.blocco-passi', { has: page.getByRole('heading', { name: 'Studio in più' }) }).getByText('Come funziona').click();
    await expect(dettaglio).toBeVisible();
    await page.screenshot({ path: `e2e/risultati/come-passi-${accesa ? 'accesa' : 'spenta'}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Torna a Astra' }).click();
    await expect(page.getByText('Ogni giorno, passino passino.')).toBeAttached();
  });
}

test('genitori: Altro, Regole del gioco, completa con i dettagli aperti', async ({ page }) => {
  await page.clock.setFixedTime(LUNEDI);
  await finto(page, { ...dati(false), profili: [{ id: 'lani', ruolo: 'genitore', nome: 'Papà' }], voti: [], note: [], gesti_casa: [], sgridate: [], richieste_foto: [] });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Sezioni genitori' }).getByRole('button', { name: 'Impostazioni' }).click();
  await page.getByRole('button', { name: /^Regole del gioco/ }).click();
  await expect(page.getByRole('heading', { name: 'R-Evolution' })).toBeVisible();
  await expect(page.getByText(`Al massimo +${config.passi.gesti_casa.tetto_giornaliero} al giorno.`)).toBeVisible();
});
