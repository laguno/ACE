// Casi limite e date difficili (filone C del piano): ora legale, mezzanotte, vacanze, testi strani
// di Nuvola. Girano anche con il fuso del server (npm run test:server, TZ=UTC).
import { describe, expect, it } from 'vitest';
import * as C from './calendario';
import * as N from './nuvola';
import * as R from './regole';

const giornoRoma = (istante: string) => R.iso(R.giornoRoma(istante));

describe('ora legale', () => {
  it('28 marzo 2027: alle 2 diventano le 3, l\'ora di Roma resta giusta', () => {
    expect(C.oraRoma('2027-03-28T00:59:00Z')).toBe('01:59');
    expect(C.oraRoma('2027-03-28T01:00:00Z')).toBe('03:00');
    // chiavi della domenica: 21:30 di Roma è 20:30 UTC d'inverno e 19:30 UTC d'estate (cron su tutte e due)
    expect(C.oraRoma('2027-03-21T20:30:00Z')).toBe('21:30');
    expect(C.oraRoma('2027-03-28T19:30:00Z')).toBe('21:30');
    expect(C.oraRoma('2027-03-28T18:30:00Z') < '21:00').toBe(true); // il primo giro d'estate... è il 19:30
    expect(C.oraRoma('2027-03-21T19:30:00Z') < '21:00').toBe(true); // d'inverno il 19:30 UTC si salta
  });
  it('31 ottobre 2027 e 25 ottobre 2026: l\'ora che si ripete', () => {
    expect(C.oraRoma('2026-10-25T00:30:00Z')).toBe('02:30');
    expect(C.oraRoma('2026-10-25T01:30:00Z')).toBe('02:30');
    expect(C.oraRoma('2027-10-31T01:30:00Z')).toBe('02:30');
  });
  it('il giorno di Roma di un istante, a cavallo della mezzanotte, d\'inverno e d\'estate', () => {
    expect(giornoRoma('2026-11-23T22:59:00Z')).toBe('2026-11-23'); // 23:59
    expect(giornoRoma('2026-11-23T23:01:00Z')).toBe('2026-11-24'); // 00:01
    expect(giornoRoma('2027-05-31T21:59:00Z')).toBe('2027-05-31'); // 23:59 d'estate
    expect(giornoRoma('2027-05-31T22:01:00Z')).toBe('2027-06-01');
    expect(giornoRoma('2027-03-27T23:30:00Z')).toBe('2027-03-28');
  });
  it('lunedì della settimana anche nella settimana del cambio dell\'ora', () => {
    expect(R.iso(R.lunedi(R.giorno('2027-03-28')))).toBe('2027-03-22');
    expect(R.iso(R.lunedi(R.giorno('2027-03-29')))).toBe('2027-03-29');
    expect(R.iso(R.lunedi(R.giorno('2027-10-31')))).toBe('2027-10-25');
  });
});

describe('spunte a mezzanotte', () => {
  const scadenza = R.giorno('2026-11-24');
  it('spunta alle 23:59 del giorno prima: in tempo; alle 00:01 del giorno stesso: ancora in tempo', () => {
    expect(R.compitoInTempo(scadenza, R.giornoRoma('2026-11-23T22:59:00Z'))).toBe(true);
    expect(R.compitoInTempo(scadenza, R.giornoRoma('2026-11-23T23:01:00Z'))).toBe(true);
  });
  it('alle 00:01 del giorno dopo la scadenza: fuori tempo', () => {
    expect(R.compitoInTempo(scadenza, R.giornoRoma('2026-11-24T23:01:00Z'))).toBe(false);
  });
  it('anticipo: due giorni prima vale, un minuto dopo la mezzanotte del giorno prima no', () => {
    const anticipo = Math.round(R.CONFIG.passi.obbligatori.compiti * R.CONFIG.passi.compiti_anticipo.moltiplicatore);
    expect(R.passiCompito(scadenza, R.giornoRoma('2026-11-22T22:59:00Z'))).toBe(anticipo); // 22 alle 23:59
    expect(R.passiCompito(scadenza, R.giornoRoma('2026-11-22T23:01:00Z'))).toBe(R.CONFIG.passi.obbligatori.compiti); // 23 alle 00:01
  });
});

describe('vacanze', () => {
  const vacanze = R.CONFIG.calendario as unknown as { vacanze?: { da: string; a: string }[] };
  it('la bandierina sta ferma per tutte le vacanze e riparte al rientro', () => {
    // dal 24/12 al 6/1 nessun giorno di scuola (calendario di config-gioco.json)
    const prima = R.bandierina(R.giorno('2026-12-23'));
    for (const g of ['2026-12-24', '2026-12-28', '2027-01-01', '2027-01-06']) expect(R.bandierina(R.giorno(g))).toBe(prima);
    expect(R.bandierina(R.giorno('2027-01-07'))).toBeGreaterThan(prima);
    expect(vacanze).toBeDefined();
  });
  it('i compiti "per domani" dell\'ultimo giorno prima di Natale scadono al rientro', () => {
    expect(R.iso(R.prossimoGiornoDiScuola(R.giorno('2026-12-23')))).toBe('2027-01-07');
    expect(R.cartellaConta(R.giorno('2026-12-23'))).toBe(false);
    expect(R.cartellaConta(R.giorno('2027-01-06'))).toBe(true);
  });
  it('verifica il primo giorno dopo le vacanze: il ripasso si fa negli ultimi giorni di vacanza', () => {
    const piano = R.pianoRipasso(R.giorno('2027-01-07'), R.giorno('2026-12-28'));
    expect(piano).toHaveLength(4);
    expect(piano.at(-1)).toMatchObject({ data: '2027-01-06', tipo: 'quiz_errori' });
  });
});

describe('orari della sera', () => {
  const sport = (titolo: string, inizio: string) => ({ titolo, inizio });
  it('due impegni dopo le 17: si chiude mezz\'ora prima del primo, anche se nel calendario viene dopo', () => {
    const imp = [sport('Partita Lani: FOXES', '2026-11-12T19:00:00Z'), sport('Allenamento Pallavolo Leilani U-13', '2026-11-12T17:30:00Z')];
    expect(C.oraChiusura('20:30', imp)).toBe('18:00');
  });
  it('sposta gira sulle 24 ore', () => {
    expect(C.sposta('23:50', 30)).toBe('00:20');
    expect(C.sposta('00:15', -30)).toBe('23:45');
    expect(C.sposta('18:30', -30)).toBe('18:00');
  });
  it('impegno senza ora (giornata intera) o del fuso sbagliato non sposta la chiusura a caso', () => {
    expect(C.oraChiusura('20:30', [sport('Torneo Lani', '2027-04-15T00:00:00Z')])).toBe('20:30'); // 02:00 di Roma, non sera
  });
});

describe('testi strani da Nuvola', () => {
  it('pagine scritte in tanti modi', () => {
    expect(N.pagine('Studiare pagine 340-352')).toBe('340–352');
    expect(N.pagine('pag. 12 es. 3, 5 e 7')).toBe('12');
    expect(N.pagine('pagg. 12, 14 e 16')).toBe('12, 14, 16');
    expect(N.pagine('p.40')).toBe('40');
    expect(N.pagine('pp 40 – 41')).toBe('40–41');
    expect(N.pagine('Ripassare tutto 📚✨')).toBeNull();
    expect(N.pagine('123')).toBeNull();
    expect(N.pagine('')).toBeNull();
    expect(N.pagine('Esercizi app 3 e 4')).toBeNull(); // "app" non è "pp"
  });
  it('il peso mette prima i compiti lunghi, anche con testi strani', () => {
    expect(N.peso('pag 340-352')).toBeGreaterThan(N.peso('pag. 12 es. 3, 5 e 7'));
    expect(N.peso('es 1-8')).toBeGreaterThan(N.peso('es 1'));
    for (const t of ['', '🏐🏐🏐', '0000', 'pag 52-40', 'x'.repeat(5000)]) expect(Number.isFinite(N.peso(t))).toBe(true);
    expect(N.peso('pag 52-40')).toBeGreaterThan(0); // intervallo al contrario: almeno 1
  });
  it('voti scritti in modo strano', () => {
    expect(N.votoNumero('7½')).toBe(7.5);
    expect(N.votoNumero('8+')).toBe(8.25);
    expect(N.votoNumero('6-')).toBe(5.75);
    expect(N.votoNumero('ottimo')).toBeNull();
    expect(N.votoNumero('')).toBeNull();
  });
});
