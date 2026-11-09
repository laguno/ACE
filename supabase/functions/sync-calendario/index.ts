// Edge Function "sync-calendario": legge il calendario di famiglia (indirizzo iCal privato nel
// segreto GOOGLE_CALENDAR_ICS_URL), espande gli eventi ripetuti e copia in impegni_famiglia quelli
// da ieri a 14 giorni avanti. Sola lettura: gli impegni si cambiano in Google, non nell'app.
// Eventi con "privato" nel titolo esclusi. La chiamano il cron (ogni ora) o un genitore.
import { apriRegistro, dbServizio } from '../_shared/ambiente.ts';
import ICAL from 'npm:ical.js@2.1.0';
import { avvisaSeFallita } from '../_shared/push.ts';
import { chiChiama, cronOGenitore } from '../_shared/accesso.ts';
import { impegni } from '../../../src/lib/calendario/ics.ts';

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
    const righe = impegni(ICAL, await r.text(), da, new Date(Date.now() + 14 * GIORNO));
    if (righe.length) {
      const { error } = await db.from('impegni_famiglia').upsert(righe);
      if (error) throw new Error(`impegni_famiglia: ${error.message}`);
    }
    // via quelli spariti da Google (cancellati o spostati) nella finestra letta
    const { error: e2 } = await db
      .from('impegni_famiglia')
      .delete()
      .gte('inizio', da.toISOString())
      .lt('aggiornato_il', righe[0]?.aggiornato_il ?? new Date().toISOString());
    if (e2) throw new Error(`pulizia: ${e2.message}`);
    dettagli = { impegni: righe.length };
  } catch (e) {
    esito = 'errore';
    dettagli = { errore: e instanceof Error ? e.message.replace(/https?:\/\/\S+/g, '[indirizzo]') : 'errore imprevisto' };
    await avvisaSeFallita(db, 'calendario', 'Il calendario', log.id).catch((x) => console.error('avviso', x));
  }
  await db.from('sync_log').update({ finito_il: new Date().toISOString(), esito, dettagli }).eq('id', log.id);
  return risposta({ esito, ...dettagli }, esito === 'ok' ? 200 : 502);
});
