import { expect, test } from '@playwright/test';
import { finto } from './finto';

// Blocco F: serie di matematica mescolata. Martedì 10 novembre 2026, verifica sulle frazioni giovedì.
const MARTEDI = new Date('2026-11-10T16:00:00+01:00');
const senzaBarre = { barre: [], totale: '' };

const A = (testo: string, barre = senzaBarre) => ({
  metodo: 'frazione di un numero',
  perche_metodo: 'Conosci l\'intero e cerchi una parte.',
  testo,
  passaggi: [
    { cosa: 'Dividi l\'intero per il denominatore', calcolo: '24 : 4', risultato: '6' },
    { cosa: 'Moltiplica per il numeratore', calcolo: '6 × 3', risultato: '18' },
  ],
  risposta: '18',
  unita: 'figurine',
  barre,
});
const B = (testo: string) => ({
  metodo: 'dalla parte all\'intero',
  perche_metodo: 'Conosci una parte e cerchi l\'intero.',
  testo,
  passaggi: [
    { cosa: 'Trova quanto vale una parte', calcolo: '15 : 3', risultato: '5' },
    { cosa: 'Moltiplica per il denominatore', calcolo: '5 × 4', risultato: '20' },
  ],
  risposta: '20',
  unita: 'euro',
  barre: senzaBarre,
});

function dati() {
  return {
    materie: [{ id: 'matematica', nome: 'Matematica' }],
    verifiche: [{ id: 'v1', data: '2026-11-12', tipo: 'verifica', argomento: 'Frazioni', materia_id: 'matematica' }],
    sessioni_ripasso: [],
    flashcard: [],
    quiz: [],
    compiti: [],
    mate_tentativi: [],
    mate_serie: [
      {
        id: 'm1',
        verifica_id: 'v1',
        problemi: [
          A('Lani ha 24 figurine e ne regala i 3/4. Quante ne regala?', {
            barre: [{ nome: 'Figurine', segmenti: [{ testo: '?', parti: 3, incognita: true }, { testo: '', parti: 1, incognita: false }] }],
            totale: '24',
          }),
          B('I 3/4 dei soldi di Sara sono 15 euro. Quanti soldi ha?'),
          A('Una squadra ha 24 palloni, i 3/4 sono nuovi. Quanti sono nuovi?'),
          B('I 3/4 di una corda sono 15 metri. Quanto è lunga?'),
        ],
      },
    ],
  };
}

test('serie di matematica: esempi svolti, metodo da scegliere, tentativo prima della soluzione', async ({ page }) => {
  await page.clock.install({ time: MARTEDI });
  const { chiamate, t } = await finto(page, dati(), { passi: { passi: 5 } });
  await page.goto('/');
  await page.getByRole('button', { name: 'Studio' }).click();
  await page.locator('.studio-verifica', { hasText: 'Matematica' }).getByRole('button', { name: 'Esercizi' }).click();

  // 1. esempio svolto, con le barre aperte e i passaggi uno alla volta
  await expect(page.getByRole('heading', { name: 'Esercizi di matematica' })).toBeVisible();
  await expect(page.getByText('Esempio svolto')).toBeVisible();
  await expect(page.getByRole('img', { name: /Modello a barre\. Figurine: 3 parti \(\?\), 1 parte\. In tutto: 24/ })).toBeVisible();
  await expect(page.getByText('Che strada prendi?')).toHaveCount(0);
  await expect(page.getByText('24 : 4 =')).toBeVisible();
  await expect(page.getByText('6 × 3')).toHaveCount(0);
  await page.screenshot({ path: 'e2e/risultati/matematica-esempio.png', fullPage: true });
  await page.getByRole('button', { name: 'Passaggio dopo' }).click();
  await expect(page.getByText('6 × 3 =')).toBeVisible();
  await page.getByRole('button', { name: 'Ho capito' }).click();

  // 2. esempio dell'altro metodo
  await expect(page.getByText('2 di 4')).toBeVisible();
  await expect(page.getByText('Esempio svolto')).toBeVisible();
  await page.getByRole('button', { name: 'Passaggio dopo' }).click();
  await page.getByRole('button', { name: 'Ho capito' }).click();

  // 3. stesso metodo del primo: ora manca l'ultimo passaggio, prima si sceglie la strada
  await expect(page.getByText('Completa 1 passaggio')).toBeVisible();
  await expect(page.getByText('Dividi l\'intero per il denominatore')).toHaveCount(0);
  await page.getByRole('button', { name: 'dalla parte all\'intero' }).click();
  await expect(page.getByText('Qui serve: frazione di un numero.')).toBeVisible();
  const campo = page.getByRole('textbox', { name: 'Risultato del passaggio 2' });
  await expect(page.getByRole('button', { name: 'Controlla' })).toBeDisabled();
  await expect(page.getByText('6 × 3')).toHaveCount(0); // il conto si vede solo dopo aver provato
  await campo.fill('17');
  await page.getByRole('button', { name: 'Controlla' }).click();
  await expect(page.getByText('Non ancora: rifai il conto e riprova.')).toBeVisible();
  await page.screenshot({ path: 'e2e/risultati/matematica-vuoto.png', fullPage: true });
  await campo.fill('16');
  await page.getByRole('button', { name: 'Controlla' }).click();
  await expect(page.getByText('Era 18. Guarda come si fa, la prossima la provi tu.')).toBeVisible();
  await expect(page.getByText('6 × 3')).toBeVisible();
  await page.getByRole('button', { name: 'Avanti' }).click();

  // 4. strada giusta e risposta giusta al primo colpo, scritta con la virgola
  await page.getByRole('button', { name: 'dalla parte all\'intero' }).click();
  await expect(page.getByText('Strada giusta.')).toBeVisible();
  await page.getByRole('textbox', { name: 'Risultato del passaggio 2' }).fill('20,0');
  await page.getByRole('button', { name: 'Controlla' }).click();
  await expect(page.getByRole('img', { name: 'Giusto' })).toBeVisible();
  await page.getByRole('button', { name: 'Avanti' }).click();

  await expect(page.getByRole('heading', { name: 'Serie finita' })).toBeVisible();
  await expect(page.getByText('1 su 2 risolti da sola. +5 passi.')).toBeVisible();
  expect(t.mate_tentativi[0]).toMatchObject({ serie_id: 'm1', problemi: 4, tentati: 4 });
  expect(t.mate_tentativi[0].dettaglio).toEqual([
    { metodo: 'frazione di un numero', livello: 0, giusto: true, metodo_giusto: null },
    { metodo: 'dalla parte all\'intero', livello: 0, giusto: true, metodo_giusto: null },
    { metodo: 'frazione di un numero', livello: 1, giusto: false, metodo_giusto: false },
    { metodo: 'dalla parte all\'intero', livello: 1, giusto: true, metodo_giusto: true },
  ]);
  expect(chiamate).toEqual([{ tipo: 'matematica', id: 'nuovo-1' }]);
});

test('serie di matematica: dopo tanti giusti il problema intero, poi i passaggi come soluzione', async ({ page }) => {
  await page.clock.install({ time: MARTEDI });
  const d = dati();
  const esito = (livello: number) => ({ metodo: 'frazione di un numero', livello, giusto: true, metodo_giusto: true });
  d.mate_tentativi = [{ id: 'x', serie_id: 'm1', fatto_il: '2026-11-09T15:00:00Z', dettaglio: [esito(0), esito(1)] }] as never;
  await finto(page, d);
  await page.goto('/');
  await page.getByRole('button', { name: 'Studio' }).click();
  await page.getByRole('button', { name: 'Esercizi' }).click();
  await expect(page.getByText('Problema intero')).toBeVisible();
  await page.getByRole('button', { name: 'frazione di un numero' }).click();
  await expect(page.getByText('Risolvilo sul quaderno e scrivi la risposta.')).toBeVisible();
  await expect(page.getByText('figurine', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Disegna le barre' }).click();
  await expect(page.getByRole('img', { name: /Modello a barre/ })).toBeVisible();
  await page.getByRole('textbox', { name: 'Risposta' }).fill('18');
  await page.getByRole('button', { name: 'Controlla' }).click();
  await expect(page.getByText('6 × 3 =')).toBeVisible();
  await page.screenshot({ path: 'e2e/risultati/matematica-intero.png', fullPage: true });
});
