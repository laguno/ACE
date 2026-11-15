import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import config from '../../../data/config-gioco.json' with { type: 'json' };
import { assenteDalCalendario, garaDi, istanteRoma, leggiGare, pillolaPartita, traQuanto } from './index';

// pagine vere del portale salvate il 15/11/2026 (risultati-classifiche.aspx, filtro del campionato)
const pagina = (cid: number) => readFileSync(`src/lib/classifiche/pagine/gare-${cid}-15-11-2026.html`, 'utf8');
const [U13, U14] = [config.classifiche.campionati.find((c) => c.cid === 93436)!, config.classifiche.campionati.find((c) => c.cid === 93399)!];

describe('gare dal portale FIPAV', () => {
  it('legge tutte le gare del girone U14, giocate e da giocare', () => {
    const gare = leggiGare(pagina(93399));
    expect(gare).toHaveLength(12);
    expect(gare[2]).toEqual({
      numero: 864,
      giornata: 2,
      inizio: '2026-10-30T16:45:00.000Z', // 17:45 di Roma, ora solare
      casa: 'ARBOR ITARCA',
      ospite: 'U14R-EVOLUTION',
      set_casa: 0,
      set_ospite: 3,
      stato: 'gara omologata',
    });
    expect(gare[1]).toMatchObject({ numero: 863, set_casa: null, set_ospite: null, stato: 'da disputare' });
    expect(gare.find((g) => g.numero === 868)?.stato).toBe('da disputare'); // senza "Arbitro designato"
    expect(gare.find((g) => g.numero === 866)?.stato).toBe('risultato ufficioso');
  });

  it('nel girone U13 trova le gare di R-Evolution dal nome della squadra in config', () => {
    const nostre = leggiGare(pagina(93436)).map((g) => garaDi(U13.squadra, g)).filter(Boolean);
    expect(nostre).toHaveLength(10);
    expect(nostre[4]).toEqual({ avversaria: 'VOLLEY SCANDIANO ROSSA', inCasa: false, nostri: 3, loro: 0 });
  });

  it('garaDi: casa o trasferta, set dalla parte giusta, null se R-Evolution non gioca', () => {
    const gare = leggiGare(pagina(93399));
    expect(garaDi(U14.squadra, gare.find((g) => g.numero === 869)!)).toEqual({ avversaria: 'A.S.D. GAZZE CANOSSA', inCasa: true, nostri: null, loro: null });
    expect(garaDi(U14.squadra, gare.find((g) => g.numero === 866)!)).toMatchObject({ inCasa: false, nostri: 3, loro: 1 });
    expect(garaDi(U14.squadra, gare.find((g) => g.numero === 865)!)).toBeNull();
  });

  it('pagina senza tabella: nessuna gara', () => {
    expect(leggiGare('<html><body>manutenzione</body></html>')).toEqual([]);
  });

  it('ora di Roma anche d’estate', () => {
    expect(istanteRoma(2027, 5, 15, 16, 0).toISOString()).toBe('2027-05-15T14:00:00.000Z');
  });

  it('assente se il calendario di famiglia segna la partita "[LANI ASSENTE]"', () => {
    expect(assenteDalCalendario(['[LANI ASSENTE] Partita U13: A vs B'])).toBe(true);
    expect(assenteDalCalendario(['Partita Lani U13: A vs B', 'Tennis Leonardo'])).toBe(false);
  });
});

describe('prossima partita: quanto manca', () => {
  const inizio = istanteRoma(2026, 11, 21, 16, 0);
  it('carta: giorni, domani, ore, tra poco', () => {
    expect(traQuanto(inizio, istanteRoma(2026, 11, 15, 20, 0))).toBe('tra 6 giorni');
    expect(traQuanto(inizio, istanteRoma(2026, 11, 20, 23, 30))).toBe('domani');
    expect(traQuanto(inizio, istanteRoma(2026, 11, 21, 11, 30))).toBe('tra 5 ore');
    expect(traQuanto(inizio, istanteRoma(2026, 11, 21, 15, 10))).toBe('tra poco');
  });
  it('pillola: solo il giorno prima e il giorno stesso, prima dell’inizio', () => {
    expect(pillolaPartita(inizio, istanteRoma(2026, 11, 19, 8, 0))).toBeNull();
    expect(pillolaPartita(inizio, istanteRoma(2026, 11, 20, 7, 0))).toBe('Domani partita · 16:00');
    expect(pillolaPartita(inizio, istanteRoma(2026, 11, 21, 12, 0))).toBe('Oggi partita · tra 4 ore');
    expect(pillolaPartita(inizio, istanteRoma(2026, 11, 21, 16, 30))).toBeNull();
  });
});
