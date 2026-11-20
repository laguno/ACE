// Foto delle pagine: le scelte che non dipendono dal browser (misure, tipi, errori), con le prove.
// Il disegno sulla tela sta in src/Foto.tsx; le prove con immagini vere in e2e/foto-file.e2e.ts.
import { pagine as estraiPagine } from '../nuvola';

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

/**
 * Carica un file nello Storage riportando i byte inviati (fetch non dà l'avanzamento, XHR sì).
 * Stesso endpoint di supabase-js (corpo grezzo + tipo): le regole del bucket valgono uguale.
 */
export function caricaConAvanzamento(
  { url, chiave, gettone, bucket, percorso, blob, tipo }: { url: string; chiave: string; gettone: string; bucket: string; percorso: string; blob: Blob; tipo: string },
  inviati: (byte: number) => void,
): Promise<void> {
  return new Promise((risolvi, rifiuta) => {
    const x = new XMLHttpRequest();
    x.open('POST', `${url}/storage/v1/object/${bucket}/${percorso.split('/').map(encodeURIComponent).join('/')}`);
    x.setRequestHeader('Authorization', `Bearer ${gettone}`);
    x.setRequestHeader('apikey', chiave);
    x.setRequestHeader('Content-Type', tipo);
    x.setRequestHeader('x-upsert', 'false');
    x.upload.onprogress = (e) => inviati(e.lengthComputable ? e.loaded : 0);
    x.onload = () => {
      if (x.status >= 200 && x.status < 300) return risolvi();
      rifiuta(Object.assign(new Error(`storage ${x.status}`), { statusCode: x.status }));
    };
    x.onerror = () => rifiuta(new Error('Failed to fetch'));
    x.ontimeout = () => rifiuta(new Error('Failed to fetch'));
    x.send(blob);
  });
}

/** Percentuale intera 0–100 (mai 100 prima della fine: lo dà il chiamante). */
export const percentuale = (fatti: number, totale: number) => (totale > 0 ? Math.min(99, Math.floor((fatti / totale) * 100)) : 0);

/** Numeri di pagina di un testo ("100, 107", "110–112", "pag. 4-16"): ogni intervallo si espande, niente doppioni. */
export function numeriPagine(testo: string | null | undefined): number[] {
  const fuori = new Set<number>();
  for (const [, da, a] of (testo ?? '').matchAll(/(\d+)(?:\s*[-–]\s*(\d+))?/g)) {
    const x = Number(da);
    const y = a ? Number(a) : x;
    if (y >= x && y - x <= 200) for (let n = x; n <= y; n++) fuori.add(n);
  }
  return [...fuori].sort((p, q) => p - q);
}

/** Pagine chieste che nessuna foto mostra ancora. */
export const pagineMancanti = (chieste: string | null, viste: (string | null)[]): number[] => {
  const fatte = new Set(viste.flatMap(numeriPagine));
  return numeriPagine(chieste).filter((n) => !fatte.has(n));
};

/** Pagine da avere: quelle della richiesta più quelle della prova in arrivo (Nuvola: "pag. 100-107, 110-117"). */
export const pagineAttese = (richiesta: string | null, daProva: string | null): string =>
  [richiesta, estraiPagine(daProva ?? '')].filter(Boolean).join(', ');

/** Numeri di pagina come intervalli leggibili: [4,5,6,10,11,13] → "4–6, 10–11, 13". */
export function intervalli(numeri: number[]): string {
  const fuori: string[] = [];
  const ord = [...new Set(numeri)].sort((a, b) => a - b);
  for (let i = 0; i < ord.length; ) {
    let j = i;
    while (ord[j + 1] === ord[j] + 1) j++;
    fuori.push(j === i ? String(ord[i]) : `${ord[i]}–${ord[j]}`);
    i = j + 1;
  }
  return fuori.join(', ');
}

type RichiestaGruppo = { id: string; materia_id: string | null; pagine: string; stato: string };

/**
 * Foto nell'Oggi dei genitori (restyling del 20/11, scelta del signore): una riga per materia con le richieste
 * ancora utili (aperte, o della materia di una prova in arrivo); le altre vanno in archivio, una per richiesta.
 * La riga usa la richiesta aperta più recente (se non c'è, la più recente) e chiede le pagine di tutte più quelle della prova.
 * `lista` dalla più recente; `prove`: materia → pagine probabili della prossima prova.
 */
export function fotoPerMateria<R extends RichiestaGruppo>(lista: R[], prove: Map<string, string>) {
  const gruppi = new Map<string, R[]>();
  const archivio: R[] = [];
  for (const r of lista) {
    if (r.stato !== 'aperta' && !(r.materia_id && prove.has(r.materia_id))) archivio.push(r);
    else gruppi.set(r.materia_id ?? r.id, [...(gruppi.get(r.materia_id ?? r.id) ?? []), r]);
  }
  const righe = [...gruppi.values()].map((g) => ({
    richiesta: g.find((r) => r.stato === 'aperta') ?? g[0],
    ids: g.map((r) => r.id),
    attese: intervalli(numeriPagine(pagineAttese(g.map((r) => r.pagine).join(', '), g[0].materia_id ? (prove.get(g[0].materia_id) ?? null) : null))),
  }));
  return { righe, archivio };
}
