import { CONFIG, passiCompito, giorno as daIso, type VoceGesto } from './index.ts';

// Tabellina dei passi (18/11): cosa si può prendere oggi e cosa si è già preso.
// Funzioni pure: i fatti del giorno li raccoglie la Edge Function "tabellina" dal database, qui si
// decidono solo le voci e i conti. Ogni numero arriva dal config (prova in tabellina.test.ts).
// Fonti scelte dal signore il 18/11: le cose di ogni giorno, lo studio in più, i gesti di casa
// (una riga per gesto) e la partita del giorno. Voti, note, enigma e malus non si "fanno" a
// comando: compaiono solo tra i passi presi.

const P = CONFIG.passi;

type Gruppo = 'ogni-giorno' | 'studio' | 'casa' | 'partita';

export type VoceTabellina = {
  id: string;
  gruppo: Gruppo;
  testo: string;
  /** Cosa fare per prenderli, in parole di casa. */
  come: string;
  /** Passi che la voce vale al massimo oggi. */
  valore: number;
  /** Passi già presi con questa voce oggi. */
  presi: number;
  /** Dove si fa: la schermata di Lani e, se c'è, il punto da mostrare. */
  dove: Dove;
};

export type Dove = { schermata: 'Oggi' | 'Studio' | 'Sera' | 'R-Evolution' | 'Regole'; ancora?: string };

/** Dove si fa una voce, dal suo id. */
function doveSiFa(id: string): Dove {
  const tipo = id.split(':')[0];
  switch (tipo) {
    case 'compito':
      return { schermata: 'Oggi', ancora: 'compiti' };
    case 'foto':
      return { schermata: 'Oggi', ancora: 'foto' };
    case 'dieci_minuti':
      return { schermata: 'Oggi', ancora: 'dieci-minuti' };
    case 'foglio':
      return { schermata: 'Oggi' };
    case 'cartella':
    case 'borsa':
      return { schermata: 'Sera' };
    case 'ripasso':
      return { schermata: 'Studio' };
    case 'flashcard':
    case 'video':
    case 'quiz':
      return { schermata: 'Studio' };
    case 'partita':
      return { schermata: 'R-Evolution' };
    default:
      return { schermata: 'Regole', ancora: 'blocco-casa' };
  }
}

export type Movimento = { motivo: string; riferimento: string; passi: number };

export type FattiGiorno = {
  /** Giorno di Roma, 'AAAA-MM-GG'. */
  giorno: string;
  /** Compiti per il prossimo giorno di scuola (giorni di assenza già tolti). */
  compiti: { id: string; testo: string; materia: string | null; scadenza: string }[];
  /** Stasera la cartella conta (domani scuola, niente assenza). */
  cartella: boolean;
  /** Stasera la borsa conta (domani allenamento o partita). */
  borsa: boolean;
  fogli: { id: string; titolo: string }[];
  ripassi: { id: string; materia: string | null }[];
  /** R-Evolution accesa e Lani non assente. */
  dieciMinuti: boolean;
  /** Richieste di foto aperte o fatte oggi. */
  foto: { id: string; pagine: string }[];
  /** Partita di Lani oggi (con R-Evolution accesa). */
  partita: { titolo: string } | null;
  /** Movimenti del giorno (storni compresi). */
  movimenti: Movimento[];
};

const COSA_GESTO: Record<VoceGesto, string> = {
  scrivania: 'Scrivania in ordine',
  lavastoviglie: 'Lavastoviglie',
  letto: 'Letto fatto',
  vestiti: 'Vestiti in ordine',
};

/** Movimenti positivi rimasti (senza storno), per chiave "motivo|riferimento". */
function rimasti(movimenti: Movimento[]): Map<string, number> {
  const stornati = new Set(movimenti.filter((m) => m.motivo === 'storno').map((m) => m.riferimento));
  const m = new Map<string, number>();
  for (const x of movimenti)
    if (x.passi > 0 && x.motivo !== 'storno' && !stornati.has(`${x.motivo}:${x.riferimento}`))
      m.set(`${x.motivo}|${x.riferimento}`, (m.get(`${x.motivo}|${x.riferimento}`) ?? 0) + x.passi);
  return m;
}

/** Le voci della tabellina di un giorno, nell'ordine in cui le vede Lani. */
export function vociDelGiorno(f: FattiGiorno, gesti: { voce: string; id: string }[] = []): VoceTabellina[] {
  const r = rimasti(f.movimenti);
  const preso = (motivo: string, rif: string) => r.get(`${motivo}|${rif}`) ?? 0;
  const conPrefisso = (motivo: string, prefisso: string) =>
    [...r].filter(([k]) => k.startsWith(`${motivo}|${prefisso}`)).reduce((a, [, n]) => a + n, 0);
  const o = P.obbligatori;
  const g = daIso(f.giorno);
  const voci: Omit<VoceTabellina, 'dove'>[] = [];

  for (const c of f.compiti) {
    const presi = preso('compito', c.id) + preso('compito_rifatto', c.id);
    voci.push({
      id: `compito:${c.id}`,
      gruppo: 'ogni-giorno',
      testo: c.materia ? `Compiti di ${c.materia}` : 'Compiti per domani',
      come: 'Fai i compiti e spuntali in Pomeriggio',
      valore: presi || passiCompito(daIso(c.scadenza), g),
      presi,
    });
  }
  if (f.cartella)
    voci.push({ id: 'cartella', gruppo: 'ogni-giorno', testo: 'Cartella pronta', come: 'Preparala stasera e spuntala in Sera', valore: o.cartella, presi: preso('cartella', `serata:${f.giorno}`) });
  if (f.borsa)
    voci.push({ id: 'borsa', gruppo: 'ogni-giorno', testo: 'Borsa pronta', come: 'Preparala stasera per domani', valore: o.borsa, presi: preso('borsa', `serata:${f.giorno}`) });
  for (const x of f.fogli)
    voci.push({ id: `foglio:${x.id}`, gruppo: 'ogni-giorno', testo: x.titolo, come: 'Fallo firmare e consegnalo', valore: o.fogli, presi: preso('foglio', x.id) });
  for (const x of f.ripassi)
    voci.push({ id: `ripasso:${x.id}`, gruppo: 'ogni-giorno', testo: x.materia ? `Ripasso di ${x.materia}` : 'Ripasso', come: 'Fai il ripasso in Studio', valore: o.ripasso, presi: preso('ripasso', x.id) });
  if (f.dieciMinuti)
    voci.push({ id: 'dieci_minuti', gruppo: 'ogni-giorno', testo: 'Dieci minuti di allenamento', come: `Fai il timer fino in fondo, dalle ${CONFIG.dieci_minuti.finestra.da} alle ${CONFIG.dieci_minuti.finestra.a}`, valore: o.dieci_minuti, presi: preso('dieci_minuti', `dieci_minuti:${f.giorno}`) });
  for (const x of f.foto)
    voci.push({ id: `foto:${x.id}`, gruppo: 'ogni-giorno', testo: `Foto delle pagine ${x.pagine}`, come: 'Fotografa le pagine che ACE ti chiede', valore: P.foto_compito, presi: conPrefisso('foto', x.id) });

  // studio in più: un giro vale sempre uguale, il quiz al massimo quanto il primo tentativo
  const s = P.studio_facoltativo;
  const quizMassimo = Object.values(s.quiz.tentativi)[0][0];
  const studio: [string, string, string, number][] = [
    ['flashcard', 'Giri di flash card', 'Gira le carte in Studio, dopo i compiti', s.flashcard_giro],
    ['video', 'Video fino in fondo', 'Guarda un video in Studio, dopo i compiti', s.video_completo],
    ['quiz', 'Quiz', 'Fai un quiz in Studio, dopo i compiti', quizMassimo],
  ];
  for (const [tipo, testo, come, uno] of studio)
    voci.push({ id: tipo, gruppo: 'studio', testo: `${testo} (fino a ${s.max_al_giorno_per_tipo})`, come, valore: uno * s.max_al_giorno_per_tipo, presi: conPrefisso(tipo, `${tipo}:${f.giorno}:`) });

  // gesti di casa: una riga per gesto; li segnano mamma e papà quando li notano
  for (const [voce, n] of Object.entries(P.gesti_casa.voci) as [VoceGesto, number][]) {
    const presi = gesti.filter((x) => x.voce === voce).reduce((a, x) => a + preso('gesto', x.id), 0);
    voci.push({ id: `gesto:${voce}`, gruppo: 'casa', testo: COSA_GESTO[voce] ?? voce, come: 'Fallo: mamma o papà lo segnano quando lo vedono', valore: n, presi });
  }

  if (f.partita) {
    const presi = [...r].filter(([k]) => k.startsWith('partita|') || k.startsWith('partita_vinta|')).reduce((a, [, n]) => a + n, 0);
    voci.push({ id: 'partita', gruppo: 'partita', testo: 'Partita di oggi', come: 'Gioca e rispondi a "Com\'è andata?"', valore: Math.max(presi, P.partite.giocata + P.partite.vinta_in_piu), presi });
  }
  return voci.map((v) => ({ ...v, dove: doveSiFa(v.id) }));
}

/** Motivi che le voci del giorno contano già: il resto (voti, enigma...) sono passi in più. */
const MOTIVI_DELLE_VOCI = new Set(['compito', 'compito_rifatto', 'cartella', 'borsa', 'foglio', 'ripasso', 'dieci_minuti', 'foto', 'flashcard', 'video', 'quiz', 'gesto', 'partita', 'partita_vinta']);

/**
 * Il contatore: "Oggi hai preso {presi} passi su {disponibili} disponibili".
 * I gesti di casa contano al massimo fino al tetto del giorno. I passi in più arrivati oggi (un
 * voto, l'enigma) si aggiungono a tutti e due i numeri; i passi tolti (storni, malus) non entrano.
 */
export function contatore(voci: VoceTabellina[], movimenti: Movimento[]): { presi: number; disponibili: number } {
  const casa = voci.filter((v) => v.gruppo === 'casa');
  const altre = voci.filter((v) => v.gruppo !== 'casa');
  const tetto = P.gesti_casa.tetto_giornaliero;
  const r = rimasti(movimenti);
  const extra = [...r].filter(([k]) => !MOTIVI_DELLE_VOCI.has(k.split('|')[0])).reduce((a, [, n]) => a + n, 0);
  const somma = (vv: VoceTabellina[], k: 'valore' | 'presi') => vv.reduce((a, v) => a + v[k], 0);
  return {
    presi: somma(altre, 'presi') + Math.min(tetto, somma(casa, 'presi')) + extra,
    disponibili: somma(altre, 'valore') + Math.min(tetto, somma(casa, 'valore')) + extra,
  };
}

const MOTIVI: Record<string, string> = {
  compito: 'Compiti fatti',
  compito_rifatto: 'Compiti rifatti',
  cartella: 'Cartella pronta',
  borsa: 'Borsa pronta',
  foglio: 'Foglio consegnato',
  ripasso: 'Ripasso',
  dieci_minuti: 'Dieci minuti',
  foto: 'Foto delle pagine',
  flashcard: 'Giro di flash card',
  video: 'Video visto',
  quiz: 'Quiz',
  gesto: 'Gesto di casa',
  partita: 'Partita',
  partita_vinta: 'Partita vinta',
  enigma: 'Enigma risolto',
  voto: 'Voto',
  voto_migliorato: 'Voto migliorato',
  voto_recupero: 'Sufficienza dopo un’insufficienza',
  voto_corretto: 'Voto corretto',
  nota_merito: 'Nota di merito',
  nota_disciplinare: 'Nota disciplinare',
  nota_terza_dimenticanza: 'Tre note per dimenticanza',
  sgridata: 'Passi tolti',
  storno: 'Spunta tolta',
};

/** Il motivo di un movimento in parole di casa. */
export function motivoInParole(motivo: string): string {
  return MOTIVI[motivo] ?? (motivo.startsWith('pagella') ? 'Pagella' : 'Passi');
}
