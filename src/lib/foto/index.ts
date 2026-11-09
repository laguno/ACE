// Foto delle pagine: le scelte che non dipendono dal browser (misure, tipi, errori), con le prove.
// Il disegno sulla tela sta in src/Foto.tsx; le prove con immagini vere in e2e/foto-file.e2e.ts.

/** Lato lungo della foto caricata: basta per leggere una pagina, pesa poco. */
const LATO_MAX = 1600;
/** Come il bucket foto-pagine (migrazione 0024): oltre, lo Storage rifiuta. */
export const PESO_MAX = 10 * 1024 * 1024;
/** I tipi che il bucket accetta. */
const TIPI_BUCKET = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/** Misure dopo il rimpicciolimento: lato lungo al massimo LATO_MAX, mai ingrandire. */
export function misure(larghezza: number, altezza: number): { larghezza: number; altezza: number } {
  const k = Math.min(1, LATO_MAX / Math.max(larghezza, altezza));
  return { larghezza: Math.max(1, Math.round(larghezza * k)), altezza: Math.max(1, Math.round(altezza * k)) };
}

/** Tipo del file originale: dal browser o, se manca (HEIC su Windows), dall'estensione. */
export function tipoOriginale(f: { name: string; type: string }): string {
  if (f.type) return f.type.toLowerCase();
  const est = f.name.toLowerCase().split('.').pop();
  return est === 'heic' || est === 'heif' ? `image/${est}` : '';
}

export type ErroreFoto = 'non-immagine' | 'troppo-grande' | 'rete' | 'altro';

/** Testi per chi carica (Lani o un genitore), mostrati come "Foto non caricata. Riprova.". */
export const MESSAGGI: Record<ErroreFoto, string> = {
  'non-immagine': 'Questo file non è una foto.',
  'troppo-grande': 'Foto troppo grande: massimo 10 MB.',
  rete: 'Niente rete. Riprova quando torna.',
  altro: 'Foto non caricata. Riprova.',
};

export type Pronta = { blob: Blob; tipo: string; estensione: string };

/**
 * Cosa si carica di un file scelto. jpeg = la foto rimpicciolita (null se il browser non l'ha
 * aperta). Se non si apre ma è di un tipo che il bucket accetta (es. HEIC su Chrome) si carica
 * l'originale; altrimenti non è una foto. Oltre 10 MB lo Storage la rifiuterebbe: si dice prima.
 */
export function scegli(file: Blob & { name: string }, jpeg: Blob | null): Pronta | ErroreFoto {
  const tipo = jpeg ? 'image/jpeg' : tipoOriginale(file);
  if (!TIPI_BUCKET.includes(tipo)) return 'non-immagine';
  const blob = jpeg ?? file;
  if (blob.size > PESO_MAX) return 'troppo-grande';
  // nel multipart dello Storage conta il tipo del Blob: se manca, lo Storage la rifiuta
  return { blob: blob.type === tipo ? blob : new Blob([blob], { type: tipo }), tipo, estensione: tipo === 'image/jpeg' ? 'jpg' : tipo.slice(6) };
}

/** Che cosa è andato storto durante il caricamento (errori di supabase-js o di fetch). */
export function erroreDi(e: unknown, inLinea: boolean): ErroreFoto {
  if (!inLinea) return 'rete';
  const x = e as { message?: unknown; statusCode?: unknown; status?: unknown; originalError?: unknown } | null;
  if (String(x?.statusCode ?? x?.status ?? '') === '413') return 'troppo-grande';
  // Chrome "Failed to fetch", Safari "Load failed", Firefox "NetworkError"
  const testo = `${String(x?.message ?? '')} ${String((x?.originalError as { message?: unknown } | undefined)?.message ?? '')}`;
  return /failed to fetch|load failed|networkerror/i.test(testo) ? 'rete' : 'altro';
}
