// Tabellina dei passi (18/11): raccoglie dal database i fatti del giorno e i movimenti degli ultimi
// sette giorni; le voci e i conti li decide src/lib/regole/tabellina.ts (numeri dal config).
// Sola lettura. "Chi li ha dati" (dato_da) esce solo per i genitori.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import * as R from '../../../src/lib/regole/index.ts';
import * as C from '../../../src/lib/calendario/index.ts';
import * as T from '../../../src/lib/regole/tabellina.ts';

/** Giorni dello storico, oggi compreso. */
export const GIORNI_STORICO = 7;

export type Preso = { giorno: string; ora: string; testo: string; passi: number; chi?: string };
export type Tabellina = { giorno: string; voci: T.VoceTabellina[]; presi: number; disponibili: number; storico: Preso[] };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ok = <X = any>(r: { data: X | null; error: unknown }, cosa: string): X => {
  if (r.error) throw new Error(`${cosa}: ${(r.error as { message?: string }).message ?? r.error}`);
  return (r.data ?? []) as X;
};
const piu = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const COSA_GESTO: Record<string, string> = { scrivania: 'scrivania', lavastoviglie: 'lavastoviglie', letto: 'letto', vestiti: 'vestiti' };

export async function leggiTabellina(db: SupabaseClient, adesso: Date, genitore: boolean): Promise<Tabellina> {
  const g = R.giornoRoma(adesso);
  const oggi = R.iso(g);
  const dal = R.iso(piu(g, -(GIORNI_STORICO - 1)));
  const scadenza = R.iso(R.prossimoGiornoDiScuola(g));

  const [assenti, compiti, materie, impegni, fogli, sessioni, accesa, foto, movimenti, gesti, profili] = await Promise.all([
    db.from('assenze').select('giorno').gte('giorno', oggi),
    db.from('compiti').select('id, testo, scadenza, materia_id').eq('scadenza', scadenza),
    db.from('materie').select('id, nome'),
    db.from('impegni_famiglia').select('titolo, inizio').gte('inizio', `${oggi}T00:00:00+01:00`).lt('inizio', `${R.iso(piu(g, 2))}T00:00:00+01:00`),
    db.from('fogli_firma').select('id, titolo, consegnato_il').or(`consegnato_il.is.null,consegnato_il.gte.${oggi}T00:00:00+01:00`),
    db.from('sessioni_ripasso').select('id, verifica_id').eq('data_prevista', oggi),
    db.from('impostazioni').select('valore').eq('chiave', R.CHIAVE_R_EVOLUTION).maybeSingle(),
    db.from('richieste_foto').select('id, pagine, stato'),
    db.from('movimenti_passi').select('giorno, creato_il, motivo, riferimento, passi, moltiplicatore, dato_da').gte('giorno', dal).lte('giorno', oggi),
    db.from('gesti_casa').select('id, voce, data').gte('data', dal).lte('data', oggi),
    genitore ? db.from('profili').select('id, nome') : Promise.resolve({ data: [], error: null }),
  ]);

  const assenze = new Set(ok<{ giorno: string }[]>(assenti, 'assenze').map((x) => x.giorno));
  const nomeMateria = new Map(ok<{ id: string; nome: string }[]>(materie, 'materie').map((m) => [m.id, m.nome]));
  const valore = ok<{ valore: unknown } | null>(accesa, 'impostazioni')?.valore;
  const rEvolution = R.rEvolutionAttiva(g, typeof valore === 'string' ? valore : null);
  const imp = ok<{ titolo: string; inizio: string }[]>(impegni, 'impegni').map((i) => ({ ...i, giorno: R.iso(R.giornoRoma(i.inizio)) }));
  const tutti = ok<{ giorno: string; creato_il: string; motivo: string; riferimento: string; passi: number; moltiplicatore: number; dato_da: string | null }[]>(movimenti, 'movimenti');
  const diOggi = tutti.filter((m) => m.giorno === oggi);
  const gestiTutti = ok<{ id: string; voce: string; data: string }[]>(gesti, 'gesti');

  // materie dei ripassi: dalla verifica della sessione
  const ses = ok<{ id: string; verifica_id: string }[]>(sessioni, 'sessioni');
  const verifiche = ses.length ? ok<{ id: string; materia_id: string | null }[]>(await db.from('verifiche').select('id, materia_id').in('id', ses.map((s) => s.verifica_id)), 'verifiche') : [];
  const materiaVerifica = new Map(verifiche.map((v) => [v.id, v.materia_id ? (nomeMateria.get(v.materia_id) ?? null) : null]));

  // foto: le richieste aperte e quelle che hanno dato passi oggi (riferimento "id" o "id:n")
  const fotoOggi = new Set(diOggi.filter((m) => m.motivo === 'foto').map((m) => m.riferimento.split(':')[0]));
  const richieste = ok<{ id: string; pagine: string; stato: string }[]>(foto, 'foto').filter((r) => r.stato === 'aperta' || fotoOggi.has(r.id));

  const fatti: T.FattiGiorno = {
    giorno: oggi,
    compiti: ok<{ id: string; testo: string; scadenza: string; materia_id: string | null }[]>(compiti, 'compiti')
      .filter((c) => R.aScuola(R.giorno(c.scadenza), assenze))
      .map((c) => ({ id: c.id, testo: c.testo, scadenza: c.scadenza, materia: c.materia_id ? (nomeMateria.get(c.materia_id) ?? null) : null })),
    cartella: R.cartellaConta(g, assenze),
    borsa: C.serveBorsa(imp.filter((i) => i.giorno === R.iso(piu(g, 1))).map((i) => i.titolo)),
    fogli: ok<{ id: string; titolo: string }[]>(fogli, 'fogli').map((f) => ({ id: f.id, titolo: f.titolo })),
    ripassi: ses.map((s) => ({ id: s.id, materia: materiaVerifica.get(s.verifica_id) ?? null })),
    dieciMinuti: rEvolution && !assenze.has(oggi),
    foto: richieste.map((r) => ({ id: r.id, pagine: r.pagine })),
    partita: rEvolution ? (imp.find((i) => i.giorno === oggi && C.tipoImpegno(i.titolo) === 'partita') ?? null) : null,
    movimenti: diOggi,
  };
  const voci = T.vociDelGiorno(fatti, gestiTutti.filter((x) => x.data === oggi));
  const conto = T.contatore(voci, diOggi);

  // storico: dal più recente; i gesti dicono quale, i compiti la materia
  const voceGesto = new Map(gestiTutti.map((x) => [x.id, COSA_GESTO[x.voce] ?? x.voce]));
  const refCompiti = [...new Set(tutti.filter((m) => m.motivo.startsWith('compito')).map((m) => m.riferimento))];
  const materiaCompito = new Map<string, string | null>();
  if (refCompiti.length)
    for (const c of ok<{ id: string; materia_id: string | null }[]>(await db.from('compiti').select('id, materia_id').in('id', refCompiti), 'compiti'))
      materiaCompito.set(c.id, c.materia_id ? (nomeMateria.get(c.materia_id) ?? null) : null);
  const nomi = new Map(ok<{ id: string; nome: string }[]>(profili, 'profili').map((p) => [p.id, p.nome]));

  const storico: Preso[] = [...tutti]
    .sort((a, b) => (a.creato_il < b.creato_il ? 1 : -1))
    .map((m) => {
      const dettaglio = m.motivo === 'gesto' ? voceGesto.get(m.riferimento) : m.motivo.startsWith('compito') ? materiaCompito.get(m.riferimento) : null;
      const p: Preso = {
        giorno: m.giorno,
        ora: C.oraRoma(m.creato_il),
        testo: dettaglio ? `${T.motivoInParole(m.motivo)}: ${dettaglio}` : T.motivoInParole(m.motivo),
        passi: Math.round(m.passi * m.moltiplicatore),
      };
      if (genitore && m.dato_da) p.chi = nomi.get(m.dato_da) ?? 'Genitore';
      return p;
    });

  return { giorno: oggi, voci, presi: conto.presi, disponibili: conto.disponibili, storico };
}
