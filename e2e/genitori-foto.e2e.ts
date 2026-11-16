import { test, type Browser, type Page } from '@playwright/test';
import { finto } from './finto';

// Foto di tutte le schermate dei genitori a 390 e 360 px, tema chiaro e scuro, per lo studio
// del restyling (docs/genitori-ux.md). Solo a richiesta: FOTO_GENITORI=prima (o dopo) npx playwright test genitori-foto
// Le foto vanno in docs/genitori-ux/<prima|dopo>/.
const FASE = process.env.FOTO_GENITORI;
test.skip(!FASE, 'solo con FOTO_GENITORI');

const ORA = new Date('2026-11-23T18:00:00+01:00'); // lunedì
const dati = () => ({
  profili: [{ id: 'lani', ruolo: 'genitore', nome: 'Papà' }],
  materie: [
    { id: 'geografia', nome: 'Geografia' },
    { id: 'spagnolo', nome: 'Spagnolo' },
    { id: 'italiano', nome: 'Italiano' },
  ],
  lezioni: [
    { data: '2026-11-24', ora: 1, materia_id: 'geografia' },
    { data: '2026-11-24', ora: 2, materia_id: 'spagnolo' },
    { data: '2026-11-27', ora: 1, materia_id: 'geografia' },
  ],
  voti: [{ voto: 7 }, { voto: 6.5 }],
  note: [],
  impostazioni: [
    { chiave: 'obiettivo_media', valore: 7.35 },
    { chiave: 'ora_chiusura', valore: { 1: '20:30' } },
    { chiave: 'materiale_cartella', valore: { 1: ['Cartellina di tecnologia'] } },
    { chiave: 'r_evolution_da', valore: '2026-11-01' },
  ],
  serate: [],
  movimenti_passi: [],
  gesti_casa: [],
  sgridate: [],
  assenze: [],
  impegni_famiglia: [],
  frasi: [{ id: 'x1', testo: 'Ogni giorno un pezzetto.', autore: 'papà', di_famiglia: true }],
  dieci_minuti: [],
  partite: [{ id: 'p3', data: '2026-11-22', avversaria: 'Foxes Volley', set_nostri: 3, set_loro: 1, approvata_il: null }],
  forzieri: Array.from({ length: 9 }, (_, i) => ({
    n: i + 1,
    premio: i < 2 ? ['Pizza con le amiche', 'Cinema'][i] : null,
    enigma: i < 2 ? 'Ho due ruote…' : null,
    soluzione: i < 2 ? 'bici' : null,
    stato: i === 0 ? 'aperto' : 'chiuso',
  })),
  compiti: [
    { id: 'c1', materia_id: 'geografia', testo: 'Cartina d’Europa', scadenza: '2026-11-24', fatto_il: '2026-11-23T15:00:00Z' },
    { id: 'c2', materia_id: 'spagnolo', testo: 'Verbi pag 12', scadenza: '2026-11-24', fatto_il: null },
  ],
  verifiche: [{ id: 'v1', materia_id: 'spagnolo', tipo: 'verifica', data: '2026-11-26', recupero_vago: false, data_spostata: null }],
  richieste_foto: [{ id: 'r1', motivo: 'compito', materia_id: 'italiano', pagine: '34–38', stato: 'aperta', creato_il: '2026-11-23T13:00:00Z' }],
  fogli_firma: [{ id: 'f1', titolo: 'Gita del benessere', scadenza: '2026-12-03', dato_il: '2026-11-23T14:00:00Z', consegnato_il: null }],
  sync_log: [{ fonte: 'nuvola', esito: 'ok', iniziato_il: '2026-11-23T13:30:00Z', finito_il: '2026-11-23T13:31:00Z' }],
  settimane: [],
  errori_client: [],
});

type Passo = [nome: string, vai: (p: Page) => Promise<unknown>];
const scheda = (n: string) => (p: Page) => p.getByRole('navigation', { name: 'Sezioni genitori' }).getByRole('button', { name: n }).click();
const altro = (n: RegExp) => async (p: Page) => (await scheda('Altro')(p), p.getByRole('button', { name: n }).click());
const PASSI: Passo[] = [
  ['01-settimana', async () => {}],
  ['02-sgridata-foglio', (p) => p.getByRole('button', { name: /^Balla/ }).click()],
  ['03-premi', scheda('Premi')],
  ['04-correzioni', scheda('Correzioni')],
  ['05-fogli', scheda('Fogli')],
  ['06-altro', scheda('Altro')],
  ['07-impostazioni', altro(/^Impostazioni/)],
  ['08-stato', altro(/^Stato di ACE/)],
  ['09-vetrina', altro(/^Vetrina/)],
  ['10-regole', altro(/^Regole/)],
];

async function foto(browser: Browser, larghezza: number, tema: 'light' | 'dark') {
  for (const [nome, vai] of PASSI) {
    const ctx = await browser.newContext({ viewport: { width: larghezza, height: 844 }, deviceScaleFactor: 1, locale: 'it-IT', timezoneId: 'Europe/Rome', reducedMotion: 'reduce', colorScheme: tema });
    const p = await ctx.newPage();
    await p.clock.setFixedTime(ORA);
    await finto(p, dati());
    await p.goto('/');
    await p.getByRole('navigation', { name: 'Sezioni genitori' }).waitFor();
    await vai(p);
    await p.waitForTimeout(600);
    await p.screenshot({ path: `docs/genitori-ux/${FASE}/${nome}-${larghezza}-${tema === 'light' ? 'chiaro' : 'scuro'}.png`, fullPage: true });
    await ctx.close();
  }
}

for (const larghezza of [390, 360])
  for (const tema of ['light', 'dark'] as const)
    test(`foto genitori ${larghezza} ${tema}`, async ({ browser }) => {
      test.setTimeout(120_000);
      await foto(browser, larghezza, tema);
    });
