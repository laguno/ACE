import { expect, test } from '@playwright/test';
import { finto } from './finto';

// Sprint 2: la voce R-Evolution compare nella barra da quando i genitori la accendono
// (impostazione r_evolution_da).
const ACCESA = [{ chiave: 'r_evolution_da', valore: '2027-01-07' }];
const dati = (impostazioni: Record<string, unknown>[] = ACCESA) => ({
  impostazioni,
  partite: [
    { id: 'p3', data: '2027-01-17', avversaria: 'Foxes Volley', set_nostri: 3, set_loro: 0, approvata_il: null },
    { id: 'p1', data: '2027-01-16', avversaria: 'Volley Bibbiano', set_nostri: 3, set_loro: 1, approvata_il: '2027-01-16T20:00:00Z' },
    { id: 'p2', data: '2027-01-09', avversaria: 'Pallavolo Montecchio', set_nostri: 2, set_loro: 3, approvata_il: '2027-01-09T20:00:00Z' },
  ],
  classifiche: [
    {
      cid: 93436,
      campionato: 'Under 13',
      girone: 'U13 Femminile girone C',
      squadra: '13R-EVOLUT. POLO DIGITALE',
      aggiornata_il: '2027-01-18T05:15:00Z',
      righe: [
        { pos: 1, squadra: '13R-EVOLUT. POLO DIGITALE', punti: 12, giocate: 4, vinte: 4, perse: 0, set_fatti: 12, set_subiti: 0 },
        { pos: 2, squadra: 'DENTI ALBINETANA PANTHERS', punti: 8, giocate: 4, vinte: 3, perse: 1, set_fatti: 9, set_subiti: 6 },
      ],
    },
  ],
  serate: [],
  movimenti_passi: [
    { motivo: 'partita', passi: 10, giorno: '2027-01-16', moltiplicatore: 1 },
    { motivo: 'partita_vinta', passi: 15, giorno: '2027-01-16', moltiplicatore: 1 },
  ],
  compiti: [],
  impegni_famiglia: [],
});

test('R-Evolution: classifica, partite con il risultato e passi presi in campo', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-18T10:00:00+01:00'));
  await finto(page, dati());
  await page.goto('/');
  await page.getByRole('button', { name: 'R-Evolution' }).click();
  await expect(page.getByRole('heading', { name: 'In campo' })).toBeVisible();
  await expect(page.getByText('+25 passi presi in campo.')).toBeVisible();

  const classifica = page.locator('.carta', { has: page.getByRole('heading', { name: 'Classifica Under 13' }) });
  await expect(classifica.getByRole('row', { name: /13R-EVOLUT\. POLO DIGITALE/ })).toHaveClass(/lani/);
  await expect(classifica.getByRole('row', { name: /DENTI ALBINETANA/ })).not.toHaveClass(/lani/);
  await expect(classifica.getByText('U13 Femminile girone C, dal portale FIPAV. Aggiornata il 18 gennaio.')).toBeVisible();

  // le partite stanno anche nel nastro dell'ultim'ora: qui si guarda la lista
  const partite = page.locator('.partite');
  await expect(partite.getByText('Volley Bibbiano')).toBeVisible();
  await expect(partite.getByText('3-1')).toHaveClass(/vinta/);
  await expect(partite.getByText('2-3')).toHaveClass(/persa/);
  await expect(page.locator('.ultimora .solo-lettori')).toHaveText("Ultim'ora. ultima partita: 3-1 con Volley Bibbiano. 1° posto in Under 13.");
  // quella senza risposta si vede ma non conta tra le giocate
  await expect(page.getByText('17 gennaio, aspetta la tua risposta')).toBeVisible();
  await expect(page.locator('.numeri dd').first()).toHaveText('2');
  await page.screenshot({ path: 'e2e/risultati/r-evolution.png', fullPage: true });
});

// dal 17/11: il risultato arriva dalla FIPAV, "Com'è andata?" si apre al primo tocco su R-Evolution
const COM_E_ANDATA = {
  id: 'q1',
  chiave: 'partita_fipav:p4',
  priorita: 3,
  situazione: 'partita_com_e_andata',
  posa: 'allenatore-pollice',
  titolo: 'Com’è andata?',
  testo: 'R-Evolution 3, Arbor Itarca 1: vinta! Siete prime nel girone, continuate così. Sei entrata in campo?',
  figurina: null,
  mostrato_il: null,
  creato_il: '2027-01-23T20:30:00Z',
};
const P4 = { id: 'p4', data: '2027-01-23', avversaria: 'Arbor Itarca', set_nostri: 3, set_loro: 1, in_campo: null, approvata_il: null, gara: 7, gara_cid: 93436 };

test("Com'è andata?: non in Oggi, si apre in R-Evolution col coach, niente chiudi, la risposta fa i passi", async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-23T21:00:00+01:00'));
  const { t, chiamate } = await finto(page, { ...dati(), partite: [P4, ...dati().partite], popup_coda: [{ ...COM_E_ANDATA }] });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'R-Evolution' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'R-Evolution' }).click();
  const popup = page.getByRole('dialog', { name: 'Com’è andata?' });
  await expect(popup).toContainText('R-Evolution 3, Arbor Itarca 1: vinta! Siete prime nel girone, continuate così. Sei entrata in campo?');
  await expect(popup.locator('.popup-avatar img')).toHaveAttribute('src', /allenatore-applaude/);
  // niente modulo per scrivere il risultato
  await expect(page.getByRole('heading', { name: /Segna la partita/ })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(popup).toBeVisible();
  await popup.getByRole('button', { name: 'In panchina' }).click();
  await expect(popup).toHaveCount(0);
  expect(t['rpc/rispondi_partita']?.[0]).toMatchObject({ p_id: 'p4', p_in_campo: false });
  expect(chiamate).toEqual([{ tipo: 'partita', id: 'p4' }]);
  expect(t.popup_coda[0].mostrato_il).toBeTruthy();
});

test("Com'è andata?: già risposta non si apre e si segna vista", async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-23T21:00:00+01:00'));
  const { t } = await finto(page, { ...dati(), partite: [{ ...P4, in_campo: true, approvata_il: '2027-01-23T20:40:00Z' }], popup_coda: [{ ...COM_E_ANDATA }] });
  await page.goto('/');
  await page.getByRole('button', { name: 'R-Evolution' }).click();
  await expect(page.getByRole('heading', { name: 'In campo' })).toBeVisible();
  await expect.poll(() => t.popup_coda[0].mostrato_il).toBeTruthy();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('il coach: dieci minuti del mattino, il collegamento porta alla carta in Oggi', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-18T07:30:00+01:00'));
  await finto(page, { ...dati(), esercizi_dieci_minuti: [{ id: 'e1', nome: 'Plank', tipo: 'forza', creato_il: '2027-01-01' }] });
  await page.goto('/');
  await page.getByRole('button', { name: 'R-Evolution' }).click();
  const coach = page.getByLabel('Il coach');
  await expect(coach).toContainText('Dieci minuti di allenamento prima delle 13:00. Forza, ti aspetto.');
  await expect(coach.locator('img')).toHaveAttribute('src', /allenatore/);
  await coach.getByRole('button', { name: 'Si parte' }).click();
  await expect(page.getByRole('button', { name: 'Oggi' })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('#dieci-minuti')).toBeInViewport();
  await page.screenshot({ path: 'e2e/risultati/coach-oggi.png' });
});

test('il coach fuori dal mattino: niente collegamento a una carta che non c’è', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-18T16:00:00+01:00'));
  await finto(page, dati());
  await page.goto('/');
  await page.getByRole('button', { name: 'R-Evolution' }).click();
  const coach = page.getByLabel('Il coach');
  await expect(coach).toContainText('I dieci minuti si fanno al mattino, dalle 6:00 alle 13:00. Domani ti aspetto.');
  await expect(coach.getByRole('button')).toHaveCount(0);
});

test('R-Evolution spenta: la voce non c’è', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-18T10:00:00+01:00'));
  await finto(page, dati([]));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Astra' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'R-Evolution' })).toHaveCount(0);
});

// 17/11: sul telefono il nome selezionato usciva dalla pillola colorata. Si prova a più larghezze,
// toccando ogni voce: il testo deve stare dentro il pulsante, con un piccolo margine.
for (const larga of [320, 360, 375, 384, 390, 393, 412, 430])
  test(`barra a cinque voci: a ${larga} px nessuna etichetta esce dal suo pulsante, anche selezionata`, async ({ page }) => {
    await page.setViewportSize({ width: larga, height: 800 });
    await page.clock.setFixedTime(new Date('2027-01-18T16:00:00+01:00'));
    await finto(page, dati());
    await page.goto('/');
    const voci = page.locator('.barra button');
    await expect(voci).toHaveCount(5);
    for (const b of await voci.all()) {
      await b.click();
      await expect(b).toHaveAttribute('aria-current', 'page');
      const fuori = await b.evaluate((e) => {
        const box = e.getBoundingClientRect();
        const testi: Node[] = [];
        const giro = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
        while (giro.nextNode()) if (giro.currentNode.textContent?.trim()) testi.push(giro.currentNode);
        return testi.some((c) => {
          const r = document.createRange();
          r.selectNodeContents(c);
          const t = r.getBoundingClientRect();
          return t.width > 0 && (t.left < box.left + 2 || t.right > box.right - 2);
        });
      });
      expect(fuori, (await b.getAttribute('aria-label')) ?? '').toBe(false);
    }
    if (larga === 390) await page.locator('.barra').screenshot({ path: 'e2e/risultati/barra-390.png' });
  });

test("annuncio il giorno dell'accensione: Vediamo porta su R-Evolution", async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-07T16:00:00+01:00'));
  const d = dati();
  await finto(page, {
    ...d,
    popup_coda: [{ id: 'a1', chiave: 'r_evolution:2027-01-07', priorita: 4, situazione: 'r_evolution_accesa', posa: 'lani-divisa', titolo: 'Arriva R-Evolution', testo: 'Da oggi anche la pallavolo fa camminare Astra: dieci minuti al mattino, le tue partite e le classifiche del campionato.', figurina: null, mostrato_il: null, creato_il: '2027-01-07T15:00:00Z' }],
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Arriva R-Evolution' })).toBeVisible();
  await page.getByRole('button', { name: 'Vediamo' }).click();
  await expect(page.getByRole('heading', { name: 'In campo' })).toBeVisible();
});

test('tema campo: carta della prossima partita e nastro Ultim’ora dal calendario FIPAV', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-18T10:00:00+01:00'));
  await finto(page, {
    ...dati(),
    gare_fipav: [{ cid: 93399, numero: 7, giornata: 4, inizio: '2027-01-23T16:00:00Z', casa: 'FOXES VOLLEY', ospite: 'U14R-EVOLUTION', set_casa: null, set_ospite: null }],
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'R-Evolution' }).click();
  const carta = page.getByLabel('Prossima partita');
  await expect(carta.locator('.giorno')).toHaveText('sab 23 gennaio');
  await expect(carta.locator('.avversaria')).toHaveText('FOXES VOLLEY');
  await expect(carta).toContainText('Alle 17:00, in trasferta');
  await expect(carta.locator('.quanto')).toContainText('tra 5 giorni');
  await expect(page.locator('.ultimora .solo-lettori')).toContainText('Ultim’ora. Prossima partita: FOXES VOLLEY. sabato 23 gennaio alle 17:00. tra 5 giorni.'.replace('’', "'"));
  // il nastro non allarga la pagina
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'e2e/risultati/r-evolution-prossima.png' });
});
