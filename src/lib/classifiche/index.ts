// Classifiche dei campionati di Lani dal portale FIPAV Reggio Emilia (pagina pubblica
// classifica.aspx?CId=...). La legge la Edge Function "classifiche" una volta al giorno; qui solo
// il conto dalla pagina alle righe, senza rete, così si prova con vitest.
// ponytail: legge la tabella "tbl-classifica" com'è oggi; se il portale cambia pagina, la funzione
// fallisce e i genitori lo vedono in Stato (sync_log), la classifica resta quella dell'ultima volta.

export type RigaClassifica = {
  pos: number;
  squadra: string;
  punti: number;
  giocate: number;
  vinte: number;
  perse: number;
  set_fatti: number;
  set_subiti: number;
};

const ENTITA: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', rsquo: '’', lsquo: '‘', deg: '°', agrave: 'à', egrave: 'è', eacute: 'é', igrave: 'ì', ograve: 'ò', ugrave: 'ù' };

const testo = (html: string) =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (e, n) => ENTITA[n.toLowerCase()] ?? e)
    .replace(/\s+/g, ' ')
    .trim();

/** Righe della classifica dalla pagina del portale; [] se la tabella non c'è. */
export function leggiClassifica(html: string): RigaClassifica[] {
  const tabella = html.match(/<table[^>]*tbl-classifica[\s\S]*?<\/table>/i)?.[0];
  if (!tabella) return [];
  const righe: RigaClassifica[] = [];
  for (const tr of tabella.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const c = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => testo(m[1]));
    if (c.length < 8 || !/^\d+$/.test(c[0])) continue;
    const n = (i: number) => Number(c[i]) || 0;
    righe.push({ pos: n(0), squadra: c[1], punti: n(2), giocate: n(3), vinte: n(4), perse: n(5), set_fatti: n(6), set_subiti: n(7) });
  }
  return righe;
}

/** Stessa squadra anche se il portale cambia maiuscole o spazi ("VOLLEY SCANDIANO  ROSSA"). */
export const stessaSquadra = (a: string, b: string) => a.replace(/\s+/g, ' ').trim().toUpperCase() === b.replace(/\s+/g, ' ').trim().toUpperCase();
