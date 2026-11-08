// Normalizzazione dei dati di Nuvola (api-studente/v1), funzioni pure: le usa sync-nuvola.
// Forme delle risposte mappate l'8 novembre 2026 dal pannello di rete.

export type Riga = Record<string, unknown>;

/** 'ARTE E IMMAGINE' -> 'arte_e_immagine', "ATTIVITA' PERSONALIZZATA" -> 'attivita_personalizzata'. */
export function materiaId(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

// Abbreviazioni del copione per le notifiche; le altre materie tengono il nome.
const ABBREVIAZIONI: Record<string, string> = {
  italiano: 'Ita',
  matematica: 'Mate',
  tecnologia: 'Tecno',
  educazione_fisica: 'Ed. fisica',
  educazione_civica: 'Ed. civica',
  arte_e_immagine: 'Arte',
};

export function materia(nome: string) {
  const id = materiaId(nome);
  const bello = nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase();
  return { id, nome: bello, abbreviazione: ABBREVIAZIONI[id] ?? bello };
}

/** '2026-11-10T00:00:00+01:00' -> '2026-11-10' (la data è già quella italiana). */
export const giorno = (s: string) => s.slice(0, 10);

/** '7½' -> 7.5, '6+' -> 6.25, '7-' -> 6.75, '8' -> 8; giudizi ('Buono') -> null. */
export function votoNumero(s: string): number | null {
  const m = s.trim().replace(',', '.').match(/^(\d+(?:\.\d+)?)\s*(½)?\s*([+-])?$/);
  if (!m) return null;
  const v = Number(m[1]) + (m[2] ? 0.5 : 0) + (m[3] === '+' ? 0.25 : m[3] === '-' ? -0.25 : 0);
  return v >= 0 && v <= 10 ? v : null;
}

export function tipoNota(tipologia: string): 'disciplinare' | 'didattica' | 'merito' | 'altro' {
  const t = tipologia.toLowerCase();
  if (t.includes('disciplinar')) return 'disciplinare';
  if (t.includes('didattic')) return 'didattica';
  if (t.includes('merito')) return 'merito';
  return 'altro';
}

/** Un evento di classe è una verifica se Nuvola lo dice o se il nome lo dice (molte sono "Avviso"). */
export function eVerifica(e: { tipo: string; nome: string }): boolean {
  return /^(verifica|compito in classe)$/i.test(e.tipo) || /verific|interrogaz|\bprova\b/i.test(e.nome);
}

// Ordine voluto: "storia della musica" è musica, non storia.
const PAROLE: [RegExp, string][] = [
  [/musica/i, 'musica'],
  [/\barte\b|immagine/i, 'arte_e_immagine'],
  [/tecnolog/i, 'tecnologia'],
  [/scienz/i, 'scienze'],
  [/geografi/i, 'geografia'],
  [/storia/i, 'storia'],
  [/aritmetic|geometri|algebr|matematic/i, 'matematica'],
  [/grammatic|letteratur|antologi|italian|epica|testo narrativo/i, 'italiano'],
  [/ingles|english/i, 'inglese'],
  [/spagnol/i, 'spagnolo'],
  [/educazione fisica|ed\. fisica/i, 'educazione_fisica'],
  [/civica/i, 'educazione_civica'],
];

/**
 * Gli eventi di classe non hanno la materia: prima la si cerca nel nome, poi dal docente se insegna
 * una materia sola (mappa costruita da compiti e lezioni). Se resta ambigua, null.
 */
export function materiaEvento(nome: string, docente: string | null, docenti: Map<string, Set<string>>): string | null {
  for (const [re, id] of PAROLE) if (re.test(nome)) return id;
  const sue = docente ? docenti.get(docente) : undefined;
  return sue?.size === 1 ? [...sue][0] : null;
}

export function mappaDocenti(righe: { docente?: string; materia?: string }[]): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  for (const r of righe) {
    if (!r.docente || !r.materia) continue;
    if (!m.has(r.docente)) m.set(r.docente, new Set());
    m.get(r.docente)!.add(materiaId(r.materia));
  }
  return m;
}

// ---------------------------------------------------------------- righe per il database

type CompitoNuvola = {
  materia: string;
  idArgomento: number;
  dataAssegnazione: string;
  dataConsegna: string;
  descrizioneCompito: string[];
};

/**
 * I compiti non hanno id: la chiave è la lezione in cui sono stati dati più la consegna, così se
 * il docente corregge il testo la riga (e la spunta di Lani) resta la stessa.
 */
export function compiti(valori: CompitoNuvola[]) {
  const visti = new Map<string, number>();
  return valori.map((c) => {
    const base = `${c.idArgomento}-${giorno(c.dataConsegna)}`;
    const n = visti.get(base) ?? 0;
    visti.set(base, n + 1);
    return {
      nuvola_id: n ? `${base}-${n}` : base,
      materia_id: materiaId(c.materia),
      testo: c.descrizioneCompito.join('\n').trim(),
      assegnato_il: giorno(c.dataAssegnazione),
      scadenza: giorno(c.dataConsegna),
    };
  });
}

type EventoNuvola = { id: number; tipo: string; nome: string; descrizione: string | null; dataInizio: string; docente: string | null };

export function verifiche(valori: EventoNuvola[], docenti: Map<string, Set<string>>) {
  return valori.filter(eVerifica).map((e) => ({
    nuvola_id: String(e.id),
    materia_id: materiaEvento(e.nome, e.docente, docenti),
    tipo: /interrogaz/i.test(e.nome) ? ('interrogazione' as const) : ('verifica' as const),
    data: giorno(e.dataInizio),
    argomento: [e.nome, e.descrizione].filter(Boolean).join('\n'),
  }));
}

type MateriaVoti = { materia: string; voti: { data: string; valutazione: string }[] };

/** I voti non hanno id: materia + giorno + posizione nel giorno. Giudizi senza numero saltati. */
export function voti(valori: MateriaVoti[]) {
  return valori.flatMap((m) => {
    const id = materiaId(m.materia);
    const visti = new Map<string, number>();
    return m.voti.flatMap((v) => {
      const g = giorno(v.data);
      const n = visti.get(g) ?? 0;
      visti.set(g, n + 1);
      const voto = votoNumero(v.valutazione);
      return voto === null ? [] : [{ nuvola_id: `${id}-${g}-${n}`, materia_id: id, data: g, voto }];
    });
  });
}

type NotaNuvola = { id: number; data: string; tipologia: string; descrizione: string | null; materia?: string | null };

export function note(valori: NotaNuvola[]) {
  return valori.map((n) => ({
    nuvola_id: String(n.id),
    data: giorno(n.data),
    tipo: tipoNota(n.tipologia),
    testo: n.descrizione,
    materia_id: n.materia ? materiaId(n.materia) : null,
  }));
}

type GiornoLezioni = {
  ore: { numeroOra: number; giorno: string; argomenti: { id: number; materia: string; nomeArgomento: string | null }[] }[];
};

export function lezioni(valori: GiornoLezioni[]) {
  return valori.flatMap((v) =>
    v.ore.flatMap((o) =>
      o.argomenti.map((a) => ({
        nuvola_id: `${a.id}-${o.numeroOra}`, // un argomento può durare due ore
        data: giorno(o.giorno),
        ora: o.numeroOra,
        materia_id: materiaId(a.materia),
        argomento: a.nomeArgomento,
      })),
    ),
  );
}

/**
 * Orario di un giorno della settimana (0 = domenica) ricavato dalle lezioni registrate: l'ultimo
 * giorno uguale che ha lezioni, materie in ordine di ora, senza ripetizioni.
 * ponytail: supplenze e uscite cambiano quel giorno; se serve, prendere la materia più frequente per ora.
 */
export function materieDelGiorno<T extends { data: string; ora: number; materia_id: string | null }>(
  righe: T[],
  giornoSettimana: number,
): string[] {
  const dow = (s: string) => new Date(s + 'T12:00:00Z').getUTCDay();
  const date = righe.map((r) => r.data).filter((d) => dow(d) === giornoSettimana);
  if (!date.length) return [];
  const ultima = date.reduce((a, b) => (a > b ? a : b));
  const ids = righe
    .filter((r) => r.data === ultima && r.materia_id)
    .sort((a, b) => a.ora - b.ora)
    .map((r) => r.materia_id!);
  return [...new Set(ids)];
}

/**
 * Quanto è lungo un compito, a occhio: pagine e esercizi negli intervalli ("pag 340-352",
 * "es 1-8") più i numeri singoli. Serve solo a mettere il più lungo per primo.
 * ponytail: stima grezza sul testo; se sbaglia spesso, chiedere a Lani una stima di minuti.
 */
export function peso(testo: string): number {
  let p = 0;
  const senzaIntervalli = testo.replace(/(\d+)\s*[-–]\s*(\d+)/g, (_, a, b) => {
    p += Math.max(1, Number(b) - Number(a) + 1);
    return ' ';
  });
  p += (senzaIntervalli.match(/\d+/g) ?? []).length;
  return p + testo.length / 200;
}
