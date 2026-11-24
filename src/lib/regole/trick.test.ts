import { describe, expect, it } from "vitest";
import {
  TRICK_CONFIG,
  durataTotale,
  esitoRecord,
  faseA,
  fumetto,
  pescaTrick,
  scaletta,
  segnale,
  trickDelRecord,
  trickInVista,
} from "./trick.ts";

const D = TRICK_CONFIG.durate;
const fasi = scaletta();

describe("carta 4: scaletta della sessione", () => {
  it('1 minuto di riscaldamento, 8 blocchi da 40" + 20", 1 minuto di record: dieci minuti', () => {
    expect(fasi).toHaveLength(1 + 2 * D.blocchi + 1);
    expect(fasi[0]).toEqual({ tipo: "riscaldamento", da: 0, a: 60 });
    expect(fasi[1]).toEqual({ tipo: "lavoro", da: 60, a: 100, blocco: 0 });
    expect(fasi[2]).toEqual({ tipo: "pausa", da: 100, a: 120, blocco: 0 });
    expect(fasi.at(-1)).toEqual({ tipo: "record", da: 540, a: 600 });
    expect(durataTotale(fasi)).toBe(600);
  });

  it("la fase si calcola dai secondi passati (anche dopo lo schermo spento)", () => {
    expect(faseA(fasi, 0)).toEqual({ fase: fasi[0], mancano: 60 });
    expect(faseA(fasi, 59.2)?.mancano).toBe(1);
    expect(faseA(fasi, 60)?.fase).toMatchObject({ tipo: "lavoro", blocco: 0 });
    expect(faseA(fasi, 305)?.fase).toMatchObject({ tipo: "lavoro", blocco: 4 });
    expect(faseA(fasi, 599.9)?.fase.tipo).toBe("record");
    expect(faseA(fasi, 600)).toBeNull();
    expect(faseA(fasi, 9999)).toBeNull();
  });

  it("le durate vengono dal config", () => {
    const corte = scaletta({
      ...D,
      riscaldamento: 10,
      blocchi: 2,
      lavoro: 5,
      pausa: 3,
      record: 7,
    });
    expect(durataTotale(corte)).toBe(10 + 2 * 8 + 7);
  });
});

describe("carta 4: trick della sessione", () => {
  const ids = TRICK_CONFIG.trick.map((t) => t.id);

  it('nove trick, nomi di al massimo quattro parole, tre righe di "Come si fa"', () => {
    expect(ids).toHaveLength(9);
    for (const t of [...TRICK_CONFIG.trick, ...TRICK_CONFIG.riscaldamento])
      expect(t.nome.split(/\s+/).length).toBeLessThanOrEqual(4);
    for (const t of TRICK_CONFIG.trick) expect(t.come).toHaveLength(3);
  });

  it("8 diversi dei 9, senza ripetizioni, in ordine casuale", () => {
    const viste = new Set<string>();
    for (let s = 1; s <= 200; s++) {
      let x = s;
      const caso = () => (x = (x * 16807) % 2147483647) / 2147483647;
      const sessione = pescaTrick(ids, D.blocchi, caso);
      expect(sessione).toHaveLength(8);
      expect(new Set(sessione).size).toBe(8);
      for (const id of sessione) expect(ids).toContain(id);
      viste.add(sessione.join());
    }
    expect(viste.size).toBeGreaterThan(150);
  });

  it("non cambia il mazzo di partenza", () => {
    const copia = [...ids];
    pescaTrick(ids, 8);
    expect(ids).toEqual(copia);
  });

  it("il record è su uno dei trick della sessione", () => {
    const sessione = ["a", "b", "c"];
    expect(trickDelRecord(sessione, () => 0)).toBe("a");
    expect(trickDelRecord(sessione, () => 0.99)).toBe("c");
  });

  it("sullo schermo: il trick del blocco nel lavoro, il prossimo nella pausa e alla fine del riscaldamento", () => {
    const s = ["a", "b", "c", "d", "e", "f", "g", "h"];
    expect(trickInVista(fasi[0], 60, s)).toBeNull();
    expect(trickInVista(fasi[0], 20, s)).toEqual({
      trick: "a",
      prossimo: true,
    });
    expect(trickInVista(fasi[1], 40, s)).toEqual({
      trick: "a",
      prossimo: false,
    });
    expect(trickInVista(fasi[2], 20, s)).toEqual({
      trick: "b",
      prossimo: true,
    });
    expect(trickInVista(fasi[16], 20, s)).toBeNull(); // pausa dopo l'ultimo blocco
    expect(trickInVista(fasi[17], 60, s)).toBeNull(); // record: lo sceglie la schermata
  });
});

describe("carta 4: segnali e fumetti", () => {
  it('"3, 2, 1" alla fine di ogni fase, "cambio" all\'inizio della successiva, avviso a 10" dalla fine del lavoro', () => {
    const lavoro = fasi[1];
    expect(segnale(fasi[0], 60)).toBeNull();
    expect(segnale(fasi[0], 3)).toBe("conto");
    expect(segnale(fasi[0], 1)).toBe("conto");
    expect(segnale(lavoro, 40)).toBe("cambio");
    expect(segnale(lavoro, 10)).toBe("avviso");
    expect(segnale(lavoro, 11)).toBeNull();
    expect(segnale(fasi[2], 20)).toBe("cambio");
    expect(segnale(fasi[2], 10)).toBeNull();
    expect(segnale(fasi[17], 60)).toBe("cambio");
    expect(segnale(fasi[17], 2)).toBeNull();
  });

  it("il fumetto è breve e segue la fase", () => {
    expect(fumetto(fasi[1], 30)).toBe("Vai, tocchi puliti!");
    expect(fumetto(fasi[1], 10)).toBe("Ancora 10 secondi!");
    expect(fumetto(fasi[1], 3)).toBe("3, 2, 1… cambio!");
    expect(fumetto(fasi[2], 15)).toBe("Respira. Ora tocca a questo.");
    expect(fumetto(null, 0)).toBe("Dieci minuti fatti. Bel lavoro.");
    for (const t of Object.values(TRICK_CONFIG.fumetti))
      expect(t.split(/\s+/).length).toBeLessThanOrEqual(8);
  });
});

describe("carta 4: record", () => {
  it("si festeggia solo quando batte quello salvato", () => {
    expect(esitoRecord(undefined, 12)).toBe("primo");
    expect(esitoRecord(12, 13)).toBe("battuto");
    expect(esitoRecord(12, 12)).toBe("resta");
    expect(esitoRecord(12, 3)).toBe("resta");
  });
});
