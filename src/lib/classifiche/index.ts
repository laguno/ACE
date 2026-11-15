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

// ---------------------------------------------------------------- gare (sprint 2, regole del 15/11)
// Calendario e risultati dalla pagina pubblica risultati-classifiche.aspx dello stesso portale, con
// il filtro del campionato (il modulo "CERCA" della pagina, in GET). Niente pagine di esportazione.

export type Gara = {
  numero: number;
  giornata: number;
  inizio: string; // ISO con il fuso di Roma già applicato
  casa: string;
  ospite: string;
  set_casa: number | null;
  set_ospite: number | null;
  stato: string; // "da disputare", "risultato ufficioso", "gara omologata"
};

/** Istante di un'ora di Roma (giorno e ora come li scrive il portale), in qualsiasi fuso giri il server. */
export function istanteRoma(a: number, m: number, g: number, h: number, mi: number): Date {
  const t = Date.UTC(a, m - 1, g, h, mi);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(t))
      .map((x) => [x.type, Number(x.value)]),
  );
  const scarto = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - t;
  return new Date(t - scarto);
}

/** Gare della pagina risultati del portale; [] se la tabella non c'è. */
export function leggiGare(html: string): Gara[] {
  const tabella = html.match(/<table[^>]*tbl-risultati[\s\S]*?<\/table>/i)?.[0];
  if (!tabella) return [];
  const gare: Gara[] = [];
  for (const tr of tabella.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const c = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => testo(m[1]));
    const quando = c[2]?.match(/^(\d\d)\/(\d\d)\/(\d\d) (\d\d):(\d\d)$/);
    if (c.length < 6 || !/^\d+$/.test(c[0]) || !quando) continue;
    const [, g, m, a, h, mi] = quando.map(Number);
    const set = c[5].match(/^(\d) - (\d)$/);
    const stato = testo(tr.match(/statogara[^>]*title="([^"]*)/i)?.[1] ?? '').split('<')[0].trim().toLowerCase();
    gare.push({
      numero: Number(c[0]),
      giornata: Number(c[1]) || 0,
      inizio: istanteRoma(2000 + a, m, g, h, mi).toISOString(),
      casa: c[3],
      ospite: c[4],
      set_casa: set ? Number(set[1]) : null,
      set_ospite: set ? Number(set[2]) : null,
      stato,
    });
  }
  return gare;
}

/** La gara vista da R-Evolution: avversaria, casa o trasferta, set nostri e loro (null se da giocare). */
export function garaDi(squadra: string, g: Pick<Gara, 'casa' | 'ospite' | 'set_casa' | 'set_ospite'>) {
  const inCasa = stessaSquadra(g.casa, squadra);
  if (!inCasa && !stessaSquadra(g.ospite, squadra)) return null;
  return {
    avversaria: (inCasa ? g.ospite : g.casa).slice(0, 60),
    inCasa,
    nostri: inCasa ? g.set_casa : g.set_ospite,
    loro: inCasa ? g.set_ospite : g.set_casa,
  };
}

/** Il giorno della gara è segnato "[LANI ASSENTE]" nel calendario di famiglia. */
export const assenteDalCalendario = (titoliDelGiorno: string[]) => titoliDelGiorno.some((t) => /assente/i.test(t) && /partita/i.test(t));

const UN_GIORNO = 86_400_000;
const giornoN = (t: Date) => {
  const [a, m, g] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(t).split('-').map(Number);
  return Date.UTC(a, m - 1, g) / UN_GIORNO;
};
export const oraDiRoma = (t: Date) => new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(t);

/** "tra N giorni" per la carta della prossima partita; il giorno stesso "tra N ore". */
export function traQuanto(inizio: Date, ora: Date): string {
  const giorni = giornoN(inizio) - giornoN(ora);
  if (giorni === 1) return 'domani';
  if (giorni > 1) return `tra ${giorni} giorni`;
  const ore = Math.ceil((inizio.getTime() - ora.getTime()) / 3_600_000);
  return ore <= 1 ? 'tra poco' : `tra ${ore} ore`;
}

/** Pillola di Oggi: solo il giorno prima e il giorno stesso, prima dell'inizio; altrimenti null. */
export function pillolaPartita(inizio: Date, ora: Date): string | null {
  if (inizio <= ora) return null;
  const giorni = giornoN(inizio) - giornoN(ora);
  if (giorni === 1) return `Domani partita · ${oraDiRoma(inizio)}`;
  if (giorni === 0) return `Oggi partita · ${traQuanto(inizio, ora)}`;
  return null;
}
