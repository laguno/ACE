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
