import { expect, test } from '@playwright/test';
import { finto } from './finto';
import { MICRO_LEZIONI } from '../src/lib/copione/metacognizione';
import { lezioneDellaSettimana } from '../src/lib/regole/metacognizione';

// Blocco D: martedì 24 novembre 2026, 16:00. Verifica di matematica giovedì 26 (fra 2 giorni).
const MARTEDI = new Date('2026-11-24T16:00:00+01:00');
const LEZIONE = MICRO_LEZIONI[lezioneDellaSettimana(new Date(2026, 10, 24), MICRO_LEZIONI.length)];

function dati() {
  return {
    materie: [{ id: 'matematica', nome: 'Matematica' }, { id: 'storia', nome: 'Storia' }],
    verifiche: [
      { id: 'v1', data: '2026-11-26', tipo: 'verifica', argomento: 'Frazioni', materia_id: 'matematica' },
      // verifiche passate con previsione e voto vero, per la tendenza
      { id: 'p1', data: '2026-11-02', tipo: 'verifica', materia_id: 'storia' },
      { id: 'p2', data: '2026-11-09', tipo: 'verifica', materia_id: 'storia' },
      { id: 'p3', data: '2026-11-16', tipo: 'verifica', materia_id: 'matematica' },
    ],
    voti_previsti: [
      { verifica_id: 'p1', voto: 8 },
      { verifica_id: 'p2', voto: 8.5 },
      { verifica_id: 'p3', voto: 8 },
    ],
    voti: [
      { id: 'n1', materia_id: 'storia', data: '2026-11-03', voto: 6.5, tipo: 'scritto' },
      { id: 'n2', materia_id: 'storia', data: '2026-11-10', voto: 7, tipo: 'scritto' },
      { id: 'n3', materia_id: 'matematica', data: '2026-11-17', voto: 7.5, tipo: 'scritto' },
    ],
    sessioni_ripasso: [{ id: 's1', verifica_id: 'v1', numero: 2, data_prevista: '2026-11-24', tipo: 'quiz', fatta_il: null }],
    flashcard: [],
    quiz: [],
    quiz_tentativi: [],
    flashcard_giri: [],
    compiti: [{ id: 'c1', testo: 'Es. 3 pag. 40', scadenza: '2026-11-25', fatto_il: null, materia_id: 'matematica' }],
    piano_voci: [],
    micro_lezioni_lette: [],
  };
}

test('Studio: micro-lezione della settimana, voto previsto e tendenza delle previsioni', async ({ page }) => {
  await page.clock.install({ time: MARTEDI });
  const { t } = await finto(page, dati());
  await page.goto('/');
  await page.getByRole('button', { name: 'Studio' }).click();

  await expect(page.getByRole('heading', { name: LEZIONE.titolo })).toBeVisible();
  await page.getByRole('button', { name: 'Ho letto' }).click();
  await expect(page.getByRole('heading', { name: LEZIONE.titolo })).toHaveCount(0);
  expect(t.micro_lezioni_lette).toMatchObject([{ settimana: '2026-11-23', lezione: LEZIONE.id }]);

  const carta = page.locator('.studio-verifica', { hasText: 'Frazioni' });
  await carta.getByLabel('Che voto pensi di prendere?').selectOption('7.5');
  await expect.poll(() => t.voti_previsti.find((v) => v.verifica_id === 'v1')?.voto).toBe(7.5);

  // tre previsioni più alte del voto vero: tendenza detta con calma, senza rimproveri
  await expect(page.getByText('Previsto 8½, preso 7.')).toBeVisible();
  await expect(page.getByText('Di solito prevedi un po’ più alto del voto vero: un ripasso in più aiuta.')).toBeVisible();
  await page.screenshot({ path: 'e2e/risultati/metacognizione-studio.png', fullPage: true });
});

test('Pomeriggio: piano del giorno con stima, inizio e fine', async ({ page }) => {
  await page.clock.install({ time: MARTEDI });
  const { t } = await finto(page, dati());
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Il piano di oggi' })).toBeVisible();
  await page.getByLabel('Minuti per Matematica: Es. 3 pag. 40').selectOption('20');
  await expect.poll(() => t.piano_voci.find((v) => v.voce === 'compito:c1')?.minuti_stimati).toBe(20);
  await page.locator('.piano-giorno').getByRole('button', { name: 'Inizio' }).first().click();
  await expect.poll(() => !!t.piano_voci.find((v) => v.voce === 'compito:c1')?.iniziata_il).toBe(true);
  await expect(page.getByLabel('Minuti per Matematica: Es. 3 pag. 40')).toBeDisabled();
  await page.screenshot({ path: 'e2e/risultati/metacognizione-piano.png', fullPage: true });
});
