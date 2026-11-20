import { expect, test } from '@playwright/test';
import { finto } from './finto';

function dati() {
  return {
    materie: [
      { id: 'italiano', nome: 'Italiano' },
      { id: 'matematica', nome: 'Matematica' },
      { id: 'inglese', nome: 'Inglese' },
    ],
    verifiche: [{ tipo: 'verifica', data: '2026-11-09', materia_id: 'italiano' }],
    compiti: [
      { id: 'c1', testo: 'le battute del dialogo, pagina 16', scadenza: '2026-11-10', fatto_il: null, materia_id: 'inglese' },
      { id: 'c2', testo: 'pagine 340–352 e la scheda', scadenza: '2026-11-10', fatto_il: null, materia_id: 'italiano' },
      { id: 'c3', testo: 'pagina 345 e problemi 380–382', scadenza: '2026-11-10', fatto_il: null, materia_id: 'matematica' },
    ],
    impostazioni: [
      { chiave: 'materiale_cartella', valore: { 1: ['Cartellina di tecnologia'] } },
      { chiave: 'ora_chiusura', valore: { 0: '20:00', 1: '20:30', 2: '20:30', 3: '20:30', 4: '20:30' } },
    ],
    impegni_famiglia: [
      { titolo: 'Allenamento Pallavolo Leilani U-13', inizio: '2026-11-09T14:00:00Z', tutto_il_giorno: false },
      { titolo: 'Cena dai nonni', inizio: '2026-11-09T18:30:00Z', tutto_il_giorno: false },
      { titolo: 'Allenamento Pallavolo Leilani U-13', inizio: '2026-11-10T17:30:00Z', tutto_il_giorno: false },
      { titolo: 'Tennis Leonardo', inizio: '2026-11-10T16:30:00Z', tutto_il_giorno: false },
    ],
    movimenti_passi: [{ giorno: '2026-11-08', passi: 15, moltiplicatore: 1 }],
    fogli_firma: [],
    serate: [],
    lezioni: [],
  };
}

test('mattina di lunedì: tre cose, passi di ieri, in famiglia', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-09T07:10:00+01:00'));
  await finto(page, dati());
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Buongiorno, Lani' })).toBeVisible();
  await expect(page.getByText('Lunedì 9 novembre')).toBeVisible();
  await expect(page.getByText('Scuola, poi allenamento.')).toBeVisible();
  const cose = page.locator('.cose li');
  await expect(cose).toHaveCount(3);
  await expect(cose.nth(0)).toContainText('Verifica di Italiano');
  await expect(cose.nth(1)).toContainText('Allenamento alle 15:00');
  await expect(cose.nth(1)).toContainText('Esci con cartella e borsa insieme');
  await expect(cose.nth(2)).toContainText('Cartellina di tecnologia');
  await expect(page.locator('.pillola-oro')).toContainText('Passi di ieri');
  await expect(page.locator('.pillola-oro .numero')).toHaveText('+15');
  await expect(page.locator('.famiglia')).toContainText('19:30 Cena dai nonni');
  await expect(page.locator('.famiglia')).toContainText('mar 17:30 Tennis Leonardo');
  await expect(page.locator('.famiglia')).not.toContainText('Allenamento');
  await page.screenshot({ path: 'e2e/risultati/oggi-mattina.png', fullPage: true });
});

test('pomeriggio di lunedì: compiti di martedì, il più lungo prima', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-09T17:45:00+01:00') });
  const { chiamate } = await finto(page, dati());
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Compiti per martedì' })).toBeVisible();
  await expect(page.getByText('Hai tempo fino alle 20:30.')).toBeVisible();
  const righe = page.locator('.spunte li');
  await expect(righe.nth(0)).toContainText('Italiano: pagine 340–352');
  await expect(righe.nth(2)).toContainText('Inglese');
  await expect(righe.nth(0)).toContainText('Inizia da qui: è il più lungo'); // sotto il primo compito, come nella bozza
  for (const c of await page.getByRole('checkbox').all()) await c.check();
  await expect(page.getByText('Compiti finiti. Il resto del pomeriggio è tuo.')).toBeVisible();
  await page.clock.runFor(5100);
  await expect.poll(() => chiamate.length).toBe(3);
  await page.screenshot({ path: 'e2e/risultati/oggi-pomeriggio.png', fullPage: true });
});

test('pomeriggio: il compito fatto va in fondo, dopo i 5 secondi di Annulla', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-09T17:45:00+01:00') });
  await finto(page, dati());
  await page.goto('/');
  const righe = page.locator('.spunte li');
  await page.getByRole('checkbox', { name: /Italiano/ }).check();
  // finché c'è Annulla la riga resta al suo posto
  await expect(righe.nth(0)).toContainText('Italiano');
  await expect(righe.nth(0).getByRole('button', { name: 'Annulla' })).toBeVisible();
  await page.clock.runFor(5100);
  await expect(righe.nth(0)).toContainText('Matematica');
  await expect(righe.nth(0).locator('.bollino')).toHaveText('1');
  await expect(righe.nth(2)).toContainText('Italiano');
  await expect(page.getByText('Inizia da qui')).toHaveCount(0);
});

test('martedì alle 17:10 si apre sulla sera: chiusura alle 18:00 per l’allenamento', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-10T17:10:00+01:00'));
  await finto(page, dati());
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Sera' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: /Pronta per/ })).toBeVisible();
});

test('lunedì alle 19:00 resta sul pomeriggio: chiusura alle 20:30', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-09T19:00:00+01:00'));
  await finto(page, dati());
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Oggi' })).toHaveAttribute('aria-current', 'page');
});

test('lampadina: spiegazione con un altro esempio, poi il tentativo, poi un indizio alla volta', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-09T17:45:00+01:00'));
  const INDIZI = ['Guarda il denominatore.', 'Dividi per lui.', 'Ora moltiplica.'];
  const s = { tentativo: null as string | null, visti: 0, corpi: [] as Record<string, unknown>[] };
  const stato = () => ({ spiegazione: 'Per trovare i 2/3 di 12: 12 : 3 = 4, poi 4 × 2 = 8.', tentativo: s.tentativo, indizi: INDIZI.slice(0, s.visti), totale_indizi: 3 });
  await finto(page, dati(), {
    spiega: (c: Record<string, unknown>) => {
      s.corpi.push(c);
      if (c.azione === 'tentativo') return { tentativo: (s.tentativo = String(c.testo)) };
      if (c.azione === 'indizio') s.visti++;
      return stato();
    },
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Non ho capito: Matematica' }).click();
  await expect(page.getByRole('heading', { name: 'Non ho capito' })).toBeVisible();
  await expect(page.getByText('Per trovare i 2/3 di 12')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Un indizio' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Ci ho provato così' }).click();
  await expect(page.getByRole('alert')).toHaveText('Scrivi almeno una parola su come hai provato.');
  await page.getByLabel('Prima dimmi come ci hai provato').fill('Ho diviso 12 per 2');
  await page.getByRole('button', { name: 'Ci ho provato così' }).click();
  await expect(page.getByText('Il tuo tentativo: Ho diviso 12 per 2')).toBeVisible();
  await expect(page.getByText('Guarda il denominatore.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Un indizio' }).click();
  await expect(page.getByText('Guarda il denominatore.')).toBeVisible();
  await page.getByRole('button', { name: 'Un altro indizio' }).click();
  await expect(page.getByText('Dividi per lui.')).toBeVisible();
  // apertura anche due volte in sviluppo (StrictMode): conta l'ordine dei passi di Lani
  expect(s.corpi.map((c) => c.azione).filter(Boolean)).toEqual(['tentativo', 'indizio', 'indizio']);
  await page.getByRole('button', { name: 'Torna ai compiti' }).click();
  await expect(page.getByRole('heading', { name: 'Compiti per martedì' })).toBeVisible();
});
