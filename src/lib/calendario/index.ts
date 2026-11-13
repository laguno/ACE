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
