// Schermate con dati finti, condivise da confronto (foto) e accessibilità (axe).
import { expect, type Page } from '@playwright/test';
import { finto, type Tabelle } from './finto';

const LUNEDI_MATTINA = new Date('2026-11-09T07:10:00+01:00');
const LUNEDI_POMERIGGIO = new Date('2026-11-09T17:45:00+01:00');
const LUNEDI_SERA = new Date('2026-11-09T20:00:00+01:00');

export function dati(): Tabelle {
  return {
    materie: [
      { id: 'italiano', nome: 'Grammatica' },
      { id: 'antologia', nome: 'Antologia' },
      { id: 'inglese', nome: 'Inglese' },
      { id: 'matematica', nome: 'Matematica' },
      { id: 'tecnologia', nome: 'Tecnologia' },
      { id: 'scienze', nome: 'Scienze' },
    ],
    verifiche: [
      { id: 'v0', data: '2026-11-09', tipo: 'verifica', argomento: 'Verifica di grammatica', materia_id: 'italiano', pagine_probabili: null },
      { id: 'v1', data: '2026-11-16', tipo: 'verifica', argomento: 'Verifica sulle strutture portanti', materia_id: 'tecnologia', pagine_probabili: 'pag. 112-120' },
      { id: 'v2', data: '2026-11-19', tipo: 'verifica', argomento: 'Atomi e molecole', materia_id: 'scienze', pagine_probabili: null },
    ],
    sessioni_ripasso: [
      { id: 's1', verifica_id: 'v1', numero: 1, data_prevista: '2026-11-09', tipo: 'rilettura_flashcard', fatta_il: null },
      { id: 's2', verifica_id: 'v1', numero: 2, data_prevista: '2026-11-11', tipo: 'flashcard_mappa', fatta_il: null },
      { id: 's3', verifica_id: 'v1', numero: 3, data_prevista: '2026-11-13', tipo: 'quiz', fatta_il: null },
      { id: 's4', verifica_id: 'v1', numero: 4, data_prevista: '2026-11-15', tipo: 'quiz_errori', fatta_il: null },
    ],
    quiz: [
      { id: 'q1', verifica_id: 'v1', domande: [{ testo: 'Una struttura portante serve a…', opzioni: ['decorare', 'sostenere i carichi', 'isolare dal freddo', 'far passare la luce'], giusta: 1, spiegazione: 'Regge il peso della costruzione.' }] },
    ],
    flashcard: Array.from({ length: 8 }, (_, i) => ({
      id: `f${i}`, verifica_id: 'v1', materia_id: 'tecnologia', tipo: 'domanda', fronte: 'Che cos’è un pilastro?', retro: 'Un elemento verticale che porta i carichi a terra.', intervallo_giorni: 1, prossima_revisione: '2026-11-09', segnalata_sbagliata: false,
    })),
    compiti: [
      { id: 'c1', testo: 'le battute del dialogo, pagina 16', scadenza: '2026-11-10', fatto_il: '2026-11-09T15:00:00Z', materia_id: 'inglese', creato_il: '1' },
      { id: 'c2', testo: 'pagine 36–38, esercizi 1–8', scadenza: '2026-11-10', fatto_il: '2026-11-09T15:30:00Z', materia_id: 'antologia', creato_il: '2' },
      { id: 'c3', testo: 'pagine 340–352 e la scheda', scadenza: '2026-11-10', fatto_il: null, materia_id: 'italiano', creato_il: '3' },
      { id: 'c4', testo: 'pagina 345 e problemi 380–382', scadenza: '2026-11-10', fatto_il: null, materia_id: 'matematica', creato_il: '4' },
    ],
    lezioni: ['inglese', 'antologia', 'italiano', 'matematica'].map((m, i) => ({ data: '2026-11-03', ora: i + 1, materia_id: m })),
    impostazioni: [
      { chiave: 'materiale_cartella', valore: { 1: ['Materiale da disegno'], 2: ['Diario e astuccio'] } },
      { chiave: 'ora_chiusura', valore: { 0: '20:00', 1: '20:30', 2: '20:30', 3: '20:30', 4: '20:30' } },
      { chiave: 'obiettivo_media', valore: 7.3 },
    ],
    impegni_famiglia: [
      { titolo: 'Allenamento Pallavolo Leilani U-13', inizio: '2026-11-09T14:00:00Z', tutto_il_giorno: false },
      { titolo: 'Cena dai nonni', inizio: '2026-11-09T18:30:00Z', tutto_il_giorno: false },
      { titolo: 'Allenamento Pallavolo Leilani U-13', inizio: '2026-11-10T17:30:00Z', tutto_il_giorno: false },
      { titolo: 'Leo al torneo di tennis', inizio: '2026-11-14T09:00:00Z', tutto_il_giorno: false },
    ],
    fogli_firma: [{ id: 'g1', titolo: 'Gita del benessere: iscrizioni entro il 3 dicembre', scadenza: '2026-12-03', dato_il: null, consegnato_il: null }],
    movimenti_passi: [
      { giorno: '2026-11-08', passi: 35, moltiplicatore: 1 },
      { giorno: '2026-11-09', passi: 12, moltiplicatore: 1 },
    ],
    serate: [{ data: '2026-11-08', cartella_il: '2026-11-08T19:40:00Z' }],
    saldo_passi: [{ passi: 725 }],
    chiavi_totali: [{ chiavi: 3 }],
    settimane: [{ inizio: '2026-11-02', chiavi: 2 }],
    forzieri_lani: Array.from({ length: 9 }, (_, i) => ({ n: i + 1, stato: i === 0 ? 'aperto' : i === 1 ? 'enigma' : 'chiuso', enigma: i === 1 ? 'Ho due ruote e nessun motore…' : null, premio: i === 0 ? 'Pizza con le amiche' : null, tentativi_enigma: 0, enigma_risolto_il: null })),
    voti: [
      { materia_id: 'matematica', data: '2026-10-01', voto: 6 },
      { materia_id: 'matematica', data: '2026-11-03', voto: 7 },
      { materia_id: 'italiano', data: '2026-10-05', voto: 7.5 },
      { materia_id: 'inglese', data: '2026-10-20', voto: 6.5 },
    ],
    figurine: ['lani-contenta', 'lani-saluta', 'bart-sonnecchia', 'lady-fusa', 'papa-pollice'].map((posa) => ({ posa, sbloccata_il: '2026-11-05T10:00:00Z' })),
    popup_coda: [],
  };
}

const popup = (situazione: string, priorita: number, posa: string, titolo: string, testo: string) => ({
  id: situazione, priorita, situazione, posa, titolo, testo, figurina: null, mostrato_il: null, creato_il: '2026-11-09T15:00:00Z',
});

export type Caso = { bozza: string; quando: Date; vai?: (p: Page) => Promise<void>; dati?: (d: Tabelle) => void; genitore?: boolean; prima?: boolean };
export const CASI: Record<string, Caso> = {
  Oggi: { bozza: 'Oggi', quando: LUNEDI_MATTINA },
  Pomeriggio: { bozza: 'Pomeriggio', quando: LUNEDI_POMERIGGIO },
  Sera: { bozza: 'Domani', quando: LUNEDI_SERA },
  Studio: { bozza: 'Studio', quando: LUNEDI_POMERIGGIO, vai: (p) => p.getByRole('button', { name: 'Studio' }).click() },
  Flashcard: {
    bozza: 'Flashcard',
    quando: LUNEDI_POMERIGGIO,
    vai: async (p) => {
      await p.getByRole('button', { name: 'Studio' }).click();
      await p.locator('.carta', { hasText: 'Tecnologia' }).getByRole('button', { name: 'Inizia' }).click();
      await p.getByRole('button', { name: 'Gira' }).click({ timeout: 10000 }); // si gira dopo 7 secondi
    },
  },
  Quiz: {
    bozza: 'Quiz',
    quando: LUNEDI_POMERIGGIO,
    dati: (d) => (d.sessioni_ripasso = []),
    vai: async (p) => {
      await p.getByRole('button', { name: 'Studio' }).click();
      await p.getByRole('button', { name: 'Prova il quiz' }).click();
    },
  },
  Astra: { bozza: 'Main', quando: LUNEDI_POMERIGGIO, vai: (p) => p.getByRole('button', { name: 'Astra' }).click() },
  Figurina: {
    bozza: 'Figurina',
    quando: LUNEDI_POMERIGGIO,
    vai: async (p) => {
      await p.getByRole('button', { name: 'Astra' }).click();
      await p.getByRole('button', { name: 'La tua figurina' }).click();
    },
  },
  Album: {
    bozza: 'Album',
    quando: LUNEDI_POMERIGGIO,
    vai: async (p) => {
      await p.getByRole('button', { name: 'Astra' }).click();
      await p.getByRole('button', { name: 'Album' }).click();
    },
  },
  'Popup-forziere': {
    bozza: 'Popup-forziere',
    quando: LUNEDI_POMERIGGIO,
    dati: (d) =>
      (d.popup_coda = [
        { id: 'p1', priorita: 3, situazione: 'forziere_aperto', posa: 'lani-sorpresa', titolo: 'Forziere aperto', testo: 'Dentro c’è: Pizza con le amiche. E una figurina che non trovi altrove.', figurina: 'Nuova figurina: Leo tennis. Album 6/64.', mostrato_il: null, creato_il: '2026-11-09T15:00:00Z' },
      ]),
  },
  'Popup-lucchetto': { bozza: 'Popup-lucchetto', quando: LUNEDI_POMERIGGIO, dati: (d) => (d.popup_coda = [popup('forziere_lucchetto', 3, 'papa-dispiaciuto', 'Servono chiavi', 'Sei arrivata al forziere, ma servono 2 chiavi in più. Si apre appena le hai.')]) },
  'Popup-bastone': { bozza: 'Popup-bastone', quando: LUNEDI_POMERIGGIO, dati: (d) => (d.popup_coda = [popup('bagno_mamma', 1, 'mamma-arrabbiata', 'Bagno da sistemare', 'Bagno da sistemare: −1. Asciugamani appesi, tappetino a posto, specchio pulito.')]) },
  'Popup-enigma': { bozza: 'Popup-enigma', quando: LUNEDI_POMERIGGIO, dati: (d) => (d.popup_coda = [popup('enigma_comparso', 3, 'lani-detective', 'Un biglietto', 'Un biglietto vicino al forziere. Riesci a decifrarlo? Hai 3 tentativi.')]) },
  Benvenuta: { bozza: 'Benvenuta', quando: LUNEDI_MATTINA, prima: true },
  'Genitori-avvio': {
    bozza: 'Genitori-avvio',
    quando: LUNEDI_POMERIGGIO,
    prima: true,
    genitore: true,
    dati: (d) => {
      d.sync_log = [{ fonte: 'nuvola', esito: 'ok', iniziato_il: '2026-11-09T13:30:00Z' }];
      d.forzieri = Array.from({ length: 9 }, (_, i) => ({ n: i + 1, premio: null }));
    },
  },
  Genitori: { bozza: 'Genitori', quando: LUNEDI_POMERIGGIO, genitore: true },
};

/**
 * Prepara la pagina per il caso: ora fissa, dati finti, accoglienze. Non la apre. Con dataSpostata
 * l'ora parte da quella del caso e poi scorre (solo Date): l'orologio finto di Playwright ferma
 * anche performance e i timer, e Lighthouse non riesce più a misurare.
 */
export async function prepara(p: Page, caso: Caso, dataSpostata = false) {
  if (caso.prima) await p.addInitScript(() => sessionStorage.setItem('prova-accoglienza', '1'));
  if (!dataSpostata) await p.clock.setFixedTime(caso.quando);
  else
    await p.addInitScript((t) => {
      const scarto = t - Date.now();
      const Vera = Date;
      class Spostata extends Vera {
        constructor(...a: []) {
          super(...((a.length ? a : [Vera.now() + scarto]) as []));
        }
        static now = () => Vera.now() + scarto;
      }
      globalThis.Date = Spostata as DateConstructor;
    }, caso.quando.getTime());
  const d = dati();
  if (caso.genitore) d.profili = [{ id: 'lani', ruolo: 'genitore', nome: 'Mamma' }];
  caso.dati?.(d);
  await finto(p, d);
}

/** Apre la schermata del caso con i dati finti, all'ora del caso, con immagini e font pronti. */
export async function apri(p: Page, caso: Caso, indirizzo = `http://localhost:${process.env.PORTA_PROVE ?? 5179}/`) {
  await prepara(p, caso);
  await p.goto(indirizzo);
  await expect(p.locator('main')).toBeVisible();
  if (caso.vai) await caso.vai(p);
  await p.waitForTimeout(700);
  // immagini tutte caricate (anche quelle lazy dell'album) e font pronti
  await p.evaluate(async () => {
    document.querySelectorAll('img').forEach((i) => (i.loading = 'eager'));
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((ok) => ((i.onload = ok), (i.onerror = ok))))));
    await document.fonts.ready;
  });
}
