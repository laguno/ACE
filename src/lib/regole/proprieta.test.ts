// Prove a proprietà (fast-check): migliaia di casi generati per ogni regola, numeri sempre da
// config-gioco.json. Se una proprietà cade, fast-check stampa il caso più piccolo che la rompe.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import * as R from './index';

const P = R.CONFIG.passi;
const TOTALE = R.CONFIG.percorso.totale_passi;
const VOCI = Object.keys(P.gesti_casa.voci) as R.VoceGesto[];
const giornoArb = fc.date({ min: new Date('2026-11-23T00:00:00'), max: new Date('2027-06-04T00:00:00'), noInvalidDate: true });
const votoArb = fc.integer({ min: 2, max: 40 }).map((x) => x / 4); // 0,5 .. 10 a quarti

describe('percorso', () => {
  it('più passi non tolgono mai tappe, e le tappe stanno tra 0 e la cima', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: TOTALE * 2 }), fc.integer({ min: 0, max: 2000 }), (a, d) => {
        const p1 = R.posizione(a);
        const p2 = R.posizione(a + d);
        expect(p2.tappeFatte).toBeGreaterThanOrEqual(p1.tappeFatte);
        expect(p1.tappeFatte).toBeGreaterThanOrEqual(0);
        expect(p1.tappeFatte).toBeLessThanOrEqual(R.CONFIG.percorso.costi_tappe.length);
        expect(p1.avanzamentoTappa).toBeGreaterThanOrEqual(0);
        expect(p1.avanzamentoTappa).toBeLessThanOrEqual(1);
        expect(p1.inCima).toBe(a >= TOTALE);
      }),
    );
  });
  it('un forziere non si apre senza la sua tappa né senza le sue chiavi', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 9 }), fc.integer({ min: 0, max: TOTALE }), fc.integer({ min: 0, max: 80 }), (n, passi, chiavi) => {
        const f = R.forziere(n);
        if (R.statoForziere(n, passi, chiavi) === 'aperto') {
          expect(R.posizione(passi).tappeFatte).toBeGreaterThanOrEqual(f.tappa);
          expect(chiavi).toBeGreaterThanOrEqual(f.chiavi);
        }
      }),
    );
  });
  it('la bandierina non torna mai indietro e sta tra 0 e il totale', () => {
    fc.assert(
      fc.property(giornoArb, fc.integer({ min: 1, max: 30 }), (g, dopo) => {
        const poi = new Date(g);
        poi.setDate(poi.getDate() + dopo);
        const a = R.bandierina(g);
        expect(R.bandierina(poi)).toBeGreaterThanOrEqual(a);
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThanOrEqual(TOTALE);
      }),
      { numRuns: 60 }, // ogni bandierina scorre l'anno intero
    );
  });
});

describe('passi delle azioni', () => {
  it('un compito vale la base o la base con anticipo, e prima non vale mai meno di dopo', () => {
    fc.assert(
      fc.property(giornoArb, fc.integer({ min: 0, max: 10 }), fc.integer({ min: 0, max: 10 }), (scadenza, a, b) => {
        const presto = new Date(scadenza);
        presto.setDate(presto.getDate() - Math.max(a, b));
        const tardi = new Date(scadenza);
        tardi.setDate(tardi.getDate() - Math.min(a, b));
        const valori = [P.obbligatori.compiti, Math.round(P.obbligatori.compiti * P.compiti_anticipo.moltiplicatore)];
        expect(valori).toContain(R.passiCompito(scadenza, presto));
        expect(R.passiCompito(scadenza, presto)).toBeGreaterThanOrEqual(R.passiCompito(scadenza, tardi));
      }),
    );
  });
  it('i gesti di casa di un giorno non dipendono dall\'ordine e non superano il tetto', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...VOCI), { maxLength: 12 }), fc.integer(), (voci, seme) => {
        // ogni gesto riceve i passi rimasti sotto il tetto, dati quelli già registrati oggi
        const somma = (l: R.VoceGesto[]) => l.reduce((tot, v) => tot + R.passiNuovoGesto(tot, v), 0);
        const mescolate = fc.sample(fc.shuffledSubarray(voci, { minLength: voci.length, maxLength: voci.length }), { seed: seme, numRuns: 1 })[0];
        expect(somma(mescolate)).toBe(somma(voci));
        expect(somma(voci)).toBe(R.passiGestiCasa(voci));
        expect(somma(voci)).toBeLessThanOrEqual(P.gesti_casa.tetto_giornaliero);
      }),
    );
  });
  it('nessun voto toglie passi, e un voto per materia dà un numero di passi per voto', () => {
    fc.assert(
      fc.property(fc.array(votoArb, { maxLength: 15 }), (voti) => {
        const passi = R.passiVotiMateria(voti);
        expect(passi).toHaveLength(voti.length);
        for (const p of passi) expect(p).toBeGreaterThanOrEqual(0);
      }),
    );
  });
  it('il quiz dà passi solo con un tentativo e domande vere, mai negativi', () => {
    fc.assert(
      fc.property(fc.integer({ min: -2, max: 10 }), fc.integer({ min: 0, max: 20 }), fc.integer({ min: -1, max: 20 }), (t, giuste, totale) => {
        const p = R.passiQuiz(t, Math.min(giuste, Math.max(totale, 0)), totale);
        expect(p).toBeGreaterThanOrEqual(0);
        if (t < 1 || totale <= 0) expect(p).toBe(0);
      }),
    );
  });
  it('le dimenticanze tolgono passi una volta ogni tre note', () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.uuid(), { maxLength: 30 }), (ids) => {
        const colpite = R.malusDimenticanze(ids);
        expect(colpite).toHaveLength(Math.floor(ids.length / 3));
        for (const id of colpite) expect(ids).toContain(id);
      }),
    );
  });
});

describe('chiavi, storni e studio', () => {
  const settimanaArb = fc
    .record({ compiti: fc.nat(15), sereCartella: fc.nat(6), sereBorsa: fc.nat(4), fogli: fc.nat(3), sessioni: fc.nat(5), note: fc.nat(3) })
    .chain((s) =>
      fc.record({
        s: fc.constant(s),
        fatti: fc.subarray(
          [
            ...Array(s.compiti).fill('compito'),
            ...Array(s.sereCartella).fill('cartella'),
            ...Array(s.sereBorsa).fill('borsa'),
            ...Array(s.fogli).fill('foglio'),
            ...Array(s.sessioni).fill('ripasso'),
          ] as string[],
        ),
      }),
    );
  const PASSI: Record<string, number> = { compito: P.obbligatori.compiti, cartella: P.obbligatori.cartella, borsa: P.obbligatori.borsa, foglio: P.obbligatori.fogli, ripasso: P.obbligatori.ripasso };
  it('da 0 a 3 chiavi; con una nota al massimo 1; fare di più non toglie chiavi', () => {
    fc.assert(
      fc.property(settimanaArb, ({ s, fatti }) => {
        const conta = (l: string[]) => R.chiaviSettimana(R.contaSettimana({ ...s, movimenti: l.map((motivo) => ({ motivo, passi: PASSI[motivo] })) }));
        const k = conta(fatti);
        expect(k).toBeGreaterThanOrEqual(0);
        expect(k).toBeLessThanOrEqual(3);
        if (s.note > 0) expect(k).toBeLessThanOrEqual(1);
        // una cosa in più fatta non fa mai perdere chiavi
        const tutte = Object.entries(PASSI).flatMap(([m]) => Array(fatti.length + 1).fill(m));
        const possibili: Record<string, number> = { compito: s.compiti, cartella: s.sereCartella, borsa: s.sereBorsa, foglio: s.fogli, ripasso: s.sessioni };
        const extra = tutte.find((m: string) => fatti.filter((x) => x === m).length < possibili[m]);
        if (extra) expect(conta([...fatti, extra])).toBeGreaterThanOrEqual(k);
      }),
    );
  });
  it('uno storno annulla esattamente la spunta, e dopo le chiavi non c\'è', () => {
    fc.assert(
      fc.property(fc.integer({ min: -50, max: 50 }), fc.constantFrom(1, R.CONFIG.rimonta.moltiplicatore), (passi, molt) => {
        const m = { passi, moltiplicatore: molt };
        const s = R.storno(m, false);
        if (passi === 0) expect(s).toBeNull();
        else expect(s!.passi * s!.moltiplicatore + m.passi * m.moltiplicatore).toBe(0);
        expect(R.storno(m, true)).toBeNull();
      }),
    );
  });
  it('la rimonta vale 1 o il suo moltiplicatore, mai senza la prima chiave', () => {
    fc.assert(
      fc.property(fc.nat(TOTALE), fc.nat(TOTALE), fc.nat(3), (passi, bandierina, chiavi) => {
        const m = R.moltiplicatoreRimonta(passi, bandierina, chiavi);
        expect([1, R.CONFIG.rimonta.moltiplicatore]).toContain(m);
        if (chiavi < 1) expect(m).toBe(1);
        if (passi >= bandierina) expect(m).toBe(1);
      }),
    );
  });
  it('le caselle dello studio sono tante quante il tetto, diverse, del giorno giusto', () => {
    fc.assert(
      fc.property(fc.constantFrom<R.TipoStudio>('flashcard', 'video', 'quiz'), giornoArb, (tipo, g) => {
        const c = R.caselleStudio(tipo, R.iso(g));
        expect(new Set(c).size).toBe(P.studio_facoltativo.max_al_giorno_per_tipo);
        for (const x of c) expect(x.startsWith(`${tipo}:${R.iso(g)}:`)).toBe(true);
      }),
    );
  });
  it('flash card: l\'intervallo resta almeno 1 e la prossima volta è sempre nel futuro', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 120 }), fc.constantFrom<R.Esito>('sapevo', 'quasi', 'non_sapevo'), giornoArb, (intervallo, esito, oggi) => {
        const r = R.prossimaRevisione(intervallo, esito, oggi);
        expect(r.intervallo).toBeGreaterThanOrEqual(1);
        expect(r.data > R.iso(oggi)).toBe(true);
      }),
    );
  });
  it('il piano di ripasso: al massimo 4 sessioni, prima della verifica, mai nei giorni occupati', () => {
    fc.assert(
      fc.property(giornoArb, fc.integer({ min: 0, max: 10 }), fc.array(fc.integer({ min: 1, max: 7 }), { maxLength: 4 }), (verifica, anticipo, buchi) => {
        const oggi = new Date(verifica);
        oggi.setDate(oggi.getDate() - anticipo);
        const occupati = buchi.map((b) => {
          const d = new Date(verifica);
          d.setDate(d.getDate() - b);
          return R.iso(d);
        });
        const piano = R.pianoRipasso(verifica, oggi, occupati);
        expect(piano.length).toBeLessThanOrEqual(4);
        for (const s of piano) {
          expect(s.data < R.iso(verifica)).toBe(true);
          expect(s.data >= R.iso(oggi)).toBe(true);
          expect(occupati).not.toContain(s.data);
        }
        if (piano.length) expect(piano.at(-1)?.tipo === 'quiz' || piano.at(-1)?.tipo === 'quiz_errori').toBe(true);
      }),
    );
  });
});
