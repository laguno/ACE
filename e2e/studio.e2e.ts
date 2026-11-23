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
  // v2: il ripasso si legge dai pallini nel colore della materia (una sessione su tre fatta)
  await expect(page.getByRole('list', { name: '1 di 3 fatti' })).toBeVisible();
  await expect(page.getByText('Da ripassare: pag. 340-345')).toBeVisible();
  await page.screenshot({ path: 'e2e/risultati/studio.png', fullPage: true });

  await page.locator('.studio-verifica', { hasText: 'Matematica' }).getByRole('button', { name: 'Ripassa ora' }).click();
  await expect(page.getByText('Il numero sotto la linea si chiama ___.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sicura' })).toBeDisabled();
  await expect(page.getByText('Pensa alla risposta: si gira tra 7 secondi.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sapevo', exact: true })).toBeDisabled();
  await expect(page.getByText('denominatore')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Sezioni' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Genitori' })).toBeHidden();
  await page.clock.runFor(7500);
  await page.getByRole('button', { name: 'Sicura' }).click();
  await expect(page.getByText('denominatore')).toBeVisible();
  await page.getByRole('button', { name: 'Sapevo', exact: true }).click();

  await expect(page.getByRole('button', { name: 'Sicura' })).toBeDisabled();
  await page.clock.runFor(7500);
  await page.getByRole('button', { name: 'Forse' }).click();
  await page.getByRole('button', { name: 'Quasi' }).click();

  await expect(page.getByText('2 su 2 al primo colpo', { exact: false })).toHaveCount(0);
  await expect(page.getByText(/1 su 2 al primo colpo\. Le 1 incerte tornano domani\./)).toBeVisible();
  // FSRS: sicura e sapevo = Bene (3 giorni), ma la verifica è il 12: torna entro l'11
  expect(t.flashcard[0]).toMatchObject({ intervallo_giorni: 1, prossima_revisione: '2026-11-11', ripetizioni: 1, cadute: 0 });
  expect(t.flashcard[1]).toMatchObject({ intervallo_giorni: 1, prossima_revisione: '2026-11-11' });
  expect(t.ripassi_carte).toHaveLength(2);
  expect(t.ripassi_carte[0]).toMatchObject({ giusta: true, sicurezza: 'sicura', voto: 3, sovrastima: false });
  expect(t.ripassi_carte[1]).toMatchObject({ giusta: true, sicurezza: 'forse', voto: 2 });
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
  await expect(page.locator('.studio-verifica').first().getByText('Finiti i compiti, flash card e quiz valgono passi')).toBeVisible();
  await expect(page.getByRole('button', { name: /Ripassa 2 carte/ })).toBeVisible();
});

test('assenze: la verifica del giorno a casa è da recuperare, quella spostata a "settimana prossima" non ha giorno', async ({ page }) => {
  await page.clock.install({ time: MARTEDI });
  const d = dati();
  await finto(page, {
    ...d,
    materie: [...d.materie, { id: 'spagnolo', nome: 'Spagnolo' }, { id: 'geografia', nome: 'Geografia' }],
    assenze: [{ giorno: '2026-11-09' }],
    verifiche: [
      ...d.verifiche.map((v) => ({ ...v, recupero_vago: false, data_spostata: null })),
      { id: 'v2', data: '2026-11-09', tipo: 'verifica', argomento: null, materia_id: 'spagnolo', recupero_vago: false, data_spostata: null },
      { id: 'v3', data: '2026-11-16', tipo: 'verifica', argomento: null, materia_id: 'geografia', recupero_vago: true, data_spostata: '2026-11-16' },
    ],
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Studio' }).click();
  const carta = (m: string) => page.locator('.studio-verifica', { has: page.getByRole('heading', { name: m }) });
  await expect(carta('Spagnolo')).toContainText('da recuperare');
  await expect(carta('Spagnolo')).toContainText('Era lunedì 9 novembre, eri a casa');
  await expect(carta('Geografia')).toContainText('settimana prossima');
  await expect(carta('Geografia')).toContainText('Settimana prossima, il giorno lo dice la prof');
  await expect(carta('Matematica')).toContainText('fra 2 giorni');
});

test('spiegamelo tu: Lani spiega, il tutor dice cosa c’è e cosa manca, senza voto', async ({ page }) => {
  await page.clock.setFixedTime(MARTEDI);
  const corpi: Record<string, unknown>[] = [];
  await finto(page, dati(), {
    spiega: (c: Record<string, unknown>) => {
      corpi.push(c);
      return { cosa_va: ['Le parti sono uguali.'], cosa_manca: ['Cosa dice il denominatore.'], da_sistemare: [], domanda: 'Cosa dice il numero sotto la linea?' };
    },
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Studio' }).click();
  await page.getByRole('button', { name: 'Spiegamelo tu' }).click();
  await expect(page.getByRole('heading', { name: 'Spiegamelo tu' })).toBeVisible();
  await page.getByLabel('Argomento').fill('Le frazioni');
  await page.getByLabel('La tua spiegazione').fill('Corta.');
  await page.getByRole('button', { name: 'Controlla' }).click();
  await expect(page.getByRole('alert')).toHaveText('Scrivi almeno due frasi.');
  await page.getByLabel('La tua spiegazione').fill('Una frazione è quando divido un intero in parti uguali e ne prendo alcune.');
  await page.getByRole('button', { name: 'Controlla' }).click();
  await expect(page.getByRole('heading', { name: 'Cosa manca' })).toBeVisible();
  await expect(page.getByText('Cosa dice il denominatore.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Da sistemare' })).toHaveCount(0);
  expect(corpi).toEqual([{ azione: 'spiegamelo', argomento: 'Le frazioni', testo: 'Una frazione è quando divido un intero in parti uguali e ne prendo alcune.' }]);
  await page.getByRole('button', { name: 'Torna allo studio' }).click();
  await expect(page.getByRole('heading', { name: 'Le tue verifiche' })).toBeVisible();
});
