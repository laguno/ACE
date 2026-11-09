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

/** "HH:MM" ± minuti. */
export function sposta(ora: string, minuti: number): string {
  const [h, m] = ora.split(':').map(Number);
  const t = h * 60 + m + minuti;
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
    .find((o) => o >= '17:00');
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
