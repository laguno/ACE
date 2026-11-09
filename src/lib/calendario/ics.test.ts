// Calendario ICS: casi limite del filone C (ripetizioni, eccezioni, giornate intere, fusi, ora legale).
import ICAL from 'ical.js';
import { describe, expect, it } from 'vitest';
import { oraRoma } from './index';
import { impegni } from './ics';

const ROMA = `BEGIN:VTIMEZONE
TZID:Europe/Rome
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE`;
const cal = (...eventi: string[]) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//prova//IT\r\n${ROMA}\r\n${eventi.join('\r\n')}\r\nEND:VCALENDAR`.replace(/\r?\n/g, '\r\n');
const ev = (righe: string) => `BEGIN:VEVENT\n${righe.trim()}\nEND:VEVENT`;
const leggi = (testo: string, da = '2026-11-01T00:00:00Z', a = '2027-06-30T00:00:00Z') => impegni(ICAL, testo, new Date(da), new Date(a), 'ora');

describe('calendario ICS', () => {
  it('allenamento del martedì ripetuto: stesse 18:30 di Roma prima e dopo il cambio dell\'ora', () => {
    const r = leggi(
      cal(ev(`UID:all-1\nDTSTART;TZID=Europe/Rome:20270316T183000\nDTEND;TZID=Europe/Rome:20270316T200000\nRRULE:FREQ=WEEKLY;COUNT=3\nSUMMARY:Allenamento Pallavolo Leilani U-13`)),
    );
    expect(r).toHaveLength(3); // 16, 23 e 30 marzo: l'ultimo è dopo il 28, in ora legale
    expect(r.map((x) => oraRoma(x.inizio))).toEqual(['18:30', '18:30', '18:30']);
    expect(r.map((x) => x.inizio)).toEqual(['2027-03-16T17:30:00.000Z', '2027-03-23T17:30:00.000Z', '2027-03-30T16:30:00.000Z']);
  });
  it('un\'occorrenza cancellata (EXDATE) sparisce, una spostata cambia ora e titolo', () => {
    const r = leggi(
      cal(
        ev(`UID:all-2\nDTSTART;TZID=Europe/Rome:20261201T183000\nRRULE:FREQ=WEEKLY;COUNT=4\nEXDATE;TZID=Europe/Rome:20261208T183000\nSUMMARY:Allenamento Lani`),
        ev(`UID:all-2\nRECURRENCE-ID;TZID=Europe/Rome:20261215T183000\nDTSTART;TZID=Europe/Rome:20261215T170000\nSUMMARY:[LANI ASSENTE] Allenamento Lani`),
      ),
    );
    expect(r.map((x) => x.inizio.slice(0, 10))).toEqual(['2026-12-01', '2026-12-15', '2026-12-22']);
    const spostato = r.find((x) => x.inizio.startsWith('2026-12-15'));
    expect(oraRoma(spostato!.inizio)).toBe('17:00');
    expect(spostato!.titolo).toBe('[LANI ASSENTE] Allenamento Lani'); // prima restava il titolo dell'evento principale
  });
  it('giornata intera: tutto_il_giorno, senza ora', () => {
    const [g] = leggi(cal(ev(`UID:gita\nDTSTART;VALUE=DATE:20270415\nDTEND;VALUE=DATE:20270416\nSUMMARY:Gita a Mantova`)));
    expect(g.tutto_il_giorno).toBe(true);
    expect(g.titolo).toBe('Gita a Mantova');
  });
  it('un evento in un altro fuso arriva all\'ora giusta di Roma', () => {
    const [p] = leggi(cal(ev(`UID:ny\nDTSTART:20270110T140000Z\nSUMMARY:Partita Lani: trasferta`)));
    expect(oraRoma(p.inizio)).toBe('15:00');
  });
  it('i privati restano fuori, anche se solo un\'occorrenza è privata', () => {
    const r = leggi(
      cal(
        ev(`UID:p1\nDTSTART:20270110T100000Z\nSUMMARY:Visita PRIVATA`),
        ev(`UID:p2\nDTSTART;TZID=Europe/Rome:20270105T090000\nRRULE:FREQ=DAILY;COUNT=3\nSUMMARY:Riunione`),
        ev(`UID:p2\nRECURRENCE-ID;TZID=Europe/Rome:20270106T090000\nDTSTART;TZID=Europe/Rome:20270106T090000\nSUMMARY:Riunione privata`),
      ),
    );
    expect(r.map((x) => x.id)).toEqual(['p2:2027-01-05T09:00:00', 'p2:2027-01-07T09:00:00']);
  });
  it('solo la finestra chiesta; una ripetizione senza fine non gira all\'infinito', () => {
    const r = leggi(cal(ev(`UID:inf\nDTSTART;TZID=Europe/Rome:20261123T080000\nRRULE:FREQ=DAILY\nSUMMARY:Scuola`)), '2026-12-01T00:00:00Z', '2026-12-14T23:00:00Z');
    expect(r).toHaveLength(14);
    expect(r[0].inizio).toBe('2026-12-01T07:00:00.000Z');
  });
  it('titoli vuoti saltati; testo con emoji tenuto com\'è', () => {
    const r = leggi(cal(ev(`UID:v\nDTSTART:20270110T100000Z\nSUMMARY:   `), ev(`UID:e\nDTSTART:20270111T100000Z\nSUMMARY:Partita Lani 🏐`)));
    expect(r.map((x) => x.titolo)).toEqual(['Partita Lani 🏐']);
  });
});
