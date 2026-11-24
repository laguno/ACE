import config from "../../../data/config-trick.json" with { type: "json" };

// Carta 4 dei dieci minuti, "Palla al muro: trick" (PROTOTIPO, 24/11, solo ACE Prova): regole pure della
// sessione. Durate e testi in data/config-trick.json. La fase si calcola dai secondi passati dall'avvio,
// così il timer resta giusto anche se il telefono spegne lo schermo o mette l'app in sottofondo.

export const TRICK_CONFIG = config;
export type Trick = (typeof config.trick)[number];
export type ConfigTrick = typeof config;

export type Fase =
  | { tipo: "riscaldamento"; da: number; a: number }
  | { tipo: "lavoro"; da: number; a: number; blocco: number }
  | { tipo: "pausa"; da: number; a: number; blocco: number }
  | { tipo: "record"; da: number; a: number };

/** La scaletta: riscaldamento, poi per ogni blocco lavoro e pausa, poi il minuto del record. */
export function scaletta(d: ConfigTrick["durate"] = config.durate): Fase[] {
  const fasi: Fase[] = [{ tipo: "riscaldamento", da: 0, a: d.riscaldamento }];
  let t = d.riscaldamento;
  for (let blocco = 0; blocco < d.blocchi; blocco++) {
    fasi.push({ tipo: "lavoro", da: t, a: (t += d.lavoro), blocco });
    fasi.push({ tipo: "pausa", da: t, a: (t += d.pausa), blocco });
  }
  fasi.push({ tipo: "record", da: t, a: t + d.record });
  return fasi;
}

export const durataTotale = (fasi: Fase[]) => fasi.at(-1)?.a ?? 0;

/** La fase in corso dopo `secondi` dall'avvio, con i secondi che mancano alla sua fine; null a sessione finita. */
export function faseA(
  fasi: Fase[],
  secondi: number,
): { fase: Fase; mancano: number } | null {
  const fase = fasi.find((f) => secondi >= f.da && secondi < f.a);
  return fase ? { fase, mancano: Math.ceil(fase.a - secondi) } : null;
}

/** `n` trick diversi in ordine casuale (Fisher-Yates); `caso` restituisce un numero in [0, 1). */
export function pescaTrick<T>(
  tutti: readonly T[],
  n: number,
  caso: () => number = Math.random,
): T[] {
  const mazzo = [...tutti];
  for (let i = mazzo.length - 1; i > 0; i--) {
    const j = Math.floor(caso() * (i + 1));
    [mazzo[i], mazzo[j]] = [mazzo[j], mazzo[i]];
  }
  return mazzo.slice(0, n);
}

/** Il trick del record finale: uno a caso fra quelli della sessione. */
export const trickDelRecord = <T>(
  sessione: readonly T[],
  caso: () => number = Math.random,
): T => sessione[Math.floor(caso() * sessione.length)];

/**
 * Il trick sullo schermo: nel lavoro quello del blocco; nella pausa (e negli ultimi secondi del riscaldamento,
 * lunghi quanto una pausa) quello che arriva, così la prima volta c'è il tempo di leggere "Come si fa".
 */
export function trickInVista<T>(
  fase: Fase,
  mancano: number,
  sessione: readonly T[],
  d = config.durate,
): { trick: T; prossimo: boolean } | null {
  if (fase.tipo === "lavoro")
    return { trick: sessione[fase.blocco], prossimo: false };
  if (fase.tipo === "pausa")
    return fase.blocco + 1 < sessione.length
      ? { trick: sessione[fase.blocco + 1], prossimo: true }
      : null;
  if (fase.tipo === "riscaldamento" && mancano <= d.pausa)
    return { trick: sessione[0], prossimo: true };
  return null;
}

export type Segnale = "conto" | "cambio" | "avviso" | null;

/**
 * Cosa si sente quando comincia il secondo `mancano` di una fase: "3, 2, 1" (vibrazione corta) negli ultimi
 * secondi di ogni fase prima del record, "cambio" (vibrazione lunga) al primo secondo di ogni fase dopo la
 * prima, "ancora 10 secondi" nel lavoro.
 */
export function segnale(
  fase: Fase,
  mancano: number,
  d = config.durate,
): Segnale {
  if (fase.da > 0 && mancano === fase.a - fase.da) return "cambio";
  if (fase.tipo !== "record" && mancano <= d.conto_alla_rovescia)
    return "conto";
  if (fase.tipo === "lavoro" && mancano === d.avviso) return "avviso";
  return null;
}

/** Il fumetto dell'allenatore. */
export function fumetto(
  fase: Fase | null,
  mancano: number,
  f = config.fumetti,
  d = config.durate,
): string {
  if (!fase) return f.fine;
  if (fase.tipo !== "record" && mancano <= d.conto_alla_rovescia)
    return f.cambio;
  if (fase.tipo === "lavoro" && mancano <= d.avviso) return f.avviso;
  return f[fase.tipo];
}

/** Record: si festeggia solo quando batte quello salvato (il primo si salva e basta). */
export function esitoRecord(
  migliore: number | undefined,
  n: number,
): "battuto" | "primo" | "resta" {
  if (migliore === undefined) return "primo";
  return n > migliore ? "battuto" : "resta";
}
