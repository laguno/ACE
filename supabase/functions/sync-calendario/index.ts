// Edge Function "sync-calendario": legge il calendario di famiglia (indirizzo iCal privato nel
// segreto GOOGLE_CALENDAR_ICS_URL), espande gli eventi ripetuti e copia in impegni_famiglia quelli
// da ieri a 14 giorni avanti. Sola lettura: gli impegni si cambiano in Google, non nell'app.
// Eventi con "privato" nel titolo esclusi. La chiamano il cron (ogni ora) o un genitore.
import { createClient } from 'npm:@supabase/supabase-js@2';
import ICAL from 'npm:ical.js@2.1.0';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const GIORNO = 864e5;

// ponytail: un impegno di un giorno intero si salva a mezzanotte UTC con tutto_il_giorno = true.
type Impegno = { id: string; inizio: string; fine: string | null; titolo: string; tutto_il_giorno: boolean; aggiornato_il: string };

function impegni(testo: string, da: Date, a: Date): Impegno[] {
  const cal = new ICAL.Component(ICAL.parse(testo));
  for (const tz of cal.getAllSubcomponents('vtimezone')) ICAL.TimezoneService.register(tz);

  // le eccezioni (un'occorrenza spostata) hanno lo stesso UID e RECURRENCE-ID
  const eventi = cal.getAllSubcomponents('vevent').map((v) => new ICAL.Event(v));
  const principali = eventi.filter((e) => !e.isRecurrenceException());
  for (const ecc of eventi.filter((e) => e.isRecurrenceException()))
    principali.find((p) => p.uid === ecc.uid)?.relateException(ecc);

  const ora = new Date().toISOString();
  const fuori: Impegno[] = [];
  for (const e of principali) {
    const titolo = (e.summary ?? '').trim();
    if (!titolo || /privat/i.test(titolo)) continue;
    const aggiungi = (inizio: ICAL.Time, fine: ICAL.Time | null, chiave: string) => {
      const i = inizio.toJSDate();
      if (i < da || i > a) return;
      fuori.push({
        id: chiave,
        inizio: i.toISOString(),
        fine: fine?.toJSDate().toISOString() ?? null,
        titolo,
        tutto_il_giorno: inizio.isDate,
        aggiornato_il: ora,
      });
    };
    if (!e.isRecurring()) {
      aggiungi(e.startDate, e.endDate, e.uid);
      continue;
    }
    const it = e.iterator();
    for (let t = it.next(), n = 0; t && n < 500; t = it.next(), n++) {
      if (t.toJSDate() > a) break;
      const d = e.getOccurrenceDetails(t);
      if (d.item.summary && /privat/i.test(d.item.summary)) continue;
      aggiungi(d.startDate, d.endDate, `${e.uid}:${t.toString()}`);
    }
  }
  return fuori;
}

async function autorizzato(req: Request): Promise<boolean> {
  const segreto = Deno.env.get('CRON_SEGRETO');
  if (segreto && req.headers.get('x-cron-segreto') === segreto) return true;
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '');
  const { data } = await db.auth.getUser(token);
  if (!data.user) return false;
  const { count } = await db.from('profili').select('id', { count: 'exact', head: true }).eq('id', data.user.id).eq('ruolo', 'genitore');
  return !!count;
}

const risposta = (corpo: unknown, stato = 200) =>
  new Response(JSON.stringify(corpo), { status: stato, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (!(await autorizzato(req))) return risposta({ errore: 'solo il cron o un genitore' }, 401);
  const { data: log } = await db.from('sync_log').insert({ fonte: 'calendario' }).select('id').single();
  let esito: 'ok' | 'errore' = 'ok';
  let dettagli: Record<string, unknown>;
  try {
    const r = await fetch(Deno.env.get('GOOGLE_CALENDAR_ICS_URL') ?? '');
    if (!r.ok) throw new Error(`calendario: ${r.status}`);
    const da = new Date(Date.now() - GIORNO);
    const righe = impegni(await r.text(), da, new Date(Date.now() + 14 * GIORNO));
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
  }
  await db.from('sync_log').update({ finito_il: new Date().toISOString(), esito, dettagli }).eq('id', log!.id);
  return risposta({ esito, ...dettagli }, esito === 'ok' ? 200 : 502);
});
