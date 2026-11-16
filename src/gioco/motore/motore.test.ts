// Prove del motore della pallavolo: funzioni pure, quindi si provano a tavolino e a proprietà.
// Numeri sempre da M; le palle e i giocatori "a mano" partono da nuovaPartita e si ritoccano.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  FERMO,
  M,
  caso,
  ia,
  nuovaPartita,
  passo,
  type Comandi,
  type Lato,
  type Stato,
} from "./index";

type Coppia = readonly [Comandi, Comandi];

const PUNTI = 15;
const FERMI: Coppia = [FERMO, FERMO];
const seme32 = fc.integer({ min: -(2 ** 31), max: 2 ** 31 - 1 });
const comandiArb = fc.record({
  sx: fc.boolean(),
  dx: fc.boolean(),
  salta: fc.boolean(),
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

const nuova = (seme: number, puntiSet = PUNTI) => nuovaPartita(seme, puntiSet);

/** Rigioca una partita: seme + comandi, uno per tic. */
function gioca(
  seme: number,
  comandi: readonly Coppia[],
  puntiSet = PUNTI,
  da: Stato = nuova(seme, puntiSet),
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
    y: g.y + M.centroG + M.raggio + M.raggioG - 10,
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
        expect(s.puntiSet).toBe(PUNTI);
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
          { x: M.casa[0], y: 0, vx: 0, vy: 0 },
          { x: M.casa[1], y: 0, vx: 0, vy: 0 },
        ]);
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
    passo(s, [{ sx: true, dx: false, salta: true }, FERMO]);
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
        const ripreso = gioca(seme, comandi.slice(meta), PUNTI, salvato);
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
      const via: Comandi = { sx: b === 0, dx: b === 1, salta: false };
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

  describe("fine set (puntiSet 3)", () => {
    const P = 3;
    const conPunti = (a: number, b: number) => {
      const s = nuova(7, P);
      s.punti = [a, b];
      return s;
    };
    it("a puntiSet-1 pari il punto successivo non chiude: serve lo scarto di 2", () => {
      for (const lato of [0, 1] as const) {
        const s = passo(
          aTerra(conPunti(P - 1, P - 1), lato === 0 ? 1 : 0),
          FERMI,
        );
        expect(s.punti[lato]).toBe(P);
        expect(s.vincitore).toBeNull();
        expect(s.battuta).toBe(lato);
      }
    });
    it("con scarto 2 chiude, e vince chi ha segnato", () => {
      for (const lato of [0, 1] as const) {
        const contro = lato === 0 ? 1 : 0;
        const punti: [number, number] = [0, 0];
        punti[lato] = P - 1;
        punti[contro] = P - 3;
        const chiude = passo(aTerra(conPunti(...punti), contro), FERMI);
        expect(chiude.vincitore).toBe(lato);
        // dopo il vantaggio (P, P-1) un altro punto chiude
        punti[lato] = P;
        punti[contro] = P - 1;
        expect(passo(aTerra(conPunti(...punti), contro), FERMI).vincitore).toBe(
          lato,
        );
      }
    });
    it("proprietà: il set si chiude solo con puntiSet e due di scarto (oltre il puntiSet si va ai vantaggi)", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: PUNTI }),
          fc.integer({ min: 0, max: 30 }),
          fc.integer({ min: 0, max: 30 }),
          fc.constantFrom<Lato>(0, 1),
          (puntiSet, a, b, lato) => {
            const punti: [number, number] = [a, b];
            const contro = lato === 0 ? 1 : 0;
            fc.pre(
              !punti.some((x, i) => x >= puntiSet && x - punti[1 - i] >= 2),
            ); // stato già chiuso: non raggiungibile
            const s = nuova(9, puntiSet);
            s.punti = punti;
            const dopo = passo(aTerra(s, contro), FERMI);
            const n = punti[lato] + 1;
            const chiude = n >= puntiSet && n - punti[contro] >= 2;
            expect(dopo.punti[lato]).toBe(n);
            expect(dopo.vincitore).toBe(chiude ? lato : null);
            if (!chiude) expect(dopo.battuta).toBe(lato);
          },
        ),
      );
    });
    it("a partita chiusa il motore non si muove più", () => {
      const chiusa = passo(aTerra(conPunti(P - 1, 0), 1), FERMI);
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
  it(
    "un tocco con il giocatore addossato alla rete non porta la palla dall'altra parte da sotto",
    () => {
      // giocatore 0 alla sua massima x, palla appena fuori dalla fascia della rete, all'altezza del suo centro:
      // la spinta del tocco la manda lungo la linea centro-centro, oltre la rete.
      for (const lato of [0, 1] as const) {
        const s = libera(nuova(2));
        const dir = lato === 0 ? 1 : -1;
        const g = s.giocatori[lato];
        g.x = M.reteX - dir * (M.reteMezza + M.raggioG);
        s.palla = {
          x: M.reteX - dir * (M.raggio + M.reteMezza),
          y: g.y + M.centroG,
          vx: 0,
          vy: 0,
        };
        expect(primaViolazione(s, 5, () => FERMI, reteIntatta)).toBeNull();
      }
    },
  );
});

describe("CPU (ia)", () => {
  it("CPU contro CPU (errore 20 e 20) finisce entro 200000 tic, per 10 semi", () => {
    for (let seme = 0; seme < 10; seme++) {
      const s = finoA(
        nuova(seme),
        (st) => st.vincitore !== null,
        200000,
        (st) => [ia(st, 0, 20), ia(st, 1, 20)],
      );
      expect(s.vincitore).not.toBeNull();
      expect(Math.max(...s.punti)).toBeGreaterThanOrEqual(PUNTI);
    }
  });
  it("con errore 0 contro 80 il lato preciso vince almeno 15 partite su 20", () => {
    let vinte = 0;
    for (let seme = 0; seme < 20; seme++) {
      const preciso: Lato = seme % 2 === 0 ? 0 : 1; // si alterna il lato per non premiare il campo
      const err = (l: Lato) => (l === preciso ? 0 : 80);
      const s = finoA(
        nuova(seme),
        (st) => st.vincitore !== null,
        200000,
        (st) => [ia(st, 0, err(0)), ia(st, 1, err(1))],
      );
      if (s.vincitore === preciso) vinte++;
    }
    expect(vinte).toBeGreaterThanOrEqual(15);
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
      y: s.giocatori[0].y + M.centroG + 150,
      vx: 0,
      vy: -1,
    };
    s.attesa = M.attesa;
    expect(ia(s, 0, 0).salta).toBe(false);
    s.attesa = 0;
    expect(ia(s, 0, 0).salta).toBe(true);
  });
});
