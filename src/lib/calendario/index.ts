// Impegni del calendario di famiglia: funzioni pure su titolo e orario.
// Titoli visti l'8 novembre 2026: "Allenamento Pallavolo Leilani U-13", "Partita Lani: ...",
// "[LANI ASSENTE] Partita U13: ...", "Tennis Leonardo".

export type TipoImpegno = 'allenamento' | 'partita' | 'famiglia';

/** Allenamento o partita di Lani (non quelli in cui è segnata assente); il resto è famiglia. */
export function tipoImpegno(titolo: string): TipoImpegno {
  if (!/\b(lani|leilani)\b/i.test(titolo) || /assente/i.test(titolo)) return 'famiglia';
  if (/partita/i.test(titolo)) return 'partita';
  if (/allenament/i.test(titolo)) return 'allenamento';
  return 'famiglia';
}

/**
 * Avversaria dal titolo di una partita del calendario di famiglia, scritto come
 * "Partita Lani U13: CASA vs OSPITI": la squadra che non è R-Evolution. null se il titolo non torna.
 */
export function avversariaDelTitolo(titolo: string): string | null {
  const m = /:\s*(.+?)\s+vs\.?\s+(.+?)\s*$/i.exec(titolo);
  if (!m) return null;
  const noi = (s: string) => /r-?evolut/i.test(s);
  if (noi(m[1]) === noi(m[2])) return null;
  return (noi(m[1]) ? m[2] : m[1]).slice(0, 60);
}

/** Borsa pronta: la sera prima di un allenamento o di una partita di Lani (docs/02). */
export function serveBorsa(titoliDiDomani: string[]): boolean {
  return titoliDiDomani.some((t) => tipoImpegno(t) !== 'famiglia');
}

/** Ora italiana "HH:MM" di un istante. */
export function oraRoma(istante: string): string {
  return new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' }).format(
    new Date(istante),
  );
}

/** "HH:MM" ± minuti, sull'orologio di 24 ore (23:50 + 30 = 00:20). */
export function sposta(ora: string, minuti: number): string {
  const [h, m] = ora.split(':').map(Number);
  const t = (((h * 60 + m + minuti) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/**
 * Ora della chiusura serale (docs/01): quella base del giorno (impostazioni), ma se Lani ha un
 * allenamento o una partita che inizia dopo le 17, si chiude mezz'ora prima di uscire (martedì
 * 18:30 -> 18:00, partita del giovedì). Senza base (venerdì, sabato) niente chiusura, salvo una
 * partita il giorno dopo: allora chiusura breve (solo la borsa) all'ora "breve" (decisione 8/11).
 */
export function oraChiusura(
  base: string | null,
  impegniDiOggi: { titolo: string; inizio: string }[],
  breve: string | null = null,
): string | null {
  base ??= breve;
  if (!base) return null; // venerdì e sabato senza partita il giorno dopo: niente chiusura, neanche con lo sport
  const tardi = impegniDiOggi
    .filter((i) => tipoImpegno(i.titolo) !== 'famiglia')
    .map((i) => oraRoma(i.inizio))
    .sort()
    .find((o) => o >= '17:00'); // il primo impegno della sera, anche se nel calendario viene dopo
  if (tardi) return sposta(tardi, -30);
  return base;
}

/** Su quale momento si apre l'app: mattina fino alle 14, sera da un'ora prima della chiusura. */
export function momento(ora: string, chiusura: string | null): 'mattina' | 'pomeriggio' | 'sera' {
  if (ora < '14:00') return 'mattina';
  if (chiusura && ora >= sposta(chiusura, -60)) return 'sera';
  return 'pomeriggio';
}

/** C'è una partita di Lani tra questi impegni (per la chiusura breve del venerdì e del sabato). */
export const partitaTra = (impegni: { titolo: string }[]) => impegni.some((i) => tipoImpegno(i.titolo) === 'partita');

/** Il prossimo orario della lista dopo "adesso" (ora di Roma), o il primo di domani: "oggi alle 19:30". */
export function prossimo(orari: string[], adesso = new Date()): string {
  const ora = oraRoma(adesso.toISOString());
  const ordinati = [...orari].sort();
  const dopo = ordinati.find((o) => o > ora);
  return dopo ? `oggi alle ${dopo}` : `domani alle ${ordinati[0]}`;
}

// ---------------------------------------------------------------- silenzio delle notifiche (blocco G, 19/11)

/** Impegno con l'orario per il silenzio: inizio, fine se il calendario la dà, giornata intera. */
export type ImpegnoOrario = { titolo: string; inizio: string; fine?: string | null; tutto_il_giorno?: boolean | null };

/** Numeri del silenzio, da data/config-gioco.json (notifiche): qui non se ne scrive nessuno. */
export type RegoleSilenzio = {
  silenzio_lani_dalle: string;
  passo_cron_minuti: number;
  sollecito_dopo_minuti: number;
  allenamento_tardo_dalle: string;
  sport: { margine_prima_minuti: number; margine_dopo_minuti: number; durata_allenamento_minuti: number; durata_partita_minuti: number };
};

const inMinuti = (o: string) => {
  const [h, m] = o.split(':').map(Number);
  return h * 60 + m;
};
/** Minuti del giorno in "HH:MM", fermi tra 00:00 e 24:00 (24:00 = fino a fine giornata, non torna a mezzanotte). */
const inOra = (t: number) => {
  const x = Math.min(1440, Math.max(0, Math.round(t)));
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
};

/**
 * Fasce "Lani in campo" del giorno (ora di Roma), ordinate: allenamenti e partite di Lani (anche le
 * righe FIPAV "fipav:", che hanno "Lani" nel titolo), dal margine prima dell'inizio alla fine più il
 * margine dopo. Senza fine si usa la durata del config. Giornata intera: tutto il giorno.
 */
export function fasceInCampo(impegni: ImpegnoOrario[], s: RegoleSilenzio): { da: string; a: string }[] {
  return impegni
    .filter((i) => tipoImpegno(i.titolo) !== 'famiglia')
    .map((i) => {
      if (i.tutto_il_giorno) return { da: '00:00', a: '24:00' };
      const inizio = inMinuti(oraRoma(i.inizio));
      const durata = i.fine
        ? Math.max(0, (Date.parse(i.fine) - Date.parse(i.inizio)) / 60000)
        : tipoImpegno(i.titolo) === 'partita'
          ? s.sport.durata_partita_minuti
          : s.sport.durata_allenamento_minuti;
      return { da: inOra(inizio - s.sport.margine_prima_minuti), a: inOra(inizio + durata + s.sport.margine_dopo_minuti) };
    })
    .sort((x, y) => (x.da < y.da ? -1 : x.da > y.da ? 1 : 0));
}

/**
 * Ora vera di una notifica a Lani prevista alle "previsto": se Lani è in campo si sposta alla fine
 * della fascia (anche di più fasce di fila); null se così si arriva al silenzio della sera (21:00).
 */
export function orarioNotifica(previsto: string, fasce: { da: string; a: string }[], s: RegoleSilenzio): string | null {
  let t = previsto;
  for (let mosso = true; mosso; ) {
    mosso = false;
    for (const f of fasce)
      if (t >= f.da && t < f.a) {
        t = f.a;
        mosso = true;
      }
  }
  return t < s.silenzio_lani_dalle ? t : null;
}

/**
 * Ora del sollecito: i minuti del config dopo la chiusura, spostato se Lani è in campo. Se così
 * cadrebbe nel silenzio, si anticipa all'ultimo giro del cron prima delle 21:00, purché venga dopo
 * la chiusura e Lani non sia in campo; se no niente sollecito (voce provvisoria del 19/11).
 */
export function orarioSollecito(chiusura: string, fasce: { da: string; a: string }[], s: RegoleSilenzio): string | null {
  const dopo = inMinuti(chiusura) + s.sollecito_dopo_minuti;
  const t = dopo < 1440 ? orarioNotifica(inOra(dopo), fasce, s) : null;
  if (t) return t;
  const ultimo = inOra(inMinuti(s.silenzio_lani_dalle) - s.passo_cron_minuti);
  return ultimo > chiusura && orarioNotifica(ultimo, fasce, s) === ultimo ? ultimo : null;
}

/**
 * La sera di questo impegno è piena, niente ripasso serale: una partita di Lani, o un suo
 * allenamento che inizia dall'ora del config (17:00, come la chiusura anticipata). Provvisorio (19/11).
 */
export function seraPiena(i: ImpegnoOrario, s: Pick<RegoleSilenzio, 'allenamento_tardo_dalle'>): boolean {
  const tipo = tipoImpegno(i.titolo);
  if (tipo === 'partita') return true;
  return tipo === 'allenamento' && !i.tutto_il_giorno && oraRoma(i.inizio) >= s.allenamento_tardo_dalle;
}
