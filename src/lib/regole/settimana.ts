import { CONFIG, aScuola, borsaConta, cartellaConta, chiaviSettimana, giorno as daIso, iso, rEvolutionAttiva, type SettimanaObbligatori } from './index.ts';

// La settimana in corso (23/11): le cose obbligatorie giorno per giorno, le due barre (passi e
// cose) e le chiavi che si prenderebbero adesso. Un solo calcolo per tutti: la funzione "chiavi"
// della domenica, "La mia settimana" di Lani, la striscia sopra la barra e la Settimana dei
// genitori. Così quello che Lani vede durante la settimana è quello che il server conterà.
//
// Rispetto al conteggio di prima (contaSettimana, che resta per il simulatore):
// - i compiti contano nella settimana della scadenza, anche se fatti prima;
// - una spunta stornata da un genitore non conta più (storno "motivo:riferimento");
// - la borsa conta solo prima dello sport del lunedì e del venerdì (config borsa, 23/11);
// - i dieci minuti contano al massimo per giorni_a_settimana giorni (6 su 7, 23/11).

const O = CONFIG.passi.obbligatori;

export const VOCI = ['compiti', 'cartella', 'borsa', 'ripasso', 'dieci_minuti', 'fogli'] as const;
export type VoceObbligatoria = (typeof VOCI)[number];

export const NOMI: Record<VoceObbligatoria, string> = {
  compiti: 'Compiti',
  cartella: 'Cartella',
  borsa: 'Borsa',
  ripasso: 'Ripasso',
  dieci_minuti: 'Dieci minuti',
  fogli: 'Fogli da firmare',
};

const VALORE: Record<VoceObbligatoria, number> = {
  compiti: O.compiti,
  cartella: O.cartella,
  borsa: O.borsa,
  ripasso: O.ripasso,
  dieci_minuti: O.dieci_minuti,
  fogli: O.fogli,
};

/** Motivi dei movimenti che fanno una cosa obbligatoria, voce per voce. */
const MOTIVI: Record<VoceObbligatoria, string[]> = {
  compiti: ['compito', 'compito_rifatto'],
  cartella: ['cartella'],
  borsa: ['borsa'],
  ripasso: ['ripasso'],
  dieci_minuti: ['dieci_minuti'],
  fogli: ['foglio'],
};
/** Motivi da leggere dal database per questo calcolo (con gli storni). */
export const MOTIVI_SETTIMANA = [...new Set(Object.values(MOTIVI).flat()), 'storno'];

export type MovimentoSettimana = { motivo: string; riferimento: string; passi: number };

export interface DatiSettimana {
  /** Lunedì della settimana. */
  lunedi: Date;
  /** Compiti in scadenza nella settimana. */
  compiti: { id: string; scadenza: string }[];
  /** Sessioni di ripasso previste nella settimana. */
  sessioni: { id: string; data_prevista: string }[];
  /** Fogli da firmare della settimana, col giorno in cui contano (scadenza o consegna). */
  fogli: { id: string; giorno: string }[];
  /** Giorni ('YYYY-MM-DD') con un allenamento o una partita di Lani, fino al lunedì dopo. */
  sportIl: Iterable<string>;
  /** Giorni di assenza, fino al lunedì dopo. */
  assenze: Iterable<string>;
  rEvolutionDa: string | null;
  /** Movimenti con i motivi di MOTIVI_SETTIMANA, anche di prima della settimana (compiti fatti in anticipo). */
  movimenti: MovimentoSettimana[];
  /** Note didattiche o disciplinari della settimana. */
  note: number;
  /** Oggi, per lo stato delle caselle; senza, nessuna casella è "persa". */
  oggi?: Date;
}

/** fatta, da fare, persa (il giorno è passato), jolly (dieci minuti saltati che non costano). */
export type StatoCasella = 'fatta' | 'da_fare' | 'persa' | 'jolly';
export type Casella = { giorno: string; possibili: number; fatte: number; stato: StatoCasella | null };
export type RigaSettimana = {
  voce: VoceObbligatoria;
  nome: string;
  /** Passi di una cosa di questa voce. */
  valore: number;
  caselle: Casella[];
  /** Cose possibili e fatte che contano per le chiavi (i dieci minuti fino al tetto). */
  possibili: number;
  fatte: number;
  passiPossibili: number;
  passiFatti: number;
};

export interface Settimana extends SettimanaObbligatori {
  righe: RigaSettimana[];
  /** Chiavi che si prenderebbero se la settimana finisse adesso (0..3). */
  chiavi: number;
  /** 0..100, arrotondate. */
  percentualePassi: number;
  percentualeCose: number;
  /** Passi e cose che servono per la prima e per la terza chiave. */
  sogliaPassi: number;
  sogliaCose: number;
  /** Dieci minuti: quanti contano a settimana. */
  dieciTetto: number;
}

const piu = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export function calcolaSettimana(d: DatiSettimana): Settimana {
  const giorni = Array.from({ length: 7 }, (_, i) => piu(d.lunedi, i));
  const assenze = new Set(d.assenze);
  const sport = new Set(d.sportIl);
  const oggi = d.oggi ? iso(d.oggi) : null;

  // movimenti validi: passi positivi e non stornati (lo storno ha riferimento "motivo:riferimento")
  const stornati = new Set(d.movimenti.filter((m) => m.motivo === 'storno').map((m) => m.riferimento));
  const validi = d.movimenti.filter((m) => m.motivo !== 'storno' && m.passi > 0 && !stornati.has(`${m.motivo}:${m.riferimento}`));
  /** Passi del movimento che fa la cosa (il più alto se ce n'è più d'uno, es. compito e compito rifatto). */
  const fatto = (voce: VoceObbligatoria, prova: (rif: string) => boolean): number =>
    validi.filter((m) => MOTIVI[voce].includes(m.motivo) && prova(m.riferimento)).reduce((a, m) => Math.max(a, m.passi), 0);

  // cose possibili per giorno, ciascuna con i passi presi (0 = non fatta)
  type Cosa = { giorno: string; passi: number };
  const cose: Record<VoceObbligatoria, Cosa[]> = { compiti: [], cartella: [], borsa: [], ripasso: [], dieci_minuti: [], fogli: [] };
  for (const c of d.compiti)
    if (aScuola(daIso(c.scadenza), assenze)) cose.compiti.push({ giorno: c.scadenza, passi: fatto('compiti', (r) => r === c.id) });
  for (const g of giorni) {
    const s = iso(g);
    const domani = piu(g, 1);
    if (cartellaConta(g, assenze)) cose.cartella.push({ giorno: s, passi: fatto('cartella', (r) => r === `serata:${s}`) });
    if (borsaConta(domani, sport.has(iso(domani)))) cose.borsa.push({ giorno: s, passi: fatto('borsa', (r) => r === `serata:${s}`) });
    if (rEvolutionAttiva(g, d.rEvolutionDa) && !assenze.has(s))
      cose.dieci_minuti.push({ giorno: s, passi: fatto('dieci_minuti', (r) => r === `dieci_minuti:${s}` || r.startsWith(`dieci_minuti:${s}:`)) });
  }
  for (const x of d.sessioni) if (!assenze.has(x.data_prevista)) cose.ripasso.push({ giorno: x.data_prevista, passi: fatto('ripasso', (r) => r === x.id) });
  for (const f of d.fogli) cose.fogli.push({ giorno: f.giorno, passi: fatto('fogli', (r) => r === f.id) });

  const tetto = CONFIG.dieci_minuti.giorni_a_settimana;
  const righe: RigaSettimana[] = VOCI.map((voce) => {
    const lista = cose[voce];
    const fatte = lista.filter((c) => c.passi > 0);
    // dieci minuti: per le chiavi contano fino al tetto, sia le possibili sia le fatte
    const limite = voce === 'dieci_minuti' ? tetto : Infinity;
    const possibili = Math.min(lista.length, limite);
    const contate = fatte.slice(0, limite);
    let jolly = voce === 'dieci_minuti' ? Math.max(0, lista.length - tetto) : 0;
    const caselle = giorni.map((g): Casella => {
      const s = iso(g);
      const qui = lista.filter((c) => c.giorno === s);
      const n = qui.filter((c) => c.passi > 0).length;
      let stato: StatoCasella | null = null;
      if (qui.length) {
        if (n >= qui.length) stato = 'fatta';
        else if (oggi && s < oggi) stato = jolly > 0 ? (jolly--, 'jolly') : 'persa';
        else stato = 'da_fare';
      }
      return { giorno: s, possibili: qui.length, fatte: n, stato };
    });
    return {
      voce,
      nome: NOMI[voce],
      valore: VALORE[voce],
      caselle,
      possibili,
      fatte: contate.length,
      passiPossibili: possibili * VALORE[voce],
      passiFatti: contate.reduce((a, c) => a + c.passi, 0),
    };
  });

  const conta: SettimanaObbligatori = {
    passiPossibili: righe.reduce((a, r) => a + r.passiPossibili, 0),
    passiFatti: righe.reduce((a, r) => a + r.passiFatti, 0),
    cosePossibili: righe.reduce((a, r) => a + r.possibili, 0),
    coseFatte: righe.reduce((a, r) => a + r.fatte, 0),
    note: d.note,
  };
  const pct = (a: number, b: number) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0);
  return {
    ...conta,
    righe,
    chiavi: chiaviSettimana(conta),
    percentualePassi: pct(conta.passiFatti, conta.passiPossibili),
    percentualeCose: pct(conta.coseFatte, conta.cosePossibili),
    sogliaPassi: Math.ceil(CONFIG.chiavi_settimana.soglia_passi_prima * conta.passiPossibili),
    sogliaCose: Math.ceil(CONFIG.chiavi_settimana.soglia_cose_terza * conta.cosePossibili),
    dieciTetto: tetto,
  };
}

/** Le prossime cose da fare per restare in rotta: da oggi in avanti, al massimo n. */
export function prossimeCose(s: Settimana, oggi: Date, n = 3): { voce: VoceObbligatoria; nome: string; giorno: string; quante: number }[] {
  const da = iso(oggi);
  const out: { voce: VoceObbligatoria; nome: string; giorno: string; quante: number }[] = [];
  for (const g of s.righe[0].caselle.map((c) => c.giorno).filter((g) => g >= da))
    for (const r of s.righe) {
      const c = r.caselle.find((x) => x.giorno === g);
      if (c && c.stato === 'da_fare' && out.length < n) out.push({ voce: r.voce, nome: r.nome, giorno: g, quante: c.possibili - c.fatte });
    }
  return out;
}

/**
 * La tacca di oggi delle barre (v2): dove dovrebbe essere la barra a fine giornata per restare in
 * pari, cioè le cose possibili fino a oggi (compreso) sul totale della settimana. 0..100.
 */
export function tacceDiOggi(s: Settimana, oggi: Date): { passi: number; cose: number } {
  const fino = iso(oggi);
  let passi = 0;
  let cose = 0;
  for (const r of s.righe) {
    // i dieci minuti contano fino al tetto: il cumulo non supera le possibili della riga
    const cumulo = Math.min(
      r.possibili,
      r.caselle.filter((c) => c.giorno <= fino).reduce((a, c) => a + c.possibili, 0),
    );
    cose += cumulo;
    passi += cumulo * r.valore;
  }
  const pct = (x: number, tot: number) => (tot > 0 ? Math.round((x / tot) * 100) : 0);
  return { passi: pct(passi, s.passiPossibili), cose: pct(cose, s.cosePossibili) };
}
