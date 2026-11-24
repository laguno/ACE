import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { finto } from './finto';
import config from '../data/config-trick.json' with { type: 'json' };

// Carta 4 dei dieci minuti, "Palla al muro: trick" (PROTOTIPO, 24/11): in fondo a Oggi solo nelle build di
// prova (qui il server di sviluppo). Sessione intera con l'orologio finto: il tempo finto scorre anche in
// tempo reale, quindi si guarda a metà delle fasi e i salti lunghi usano fastForward (la schermata calcola
// la fase dall'ora di avvio, come dopo uno schermo spento).
const LUNEDI = new Date('2027-01-11T16:30:00+01:00');
const NOMI = config.trick.map((t) => t.nome);
const dati = () => ({
  materie: [],
  compiti: [],
  lezioni: [],
  verifiche: [],
  fogli_firma: [],
  impostazioni: [],
  impegni_famiglia: [],
  serate: [],
  movimenti_passi: [],
});
const sessione = (page: Page) => page.getByRole('dialog', { name: 'Palla al muro: trick' });

async function apri(page: Page, primaDiVia?: () => void) {
  await page.clock.install({ time: LUNEDI });
  await page.addInitScript(() => {
    (window as unknown as { vibrazioni: unknown[] }).vibrazioni = [];
    Object.defineProperty(navigator, 'vibrate', {
      value: (p: unknown) => (window as unknown as { vibrazioni: unknown[] }).vibrazioni.push(p),
    });
  });
  await finto(page, dati());
  await page.goto('/');
  const fascia = page.getByRole('region', { name: 'Carta 4, prova' });
  await expect(fascia.getByRole('heading', { name: 'Palla al muro: trick' })).toBeVisible();
  if (primaDiVia) await page.evaluate(primaDiVia);
  await fascia.getByRole('button', { name: 'VIA' }).click();
  await expect(sessione(page)).toBeVisible();
}

// passo passo (ogni scatto del timer, per i segnali) o di colpo
const avanti = (page: Page, secondi: number) => page.clock.runFor(secondi * 1000);
const salta = (page: Page, secondi: number) => page.clock.fastForward(secondi * 1000);
const nome = (page: Page) => sessione(page).getByRole('heading', { level: 2 }).first();
const timer = (page: Page) => sessione(page).getByRole('timer');

test('carta 4: riscaldamento, "Come si fa" la prima volta, 8 trick diversi, "3, 2, 1, cambio" e record', async ({ page }) => {
  await apri(page);
  const s = sessione(page);
  // riscaldamento con le pose base
  await expect(nome(page)).toHaveText('Palleggio base');
  await expect(timer(page)).toHaveText(/^(60|59|58)$/);
  await expect(s.getByText('Scaldiamo braccia e gambe.')).toBeVisible();
  await page.screenshot({ path: 'e2e/risultati/carta4-riscaldamento.png' });

  // ultimi 20" del riscaldamento: arriva il primo trick, mai visto: striscia in tre vignette numerate
  await salta(page, 41);
  const primo = await nome(page).textContent();
  expect(NOMI).toContain(primo);
  const come = s.getByRole('region', { name: `Come si fa: ${primo}` });
  await expect(come.getByRole('listitem')).toHaveCount(3);
  await expect(s.getByRole('button', { name: `Come si fa: ${primo}` })).toHaveCount(0);
  await page.screenshot({ path: 'e2e/risultati/carta4-come-si-fa.png' });

  // ultimi 3": "3, 2, 1… cambio!" e vibrazione corta
  await avanti(page, 16.5);
  await expect(s.getByText('3, 2, 1… cambio!')).toBeVisible();

  // lavoro: il trick, il timer, il "?" per riaprire la striscia
  await avanti(page, 4);
  await expect(timer(page)).toHaveText(/^3[4-9]$/);
  await expect(s.getByText('Vai, tocchi puliti!')).toBeVisible();
  await expect(come).toHaveCount(0);
  const aiuto = s.getByRole('button', { name: `Come si fa: ${primo}` });
  await aiuto.click();
  await expect(come.getByRole('listitem')).toHaveCount(3);
  await come.getByRole('button', { name: 'Ho capito' }).click();
  await expect(come).toHaveCount(0);
  const id = config.trick.find((t) => t.nome === primo)!.id;
  await expect(s.locator('.carta4-figura img')).toHaveAttribute('src', `/assets/trick/${id}.webp`);
  await page.screenshot({ path: 'e2e/risultati/carta4-lavoro.png' });

  await salta(page, 30);
  await expect(s.getByText('Ancora 10 secondi!')).toBeVisible();
  const vibrazioni = await page.evaluate(() => (window as unknown as { vibrazioni: unknown[] }).vibrazioni);
  expect(vibrazioni).toContainEqual(config.vibrazione_ms.conto);
  expect(vibrazioni).toContainEqual(config.vibrazione_ms.cambio);

  // gli altri sette blocchi: nomi tutti diversi, otto dei nove
  const visti = [primo];
  for (let b = 1; b < 8; b++) {
    await salta(page, b === 1 ? 50 : 60); // a metà del lavoro del blocco dopo
    await expect(s.getByText('Vai, tocchi puliti!')).toBeVisible();
    visti.push(await nome(page).textContent());
  }
  expect(new Set(visti).size).toBe(8);
  for (const n of visti) expect(NOMI).toContain(n);

  // record: uno degli otto, il primo si salva senza festa
  await salta(page, 50);
  await expect(s.getByText('Quanti di fila? Conta!')).toBeVisible();
  expect(visti).toContain(await nome(page).textContent());
  await s.getByLabel('Quanti di fila?').fill('12');
  await s.getByRole('button', { name: 'Salva' }).click();
  await expect(s.getByRole('status')).toHaveText('Primo record: 12. Domani lo batti?');
  await expect(s.locator('.carta4-festa')).toHaveCount(0);

  await salta(page, 60);
  await expect(timer(page)).toHaveText('FATTO');
  await expect(s.getByText('Dieci minuti fatti. Bel lavoro.')).toBeVisible();
  await page.screenshot({ path: 'e2e/risultati/carta4-fine.png' });
  await s.getByRole('button', { name: 'Esci' }).click();
  await expect(sessione(page)).toHaveCount(0);
});

test('carta 4: si festeggia solo quando il record è battuto', async ({ page }) => {
  const record = Object.fromEntries(config.trick.map((t) => [t.id, 10]));
  await apri(page, new Function(`localStorage.setItem('ace-prova:trick:record', '${JSON.stringify(record)}')`) as () => void);
  const s = sessione(page);
  await salta(page, 545);
  await s.getByLabel('Quanti di fila?').fill('10');
  await s.getByRole('button', { name: 'Salva' }).click();
  await expect(s.getByRole('status')).toHaveText('Il record resta 10. Oggi 10.');
  await expect(s.locator('.carta4-festa')).toHaveCount(0);

  await s.getByRole('button', { name: 'Esci' }).click();
  await page.getByRole('button', { name: 'VIA' }).click();
  await salta(page, 545);
  await s.getByLabel('Quanti di fila?').fill('11');
  await s.getByRole('button', { name: 'Salva' }).click();
  await expect(s.getByRole('status')).toHaveText('Record nuovo: 11!');
  await expect(s.locator('.carta4-festa')).toBeVisible();
  await page.screenshot({ path: 'e2e/risultati/carta4-record.png' });
});

test('carta 4: con il movimento ridotto solo il primo fotogramma, e niente vibrazione', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await apri(page);
  const s = sessione(page);
  await expect(s.locator('.carta4-figura img')).toHaveAttribute('src', '/assets/trick/palleggio-base-fermo.webp');
  await salta(page, 70);
  await expect(s.locator('.carta4-figura img')).toHaveAttribute('src', /-fermo\.webp$/);
  expect(await page.evaluate(() => (window as unknown as { vibrazioni: unknown[] }).vibrazioni)).toEqual([]);
});

test('carta 4: il muro che manca nella GIF è disegnato accanto al trick del muro', async ({ page }) => {
  // caso fisso: in ogni pescata (8 estrazioni, anche ripetuta da StrictMode) il primo scambio porta il muro
  // con rimbalzo, l'ultimo del config, in testa; poi nessuno scambio
  await apri(page, () => {
    let n = 0;
    Math.random = () => (n++ % 8 === 0 ? 0 : 0.999);
  });
  const s = sessione(page);
  await salta(page, 70);
  await expect(nome(page)).toHaveText('Muro e rimbalzo');
  await expect(s.locator('.carta4-figura.con-muro .carta4-muro')).toBeVisible();
  await page.screenshot({ path: 'e2e/risultati/carta4-muro.png' });
  const { violations } = await new AxeBuilder({ page }).include('.carta4').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([]);
});
