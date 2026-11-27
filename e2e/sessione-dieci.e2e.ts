import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { finto, type Tabelle } from './finto';
import config from '../data/config-dieci-minuti.json' with { type: 'json' };

// Dieci minuti a carte (25/11): la sessione a tutto schermo, uguale per le sette carte. Orologio finto: il
// tempo finto scorre anche in tempo reale, quindi si guarda a metà delle fasi e i salti lunghi usano
// fastForward (la schermata calcola la fase dall'ora di avvio, come dopo uno schermo spento).
const LUNEDI = new Date('2027-01-11T16:30:00+01:00');
const OGGI = '2027-01-11';
const TRICK = config.carte.find((c) => c.n === 4)!.esercizi;
const NOMI = TRICK.map((t) => t.nome);
const dati = (carta: number, altro: Tabelle = {}): Tabelle => ({
  materie: [],
  compiti: [],
  lezioni: [],
  verifiche: [],
  fogli_firma: [],
  impostazioni: [{ chiave: 'r_evolution_da', valore: '2027-01-07' }],
  impegni_famiglia: [],
  serate: [],
  movimenti_passi: [],
  carte_del_giorno: [{ data: OGGI, carta, record: null, record_su: null }],
  ruota: [{ data: OGGI, carta }],
  ...altro,
});
const nomeCarta = (n: number) => config.carte.find((c) => c.n === n)!.nome;
const sessione = (page: Page, n = 4) => page.getByRole('dialog', { name: `Dieci minuti: ${nomeCarta(n)}` });

async function apri(page: Page, carta = 4, altro: Tabelle = {}, primaDiVia?: () => void) {
  await page.clock.install({ time: LUNEDI });
  await page.addInitScript(() => {
    (window as unknown as { vibrazioni: unknown[] }).vibrazioni = [];
    Object.defineProperty(navigator, 'vibrate', {
      value: (p: unknown) => (window as unknown as { vibrazioni: unknown[] }).vibrazioni.push(p),
    });
  });
  const f = await finto(page, dati(carta, altro), { passi: { passi: 10 } });
  await page.goto('/');
  const fascia = page.getByRole('region', { name: 'Dieci minuti' });
  await expect(fascia.getByText(nomeCarta(carta).toUpperCase())).toBeVisible();
  if (primaDiVia) await page.evaluate(primaDiVia);
  await fascia.getByRole('button', { name: 'VIA' }).click();
  await expect(sessione(page, carta)).toBeVisible();
  return f;
}

// passo passo (ogni scatto del timer, per i segnali) o di colpo
const avanti = (page: Page, secondi: number) => page.clock.runFor(secondi * 1000);
const salta = (page: Page, secondi: number) => page.clock.fastForward(secondi * 1000);
const nome = (page: Page, n = 4) => sessione(page, n).getByRole('heading', { level: 2 }).first();
const timer = (page: Page, n = 4) => sessione(page, n).getByRole('timer');

test('carta 4: riscaldamento, "Come si fa" la prima volta, 8 trick diversi, "3, 2, 1, cambio", record e SEGNA FATTO', async ({ page }) => {
  const { t, chiamate } = await apri(page);
  const s = sessione(page);
  await expect.poll(() => t.serate[0]).toMatchObject({ data: OGGI, dieci_minuti_esercizio: 'carta-4' });
  // riscaldamento con le pose base
  await expect(nome(page)).toHaveText('Palleggio base');
  await expect(timer(page)).toHaveText(/^(60|59|58)$/);
  await expect(s.getByText('Scaldiamo braccia e gambe.')).toBeVisible();
  await page.screenshot({ path: 'e2e/risultati/dieci-riscaldamento.png' });

  // ultimi 20" del riscaldamento: arriva il primo trick, mai visto: striscia in tre vignette numerate
  await salta(page, 41);
  const primo = await nome(page).textContent();
  expect(NOMI).toContain(primo);
  const come = s.getByRole('region', { name: `Come si fa: ${primo}` });
  await expect(come.getByRole('listitem')).toHaveCount(3);

  // ultimi 3": "3, 2, 1… cambio!" e vibrazione corta
  await avanti(page, 16.5);
  await expect(s.getByText('3, 2, 1… cambio!')).toBeVisible();

  // lavoro: il trick, il timer, il "?" per riaprire la striscia
  await avanti(page, 4);
  await expect(timer(page)).toHaveText(/^3[4-9]$/);
  await expect(s.getByText('Vai, tocchi puliti!')).toBeVisible();
  await expect(come).toHaveCount(0);
  await s.getByRole('button', { name: `Come si fa: ${primo}` }).click();
  await come.getByRole('button', { name: 'Ho capito' }).click();
  const id = TRICK.find((x) => x.nome === primo)!.id;
  await expect(s.locator('.sessione-figura img')).toHaveAttribute('src', `/assets/trick/${id}.webp`);

  await salta(page, 30);
  await expect(s.getByText('Ancora 10 secondi!')).toBeVisible();
  const vibrazioni = await page.evaluate(() => (window as unknown as { vibrazioni: unknown[] }).vibrazioni);
  expect(vibrazioni).toContainEqual(config.vibrazione_ms.conto);
  expect(vibrazioni).toContainEqual(config.vibrazione_ms.cambio);

  // gli altri sette blocchi: nomi tutti diversi, otto dei nove
  const visti = [primo];
  for (let b = 1; b < 8; b++) {
    await salta(page, b === 1 ? 50 : 60);
    await expect(s.getByText('Vai, tocchi puliti!')).toBeVisible();
    visti.push(await nome(page).textContent());
  }
  expect(new Set(visti).size).toBe(8);

  // record: uno degli otto, il primo si salva sul server senza festa
  await salta(page, 50);
  await expect(s.getByText('Ultimo minuto: il record!')).toBeVisible();
  const su = await nome(page).textContent();
  expect(visti).toContain(su);
  await s.getByLabel('Quanti di fila?').fill('12');
  await s.getByRole('button', { name: 'Salva' }).click();
  await expect(s.getByRole('status')).toHaveText('Primo record: 12. La prossima volta lo batti?');
  expect(t.carte_del_giorno[0]).toMatchObject({ record: 12, record_su: su });

  // a sessione finita (e col margine del server) SEGNA FATTO: i passi come prima
  await salta(page, 66);
  await expect(timer(page)).toHaveText('FATTO');
  await s.getByRole('button', { name: 'SEGNA FATTO' }).click();
  const fascia = page.getByRole('region', { name: 'Dieci minuti' });
  await expect(fascia.getByText('FATTI!')).toBeVisible();
  await expect.poll(() => chiamate).toEqual([{ tipo: 'dieci_minuti', id: OGGI }]);
});

test('record: si festeggia solo quando batte il migliore dei giorni prima', async ({ page }) => {
  const prima = NOMI.map((n, i) => ({ data: `2027-01-0${(i % 3) + 4}`, carta: 4, record: 10, record_su: n }));
  await apri(page, 4, { carte_del_giorno: [{ data: OGGI, carta: 4, record: null, record_su: null }, ...prima] });
  const s = sessione(page);
  await salta(page, 545);
  await s.getByLabel('Quanti di fila?').fill('10');
  await s.getByRole('button', { name: 'Salva' }).click();
  await expect(s.getByRole('status')).toHaveText('Il record resta 10. Oggi 10.');
  await expect(s.locator('.sessione-festa')).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'APRI IL TIMER' }).click();
  await s.getByLabel('Quanti di fila?').fill('11');
  await s.getByRole('button', { name: 'Salva' }).click();
  await expect(s.getByRole('status')).toHaveText('Record nuovo: 11!');
  await expect(s.locator('.sessione-festa')).toBeVisible();
  await page.screenshot({ path: 'e2e/risultati/dieci-record.png' });
});

test('carta 1: sticker fisso, esercizi a rotazione, record degli squat', async ({ page }) => {
  await apri(page, 1);
  const s = sessione(page, 1);
  await expect(nome(page, 1)).toHaveText('Camminata sul posto');
  await expect(s.locator('.sessione-figura img')).toHaveAttribute('src', /lani-dieci-minuti\.webp$/);
  await salta(page, 70);
  await expect(nome(page, 1)).toHaveText('Squat');
  await expect(s.locator('.sessione-figura img')).toHaveAttribute('src', '/assets/trick/squat.webp');
  await page.screenshot({ path: 'e2e/risultati/dieci-squat.png' });
  await expect(s.getByText('Vai così, bene!')).toBeVisible();
  await expect(s.locator('.sessione-totale')).toHaveText(/^8:[45][0-9]$/);
  // pausa: si vede che è pausa e quale esercizio arriva
  await salta(page, 35);
  await expect(s.getByText('PAUSA')).toBeVisible();
  await expect(s.getByText('Il prossimo esercizio sarà:')).toBeVisible();
  await expect(nome(page, 1)).toHaveText('Affondi');
  await page.screenshot({ path: 'e2e/risultati/dieci-pausa.png' });
  await salta(page, 60 * 5 - 35);
  await expect(nome(page, 1)).toHaveText('Squat'); // sesto blocco: si ricomincia
  await salta(page, 60 * 3 - 10 + 5);
  await expect(s.getByLabel('Quanti squat in 30 secondi?')).toBeVisible();
});

test('carta 6: il record si sceglie fra quattro valori', async ({ page }) => {
  const { t } = await apri(page, 6);
  const s = sessione(page, 6);
  await salta(page, 545);
  await s.getByRole('button', { name: 'Punte' }).click();
  await expect(s.getByRole('status')).toHaveText('Primo record: Punte. La prossima volta lo batti?');
  expect(t.carte_del_giorno[0]).toMatchObject({ record: 2, record_su: 'Busto in avanti' });
});

test('carta 7: niente record, il minuto finale è respirazione', async ({ page }) => {
  await apri(page, 7);
  const s = sessione(page, 7);
  await salta(page, 545);
  await expect(nome(page, 7)).toHaveText('Respirazione');
  await expect(s.getByText('Respira piano, così va bene.')).toBeVisible();
  await expect(s.getByRole('textbox')).toHaveCount(0);
  await expect(s.getByRole('spinbutton')).toHaveCount(0);
});

test('carta 3: "Ho il visore" fa Beat Saber con la combo più lunga; di base la palla rimbalzina', async ({ page }) => {
  await page.clock.install({ time: LUNEDI });
  const prima = [
    { data: '2027-01-04', carta: 3, record: 500, record_su: 'Prese di fila' },
    { data: '2027-01-05', carta: 3, record: 100, record_su: 'Combo più lunga' },
  ];
  await finto(page, dati(3, { carte_del_giorno: [{ data: OGGI, carta: 3, record: null, record_su: null }, ...prima] }));
  await page.goto('/');
  const fascia = page.getByRole('region', { name: 'Dieci minuti' });
  const visore = fascia.getByRole('checkbox', { name: 'Ho il visore' });
  await expect(visore).not.toBeChecked();
  await visore.check();
  await expect(fascia.getByText('Beat Saber col visore, 10 minuti.')).toBeVisible();
  await fascia.getByRole('button', { name: 'VIA' }).click();
  const s = sessione(page, 3);
  await expect(s.locator('.sessione-figura img')).toHaveAttribute('src', /lani-vr\.webp$/);
  // parte subito: niente riscaldamento, un solo conto alla rovescia
  await expect(nome(page, 3)).toHaveText('Beat Saber');
  await expect(s.getByRole('timer')).toHaveText(/^(10:00|9:5[0-9])$/);
  await page.screenshot({ path: 'e2e/risultati/dieci-visore.png' });
  await salta(page, 545);
  await expect(s.getByText('PAUSA')).toHaveCount(0);
  await expect(s.getByRole('spinbutton')).toHaveCount(0);
  // finiti i 10 minuti (col margine del server), SEGNA FATTO aspetta il record
  await salta(page, 70);
  const segna = s.getByRole('button', { name: 'SEGNA FATTO' });
  await expect(s.getByRole('timer')).toHaveText('FATTO');
  await expect(segna).toHaveCount(0);
  await s.getByLabel('Qual è la combo più lunga?').fill('120');
  await s.getByRole('button', { name: 'Salva' }).click();
  // il record delle prese di fila (500) non conta: col visore si confronta solo la combo
  await expect(s.getByRole('status')).toHaveText('Record nuovo: 120!');
  await expect(segna).toBeVisible();
});

test('movimento ridotto: solo il primo fotogramma, e niente vibrazione', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await apri(page);
  const s = sessione(page);
  await expect(s.locator('.sessione-figura img')).toHaveAttribute('src', '/assets/trick/palleggio-base-fermo.webp');
  await salta(page, 70);
  await expect(s.locator('.sessione-figura img')).toHaveAttribute('src', /-fermo\.webp$/);
  expect(await page.evaluate(() => (window as unknown as { vibrazioni: unknown[] }).vibrazioni)).toEqual([]);
});

test('carta 4: il muro che manca nella GIF è disegnato accanto al trick del muro', async ({ page }) => {
  // caso fisso: il primo scambio porta il muro con rimbalzo, l'ultimo del config, in testa; poi nessuno scambio
  await apri(page, 4, {}, () => {
    localStorage.removeItem('ace:dieci-minuti:sessione');
    let n = 0;
    Math.random = () => (n++ % 8 === 0 ? 0 : 0.999);
  });
  const s = sessione(page);
  await salta(page, 70);
  await expect(nome(page)).toHaveText('Muro e rimbalzo');
  await expect(s.locator('.sessione-figura.con-muro .sessione-muro')).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).include('.sessione').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([]);
});

for (const c of config.carte) {
  test(`sfondo della carta ${c.n}`, async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    await apri(page, c.n);
    await expect(sessione(page, c.n).locator(`.sfondo.${c.tema.motivo}`)).toBeVisible();
    // a metà del terzo blocco di lavoro
    await salta(page, 190);
    await avanti(page, 1);
    // tempo vero per le dissolvenze (costellazioni)
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `e2e/risultati/sfondo-${c.n}.png` });
  });
}

test('la ruota usa i colori dei temi', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await page.clock.install({ time: LUNEDI });
  await finto(page, dati(1, { carte_del_giorno: [], ruota: [] }));
  await page.goto('/');
  const ruota = page.locator('.ruota-disco');
  await expect(ruota.locator('path').first()).toHaveAttribute('fill', config.carte[0].tema.fondo);
  await ruota.screenshot({ path: 'e2e/risultati/ruota-temi.png' });
});
