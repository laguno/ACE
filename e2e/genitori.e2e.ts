import { expect, test, type Page } from '@playwright/test';
import { carica, finto } from './finto';

// Area genitori dal restyling del 16/11 (docs/genitori-ux.md): una prova per ognuno dei compiti
// dello studio, con le quattro schede (Oggi, Settimana, Forzieri, Impostazioni).

const PAPA = [{ id: 'lani', ruolo: 'genitore', nome: 'Papà' }]; // il finto entra sempre con id 'lani'
const LUNEDI_SERA = new Date('2026-11-23T18:00:00+01:00');
const ACCESA = { chiave: 'r_evolution_da', valore: '2026-11-01' };

function dati() {
  return {
    profili: PAPA,
    materie: [
      { id: 'geografia', nome: 'Geografia' },
      { id: 'italiano', nome: 'Italiano' },
    ],
    voti: [{ voto: 7 }, { voto: 6.5 }],
    impostazioni: [
      { chiave: 'obiettivo_media', valore: 7.35 },
      { chiave: 'ora_chiusura', valore: { 1: '20:30' } },
      { chiave: 'materiale_cartella', valore: { 1: ['Cartellina di tecnologia'] } },
    ] as Record<string, unknown>[],
    note: [],
    serate: [],
    movimenti_passi: [] as Record<string, unknown>[],
    gesti_casa: [] as Record<string, unknown>[],
    sgridate: [] as Record<string, unknown>[],
    popup_coda: [] as Record<string, unknown>[],
    assenze: [] as Record<string, unknown>[],
    lezioni: [],
    verifiche: [] as Record<string, unknown>[],
    richieste_foto: [] as Record<string, unknown>[],
    partite: [] as Record<string, unknown>[],
    forzieri: Array.from({ length: 9 }, (_, i) => ({ n: i + 1, premio: null as string | null, enigma: null, soluzione: null, stato: 'chiuso' })),
    compiti: [{ id: 'c1', testo: 'Cartina', materia_id: 'geografia', scadenza: '2026-11-24', scadenza_spostata: null, fatto_il: '2026-11-23T15:00:00Z' }] as Record<string, unknown>[],
    fogli_firma: [{ id: 'f1', titolo: 'Gita del benessere', scadenza: '2026-12-03', dato_il: '2026-11-23T14:00:00Z', consegnato_il: null }] as Record<string, unknown>[],
  };
}
const scheda = (p: Page, nome: string) => p.getByRole('navigation', { name: 'Sezioni genitori' }).getByRole('button', { name: nome }).click();
const daFare = (p: Page) => p.getByRole('list', { name: 'Da fare per voi' });

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(LUNEDI_SERA);
});

test('Oggi: si apre qui, con le cose da fare, le due azioni e Lani in tre righe', async ({ page }) => {
  await finto(page, dati());
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Oggi', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Da fare per voi/ })).toContainText('1');
  await expect(daFare(page)).toContainText('Gita del benessere');
  await expect(page.getByRole('button', { name: /^Dai passi/ })).toContainText('oggi 0 su 6');
  await expect(page.getByText('da chiudere entro le 20:30')).toBeVisible();
  // il numero delle cose da fare anche sulla scheda
  await expect(page.getByRole('navigation', { name: 'Sezioni genitori' }).getByRole('button', { name: /Oggi/ })).toContainText('1');
  // dopo le 14 niente domanda "a casa oggi?"
  await expect(page.getByRole('button', { name: 'Lani è a casa oggi?' })).toHaveCount(0);
  // senza un fatto di ieri la riga "Una cosa da dirle oggi" non compare
  await expect(page.getByText('Una cosa da dirle oggi')).toHaveCount(0);
});

test('Oggi: se ieri Lani ha chiuso la serata, una cosa da dirle oggi', async ({ page }) => {
  // come nei dati veri: c'è l'ora della cartella pronta, chiusa_il resta vuota
  await finto(page, { ...dati(), serate: [{ data: '2026-11-22', cartella_il: '2026-11-22T18:40:00Z', chiusa_il: null }] });
  await page.goto('/');
  await expect(page.locator('.ga-da-dirle')).toHaveText('Una cosa da dirle oggiIeri sera ha chiuso tutto alle 19:40. Per esempio: «Ho visto che ieri sera hai chiuso tutto.»');
});

test('Oggi: la riga Serata dice l’ora della cartella pronta di oggi', async ({ page }) => {
  await finto(page, { ...dati(), serate: [{ data: '2026-11-23', cartella_il: '2026-11-23T19:05:00Z', chiusa_il: null }] });
  await page.goto('/');
  await expect(page.getByText('chiusa alle 20:05')).toBeVisible();
});

test('dare un gesto: due tocchi, il foglio resta aperto, Annulla storna e spegne il popup', async ({ page }) => {
  const d = dati();
  const { t, chiamate } = await finto(page, d, { passi: { passi: 2 } });
  await page.goto('/');
  await page.getByRole('button', { name: /^Dai passi/ }).click();
  const foglio = page.getByRole('dialog', { name: 'Dai passi' });
  await foglio.getByRole('button', { name: /^Scrivania in ordine/ }).click();
  await expect(foglio.getByRole('status')).toContainText('Scrivania in ordine: +2 a Lani.');
  expect(t.gesti_casa[0]).toMatchObject({ voce: 'scrivania' });
  await expect.poll(() => chiamate.map((c) => c.tipo)).toEqual(['gesto']);
  await expect(foglio).toBeVisible();
  // il server ha dato il +2 e accodato il popup: Annulla usa lo storno di oggi
  const id = t.gesti_casa[0].id as string;
  t.popup_coda.push({ id: 'pp', chiave: `gesto:${id}`, mostrato_il: null });
  await foglio.getByRole('status').getByRole('button', { name: 'Annulla' }).click();
  await expect(foglio.getByRole('status')).toHaveText('Scrivania in ordine: annullato.');
  expect(t['rpc/storna_spunta']).toEqual([expect.objectContaining({ p_motivo: 'gesto', p_riferimento: id })]);
  expect(t.popup_coda[0].mostrato_il).toBeTruthy();
});

test('dare un gesto: le voci già date oggi e il tetto pieno', async ({ page }) => {
  const d = dati();
  d.gesti_casa = [{ id: 'g1', voce: 'letto', data: '2026-11-23' }];
  d.movimenti_passi = [
    { motivo: 'gesto', riferimento: 'g1', passi: 2, giorno: '2026-11-23' },
    { motivo: 'gesto', riferimento: 'altro', passi: 4, giorno: '2026-11-23' },
  ];
  await finto(page, d);
  await page.goto('/');
  await page.getByRole('button', { name: /^Dai passi/ }).click();
  const foglio = page.getByRole('dialog', { name: 'Dai passi' });
  await expect(foglio).toContainText('Il tetto di oggi è pieno');
  await expect(foglio.getByRole('button', { name: /^Letto fatto/ })).toContainText('dato oggi');
  await expect(foglio.getByRole('button', { name: /^Vestiti in ordine/ })).toBeDisabled();
});

test('segnare una sgridata: scelta e conferma col numero', async ({ page }) => {
  const { t, chiamate } = await finto(page, dati(), { passi: { passi: -1 } });
  await page.goto('/');
  await page.getByRole('button', { name: /^Segna/ }).click();
  const foglio = page.getByRole('dialog', { name: 'Segna' });
  await expect(foglio.getByRole('button', { name: 'Segna', exact: true })).toBeDisabled();
  await foglio.getByRole('button', { name: /^Bagno da sistemare/ }).click();
  await foglio.getByRole('button', { name: 'Segna −1' }).click();
  await expect(foglio).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('Bagno da sistemare: −1 passi.');
  expect(t.sgridate[0]).toMatchObject({ tipo: 'bagno', nota: null });
  await expect.poll(() => chiamate.map((c) => c.tipo)).toEqual(['sgridata']);
});

test('balla: frasi pronte con il tu per Lani, testo libero al massimo 80 caratteri e 16 parole', async ({ page }) => {
  const { t } = await finto(page, dati(), { passi: { passi: -10 } });
  await page.goto('/');
  await page.getByRole('button', { name: /^Segna/ }).click();
  const foglio = page.getByRole('dialog', { name: 'Segna' });
  await foglio.getByRole('button', { name: /^Balla/ }).click();
  await foglio.getByLabel('Ha detto di aver studiato').check();
  await foglio.getByRole('button', { name: 'Segna −10' }).click();
  await expect.poll(() => t.sgridate[0]).toMatchObject({ tipo: 'balla', nota: 'Hai detto di aver studiato, ma non era così' });

  await page.getByRole('button', { name: /^Segna/ }).click();
  await foglio.getByRole('button', { name: /^Balla/ }).click();
  await foglio.getByLabel('Lo scrivo io').check();
  const campo = foglio.getByLabel(/Per Lani, con il tu/);
  await expect(campo).toHaveAttribute('maxlength', '80');
  await campo.fill('hai detto che a me e a te lo ha detto lei ma non è vero e lo sai bene');
  await expect(foglio.getByRole('alert')).toHaveText('Al massimo 16 parole: il popup di Lani è corto.');
  await expect(foglio.getByRole('button', { name: 'Segna −10' })).toBeDisabled();
  await campo.fill('hai detto di aver messo in ordine la borsa.');
  await foglio.getByRole('button', { name: 'Segna −10' }).click();
  // maiuscola e senza il punto: il copione aggiunge ". −10. ..."
  await expect.poll(() => t.sgridate[1]).toMatchObject({ nota: 'Hai detto di aver messo in ordine la borsa' });
});

test('dopo le 21 la sgridata avvisa che Lani la vede domattina', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-23T21:20:00+01:00'));
  await finto(page, dati());
  await page.goto('/');
  await page.getByRole('button', { name: /^Segna/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^Antisportiva/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Sono le 21:20: Lani lo vede domattina.');
});

test('firmare un foglio da Oggi: un tocco, passi dal server', async ({ page }) => {
  const { t, chiamate } = await finto(page, dati(), { passi: { passi: 2 } });
  await page.goto('/');
  await daFare(page).getByRole('button', { name: 'Firmato' }).click();
  await page.getByRole('dialog', { name: 'Gita del benessere: firmato?' }).getByRole('button', { name: 'Sì, firmato' }).click();
  await expect(page.getByRole('status')).toHaveText('Gita del benessere: firmato, +2 a Lani.');
  expect(t.fogli_firma[0].consegnato_il).toBeTruthy();
  await expect.poll(() => chiamate).toContainEqual({ tipo: 'foglio', id: 'f1' });
  await expect(page.getByText('Niente da fare per voi')).toBeVisible();
});

test('errore: la pillola dice cosa non è salvato e Riprova rifà la stessa azione', async ({ page }) => {
  const { t, chiamate } = await finto(page, dati(), { passi: { passi: 2 } });
  let rotto = true;
  await page.route('https://finto.supabase.test/rest/v1/fogli_firma*', (r) =>
    rotto && r.request().method() === 'PATCH' ? ((rotto = false), r.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"giù"}' })) : r.fallback(),
  );
  await page.goto('/');
  await daFare(page).getByRole('button', { name: 'Firmato' }).click();
  await page.getByRole('dialog', { name: 'Gita del benessere: firmato?' }).getByRole('button', { name: 'Sì, firmato' }).click();
  await expect(page.getByRole('status')).toContainText('Gita del benessere: firma non salvata.');
  expect(t.fogli_firma[0].consegnato_il).toBeFalsy();
  await page.getByRole('status').getByRole('button', { name: 'Riprova' }).click();
  await expect(page.getByRole('status')).toHaveText('Gita del benessere: firmato, +2 a Lani.');
  expect(t.fogli_firma[0].consegnato_il).toBeTruthy();
  await expect.poll(() => chiamate).toContainEqual({ tipo: 'foglio', id: 'f1' });
});

test('aggiungere un foglio dalla Settimana', async ({ page }) => {
  const { t } = await finto(page, { ...dati(), fogli_firma: [] });
  await page.goto('/');
  await scheda(page, 'Settimana');
  // senza fogli da firmare la sezione è chiusa
  await page.getByText('Fogli da firmare', { exact: true }).click();
  await page.getByRole('button', { name: /^Aggiungi un foglio/ }).click();
  await page.getByLabel('Che foglio è').fill('Autorizzazione uscita');
  await page.getByLabel('Entro il').fill('2026-12-01');
  await expect(page.getByText('1 dic 2026')).toBeVisible();
  await page.getByRole('button', { name: 'Aggiungi il foglio' }).click();
  await expect(page.getByRole('status')).toContainText('Foglio aggiunto');
  expect(t.fogli_firma[0]).toMatchObject({ titolo: 'Autorizzazione uscita', scadenza: '2026-12-01' });
  await expect(page.getByText('Autorizzazione uscita')).toBeVisible();
});

// dal 17/11 il risultato arriva solo dalla FIPAV: i genitori non approvano, non rifiutano e non segnano
test('partite: niente da approvare in Oggi, in Settimana solo la correzione delle partite FIPAV', async ({ page }) => {
  const d = dati();
  d.impostazioni.push(ACCESA);
  d.partite = [{ id: 'p1', data: '2026-11-21', avversaria: 'Foxes Volley', set_nostri: 3, set_loro: 1, in_campo: null, approvata_il: null }];
  await finto(page, d);
  await page.goto('/');
  await expect(daFare(page)).not.toContainText('Foxes');
  await expect(page.getByRole('button', { name: 'Approva' })).toHaveCount(0);
  await scheda(page, 'Settimana');
  await page.getByText('Partite', { exact: true }).click();
  await expect(page.getByRole('button', { name: /Segna una partita/ })).toHaveCount(0);
});

test('correggere una spunta nel suo giorno della Settimana', async ({ page }) => {
  const { t } = await finto(page, dati());
  await page.goto('/');
  await scheda(page, 'Settimana');
  await page.getByRole('button', { name: /^Mar 24/ }).click();
  await page.getByRole('button', { name: 'Togli la spunta: Cartina' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Togli la spunta' }).click();
  await expect(page.getByRole('status')).toContainText('Spunta tolta');
  expect(t.compiti[0].fatto_il).toBeNull();
  expect(t['rpc/storna_spunta']).toEqual([expect.objectContaining({ p_motivo: 'compito', p_riferimento: 'c1' })]);
});

test('cartella segnata ma non fatta: Togli nella Settimana storna i passi e toglie la spunta', async ({ page }) => {
  const { t } = await finto(page, { ...dati(), serate: [{ data: '2026-11-23', cartella_il: '2026-11-23T19:05:00Z', borsa_il: null, chiusa_il: null }] });
  await page.goto('/');
  await scheda(page, 'Settimana');
  await page.getByRole('button', { name: 'Togli la spunta: cartella' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Togli la spunta' }).click();
  await expect(page.getByRole('status')).toContainText('Cartella: spunta tolta');
  expect(t.serate[0].cartella_il).toBeNull();
  expect(t['rpc/storna_spunta']).toEqual([expect.objectContaining({ p_motivo: 'cartella', p_riferimento: 'serata:2026-11-23' })]);
});

test('dieci minuti segnati per sbaglio: Togli nella Settimana storna i passi e li rimette da fare', async ({ page }) => {
  const { t } = await finto(page, {
    ...dati(),
    serate: [{ data: '2026-11-23', cartella_il: null, borsa_il: null, chiusa_il: null, dieci_minuti_da: '2026-11-23T06:30:00Z', dieci_minuti_il: '2026-11-23T06:41:00Z', dieci_minuti_esercizio: null }],
    movimenti_passi: [
      { motivo: 'dieci_minuti', riferimento: 'dieci_minuti:2026-11-23', passi: 3, giorno: '2026-11-23' },
      { motivo: 'quiz', riferimento: '2026-11-22:1', passi: 2, giorno: '2026-11-22' },
      { motivo: 'storno', riferimento: 'quiz:2026-11-22:1', passi: -2, giorno: '2026-11-23' },
    ],
  });
  await page.goto('/');
  await scheda(page, 'Settimana');
  await page.getByRole('button', { name: 'Togli: Dieci minuti di allenamento' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Togli' }).click();
  await expect(page.getByRole('status')).toContainText('Dieci minuti di allenamento: tolto');
  expect(t.serate[0].dieci_minuti_il).toBeNull();
  expect(t['rpc/storna_spunta']).toEqual([expect.objectContaining({ p_motivo: 'dieci_minuti', p_riferimento: 'dieci_minuti:2026-11-23' })]);
});

test('foto mancante: la fa Lani e la riga non compare; dopo le 20 o dalla scadenza la possono fare i genitori, senza passi', async ({ page }) => {
  const d = dati();
  d.compiti.push({ id: 'c2', testo: 'Leggere', materia_id: 'italiano', scadenza: '2026-11-25', fatto_il: null });
  d.richieste_foto = [{ id: 'r1', motivo: 'compito', materia_id: 'italiano', pagine: '34–38', compito_id: 'c2', stato: 'aperta', creato_il: '2026-11-23T13:00:00Z' }];
  await finto(page, d);
  await page.goto('/');
  const riga = page.getByRole('list', { name: 'Da fare per voi' }).getByRole('listitem').filter({ hasText: 'Foto: Italiano' });
  // prima delle 20 e prima della scadenza la riga non c'è: la foto la fa Lani, ai genitori non resta nulla da fare
  await expect(riga).toHaveCount(0);

  await page.clock.setFixedTime(new Date('2026-11-23T20:10:00+01:00'));
  await page.reload();
  await expect(riga).toContainText('Se la fate voi, Lani non prende i passi');
  await expect(riga.getByRole('button', { name: 'Fotografa' })).toBeVisible();

  // dopo il primo scatto: Un'altra pagina, Dalla galleria e Ho finito in fila sotto il testo, con la veste dei genitori
  await carica(page, riga.getByLabel(/^Fotocamera/), { name: 'p.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(JPEG_1PX, 'base64') });
  const finito = riga.getByRole('button', { name: 'Ho finito' });
  await expect(finito).toBeVisible();
  const testo = await riga.locator('.ga-riga-testo').boundingBox();
  const bottone = await finito.boundingBox();
  expect(bottone!.height).toBeGreaterThanOrEqual(44);
  expect(bottone!.y).toBeGreaterThan(testo!.y + testo!.height - 1); // sotto il testo, non accanto
  expect(await finito.evaluate((b) => getComputedStyle(b).borderRadius)).toBe('999px');
  if (process.env.FOTO_RIGA) await riga.screenshot({ path: process.env.FOTO_RIGA });
});

// JPEG di 1 pixel, abbastanza per il caricamento finto
const JPEG_1PX =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

test('Lani è a casa oggi? Solo fino alle 14, con conferma', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-23T07:30:00+01:00'));
  const { t } = await finto(page, dati());
  await page.goto('/');
  await page.getByRole('button', { name: 'Lani è a casa oggi?' }).click();
  const foglio = page.getByRole('dialog', { name: 'Lani a casa lunedì 23/11' });
  await foglio.getByRole('button', { name: 'Segna Lani a casa' }).click();
  await expect(page.getByRole('status')).toHaveText('Lani a casa: lunedì 23/11.');
  expect(t.assenze.map((a) => a.giorno)).toEqual(['2026-11-23']);
  await expect(page.getByRole('button', { name: 'Lani è a casa oggi?' })).toHaveCount(0);
  await expect(page.getByText('a casa da scuola')).toBeVisible();
});

test('consegnare un forziere da Oggi, con conferma', async ({ page }) => {
  const d = dati();
  d.forzieri[0] = { ...d.forzieri[0], premio: 'Pizza con le amiche', stato: 'aperto' };
  const { t } = await finto(page, d);
  await page.goto('/');
  await daFare(page).getByRole('button', { name: 'Consegnato' }).click();
  await page.getByRole('dialog', { name: 'Forziere 1: consegnato?' }).getByRole('button', { name: 'Sì, consegnato' }).click();
  await expect(page.getByRole('status')).toHaveText('Forziere 1: consegnato.');
  expect(t.forzieri[0]).toMatchObject({ stato: 'consegnato' });
});

test('cambiare un premio: Forzieri, riga, premio, salva e crea l’enigma', async ({ page }) => {
  const { t } = await finto(page, dati(), { enigma: { enigma: 'Ho due ruote…', soluzione: 'bici' } });
  // 23/11: i premi non sono più nella barra, si aprono dal fondo della Settimana con il PIN
  await page.route('https://finto.supabase.test/rest/v1/rpc/controlla_pin', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '"ok"' }));
  await page.goto('/');
  await scheda(page, 'Settimana');
  await page.getByRole('button', { name: /Premi e forzieri/ }).click();
  await page.getByLabel('PIN').fill('1234');
  await page.getByRole('button', { name: 'Apri i premi' }).click();
  await expect(page.getByText('9 forzieri senza premio.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Scegli', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Forziere 1' })).toBeVisible();
  await page.getByLabel('Premio').fill('Una bici nuova');
  await page.getByRole('button', { name: 'Salva e crea l’enigma' }).click();
  await expect(page.getByRole('status')).toHaveText('Forziere 1: premio salvato ed enigma pronto.');
  expect(t.forzieri[0].premio).toBe('Una bici nuova');
  await page.getByRole('button', { name: '‹ Forzieri' }).click();
  await expect(page.getByRole('list', { name: 'Forzieri' })).toContainText('1 · Una bici nuova');
});

test('premi dietro il PIN: senza il PIN giusto i forzieri non si vedono', async ({ page }) => {
  await finto(page, dati());
  await page.route('https://finto.supabase.test/rest/v1/rpc/controlla_pin', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '"sbagliato"' }));
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Sezioni genitori' }).getByRole('button', { name: 'Forzieri' })).toHaveCount(0);
  await scheda(page, 'Settimana');
  await page.getByRole('button', { name: /Premi e forzieri/ }).click();
  await page.getByLabel('PIN').fill('0000');
  await page.getByRole('button', { name: 'Apri i premi' }).click();
  await expect(page.getByText('PIN non giusto. Riprova.')).toBeVisible();
  await expect(page.getByText('forzieri senza premio', { exact: false })).toHaveCount(0);
});

test('Impostazioni: R-Evolution con conferma, dieci minuti, frasi, orari', async ({ page }) => {
  const menu = [
    { id: 'plank', nome: 'Plank e varianti', tipo: 'forza_riflessi', creato_il: '2026-11-13T10:00:00Z' },
    { id: 'visore', nome: 'Riflessi con il visore', tipo: 'forza_riflessi', creato_il: '2026-11-13T10:00:01Z' },
    { id: 'respiro', nome: 'Respirazione guidata', tipo: 'recupero', creato_il: '2026-11-13T10:00:02Z' },
  ];
  const { t } = await finto(page, { ...dati(), esercizi_dieci_minuti: menu, frasi: [{ id: 'x1', testo: 'Affrettati lentamente.', autore: 'motto latino', di_famiglia: false }] });
  await page.goto('/');
  await scheda(page, 'Impostazioni');

  await page.getByRole('switch', { name: /R-Evolution/ }).click();
  await page.getByRole('dialog', { name: 'Accendere R-Evolution?' }).getByRole('button', { name: 'Accendi da oggi' }).click();
  await expect(page.getByRole('status')).toContainText('R-Evolution accesa');
  expect(t.impostazioni.find((i) => i.chiave === 'r_evolution_da')?.valore).toBe('2026-11-23');
  await expect(page.getByRole('switch', { name: /R-Evolution/ })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('switch', { name: /R-Evolution/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Spegni' }).click();
  await expect(page.getByRole('status')).toContainText('R-Evolution spenta');
  expect(t.impostazioni.find((i) => i.chiave === 'r_evolution_da')).toBeUndefined();

  await page.getByRole('button', { name: /^Dieci minuti/ }).click();
  await expect(page.getByRole('button', { name: 'Togli: Respirazione guidata' })).toBeDisabled();
  await page.getByLabel('Esercizio nuovo').fill('Mobilità delle spalle');
  await page.getByLabel('Tipo').selectOption('recupero');
  await page.getByRole('button', { name: 'Aggiungi al menu' }).click();
  await expect(page.getByRole('status')).toHaveText('Esercizio aggiunto al menu.');
  expect(t.esercizi_dieci_minuti.find((e) => e.nome === 'Mobilità delle spalle')).toMatchObject({ tipo: 'recupero' });
  await page.getByRole('button', { name: 'Togli: Riflessi con il visore' }).click();
  await expect(page.getByRole('status')).toHaveText('Esercizio tolto dal menu.');
  await page.getByRole('button', { name: '‹ Impostazioni' }).click();

  await page.getByRole('button', { name: /^Frasi di famiglia/ }).click();
  await expect(page.getByText('Affrettati lentamente.')).toHaveCount(0);
  await page.getByLabel('Frase', { exact: true }).fill('Ogni giorno un pezzetto.');
  await page.getByLabel('Di chi (facoltativo)').fill('papà');
  await page.getByRole('button', { name: 'Aggiungi la frase' }).click();
  await expect(page.getByRole('status')).toContainText('Frase salvata');
  expect(t.frasi.find((f) => f.testo === 'Ogni giorno un pezzetto.')).toMatchObject({ autore: 'papà', di_famiglia: true });
  await page.getByRole('button', { name: 'Togli: Ogni giorno un pezzetto.' }).click();
  await expect(page.getByRole('status')).toHaveText('Frase tolta.');
  await page.getByRole('button', { name: '‹ Impostazioni' }).click();

  await page.getByRole('button', { name: /^Sera e cartella/ }).click();
  // una sera alla volta: in alto i giorni con l'ora
  await page.getByRole('group', { name: 'Sera della settimana' }).getByRole('button', { name: /^Mar/ }).click();
  await page.getByLabel('Chiusura di martedì').fill('21:00');
  await expect(page.getByRole('group', { name: 'Sera della settimana' }).getByRole('button', { name: /^Mar/ })).toContainText('21:00');
  // modifiche non salvate: uscire chiede prima, sia indietro sia dalle schede
  await page.getByRole('button', { name: '‹ Impostazioni' }).click();
  await page.getByRole('dialog', { name: 'Modifiche non salvate' }).getByRole('button', { name: 'Resta qui' }).click();
  await page.getByRole('navigation', { name: 'Sezioni genitori' }).getByRole('button', { name: 'Oggi' }).click();
  await page.getByRole('dialog', { name: 'Modifiche non salvate' }).getByRole('button', { name: 'Resta qui' }).click();
  await expect(page.getByLabel('Chiusura di martedì')).toHaveValue('21:00');
  await page.getByRole('button', { name: 'Salva la settimana' }).click();
  await expect(page.getByRole('status')).toHaveText('Sera e cartella salvate.');
  // il finto aggiunge la riga dell'upsert: conta l'ultima
  expect(t.impostazioni.filter((i) => i.chiave === 'ora_chiusura').at(-1)?.valore).toEqual({ 1: '20:30', 2: '21:00' });
});

test('Impostazioni: Stato di ACE in "Per controllare"', async ({ page }) => {
  await finto(page, {
    ...dati(),
    sync_log: [
      { fonte: 'nuvola', esito: 'ok', iniziato_il: '2026-11-23T13:30:00Z', finito_il: '2026-11-23T13:31:00Z' },
      { fonte: 'calendario', esito: 'errore', iniziato_il: '2026-11-23T16:05:00Z', finito_il: '2026-11-23T16:05:10Z' },
    ],
    settimane: [{ inizio: '2026-11-16', chiavi: 2 }],
    errori_client: [{ id: 1, creato_il: '2026-11-23T15:00:00Z', dove: 'Oggi', messaggio: 'Rete assente', origine: 'app' }],
  });
  await page.goto('/');
  await scheda(page, 'Impostazioni');
  await page.getByRole('button', { name: /^Stato di ACE/ }).click();
  await expect(page.getByText('ok, oggi alle 14:30')).toBeVisible();
  await expect(page.getByText(/non riuscita, oggi alle 17:05/)).toBeVisible();
  // dopo un giro non riuscito dice cosa fare
  await expect(page.getByText('Ci riprova da sola al prossimo giro: di solito basta.')).toBeVisible();
  await expect(page.getByText('Prossima: oggi alle 19:30')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Errori degli ultimi 7 giorni: 1' })).toBeVisible();
});

test('Esci dall’account: in Impostazioni, con conferma', async ({ page }) => {
  await finto(page, dati());
  await page.goto('/');
  await scheda(page, 'Impostazioni');
  await page.getByRole('button', { name: 'Esci dall’account' }).click();
  await expect(page.getByRole('dialog', { name: 'Uscire dall’account?' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Annulla' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

// 20/11: un errore della funzione "passi" non si legge più come "tetto pieno"; Riprova rifà solo la chiamata
test('dare un gesto: se i passi non arrivano, lo dice e Riprova li chiede di nuovo', async ({ page }) => {
  const { t, chiamate } = await finto(page, dati(), { passi: { passi: 2 } });
  let primo = true;
  await page.route('**/functions/v1/passi', (r) => {
    if (!primo) return r.fallback();
    primo = false;
    return r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"giù"}' });
  });
  await page.goto('/');
  await page.getByRole('button', { name: /^Dai passi/ }).click();
  const foglio = page.getByRole('dialog', { name: 'Dai passi' });
  await foglio.getByRole('button', { name: /^Scrivania in ordine/ }).click();
  await expect(foglio.getByRole('status')).toContainText('Scrivania in ordine: passi non arrivati.');
  await expect(foglio.getByRole('status')).not.toContainText('tetto');
  await foglio.getByRole('status').getByRole('button', { name: 'Riprova' }).click();
  await expect(foglio.getByRole('status')).toContainText('Scrivania in ordine: +2 a Lani.');
  expect(t.gesti_casa).toHaveLength(1);
  expect(chiamate.map((c) => c.tipo)).toEqual(['gesto']);
});
