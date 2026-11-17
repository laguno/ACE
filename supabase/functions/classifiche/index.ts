// Edge Function "classifiche" (sprint 2): legge dal portale FIPAV Reggio Emilia le classifiche dei
// campionati di Lani (config classifiche.campionati) e le copia in classifiche; dal 15/11 legge anche
// calendario e risultati delle gare (gare_fipav). Pagine pubbliche, nessun segreto.
// La chiamano il cron (alle 6:15 tutto; ogni mezz'ora con {"solo":"partite"}) o un genitore.
// Col risultato ufficiale di una partita a cui Lani è convocata (calendario di famiglia) crea la
// partita e accoda "Com'è andata?": la risposta di Lani fa i passi, senza genitori (docs/08).
import { apriRegistro, dbServizio } from '../_shared/ambiente.ts';
import { avvisaSeFallita } from '../_shared/push.ts';
import { accoda } from '../_shared/popup.ts';
import { chiChiama, cronOGenitore, leggiCorpo } from '../_shared/accesso.ts';
import * as R from '../../../src/lib/regole/index.ts';
import * as Cal from '../../../src/lib/calendario/index.ts';
import { garaDi, leggiClassifica, leggiGare, riassuntoClassifica, type Gara, type RigaClassifica } from '../../../src/lib/classifiche/index.ts';

const db = dbServizio();
const C = R.CONFIG.classifiche;
type Campionato = (typeof C.campionati)[number];

const autorizzato = async (req: Request) => cronOGenitore(await chiChiama(db, req, Deno.env.get('CRON_SEGRETO')));

const risposta = (corpo: unknown, stato = 200) =>
  new Response(JSON.stringify(corpo), { status: stato, headers: { 'Content-Type': 'application/json' } });

const ORA = 3_600_000;
const giornoDi = (istante: string) => R.iso(R.giornoRoma(istante));

async function pagina(url: string, nome: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${nome}: portale ${r.status}`);
  return r.text();
}

/** Campionati con una partita di R-Evolution oggi, iniziata da almeno 2 ore e ancora senza risultato. */
async function daLeggereOra(): Promise<Campionato[]> {
  const adesso = Date.now();
  const { data, error } = await db
    .from('gare_fipav')
    .select('cid, inizio, casa, ospite, set_casa, set_ospite')
    .is('set_casa', null)
    .gte('inizio', new Date(adesso - 24 * ORA).toISOString())
    .lte('inizio', new Date(adesso - C.prima_lettura_dopo_ore * ORA).toISOString());
  if (error) throw new Error(`gare_fipav: ${error.message}`);
  const oggi = R.iso(R.giornoRoma(new Date()));
  return C.campionati.filter((c) =>
    (data ?? []).some((g) => g.cid === c.cid && giornoDi(g.inizio) === oggi && garaDi(c.squadra, g)),
  );
}

/** Titoli del calendario di famiglia nel giorno di Roma. */
async function titoliDel(giorno: string): Promise<string[]> {
  const dopo = new Date(R.giorno(giorno));
  dopo.setDate(dopo.getDate() + 1);
  // ponytail: giorno di Roma approssimato con +01:00 (come borsaServe): le partite non sono a mezzanotte
  const { data, error } = await db
    .from('impegni_famiglia')
    .select('titolo')
    .gte('inizio', `${giorno}T00:00:00+01:00`)
    .lt('inizio', `${R.iso(dopo)}T00:00:00+01:00`);
  if (error) throw new Error(`impegni_famiglia: ${error.message}`);
  return (data ?? []).map((x) => x.titolo);
}

/** Risultato ufficiale arrivato: partita nuova e popup per Lani. Restituisce cosa ha fatto. */
async function risultato(c: Campionato, g: Gara, righe: RigaClassifica[]): Promise<string | null> {
  const x = garaDi(c.squadra, g);
  if (!x || x.nostri === null || x.loro === null || x.nostri === x.loro) return null;
  const giorno = giornoDi(g.inizio);
  // dal 17/11 il risultato arriva solo dalla FIPAV: uno pubblicato in ritardo si prende ancora per
  // risultato_entro_giorni (config); più vecchio no, Lani non saprebbe più rispondere
  const limite = R.giornoRoma(new Date());
  limite.setDate(limite.getDate() - C.risultato_entro_giorni);
  if (giorno < R.iso(limite)) return null;
  // prima dell'inizio del gioco niente popup (accoda): la partita resterebbe senza risposta
  if (giorno < R.CONFIG.periodo.inizio) return null;

  const { data: gia } = await db.from('partite').select('id').eq('gara_cid', c.cid).eq('gara', g.numero).maybeSingle();
  if (gia) return null;
  // convocata: una partita di Lani nel calendario quel giorno ("[LANI ASSENTE]" non conta)
  // ponytail: non guarda quale squadra dice il titolo; due partite di Lani nello stesso giorno non capitano
  if (!(await titoliDel(giorno)).some((t) => Cal.tipoImpegno(t) === 'partita')) return 'non convocata';
  // segnata a mano da Lani prima del risultato: si lega alla gara, niente doppione né popup
  const { data: aMano, error: e1 } = await db.from('partite').select('id').eq('data', giorno).is('gara', null).limit(1);
  if (e1) throw new Error(`partite: ${e1.message}`);
  if (aMano?.length) {
    await db.from('partite').update({ gara_cid: c.cid, gara: g.numero }).eq('id', aMano[0].id);
    return 'già segnata';
  }
  const { data: lani, error: e2 } = await db.from('profili').select('id').eq('ruolo', 'lani').single();
  if (e2) throw new Error(`profili: ${e2.message}`);
  const { data: p, error: e3 } = await db
    .from('partite')
    .insert({ data: giorno, avversaria: x.avversaria, set_nostri: x.nostri, set_loro: x.loro, in_campo: null, dato_da: lani.id, gara_cid: c.cid, gara: g.numero })
    .select('id')
    .single();
  if (e3) throw new Error(`partite: ${e3.message}`);
  // il popup lo apre R-Evolution: risultato, due parole sulla classifica appena letta, la domanda
  const riassunto = riassuntoClassifica(righe, c.squadra);
  await accoda(db, `partita_fipav:${p.id}`, 'partita_com_e_andata', { esito: x.nostri > x.loro ? 'vinta!' : 'persa.', noi: x.nostri, loro: x.loro, avversaria: x.avversaria, riassunto });
  return 'popup';
}

Deno.serve(async (req) => {
  if (!(await autorizzato(req))) return risposta({ errore: 'solo il cron o un genitore' }, 401);
  const solo = (await leggiCorpo<{ solo: string }>(req).catch(() => ({}))) as { solo?: string };
  let campionati: Campionato[] = C.campionati;
  if (solo.solo === 'partite') {
    // il cron di ogni mezz'ora: senza partite da leggere niente portale e niente registro
    campionati = await daLeggereOra();
    if (!campionati.length) return risposta({ esito: 'niente da leggere' });
  }
  const log = { id: await apriRegistro(db, 'classifiche') };
  let esito: 'ok' | 'errore' = 'ok';
  let dettagli: Record<string, unknown> = {};
  try {
    for (const c of campionati) {
      const righe = leggiClassifica(await pagina(C.portale + c.cid, c.nome));
      if (!righe.length) throw new Error(`${c.nome}: classifica non trovata nella pagina`);
      const { error } = await db.from('classifiche').upsert({
        cid: c.cid,
        campionato: c.nome,
        girone: c.girone,
        squadra: c.squadra,
        righe,
        aggiornata_il: new Date().toISOString(),
      });
      if (error) throw new Error(`classifiche: ${error.message}`);

      const gare = leggiGare(await pagina(C.gare + c.cid, c.nome));
      if (!gare.length) throw new Error(`${c.nome}: gare non trovate nella pagina`);
      const { error: eg } = await db.from('gare_fipav').upsert(gare.map((g) => ({ cid: c.cid, ...g, letta_il: new Date().toISOString() })));
      if (eg) throw new Error(`gare_fipav: ${eg.message}`);
      const fatte: string[] = [];
      for (const g of gare) {
        const f = await risultato(c, g, righe);
        if (f) fatte.push(`${g.numero} ${f}`);
      }
      dettagli[c.nome] = { classifica: righe.length, gare: gare.length, ...(fatte.length ? { risultati: fatte } : {}) };
    }
  } catch (e) {
    esito = 'errore';
    dettagli = { errore: e instanceof Error ? e.message : 'errore imprevisto' };
    await avvisaSeFallita(db, 'classifiche', 'La classifica', log.id).catch((x) => console.error('avviso', x));
  }
  await db.from('sync_log').update({ finito_il: new Date().toISOString(), esito, dettagli }).eq('id', log.id);
  return risposta({ esito, ...dettagli }, esito === 'ok' ? 200 : 502);
});
