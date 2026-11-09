import { expect, test } from '@playwright/test';
import { finto } from './finto';

// Martedì 10 novembre 2026, 16:00. Verifica di aritmetica giovedì 12.
const MARTEDI = new Date('2026-11-10T16:00:00+01:00');

function dati() {
  return {
    materie: [{ id: 'matematica', nome: 'Matematica' }],
    verifiche: [
      { id: 'v1', data: '2026-11-12', tipo: 'verifica', argomento: 'Verifica di aritmetica', pagine_probabili: 'pag. 340-345', materia_id: 'matematica' },
    ],
    sessioni_ripasso: [
      { id: 's1', verifica_id: 'v1', numero: 1, data_prevista: '2026-11-09', tipo: 'rilettura_flashcard', fatta_il: '2026-11-09T15:00:00Z' },
      { id: 's2', verifica_id: 'v1', numero: 2, data_prevista: '2026-11-10', tipo: 'flashcard_mappa', fatta_il: null },
      { id: 's3', verifica_id: 'v1', numero: 3, data_prevista: '2026-11-11', tipo: 'quiz', fatta_il: null },
    ],
    flashcard: [
      { id: 'f1', verifica_id: 'v1', materia_id: 'matematica', tipo: 'completa', fronte: 'Il numero sotto la linea si chiama ___.', retro: 'denominatore', intervallo_giorni: 1, prossima_revisione: '2026-11-10', segnalata_sbagliata: false },
      { id: 'f2', verifica_id: 'v1', materia_id: 'matematica', tipo: 'domanda', fronte: 'Come trovi i 3/4 di 20?', retro: '20 : 4 × 3 = 15', intervallo_giorni: 2, prossima_revisione: '2026-11-10', segnalata_sbagliata: false },
    ],
    quiz: [
      {
        id: 'q1',
        verifica_id: 'v1',
        domande: [
          { testo: 'Quanto fa 1/2 di 10?', opzioni: ['2', '5', '10', '20'], giusta: 1, spiegazione: '10 diviso 2 fa 5.' },
          { testo: 'Una frazione propria è…', opzioni: ['maggiore di 1', 'minore di 1'], giusta: 1, spiegazione: 'Il numeratore è più piccolo.' },
        ],
      },
    ],
    quiz_tentativi: [],
    flashcard_giri: [],
    compiti: [],
  };
}

test('sessione di flash card: si gira dopo 7 secondi, intervalli e giro salvati', async ({ page }) => {
  await page.clock.install({ time: MARTEDI });
  const { chiamate, t } = await finto(page, dati());
  await page.goto('/');
  await page.getByRole('button', { name: 'Studio' }).click();

  await expect(page.getByRole('heading', { name: 'Matematica' })).toBeVisible();
  await expect(page.getByText('Sessione 2 di 3: flash card e mappa, 15 minuti.')).toBeVisible();
  await expect(page.getByText('Da ripassare: pag. 340-345')).toBeVisible();
  await page.screenshot({ path: 'e2e/risultati/studio.png', fullPage: true });

  await page.locator('.carta', { hasText: 'Matematica' }).getByRole('button', { name: 'Inizia' }).click();
  await expect(page.getByText('Il numero sotto la linea si chiama ___.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gira' })).toBeDisabled();
  await expect(page.getByText('Leggi bene: si gira tra 7 secondi.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sapevo', exact: true })).toBeDisabled();
  await expect(page.getByText('denominatore')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Sezioni' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Genitori' })).toBeHidden();
  await page.clock.runFor(7500);
  await page.getByRole('button', { name: 'Gira' }).click();
  await expect(page.getByText('denominatore')).toBeVisible();
  await page.getByRole('button', { name: 'Sapevo', exact: true }).click();

  await expect(page.getByRole('button', { name: 'Gira' })).toBeDisabled();
  await page.clock.runFor(7500);
  await page.getByRole('button', { name: 'Gira' }).click();
  await page.getByRole('button', { name: 'Quasi' }).click();

  await expect(page.getByText('2 su 2 al primo colpo', { exact: false })).toHaveCount(0);
  await expect(page.getByText(/1 su 2 al primo colpo\. Le 1 incerte tornano domani\./)).toBeVisible();
  expect(t.flashcard[0]).toMatchObject({ intervallo_giorni: 2, prossima_revisione: '2026-11-12' });
  expect(t.flashcard[1]).toMatchObject({ intervallo_giorni: 2, prossima_revisione: '2026-11-11' });
  expect(t.flashcard_giri[0]).toMatchObject({ carte: 2, sapevo: 1, quasi: 1, non_sapevo: 0 });
  expect(t.sessioni_ripasso[1].fatta_il).toBeTruthy();
  expect(chiamate.map((c) => c.tipo)).toEqual(['flashcard', 'ripasso']);
});

test('quiz: spiegazione dopo ogni risposta, sbagliate salvate', async ({ page }) => {
  await page.clock.install({ time: MARTEDI });
  const d = dati();
  d.sessioni_ripasso[1].fatta_il = '2026-11-10T14:00:00Z';
  const { chiamate, t } = await finto(page, d);
  await page.goto('/');
  await page.getByRole('button', { name: 'Studio' }).click();
  await page.getByRole('button', { name: 'Prova il quiz' }).click();
  const barra = page.getByRole('progressbar', { name: 'Domande del quiz' });
  await expect(barra).toHaveAttribute('aria-valuenow', '0');

  await page.getByRole('button', { name: '2', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Non era questa. 10 diviso 2 fa 5.');
  await expect(barra).toHaveAttribute('aria-valuenow', '1');
  await page.getByRole('button', { name: 'Avanti' }).click();
  await page.getByRole('button', { name: 'minore di 1' }).click();
  await expect(page.getByRole('status')).toContainText('Giusto!');
  await page.getByRole('button', { name: 'Fine' }).click();

  await expect(page.getByText('1 su 2. Ora sai cosa ripassare: domani si riprova.')).toBeVisible();
  expect(t.quiz_tentativi[0]).toMatchObject({ quiz_id: 'q1', giuste: 1, totale: 2, sbagliate: [0] });
  expect(chiamate).toEqual([{ tipo: 'quiz', id: 'nuovo-1' }]);
});

test('carte del giorno e avviso dei compiti', async ({ page }) => {
  await page.clock.install({ time: MARTEDI });
  const d = dati();
  d.compiti = [{ id: 'c1', scadenza: '2026-11-11', fatto_il: null, testo: 'x' }] as never;
  await finto(page, d);
  await page.goto('/');
  await page.getByRole('button', { name: 'Studio' }).click();
  await expect(page.getByText('Prima i compiti di oggi: poi flash card e quiz danno passi.')).toBeVisible();
  await expect(page.getByText('2 da ripassare oggi', { exact: false })).toBeVisible();
});
