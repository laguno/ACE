// Edge Function "notifiche": gira ogni 15 minuti (cron) e manda le notifiche push del copione
// (docs/05, Notifiche): a Lani al massimo 3 al giorno (7:00, compiti nuovi del pomeriggio,
// chiusura della sera) più un sollecito 45 minuti dopo la chiusura; ai genitori il riepilogo della
// domenica. Mai rimproveri. Nei giorni di assenza (Lani a casa) niente notifiche a Lani; al rientro
// il popup "Bentornata" (docs/02, Assenze). Una per tipo al giorno: la chiave di notifiche_inviate lo garantisce.
import { dbServizio, registraErroreServer } from '../_shared/ambiente.ts';
import * as C from '../../../src/lib/calendario/index.ts';
import * as K from '../../../src/lib/copione/index.ts';
import * as R from '../../../src/lib/regole/index.ts';
import { inviaPush } from '../_shared/push.ts';
import { stessoSegreto } from '../_shared/accesso.ts';
import { accoda } from '../_shared/popup.ts';

const db = dbServizio();

const piu = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const finestra = (ora: string, da: string) => ora >= da && ora < C.sposta(da, 15);

async function manda(ruolo: 'lani' | 'genitore', tipo: string, testo: { titolo: string; testo: string }, giorno: string) {
  // prima si prenota il tipo del giorno: se c'è già, la notifica è partita
  const { error } = await db.from('notifiche_inviate').insert({ giorno, tipo, testo: testo.testo });
  if (error) return 0;
  return inviaPush(db, ruolo, { ...testo, tipo });
}

/**
 * Nuvola ferma: due giri di fila non ok (errore o interrotta) dopo l'ultimo ok. Un avviso ai soli
 * genitori, una volta per serie (finché non torna un ok), sempre attraverso manda() (17/11).
 */
async function avvisoNuvola(giorno: string) {
  const { data: ok } = await db.from('sync_log').select('iniziato_il').eq('fonte', 'nuvola').eq('esito', 'ok').order('iniziato_il', { ascending: false }).limit(1).maybeSingle();
  let falliti = db.from('sync_log').select('iniziato_il').eq('fonte', 'nuvola').in('esito', ['errore', 'interrotta']);
  if (ok) falliti = falliti.gt('iniziato_il', ok.iniziato_il);
  const { data: serie } = await falliti.order('iniziato_il', { ascending: true }).limit(2);
  if (!serie || serie.length < 2) return undefined;
  // già avvisati per questa serie: la notifica è partita dal giorno del primo giro fallito in poi
  // (a giorni, come la chiave di notifiche_inviate: due serie nello stesso giorno danno un avviso solo)
  const dal = R.iso(R.giornoRoma(new Date(serie[0].iniziato_il)));
  const { data: gia } = await db.from('notifiche_inviate').select('giorno').eq('tipo', 'genitori_nuvola').gte('giorno', dal).limit(1);
  if (gia?.length) return undefined;
  return manda('genitore', 'genitori_nuvola', K.notifica('genitori_nuvola'), giorno);
}

async function turno() {
  const adesso = new Date();
  const ora = C.oraRoma(adesso.toISOString());
  const oggi = R.giornoRoma(adesso);
  const giorno = R.iso(oggi);
  const inviate: Record<string, number> = {};
  // prima dell'assenza: Lani a casa non ferma l'avviso ai genitori
  const nuvola = await avvisoNuvola(giorno);
  if (nuvola !== undefined) inviate.genitori_nuvola = nuvola;
  const { data: assenza } = await db.from('assenze').select('giorno').eq('giorno', giorno).maybeSingle();
  if (assenza) {
    // a casa: niente notifiche a Lani; solo il riepilogo della domenica ai genitori, più sotto
    if (!(oggi.getDay() === 0 && finestra(ora, '21:45'))) return { ora, a_casa: true, inviate };
  }

  const impegniDi = async (d: Date) => {
    const { data } = await db.from('impegni_famiglia').select('titolo, inizio').gte('inizio', d.toISOString()).lt('inizio', piu(d, 1).toISOString());
    return data ?? [];
  };

  // 7:00: verifica e allenamento del giorno
  if (!assenza && finestra(ora, '07:00')) {
    // rientro dopo l'assenza: l'ultimo giorno di scuola prima di oggi Lani era a casa
    let prima = piu(oggi, -1);
    while (!R.giornoDiScuola(prima)) prima = piu(prima, -1);
    if (R.giornoDiScuola(oggi)) {
      const { data: ieri } = await db.from('assenze').select('giorno').eq('giorno', R.iso(prima)).maybeSingle();
      if (ieri) await accoda(db, `bentornata:${giorno}`, 'bentornata');
    }
    const [{ data: verifiche }, impegni] = await Promise.all([
      db.from('verifiche').select('materie(abbreviazione)').eq('data', giorno),
      impegniDi(oggi),
    ]);
    const sport = impegni.find((i) => C.tipoImpegno(i.titolo) !== 'famiglia');
    const ver = (verifiche ?? [])[0]?.materie as unknown as { abbreviazione: string } | undefined;
    const pezzi = [ver && `verifica di ${ver.abbreviazione}`, sport && C.tipoImpegno(sport.titolo) === 'allenamento' && `allenamento ${C.oraRoma(sport.inizio)}`].filter(Boolean);
    const testo =
      sport && C.tipoImpegno(sport.titolo) === 'partita'
        ? K.notifica('mattina_partita', { ora: C.oraRoma(sport.inizio) })
        : pezzi.length
          ? K.notifica('mattina', { cose: pezzi.join(', ') })
          : K.notifica('mattina_tranquilla');
    inviate.mattina = await manda('lani', 'mattina', testo, giorno);
  }

  // 14:45, dopo la sincronizzazione delle 14:30: compiti nuovi per domani
  if (!assenza && finestra(ora, '14:45')) {
    const domani = R.iso(R.prossimoGiornoDiScuola(oggi));
    const { data: nuovi } = await db.from('compiti').select('testo, materie(abbreviazione)').eq('scadenza', domani).gte('creato_il', oggi.toISOString());
    if (nuovi?.length) {
      const primo = (nuovi as unknown as { testo: string; materie: { abbreviazione: string } | null }[]).sort((a, b) => b.testo.length - a.testo.length)[0];
      inviate.pomeriggio = await manda('lani', 'pomeriggio', K.notifica('compiti_nuovi', { n: nuovi.length, materia: primo.materie?.abbreviazione ?? 'il primo' }), giorno);
    }
  }

  // chiusura della sera e sollecito 45 minuti dopo, se mancano ancora cose
  const { data: righe } = await db.from('impostazioni').select('chiave, valore').in('chiave', ['ora_chiusura', 'ora_chiusura_breve']);
  const imp = Object.fromEntries((righe ?? []).map((r) => [r.chiave, r.valore]));
  // venerdì e sabato con partita il giorno dopo: chiusura breve con la sola borsa
  const soloBorsa = !R.cartellaConta(oggi) && C.partitaTra(await impegniDi(piu(oggi, 1)));
  const chiusura = C.oraChiusura(imp.ora_chiusura?.[oggi.getDay()] ?? null, await impegniDi(oggi), soloBorsa ? (imp.ora_chiusura_breve ?? null) : null);
  if (chiusura && !assenza) {
    if (finestra(ora, chiusura))
      inviate.chiusura = await manda('lani', 'chiusura', K.notifica(oggi.getDay() === 0 ? 'chiusura_domenica' : 'chiusura'), giorno);
    const minuti = R.CONFIG.notifiche.sollecito_dopo_minuti;
    if (finestra(ora, C.sposta(chiusura, minuti))) {
      const domani = R.iso(R.prossimoGiornoDiScuola(oggi));
      const [{ count: compiti }, { data: serata }] = await Promise.all([
        db.from('compiti').select('id', { count: 'exact', head: true }).eq('scadenza', domani).is('fatto_il', null),
        db.from('serate').select('cartella_il, borsa_il').eq('data', giorno).maybeSingle(),
      ]);
      const mancano = soloBorsa
        ? serata?.borsa_il ? 0 : 1
        : (compiti ?? 0) + (R.cartellaConta(oggi) && !serata?.cartella_il ? 1 : 0);
      if (mancano) inviate.sollecito = await manda('lani', 'sollecito', K.notifica('sollecito', { n: mancano }), giorno);
    }
  }

  // domenica, dopo le chiavi delle 21:30: riepilogo ai genitori
  if (oggi.getDay() === 0 && finestra(ora, '21:45')) {
    const { data: s } = await db.from('settimane').select('chiavi').eq('inizio', R.iso(R.lunedi(oggi))).maybeSingle();
    if (s?.chiavi != null) inviate.genitori_riepilogo = await manda('genitore', 'genitori_riepilogo', K.notifica('genitori_riepilogo', { chiavi: s.chiavi }), giorno);
  }
  return { ora, inviate };
}

Deno.serve(async (req) => {
  if (!stessoSegreto(req.headers.get('x-cron-segreto'), Deno.env.get('CRON_SEGRETO'))) return new Response('{"errore":"solo il cron"}', { status: 401 });
  try {
    // prova di consegna (APK, docs/07): solo ai genitori, fuori dai conteggi del copione
    const corpo = await req.json().catch(() => ({}));
    if (corpo?.prova === 'genitori') {
      const inviate = await inviaPush(db, 'genitore', { titolo: 'ACE', testo: 'Notifica di prova: arriva!', tipo: 'prova' });
      return new Response(JSON.stringify({ prova: inviate }), { headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify(await turno()), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    await registraErroreServer(db, 'notifiche', e);
    return new Response(JSON.stringify({ errore: e instanceof Error ? e.message : 'errore' }), { status: 500 });
  }
});
