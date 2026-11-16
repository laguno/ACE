import AxeBuilder from '@axe-core/playwright';
import { test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { finto } from './finto';

// Misure oggettive delle schermate dei genitori (docs/genitori-ux): axe, bersagli tattili, campi senza
// etichetta, campi nativi, overflow a 360 px, lunghezza pagina, carte e pulsanti. Solo a richiesta:
//   MISURE_GENITORI=1 npx playwright test genitori-misure   (=prima)  oppure MISURE_GENITORI=dopo
// Scrive docs/genitori-ux/misure-<prima|dopo>.json (con 1 = prima), da confrontare fra prima e dopo il restyling.
const VAL = process.env.MISURE_GENITORI;
const FASE = VAL === '1' ? 'prima' : VAL;
test.skip(!FASE, 'solo con MISURE_GENITORI');

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
const dentro = (s: string, n: RegExp) => async (p: Page) => (await scheda(s)(p), p.getByRole('button', { name: n }).first().click());
// dal restyling del 16/11: quattro schede, fogli dal basso, pagine dentro Impostazioni e Forzieri
const DOPO: Passo[] = [
  ['01-oggi', async () => {}],
  ['02-dai-passi', (p) => p.getByRole('button', { name: /^Dai passi/ }).click()],
  ['03-segna-balla', async (p) => (await p.getByRole('button', { name: /^Segna/ }).click(), p.getByRole('button', { name: /^Balla/ }).click())],
  ['04-partita', (p) => p.getByRole('button', { name: /^Partita: Foxes/ }).click()],
  ['05-settimana', scheda('Settimana')],
  ['06-forzieri', scheda('Forzieri')],
  ['07-forziere', dentro('Forzieri', /^2 · Cinema/)],
  ['08-impostazioni', scheda('Impostazioni')],
  ['09-sera', dentro('Impostazioni', /^Sera e cartella/)],
  ['10-stato', dentro('Impostazioni', /^Stato di ACE/)],
];
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


// Misure dentro la pagina: solo elementi visibili, un campo nascosto (opacity 0) conta con il box dell'etichetta.
const MISURA = () => {
  const visibile = (e: Element) => {
    const r = e.getBoundingClientRect();
    const c = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none';
  };
  const nome = (e: Element) => (e.getAttribute('aria-label') || (e as HTMLElement).innerText || e.getAttribute('placeholder') || e.getAttribute('type') || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
  const box = (e: Element) => {
    const lab = e.closest('label');
    const r = (getComputedStyle(e).opacity === '0' && lab ? lab : e).getBoundingClientRect();
    return { l: Math.round(r.width), a: Math.round(r.height) };
  };
  const tutti = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button], [tabindex="0"]')].filter((e) => visibile(e) || getComputedStyle(e).opacity === '0');
  const piccoli = tutti.map((e) => ({ e, ...box(e) })).filter((x) => x.l < 44 || x.a < 44).map((x) => ({ tag: x.e.tagName.toLowerCase() + (x.e.getAttribute('type') ? `[${x.e.getAttribute('type')}]` : ''), testo: nome(x.e), misura: `${x.l}x${x.a}` }));
  const campi = [...document.querySelectorAll('input:not([type=hidden]), select, textarea')];
  const senzaEtichetta = campi.filter((e) => {
    const c = e as HTMLInputElement;
    return !(c.labels && c.labels.length) && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby') && !e.getAttribute('title');
  }).map((e) => ({ tag: e.tagName.toLowerCase(), tipo: e.getAttribute('type') ?? '', testo: nome(e) }));
  // "nativo": angoli vivi a 0 (nessun raggio della casa) o spunta/radio con aspetto di sistema
  const nativi = campi.map((e) => {
    const c = getComputedStyle(e);
    const tipo = e.tagName === 'INPUT' ? ((e as HTMLInputElement).type || 'text') : e.tagName.toLowerCase();
    const spunta = tipo === 'checkbox' || tipo === 'radio';
    const senzaStile = spunta ? c.appearance !== 'none' && c.accentColor === 'auto' : parseFloat(c.borderTopLeftRadius) === 0;
    return { tipo, senzaStile, pickerDiSistema: ['date', 'time', 'datetime-local', 'month', 'week', 'color', 'file'].includes(tipo) };
  });
  const perTipo: Record<string, number> = {};
  const nativiPerTipo: Record<string, number> = {};
  for (const n of nativi) {
    perTipo[n.tipo] = (perTipo[n.tipo] ?? 0) + 1;
    if (n.senzaStile) nativiPerTipo[n.tipo] = (nativiPerTipo[n.tipo] ?? 0) + 1;
  }
  return {
    piccoli,
    senzaEtichetta,
    campi: { totale: campi.length, perTipo, senzaStile: nativi.filter((n) => n.senzaStile).length, senzaStilePerTipo: nativiPerTipo, pickerDiSistema: nativi.filter((n) => n.pickerDiSistema).length },
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
    carte: document.querySelectorAll('.carta, section, .foglio > *').length,
    sezioni: document.querySelectorAll('section, h2').length,
    pulsanti: [...document.querySelectorAll('button')].filter(visibile).length,
  };
};

const risultati: Record<string, Record<string, unknown>> = {};
test.afterAll(() => {
  if (!FASE) return;
  mkdirSync('docs/genitori-ux', { recursive: true });
  writeFileSync(`docs/genitori-ux/misure-${FASE}.json`, JSON.stringify({ ora: ORA.toISOString(), larghezze: risultati }, null, 2));
});

for (const larghezza of [390, 360])
  test(`misure genitori ${larghezza}`, async ({ browser }) => {
    test.setTimeout(180_000);
    const schermate: Record<string, unknown> = {};
    for (const [nome, vai] of FASE === 'prima' ? PASSI : DOPO) {
      const ctx = await browser.newContext({ viewport: { width: larghezza, height: 844 }, locale: 'it-IT', timezoneId: 'Europe/Rome', reducedMotion: 'reduce', colorScheme: 'light' });
      const p = await ctx.newPage();
      await p.clock.setFixedTime(ORA);
      await finto(p, dati());
      await p.goto('/');
      await p.getByRole('navigation', { name: 'Sezioni genitori' }).waitFor();
      await vai(p);
      await p.waitForTimeout(600);
      const { violations } = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
      const altezza = await p.evaluate(() => document.documentElement.scrollHeight);
      schermate[nome] = {
        altezzaPagina: altezza,
        axe: violations.map((v) => ({ id: v.id, impatto: v.impact, nodi: v.nodes.length, esempi: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) })),
        ...(await p.evaluate(MISURA)),
      };
      await ctx.close();
    }
    risultati[larghezza] = schermate;
  });
