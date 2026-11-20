import { describe, expect, it } from 'vitest';
import { riassunto } from './Tutor';

const base = { id: '1', argomento: null, testo: null, risposta: null, ia: false, esito: 'ok' as const, giorno: '2026-11-24', creato_il: '2026-11-24T16:00:00Z', compiti: { testo: 'Frazioni pag. 40' }, profili: { nome: 'Lani' } };

describe('storico del tutor per i genitori', () => {
  it('una riga per tipo, con l’esito quando non è ok', () => {
    expect(riassunto({ ...base, tipo: 'tentativo', testo: 'ho diviso' })).toEqual({ titolo: 'Non ho capito: Frazioni pag. 40', sotto: 'Ha provato così: ho diviso' });
    expect(riassunto({ ...base, tipo: 'indizio', risposta: { n: 2, indizio: 'Cerca un divisore.' } }).sotto).toBe('Indizio 2: Cerca un divisore.');
    expect(riassunto({ ...base, tipo: 'spiegazione', ia: true, esito: 'bloccata' }).sotto).toBe('Spiegazione nuova del tutor · conteneva il risultato: scartata dal controllo');
    expect(riassunto({ ...base, tipo: 'spiegamelo', argomento: 'Frazioni', testo: 'Parti uguali.', risposta: { cosa_manca: ['Il denominatore', 'Il numeratore'] }, compiti: null })).toEqual({
      titolo: 'Spiegamelo tu: Frazioni',
      sotto: 'Ha scritto: Parti uguali. · Manca: Il denominatore; Il numeratore',
    });
  });
});
