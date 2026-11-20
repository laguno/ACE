// Prove del motore della pallavolo: funzioni pure, quindi si provano a tavolino e a proprietà.
// Numeri sempre da M; le palle e i giocatori "a mano" partono da nuovaPartita e si ritoccano.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  FERMO,
  HZ,
  M,
  caso,
  cerchio,
  ia,
  nuovaPartita,
  passo,
  type Comandi,
  type Lato,
  type Stato,
} from "./index";

type Coppia = readonly [Comandi, Comandi];

const DURATA = 2 * 60 * HZ; // durata normale: due minuti
const FERMI: Coppia = [FERMO, FERMO];
const seme32 = fc.integer({ min: -(2 ** 31), max: 2 ** 31 - 1 });
const comandiArb = fc.record({
  sx: fc.boolean(),
  dx: fc.boolean(),
  salta: fc.boolean(),
  schiaccia: fc.boolean(),
});
// Comandi tenuti per qualche tic (altrimenti i giocatori tremano sul posto): fino a ~3000 tic.
const sequenzaArb: fc.Arbitrary<Coppia[]> = fc
  .array(
    fc.tuple(fc.tuple(comandiArb, comandiArb), fc.integer({ min: 1, max: 40 })),
    { maxLength: 150 },
  )
  .map((blocchi) =>
    blocchi.flatMap(([c, n]) => Array.from({ length: n }, () => c as Coppia)),
  );

// ---- aiutanti ----

const nuova = (seme: number, durata = DURATA) => nuovaPartita(seme, durata);

/** Rigioca una partita: seme + comandi, uno per tic. */
function gioca(
  seme: number,
  comandi: readonly Coppia[],
  durata = DURATA,
  da: Stato = nuova(seme, durata),
): Stato {
  let s = da;
  for (const c of comandi) s = passo(s, c);
  return s;
}

/** Avanza (con i comandi di `scegli`, di default fermi) finché il predicato è vero; se non arriva entro max tic, lancia. */
function finoA(
  s: Stato,
  vero: (s: Stato) => boolean,
  max: number,
  scegli: (s: Stato) => Coppia = () => FERMI,
): Stato {
  for (let i = 0; i < max && !vero(s); i++) s = passo(s, scegli(s));
  if (!vero(s))
    throw new Error(
      `predicato non raggiunto in ${max} tic (tic ${s.tic}, punti ${s.punti})`,
    );
  return s;
}

/** Copia dello stato con la palla libera di muoversi (niente attesa di battuta). */
function libera(s: Stato): Stato {
  const c = structuredClone(s);
  c.attesa = 0;
  return c;
}

/** Palla ferma che tocca appena la testa del giocatore `lato`. */
function sopraGiocatore(s: Stato, lato: Lato): Stato {
  const c = libera(s);
  const g = c.giocatori[lato];
  c.palla = {
    x: g.x,
    y: g.y + cerchio(c, g)[0] + M.raggio + M.raggioG - 10,
    vx: 0,
    vy: 0,
  };
  return c;
}

/** Palla che sta per toccare terra nel campo di `campo`, lontana dai giocatori: il punto va all'altro lato. */
function aTerra(s: Stato, campo: Lato): Stato {
  const c = libera(s);
  c.palla = {
    x: M.casa[campo] + (campo === 1 ? 150 : -150),
    y: M.raggio + 1,
    vx: 0,
    vy: -1,
  };
  return c;
}

function numeriFiniti(v: unknown): boolean {
  if (typeof v === "number") return Number.isFinite(v);
  if (v !== null && typeof v === "object")
    return Object.values(v).every(numeriFiniti);
  return true;
}

/** Percorre n tic e dà il primo messaggio di violazione dei controlli (tra due stati consecutivi), o null. */
function primaViolazione(
  s: Stato,
  n: number,
  scegli: (s: Stato) => Coppia,
  ...controlli: ((prima: Stato, dopo: Stato) => string | null)[]
): string | null {
  for (let i = 0; i < n; i++) {
    const dopo = passo(s, scegli(s));
    for (const c of controlli) {
      const v = c(s, dopo);
      if (v) return `tic ${dopo.tic}: ${v}`;
    }
    s = dopo;
  }
  return null;
}

const sommaPunti = (s: Stato) => s.punti[0] + s.punti[1];

/** Invarianti del motore tra due stati consecutivi. */
function invarianti(a: Stato, b: Stato): string | null {
  if (!numeriFiniti(b)) return "numero non finito";
  if (b.palla.x < M.raggio || b.palla.x > M.largo - M.raggio)
    return `palla.x fuori dal campo (${b.palla.x})`;
  const [g0, g1] = b.giocatori;
  if (g0.x < M.raggioG || g0.x > M.reteX - M.reteMezza - M.raggioG)
    return `giocatore 0 fuori dal suo campo (${g0.x})`;
  if (g1.x < M.reteX + M.reteMezza + M.raggioG || g1.x > M.largo - M.raggioG)
    return `giocatore 1 fuori dal suo campo (${g1.x})`;
  if (g0.y < 0 || g1.y < 0) return "giocatore sotto il pavimento";
  if (b.punti[0] < a.punti[0] || b.punti[1] < a.punti[1])
    return "punti in discesa";
  if (sommaPunti(b) - sommaPunti(a) > 1) return "più di un punto in un tic";
  if (a.vincitore === null ? b.tic !== a.tic + 1 : b !== a)
    return "il tic non cresce di 1 (o la partita finita si è mossa)";
  if (b.tocchi > M.tocchiMax) return `tocchi ${b.tocchi} oltre il massimo`;
  return null;
}

/** La palla non passa da un lato all'altro sotto la rete. */
function reteIntatta(a: Stato, b: Stato): string | null {
  if (sommaPunti(a) !== sommaPunti(b)) return null; // dopo un punto la palla riparte dalla battuta
  if (
    Math.sign(a.palla.x - M.reteX) !== Math.sign(b.palla.x - M.reteX) &&
    Math.max(a.palla.y, b.palla.y) < M.reteAlta
  )
    return `palla passata sotto la rete (x ${a.palla.x} -> ${b.palla.x}, y ${a.palla.y} -> ${b.palla.y})`;
  return null;
}

// ---- prove ----

describe("caso", () => {
  it("stesso seme, stessa coppia; valore in [0,1) e seme nuovo intero a 32 bit", () => {
    fc.assert(
      fc.property(seme32, (seme) => {
        const [v, nuovoSeme] = caso(seme);
        expect(caso(seme)).toEqual([v, nuovoSeme]);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
        expect(nuovoSeme | 0).toBe(nuovoSeme);
      }),
    );
  });
  it("semi diversi danno sequenze diverse", () => {
    const sequenza = (seme: number) => {
      const out: number[] = [];
      for (let i = 0; i < 8; i++) {
        const [v, nuovoSeme] = caso(seme);
        out.push(v);
        seme = nuovoSeme;
      }
      return out;
    };
    fc.assert(
      fc.property(seme32, seme32, (a, b) => {
        fc.pre(a !== b);
        expect(sequenza(a)).not.toEqual(sequenza(b));
      }),
    );
  });
});

describe("nuovaPartita", () => {
  it("parte 0-0, senza vincitore, con la palla di battuta ferma sopra la casa di chi batte", () => {
    fc.assert(
      fc.property(seme32, (seme) => {
        const s = nuova(seme);
        expect(s.punti).toEqual([0, 0]);
        expect(s.vincitore).toBeNull();
        expect(s.tic).toBe(0);
        expect(s.durata).toBe(DURATA);
        expect(s.attesa).toBe(M.attesa);
        expect(s.tocchi).toBe(0);
        expect(s.latoTocchi).toBeNull();
        expect(s.palla).toEqual({
          x: M.casa[s.battuta],
          y: M.altoBattuta,
          vx: 0,
          vy: 0,
        });
        expect(s.giocatori).toEqual([
          { x: M.casa[0], y: 0, vx: 0, vy: 0, cm: M.CM_DEFAULT, schiaccia: 0 },
          { x: M.casa[1], y: 0, vx: 0, vy: 0, cm: M.CM_DEFAULT, schiaccia: 0 },
        ]);
        expect(s.uPerCm).toBe(M.reteAlta / 224);
      }),
    );
  });
  it("su 50 semi battono entrambi i lati", () => {
    const lati = new Set(
      Array.from({ length: 50 }, (_, seme) => nuova(seme).battuta),
    );
    expect([...lati].sort()).toEqual([0, 1]);
  });
  it("stesso seme, stato identico", () => {
    fc.assert(
      fc.property(seme32, (seme) => {
        expect(nuova(seme)).toEqual(nuova(seme));
      }),
    );
  });
});

describe("passo: purezza", () => {
  it("non cambia lo stato in ingresso", () => {
    fc.assert(
      fc.property(
        seme32,
        sequenzaArb,
        fc.tuple(comandiArb, comandiArb),
        (seme, comandi, c) => {
          const s = gioca(seme, comandi);
          const prima = structuredClone(s);
          passo(s, c);
          expect(s).toEqual(prima);
        },
      ),
      { numRuns: 30 },
    );
  });
  it("a partita finita restituisce lo stesso riferimento", () => {
    const s = nuova(1);
    s.vincitore = 1;
    expect(passo(s, FERMI)).toBe(s);
    const prima = structuredClone(s);
    passo(s, [{ sx: true, dx: false, salta: true, schiaccia: true }, FERMO]);
    expect(s).toEqual(prima);
  });
});

describe("determinismo", () => {
  it("stessa partita rigiocata due volte: stessi stati finali", () => {
    fc.assert(
      fc.property(seme32, sequenzaArb, (seme, comandi) => {
        expect(gioca(seme, comandi)).toEqual(gioca(seme, comandi));
      }),
      { numRuns: 30 },
    );
  });
  it("salvare lo stato in JSON a metà partita non cambia il risultato", () => {
    fc.assert(
      fc.property(seme32, sequenzaArb, (seme, comandi) => {
        const meta = Math.floor(comandi.length / 2);
        const salvato = JSON.parse(
          JSON.stringify(gioca(seme, comandi.slice(0, meta))),
        ) as Stato;
        const ripreso = gioca(seme, comandi.slice(meta), DURATA, salvato);
        expect(ripreso).toEqual(gioca(seme, comandi));
      }),
      { numRuns: 30 },
    );
  });
});

describe("battuta", () => {
  it("per M.attesa tic la palla non si muove, poi scende", () => {
    for (let seme = 0; seme < 10; seme++) {
      let s = nuova(seme);
      const palla = { ...s.palla };
      for (let i = 0; i < M.attesa; i++) {
        s = passo(s, FERMI);
        expect(s.palla).toEqual(palla);
      }
      expect(s.attesa).toBe(0);
      s = passo(s, FERMI);
      expect(s.palla.y).toBeLessThan(palla.y);
    }
  });
  it("se nessuno la tocca il punto va all'altro lato, che batte", () => {
    for (let seme = 0; seme < 10; seme++) {
      const b = nuova(seme).battuta;
      const altro: Lato = b === 0 ? 1 : 0;
      // il battitore si scansiona verso il fondo: la palla cade sulla sua casa, non sulla sua testa
      const via: Comandi = { ...FERMO, sx: b === 0, dx: b === 1 };
      const scegli = (): Coppia => (b === 0 ? [via, FERMO] : [FERMO, via]);
      const s = finoA(nuova(seme), (st) => sommaPunti(st) > 0, 600, scegli);
      expect(s.punti[altro]).toBe(1);
      expect(s.punti[b]).toBe(0);
      expect(s.battuta).toBe(altro);
      expect(s.attesa).toBe(M.attesa);
      expect(s.vincitore).toBeNull();
    }
  });
});

describe("regole", () => {
  it("palla a terra a sinistra della rete: punto al lato 1; a destra: punto al lato 0", () => {
    for (let seme = 0; seme < 6; seme++) {
      const sx = passo(aTerra(nuova(seme), 0), FERMI);
      expect(sx.punti).toEqual([0, 1]);
      expect(sx.battuta).toBe(1);
      const dx = passo(aTerra(nuova(seme), 1), FERMI);
      expect(dx.punti).toEqual([1, 0]);
      expect(dx.battuta).toBe(0);
    }
  });

  it("il quarto tocco di fila dello stesso lato è punto per l'altro", () => {
    for (const lato of [0, 1] as const) {
      const s = sopraGiocatore(nuova(3), lato);
      s.tic = 100;
      s.ticTocco = 0;
      s.tocchi = M.tocchiMax;
      s.latoTocchi = lato;
      const dopo = passo(s, FERMI);
      expect(dopo.punti[lato === 0 ? 1 : 0]).toBe(1);
      expect(dopo.punti[lato]).toBe(0);
      expect(dopo.battuta).toBe(lato === 0 ? 1 : 0);
      expect(dopo.tocchi).toBe(0);
    }
  });

  it("il tocco entro il massimo non è punto e si conta", () => {
    for (const lato of [0, 1] as const) {
      const s = sopraGiocatore(nuova(3), lato);
      s.tic = 100;
      s.ticTocco = 0;
      s.tocchi = M.tocchiMax - 1;
      s.latoTocchi = lato;
      const dopo = passo(s, FERMI);
      expect(dopo.punti).toEqual([0, 0]);
      expect(dopo.tocchi).toBe(M.tocchiMax);
    }
  });

  it("due contatti entro M.pausaTocco tic contano un tocco solo", () => {
    let s = sopraGiocatore(nuova(5), 0);
    s.tic = 100;
    s.ticTocco = 0;
    s = passo(s, FERMI);
    expect(s.tocchi).toBe(1);
    // secondo contatto subito dopo, a mano: ancora uno
    s = sopraGiocatore(s, 0);
    s.tic = s.ticTocco + 1;
    s = passo(s, FERMI);
    expect(s.tocchi).toBe(1);
    // al limite della pausa conta ancora come lo stesso contatto...
    s = sopraGiocatore(s, 0);
    s.tic = s.ticTocco + M.pausaTocco - 1;
    expect(passo(s, FERMI).tocchi).toBe(1);
    // ...un tic dopo è un tocco nuovo
    s.tic = s.ticTocco + M.pausaTocco;
    expect(passo(s, FERMI).tocchi).toBe(2);
  });

  it("un tocco dell'altro lato riparte da 1", () => {
    const s = sopraGiocatore(nuova(5), 1);
    s.tic = 100;
    s.tocchi = 2;
    s.latoTocchi = 0;
    s.ticTocco = 99;
    const dopo = passo(s, FERMI);
    expect(dopo.latoTocchi).toBe(1);
    expect(dopo.tocchi).toBe(1);
  });

  describe("fine partita a tempo", () => {
    const D = 600; // durata breve per i test a tavolino
    /** Stato con il tempo già scaduto (tic >= durata dopo il passo) e punteggio dato. */
    const scaduto = (a: number, b: number) => {
      const s = nuova(7, D);
      s.punti = [a, b];
      s.tic = D;
      return s;
    };
    it("prima della scadenza nessun punto chiude la partita", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 30 }),
          fc.integer({ min: 0, max: 30 }),
          fc.constantFrom<Lato>(0, 1),
          (a, b, lato) => {
            const s = nuova(7, D);
            s.punti = [a, b];
            s.tic = D - 2; // dopo il passo: D - 1, ancora un tic di tempo
            const dopo = passo(aTerra(s, lato === 0 ? 1 : 0), FERMI);
            expect(dopo.punti[lato]).toBe(s.punti[lato] + 1);
            expect(dopo.vincitore).toBeNull();
            expect(dopo.battuta).toBe(lato);
          },
        ),
      );
    });
    it("a tempo scaduto con la palla in volo la partita non finisce finché lo scambio non si chiude", () => {
      let s = scaduto(5, 3);
      // palla alta sopra un tratto di campo vuoto: cade a sinistra, punto al lato 1
      s.attesa = 0;
      s.palla = { x: M.raggio + 72, y: M.altoBattuta, vx: 0, vy: 0 };
      let tic = 0;
      while (sommaPunti(s) === 8 && tic++ < 600) {
        s = passo(s, FERMI);
        if (sommaPunti(s) === 8) expect(s.vincitore).toBeNull();
      }
      expect(tic).toBeGreaterThan(1); // la palla era davvero in volo
      expect(s.punti).toEqual([5, 4]);
      expect(s.vincitore).toBe(0); // vince chi ha più punti, anche se ha segnato chi era sotto
    });
    it("a tempo scaduto un punto che lascia il punteggio diverso chiude: vince chi ha più punti", () => {
      for (const [a, b] of [
        [5, 3],
        [3, 5],
        [0, 0],
        [9, 8],
      ] as const) {
        for (const lato of [0, 1] as const) {
          const s = scaduto(a, b);
          const dopo = passo(aTerra(s, lato === 0 ? 1 : 0), FERMI);
          const p = [a, b];
          p[lato]++;
          if (p[0] === p[1]) expect(dopo.vincitore).toBeNull();
          else expect(dopo.vincitore).toBe(p[0] > p[1] ? 0 : 1);
        }
      }
    });
    it("a tempo scaduto un punto che porta in parità non chiude; il punto dopo sì", () => {
      for (const lato of [0, 1] as const) {
        const contro = lato === 0 ? 1 : 0;
        const punti: [number, number] = [0, 0];
        punti[lato] = 4; // chi segna era sotto di uno
        punti[contro] = 5;
        const parita = passo(aTerra(scaduto(...punti), contro), FERMI);
        expect(parita.punti).toEqual([5, 5]);
        expect(parita.vincitore).toBeNull();
        expect(parita.battuta).toBe(lato);
        const fine = passo(aTerra(parita, contro), FERMI);
        expect(fine.punti[lato]).toBe(6);
        expect(fine.vincitore).toBe(lato);
      }
    });
    it("proprietà: a tempo scaduto vince chi ha più punti dopo il punto, in parità si continua", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 30 }),
          fc.integer({ min: 0, max: 30 }),
          fc.constantFrom<Lato>(0, 1),
          (a, b, lato) => {
            const punti: [number, number] = [a, b];
            punti[lato]++;
            const dopo = passo(
              aTerra(scaduto(a, b), lato === 0 ? 1 : 0),
              FERMI,
            );
            expect(dopo.punti).toEqual(punti);
            expect(dopo.vincitore).toBe(
              punti[0] === punti[1] ? null : punti[0] > punti[1] ? 0 : 1,
            );
          },
        ),
      );
    });
    it("a partita chiusa il motore non si muove più", () => {
      const chiusa = passo(aTerra(scaduto(2, 0), 1), FERMI);
      expect(chiusa.vincitore).toBe(0);
      expect(passo(chiusa, FERMI)).toBe(chiusa);
    });
  });
});

describe("proprietà con comandi casuali", () => {
  it("numeri finiti, giocatori e palla nei limiti, punti e tic coerenti", () => {
    fc.assert(
      fc.property(seme32, sequenzaArb, (seme, comandi) => {
        let i = 0;
        const scegli = () => comandi[i++] ?? FERMI;
        // dopo la sequenza si lascia correre ancora un po' con comandi fermi
        const v = primaViolazione(
          nuova(seme),
          comandi.length,
          scegli,
          invarianti,
        );
        expect(v).toBeNull();
      }),
      { numRuns: 40 },
    );
  });
  it("anche con la CPU che gioca (scambi veri), le invarianti reggono", () => {
    for (let seme = 0; seme < 8; seme++) {
      const v = primaViolazione(
        nuova(seme),
        3000,
        (s) => [ia(s, 0, 20), ia(s, 1, 20)],
        invarianti,
        reteIntatta,
      );
      expect(v).toBeNull();
    }
  });
});

describe("rete", () => {
  it("la palla non passa da un lato all'altro sotto la rete (comandi casuali)", () => {
    fc.assert(
      fc.property(seme32, sequenzaArb, (seme, comandi) => {
        let i = 0;
        expect(
          primaViolazione(
            nuova(seme),
            comandi.length,
            () => comandi[i++] ?? FERMI,
            reteIntatta,
          ),
        ).toBeNull();
      }),
      { numRuns: 40 },
    );
  });
  it("palla lanciata a mano contro la rete a M.vMax: resta dal suo lato", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Lato>(0, 1),
        fc.integer({ min: M.raggio + 60, max: M.reteAlta - 1 }),
        fc.integer({ min: 0, max: 100 }), // distanza dalla rete a inizio lancio
        fc.integer({ min: -M.vMax, max: 0 }),
        (lato, y, lontano, vy) => {
          const s = libera(nuova(2));
          const dir = lato === 0 ? 1 : -1;
          s.palla = {
            x: M.reteX - dir * (M.raggio + M.reteMezza + 40 + lontano),
            y,
            vx: dir * M.vMax,
            vy,
          };
          const v = primaViolazione(s, 40, () => FERMI, reteIntatta);
          expect(v).toBeNull();
        },
      ),
    );
  });
  // Difetto trovato da queste prove il 16/11 e corretto (la rete si riapplica dopo i tocchi): il tocco di un giocatore addossato alla rete spingeva la palla oltre, da sotto.
  // Caso minimo: giocatore 0 a x = reteX-reteMezza-raggioG, palla ferma a x = reteX-raggio-reteMezza, y = centro del giocatore:
  // dopo 1 tic la palla è a x~522, y~59 (dall'altra parte, sotto reteAlta).
  it("un tocco con il giocatore addossato alla rete non porta la palla dall'altra parte da sotto", () => {
    // giocatore 0 alla sua massima x, palla appena fuori dalla fascia della rete, all'altezza del suo centro:
    // la spinta del tocco la manda lungo la linea centro-centro, oltre la rete.
    for (const lato of [0, 1] as const) {
      const s = libera(nuova(2));
      const dir = lato === 0 ? 1 : -1;
      const g = s.giocatori[lato];
      g.x = M.reteX - dir * (M.reteMezza + M.raggioG);
      s.palla = {
        x: M.reteX - dir * (M.raggio + M.reteMezza),
        y: g.y + cerchio(s, g)[0],
        vx: 0,
        vy: 0,
      };
      expect(primaViolazione(s, 5, () => FERMI, reteIntatta)).toBeNull();
    }
  });
});

describe("schiacciata", () => {
  // Riscritte il 20/11: il cerchio di tocco ora è alle mani alzate (sopra la testa), quindi le palle
  // di prova si mettono a una quota assoluta e a una distanza data dal centro del cerchio.
  const SCHIACCIA: Comandi = { ...FERMO, schiaccia: true };
  /**
   * Lato 0 in aria (piedi a gy) a x; palla ferma a quota assoluta `quota`, verso la rete, a
   * distanza `dist` dal centro del cerchio di tocco (default: dentro, a contatto).
   */
  function aTiro(x: number, quota: number, piedi?: number, dist?: number): Stato {
    const s = libera(nuova(6));
    const g = s.giocatori[0];
    const [centro, raggio] = cerchio(s, g);
    const r = dist ?? M.raggio + raggio - 5;
    const gy = piedi ?? Math.max(1, quota - centro - 0.6 * r); // palla sopra le mani, in avanti
    g.x = x;
    g.y = gy;
    g.vy = gy > 0 ? 2 : 0;
    const dy = quota - (gy + centro);
    const dx = r * r > dy * dy ? Math.sqrt(r * r - dy * dy) : 0;
    s.palla = { x: x + dx, y: quota, vx: 0, vy: 0 };
    return s;
  }
  /** Gioca fino al punto con l'altro giocatore fuori gioco; dice dove la palla tocca terra. */
  function doveCade(s: Stato, lato: Lato): number {
    s.giocatori[lato === 0 ? 1 : 0].y = 1e5; // tolto di mezzo: in aria, lontano dalla palla
    let x = s.palla.x;
    s = finoA(
      s,
      (st) => {
        if (sommaPunti(st) === 0) x = st.palla.x;
        return sommaPunti(st) > 0;
      },
      400,
    );
    expect(s.punti[lato]).toBe(1);
    return x;
  }
  /** Copia a specchio dello stato (lato 0 ↔ lato 1). */
  function specchio(s: Stato): Stato {
    const c = structuredClone(s);
    const [a, b] = c.giocatori;
    c.giocatori = [
      { ...b, x: M.largo - b.x },
      { ...a, x: M.largo - a.x },
    ];
    c.palla.x = M.largo - c.palla.x;
    c.palla.vx = -c.palla.vx;
    return c;
  }

  it("palla sopra la rete: la schiacciata parte in giù fin dal colpo, supera la rete e cade nell'altro campo", () => {
    for (const lato of [0, 1] as const)
      for (let x = 340; x <= 440; x += 20)
        for (const quota of [300, 320, 340]) {
          const base = aTiro(x, quota);
          const s0 = lato === 0 ? base : specchio(base);
          const comandi: Coppia = lato === 0 ? [SCHIACCIA, FERMO] : [FERMO, SCHIACCIA];
          const s = passo(s0, comandi);
          expect(s.giocatori[lato].schiaccia).toBe(M.durataSchiaccia);
          expect(s.palla.vy).toBeLessThan(0);
          expect(s.palla.vx * (lato === 0 ? 1 : -1)).toBeGreaterThanOrEqual(M.schiacciaVx);
          const cade = doveCade(s, lato);
          expect(lato === 0 ? cade > M.reteX : cade < M.reteX).toBe(true);
          expect(primaViolazione(s, 200, () => FERMI, reteIntatta)).toBeNull();
        }
  });
  it("da lontano la schiacciata passa comunque la rete e fa punto", () => {
    for (let x = 100; x < 340; x += 20) {
      const s = passo(aTiro(x, 300), [SCHIACCIA, FERMO]);
      expect(s.giocatori[0].schiaccia).toBe(M.durataSchiaccia);
      expect(doveCade(s, 0)).toBeGreaterThan(M.reteX);
    }
  });
  it("è più veloce e più in giù del tocco normale dallo stesso punto", () => {
    const s = passo(aTiro(400, 300), [SCHIACCIA, FERMO]);
    const t = passo(aTiro(400, 300), FERMI);
    expect(t.giocatori[0].schiaccia).toBe(0);
    expect(t.tocchi).toBe(1);
    expect(s.tocchi).toBe(1);
    expect(Math.sqrt(s.palla.vx ** 2 + s.palla.vy ** 2)).toBeGreaterThan(M.tocco);
    expect(s.palla.vy).toBeLessThan(t.palla.vy - 5);
  });
  it("palla molto sopra la rete e vicina: scende a M.schiacciaGiu", () => {
    expect(passo(aTiro(430, 500, 300), [SCHIACCIA, FERMO]).palla.vy).toBe(-M.schiacciaGiu);
  });
  it("l'animazione dura M.durataSchiaccia tic e scende fino a 0", () => {
    let s = passo(aTiro(400, 300), [SCHIACCIA, FERMO]);
    for (let i = 0; i < M.durataSchiaccia; i++) s = passo(s, FERMI);
    expect(s.giocatori[0].schiaccia).toBe(0);
  });
  it("senza comando, a terra, con la palla sotto la cima della rete o fuori tiro: niente schiacciata", () => {
    const [, raggio] = cerchio(nuova(6), nuova(6).giocatori[0]);
    const casi: [Stato, Comandi][] = [
      [aTiro(400, 300), FERMO], // senza comando: tocco normale
      [aTiro(400, M.reteAlta + 5, 0), SCHIACCIA], // a terra, palla appena sopra la rete
      [aTiro(400, M.reteAlta - 10), SCHIACCIA], // in aria, palla sotto la cima della rete
      [aTiro(400, 300, 60, M.raggio + raggio + M.margineSchiaccia + 5), SCHIACCIA], // fuori tiro
    ];
    for (const [s, c] of casi) {
      const dopo = passo(s, [c, FERMO]);
      expect(dopo.giocatori[0].schiaccia).toBe(0);
    }
    // i primi tre sono comunque tocchi normali
    for (const [s, c] of casi.slice(0, 3)) expect(passo(s, [c, FERMO]).tocchi).toBe(1);
  });
  it("premuto un filo prima vale ancora; premuto troppo prima si perde; tenuto non conta di nuovo", () => {
    for (const [anticipo, vale] of [
      [M.memoriaSchiaccia - 1, true],
      [M.memoriaSchiaccia, false],
    ] as const) {
      // si preme con la palla fuori tiro e la si porta a tiro dopo anticipo tic
      let s = aTiro(400, 300, 1e5); // in aria per tutta la prova
      s.palla = { x: 900, y: 900, vx: 0, vy: 0 };
      s.attesa = anticipo;
      s.giocatori[0].vy = 0;
      for (let i = 0; i < anticipo; i++) s = passo(s, [SCHIACCIA, FERMO]);
      const g = s.giocatori[0];
      const [centro, raggio] = cerchio(s, g);
      s.palla = { x: g.x, y: g.y + centro + raggio + M.raggio + 5, vx: 0, vy: 0 };
      s.attesa = 0;
      s = passo(s, [SCHIACCIA, FERMO]);
      expect(s.giocatori[0].schiaccia > 0).toBe(vale);
    }
  });
  it("la CPU con errore 0 schiaccia quando la palla è a tiro", () => {
    const s = aTiro(400, 300);
    s.mira = 0;
    expect(ia(s, 0, 0).schiaccia).toBe(true);
    s.giocatori[0].y = 0;
    expect(ia(s, 0, 0).schiaccia).toBe(false);
  });
  it("in partita CPU contro CPU: con errore 0 schiaccia, con errore alto molto meno", () => {
    const conta = (errore: number) => {
      let n = 0;
      for (let seme = 0; seme < 4; seme++) {
        let s = nuova(seme);
        for (let i = 0; i < 60 * HZ && s.vincitore === null; i++) {
          s = passo(s, [ia(s, 0, errore), ia(s, 1, errore)]);
          for (const g of s.giocatori) if (g.schiaccia === M.durataSchiaccia) n++;
        }
      }
      return n;
    };
    const precisa = conta(0);
    expect(precisa).toBeGreaterThan(0);
    expect(conta(80)).toBeLessThan(precisa);
  });
});

describe("Stato.tocco", () => {
  it("parte null; a ogni contatto dice tic, lato e se era una schiacciata", () => {
    const s = nuova(6);
    expect(s.tocco).toBeNull();
    for (const lato of [0, 1] as const) {
      const t = passo(sopraGiocatore(s, lato), FERMI);
      expect(t.tocco).toEqual({ tic: t.tic, lato, schiacciata: false });
    }
    // un tic senza contatti lascia il tocco di prima
    const t = passo(sopraGiocatore(s, 0), FERMI);
    expect(passo(t, FERMI).tocco).toEqual(t.tocco);
  });
  it("una schiacciata la segna come tale", () => {
    const s = libera(nuova(6));
    const g = s.giocatori[0];
    g.x = 420;
    g.y = 100;
    g.vy = 2;
    s.palla = { x: 430, y: g.y + cerchio(s, g)[0] + 40, vx: 0, vy: 0 };
    const t = passo(s, [{ ...FERMO, schiaccia: true }, FERMO]);
    expect(t.tocco).toEqual({ tic: t.tic, lato: 0, schiacciata: true });
  });
});

describe("comandi reattivi", () => {
  const SALTA: Comandi = { ...FERMO, salta: true };
  const DX: Comandi = { ...FERMO, dx: true };
  /** Partita con la palla bloccata in battuta: si provano solo i movimenti. */
  const campo = () => {
    const s = nuova(5);
    s.attesa = 10 ** 6;
    return s;
  };
  /** Tic in cui il giocatore 0 è in aria, eseguendo i comandi dati (uno per tic). */
  function ticInAria(comandi: Comandi[]): number[] {
    let s = campo();
    const su: number[] = [];
    comandi.forEach((c, i) => {
      s = passo(s, [c, FERMO]);
      if (s.giocatori[0].y > 0) su.push(i);
    });
    return su;
  }
  const LUNGO = 100;
  // salto premuto al tic 0: in aria dal tic 0 al tic atterra - 1, a terra al tic atterra
  const atterra = ticInAria([SALTA, ...Array<Comandi>(LUNGO).fill(FERMO)]).length;
  /** Salta al tic 0 e di nuovo al tic t. */
  const dueSalti = (t: number) =>
    Array.from({ length: LUNGO }, (_, i) => (i === 0 || i === t ? SALTA : FERMO));

  it("tenere salta fa un salto solo: niente rimbalzi all'atterraggio", () => {
    const su = ticInAria(Array<Comandi>(LUNGO).fill(SALTA));
    expect(su.length).toBe(atterra);
    expect(su[0]).toBe(0);
  });
  it("salto premuto poco prima di atterrare: riparte il tic dopo l'atterraggio", () => {
    for (let anticipo = 1; anticipo <= M.memoriaSalto - 2; anticipo++) {
      const su = ticInAria(dueSalti(atterra - anticipo));
      expect(su.length).toBe(2 * atterra);
      expect(su).toContain(atterra + 1);
    }
  });
  it("salto premuto troppo presto in aria si perde", () => {
    expect(ticInAria(dueSalti(atterra - (M.memoriaSalto - 1))).length).toBe(atterra);
  });
  // Niente prova del "coyote" (salto concesso pochi tic dopo aver lasciato terra): nel gioco si
  // lascia terra solo saltando, quindi non c'è un caso in cui servirebbe.
  it("partenza in 3-5 tic, frenata in 2-4, inversione senza scatti", () => {
    let s = campo();
    const vx: number[] = [];
    const via = (c: Comandi, n: number) => {
      for (let i = 0; i < n; i++) {
        s = passo(s, [c, FERMO]);
        vx.push(s.giocatori[0].vx);
      }
    };
    via(DX, 6);
    const piena = vx.indexOf(M.passoG) + 1;
    expect(piena).toBeGreaterThanOrEqual(3);
    expect(piena).toBeLessThanOrEqual(5);
    vx.length = 0;
    via(FERMO, 6);
    const ferma = vx.indexOf(0) + 1;
    expect(ferma).toBeGreaterThanOrEqual(2);
    expect(ferma).toBeLessThanOrEqual(4);
    vx.length = 0;
    via(DX, 6);
    via({ ...FERMO, sx: true }, 10);
    for (let i = 1; i < vx.length; i++)
      expect(Math.abs(vx[i] - vx[i - 1])).toBeLessThanOrEqual(M.frenaG);
    expect(vx.at(-1)).toBe(-M.passoG);
  });
  it("contro la rete il giocatore si ferma (vx a 0)", () => {
    let s = campo();
    for (let i = 0; i < 120; i++) s = passo(s, [DX, FERMO]);
    expect(s.giocatori[0].x).toBe(M.reteX - M.reteMezza - M.raggioG);
    expect(s.giocatori[0].vx).toBe(0);
  });
});

describe("altezze", () => {
  const ALTEZZE = { papa: 187, lani: 174, default: 170, leo: 135, bart: 60, lady: 25 };
  /** Quota più alta raggiunta dal centro della palla toccata da chi salta (cima del cerchio + raggio palla). */
  function cimaInSalto(cm: number): number {
    let s = libera(nuova(3, DURATA));
    s.giocatori[0].cm = cm;
    s.palla = { x: 900, y: 900, vx: 0, vy: 0 }; // lontana: non disturba
    s.attesa = 10 ** 6;
    let cima = 0;
    for (let i = 0; i < 60; i++) {
      s = passo(s, [{ ...FERMO, salta: i === 0 }, FERMO]);
      const g = s.giocatori[0];
      const [centro, raggio] = cerchio(s, g);
      cima = Math.max(cima, g.y + centro + raggio + M.raggio);
    }
    return cima;
  }
  it("il tocco è alle mani alzate: centro del cerchio vicino alla cima della testa disegnata", () => {
    // con l'attenuazione vale per chi è vicino all'altezza di default; i piccoli toccano più in alto della testa
    for (const cm of [M.CM_DEFAULT, ALTEZZE.lani, 182]) {
      const s = nuovaPartita(1, DURATA, [cm, cm]);
      const rapporto = cerchio(s, s.giocatori[0])[0] / (cm * s.uPerCm);
      expect(rapporto).toBeGreaterThanOrEqual(0.95);
      expect(rapporto).toBeLessThanOrEqual(1.05);
    }
  });
  it("il cm passa da nuovaPartita ai giocatori e resta dopo ogni battuta", () => {
    let s = nuovaPartita(1, DURATA, [ALTEZZE.lani, ALTEZZE.papa]);
    s = finoA(s, (st) => sommaPunti(st) >= 2, 2000);
    expect(s.giocatori.map((g) => g.cm)).toEqual([ALTEZZE.lani, ALTEZZE.papa]);
  });
  it("chi è più alto tocca più in alto; sotto e sopra la portata è chiusa tra i limiti", () => {
    const c = Object.fromEntries(
      Object.entries(ALTEZZE).map(([n, cm]) => [n, cimaInSalto(cm)]),
    );
    expect(c.papa).toBeGreaterThan(c.lani);
    expect(c.lani).toBeGreaterThan(c.default);
    expect(c.default).toBeGreaterThan(c.leo);
    expect(c.leo).toBeGreaterThanOrEqual(c.bart);
    expect(c.bart).toBe(c.lady); // entrambi al limite portataMin
    // l'altezza aiuta un pochino: tra papà e la gattina meno di mezza palla
    expect(c.papa - c.lady).toBeLessThan(M.raggio);
  });
  it("anche a 25 cm, saltando, si arriva a una palla appena sopra la rete", () => {
    // palla "normale sopra la rete": il suo fondo alla quota della rete
    expect(cimaInSalto(ALTEZZE.lady)).toBeGreaterThan(M.reteAlta + M.raggio);
  });
  it("da fermo, una palla appena sopra la cima del cerchio di default la prende solo il più alto", () => {
    for (const [cm, tocca] of [
      [M.CM_DEFAULT, false],
      [ALTEZZE.papa, true],
    ] as const) {
      const s = libera(nuovaPartita(4, DURATA, [cm, M.CM_DEFAULT]));
      const g = s.giocatori[0];
      s.palla = { x: g.x, y: cerchio(s, s.giocatori[1])[0] + M.raggioG + M.raggio + 2 + M.gravita, vx: 0, vy: 0 };
      expect(passo(s, FERMI).tocchi).toBe(tocca ? 1 : 0);
    }
  });
});

describe("CPU (ia)", () => {
  // dopo la scadenza servono al più uno scambio e i punti di parità: un margine largo
  const MARGINE = 3 * 60 * HZ; // gli scambi CPU contro CPU durano anche 90 secondi
  it("CPU contro CPU (errore 20 e 20) finisce entro durata + margine, per 10 semi", () => {
    for (let seme = 0; seme < 10; seme++) {
      const s = finoA(
        nuova(seme),
        (st) => st.vincitore !== null,
        DURATA + MARGINE,
        (st) => [ia(st, 0, 20), ia(st, 1, 20)],
      );
      expect(s.tic).toBeGreaterThanOrEqual(DURATA);
      const v = s.vincitore as Lato;
      expect(s.punti[v]).toBeGreaterThan(s.punti[v === 0 ? 1 : 0]);
    }
  });
  it("con errore 0 contro 80 il lato preciso vince più spesso: almeno 14 partite su 20", () => {
    let vinte = 0;
    for (let seme = 0; seme < 20; seme++) {
      const preciso: Lato = seme % 2 === 0 ? 0 : 1; // si alterna il lato per non premiare il campo
      const err = (l: Lato) => (l === preciso ? 0 : 80);
      const s = finoA(
        nuova(seme),
        (st) => st.vincitore !== null,
        DURATA + MARGINE,
        (st) => [ia(st, 0, err(0)), ia(st, 1, err(1))],
      );
      if (s.vincitore === preciso) vinte++;
    }
    expect(vinte).toBeGreaterThanOrEqual(14);
  });
  it("ia non cambia lo stato e risponde con comandi veri", () => {
    fc.assert(
      fc.property(
        seme32,
        fc.integer({ min: 0, max: 800 }),
        fc.integer({ min: 0, max: 100 }),
        (seme, n, errore) => {
          const s = finoA(
            nuova(seme),
            (st) => st.tic >= n || st.vincitore !== null,
            n + 1,
            (st) => [ia(st, 0, 20), ia(st, 1, 20)],
          );
          const prima = structuredClone(s);
          for (const lato of [0, 1] as const) {
            const c = ia(s, lato, errore);
            expect(typeof c.sx).toBe("boolean");
            expect(typeof c.dx).toBe("boolean");
            expect(typeof c.salta).toBe("boolean");
            expect(typeof c.schiaccia).toBe("boolean");
            expect(c.sx && c.dx).toBe(false);
          }
          expect(s).toEqual(prima);
        },
      ),
      { numRuns: 30 },
    );
  });
  it("durante l'attesa della battuta non salta", () => {
    for (let seme = 0; seme < 5; seme++) {
      let s = nuova(seme);
      while (s.attesa > 0) {
        for (const lato of [0, 1] as const)
          expect(ia(s, lato, 20).salta).toBe(false);
        s = passo(s, [ia(s, 0, 20), ia(s, 1, 20)]);
      }
    }
    // stato costruito: palla in discesa a portata di salto, secondo tocco; salta solo a attesa finita
    const s = nuova(1);
    s.tocchi = 1;
    s.palla = {
      x: s.giocatori[0].x,
      y: s.giocatori[0].y + cerchio(s, s.giocatori[0])[0] + 150,
      vx: 0,
      vy: -1,
    };
    s.attesa = M.attesa;
    expect(ia(s, 0, 0).salta).toBe(false);
    s.attesa = 0;
    expect(ia(s, 0, 0).salta).toBe(true);
  });
});
