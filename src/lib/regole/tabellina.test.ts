import { describe, expect, it } from 'vitest';
import { CONFIG } from './index';
import { contatore, motivoInParole, perLeChiavi, vociDelGiorno, type FattiGiorno } from './tabellina';

const P = CONFIG.passi;
const vuoto: FattiGiorno = { giorno: '2026-11-24', compiti: [], cartella: false, borsa: false, fogli: [], ripassi: [], dieciMinuti: false, foto: [], partita: null, movimenti: [] };
const studioMassimo =
  (P.studio_facoltativo.flashcard_giro + P.studio_facoltativo.video_completo + Object.values(P.studio_facoltativo.quiz.tentativi)[0][0]) *
  P.studio_facoltativo.max_al_giorno_per_tipo;

describe('tabellina dei passi', () => {
  it('giorno vuoto: studio in più e una riga per ogni gesto di casa', () => {
    const v = vociDelGiorno(vuoto);
    expect(v.filter((x) => x.gruppo === 'casa').map((x) => x.id)).toEqual(Object.keys(P.gesti_casa.voci).map((k) => `gesto:${k}`));
    expect(v.filter((x) => x.gruppo === 'studio')).toHaveLength(3);
    expect(contatore(v, [])).toEqual({ presi: 0, disponibili: studioMassimo + P.gesti_casa.tetto_giornaliero });
  });

  it('cose di ogni giorno con i numeri del config, presi dai movimenti', () => {
    const f: FattiGiorno = {
      ...vuoto,
      compiti: [{ id: 'c1', testo: 'Es. 1', materia: 'Matematica', scadenza: '2026-11-25' }],
      cartella: true,
      borsa: true,
      fogli: [{ id: 'f1', titolo: 'Gita' }],
      ripassi: [{ id: 'r1', materia: 'Storia' }],
      dieciMinuti: true,
      movimenti: [
        { motivo: 'compito', riferimento: 'c1', passi: P.obbligatori.compiti },
        { motivo: 'cartella', riferimento: 'serata:2026-11-24', passi: P.obbligatori.cartella },
      ],
    };
    const v = vociDelGiorno(f).filter((x) => x.gruppo === 'ogni-giorno');
    expect(v.map((x) => [x.id, x.valore, x.presi])).toEqual([
      ['compito:c1', P.obbligatori.compiti, P.obbligatori.compiti],
      ['cartella', P.obbligatori.cartella, P.obbligatori.cartella],
      ['borsa', P.obbligatori.borsa, 0],
      ['foglio:f1', P.obbligatori.fogli, 0],
      ['ripasso:r1', P.obbligatori.ripasso, 0],
      ['dieci_minuti', P.obbligatori.dieci_minuti, 0],
    ]);
    expect(v[0].testo).toBe('Compiti di Matematica');
  });

  it('compito non ancora fatto: vale col bonus se mancano almeno due giorni', () => {
    const v = vociDelGiorno({ ...vuoto, compiti: [{ id: 'c1', testo: 'x', materia: null, scadenza: '2026-11-27' }] });
    expect(v[0].valore).toBe(Math.round(P.obbligatori.compiti * P.compiti_anticipo.moltiplicatore));
  });

  it('spunta stornata: non conta tra i presi', () => {
    const f = {
      ...vuoto,
      compiti: [{ id: 'c1', testo: 'x', materia: null, scadenza: '2026-11-25' }],
      movimenti: [
        { motivo: 'compito', riferimento: 'c1', passi: 10 },
        { motivo: 'storno', riferimento: 'compito:c1', passi: -10 },
      ],
    };
    expect(vociDelGiorno(f)[0].presi).toBe(0);
  });

  it('gesti di casa: il contatore si ferma al tetto del giorno', () => {
    const gesti = Object.keys(P.gesti_casa.voci).map((voce, i) => ({ voce, id: `g${i}` }));
    const movimenti = gesti.map((g) => ({ motivo: 'gesto', riferimento: g.id, passi: 2 }));
    const v = vociDelGiorno({ ...vuoto, movimenti }, gesti);
    expect(v.filter((x) => x.gruppo === 'casa').every((x) => x.presi > 0)).toBe(true);
    expect(contatore(v, movimenti).presi).toBe(P.gesti_casa.tetto_giornaliero);
  });

  it('studio in più: conta i giri del giorno', () => {
    const movimenti = [1, 2].map((n) => ({ motivo: 'flashcard', riferimento: `flashcard:2026-11-24:${n}`, passi: P.studio_facoltativo.flashcard_giro }));
    const v = vociDelGiorno({ ...vuoto, movimenti });
    expect(v.find((x) => x.id === 'flashcard')?.presi).toBe(2 * P.studio_facoltativo.flashcard_giro);
  });

  it('partita del giorno: giocata più vinta; passi in più (voto) su tutti e due i numeri', () => {
    const movimenti = [
      { motivo: 'partita', riferimento: 'p1', passi: P.partite.giocata },
      { motivo: 'voto', riferimento: 'v1', passi: P.voti['8'] },
      { motivo: 'sgridata', riferimento: 's1', passi: P.malus.bagno },
    ];
    const v = vociDelGiorno({ ...vuoto, partita: { titolo: 'Partita Lani' }, movimenti });
    expect(v.find((x) => x.id === 'partita')).toMatchObject({ valore: P.partite.giocata + P.partite.vinta_in_piu, presi: P.partite.giocata });
    const c = contatore(v, movimenti);
    expect(c.presi).toBe(P.partite.giocata + P.voti['8']);
    expect(c.disponibili).toBe(studioMassimo + P.gesti_casa.tetto_giornaliero + P.partite.giocata + P.partite.vinta_in_piu + P.voti['8']);
  });

  it('per le chiavi solo le cose obbligatorie: foto, studio, casa e partita sono passi in più', () => {
    const f: FattiGiorno = {
      ...vuoto,
      compiti: [{ id: 'c1', testo: 'Es. 1', materia: 'Matematica', scadenza: '2026-11-25' }],
      cartella: true,
      dieciMinuti: true,
      foto: [{ id: 'r1', pagine: '12' }],
      partita: { titolo: 'Partita Lani' },
    };
    const v = vociDelGiorno(f);
    expect(v.filter(perLeChiavi).map((x) => x.id)).toEqual(['compito:c1', 'cartella', 'dieci_minuti']);
    expect(v.filter((x) => !perLeChiavi(x)).map((x) => x.id)).toContain('foto:r1');
    expect(v.filter((x) => !perLeChiavi(x)).map((x) => x.id)).toContain('partita');
  });

  it('motivi in parole di casa', () => {
    expect(motivoInParole('gesto')).toBe('Gesto di casa');
    expect(motivoInParole('pagella:1q')).toBe('Pagella');
    expect(motivoInParole('sconosciuto')).toBe('Passi');
  });
});
