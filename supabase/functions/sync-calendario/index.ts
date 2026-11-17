// Edge Function "sync-calendario": legge il calendario di famiglia (indirizzo iCal privato nel
// segreto GOOGLE_CALENDAR_ICS_URL), espande gli eventi ripetuti e copia in impegni_famiglia quelli
// da ieri a 14 giorni avanti. Sola lettura: gli impegni si cambiano in Google, non nell'app.
// Eventi con "privato" nel titolo esclusi. La chiamano il cron (ogni ora) o un genitore.
// Dal 17/11 (signore) le partite di Lani le scrive solo la funzione classifiche dalla FIPAV (id "fipav:..."):
// qui le partite del calendario si saltano, quelle FIPAV non si cancellano, e un giorno segnato
// "[LANI ASSENTE]" toglie la partita FIPAV di quel giorno.
import { apriRegistro, dbServizio } from '../_shared/ambiente.ts';
import ICAL from 'npm:ical.js@2.1.0';
import { avvisaSeFallita } from '../_shared/push.ts';
import { chiChiama, cronOGenitore } from '../_shared/accesso.ts';
import { impegni } from '../../../src/lib/calendario/ics.ts';
import * as Cal from '../../../src/lib/calendario/index.ts';
import { IMPEGNO_FIPAV, assenteDalCalendario, giornoRomaIso } from '../../../src/lib/classifiche/index.ts';

const db = dbServizio();
const GIORNO = 864e5;

const autorizzato = async (req: Request) => cronOGenitore(await chiChiama(db, req, Deno.env.get('CRON_SEGRETO')));

const risposta = (corpo: unknown, stato = 200) =>
  new Response(JSON.stringify(corpo), { status: stato, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (!(await autorizzato(req))) return risposta({ errore: 'solo il cron o un genitore' }, 401);
  const log = { id: await apriRegistro(db, 'calendario') };
  let esito: 'ok' | 'errore' = 'ok';
  let dettagli: Record<string, unknown>;
  try {
    const r = await fetch(Deno.env.get('GOOGLE_CALENDAR_ICS_URL') ?? '');
    if (!r.ok) throw new Error(`calendario: ${r.status}`);
    const da = new Date(Date.now() - GIORNO);
    const righe = impegni(ICAL, await r.text(), da, new Date(Date.now() + 14 * GIORNO)).filter((i) => Cal.tipoImpegno(i.titolo) !== 'partita');
    if (righe.length) {
      const { error } = await db.from('impegni_famiglia').upsert(righe);
      if (error) throw new Error(`impegni_famiglia: ${error.message}`);
    }
    // via quelli spariti da Google (cancellati o spostati) nella finestra letta
    const { error: e2 } = await db
      .from('impegni_famiglia')
      .delete()
      .gte('inizio', da.toISOString())
      .not('id', 'like', `${IMPEGNO_FIPAV}%`)
      .lt('aggiornato_il', righe[0]?.aggiornato_il ?? new Date().toISOString());
    if (e2) throw new Error(`pulizia: ${e2.message}`);
    // ponytail: giorno di Roma approssimato con +01:00, come in classifiche: le partite non sono a mezzanotte
    for (const g of new Set(righe.filter((i) => assenteDalCalendario([i.titolo])).map((i) => giornoRomaIso(i.inizio)))) {
      const dopo = new Date(Date.parse(`${g}T12:00:00Z`) + GIORNO).toISOString().slice(0, 10);
      const { error: e3 } = await db.from('impegni_famiglia').delete().like('id', `${IMPEGNO_FIPAV}%`).gte('inizio', `${g}T00:00:00+01:00`).lt('inizio', `${dopo}T00:00:00+01:00`);
      if (e3) throw new Error(`assente: ${e3.message}`);
    }
    dettagli = { impegni: righe.length };
  } catch (e) {
    esito = 'errore';
    dettagli = { errore: e instanceof Error ? e.message.replace(/https?:\/\/\S+/g, '[indirizzo]') : 'errore imprevisto' };
    await avvisaSeFallita(db, 'calendario', 'Il calendario', log.id).catch((x) => console.error('avviso', x));
  }
  await db.from('sync_log').update({ finito_il: new Date().toISOString(), esito, dettagli }).eq('id', log.id);
  return risposta({ esito, ...dettagli }, esito === 'ok' ? 200 : 502);
});
