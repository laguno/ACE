// Edge Function "chiavi": la domenica sera (21:30, cron) conta la settimana da lunedì a domenica,
// scrive le chiavi in settimane (da quel momento niente storni), applica la rimonta ×1,25 se Lani
// era indietro e ha preso almeno la prima chiave, e aggiorna i forzieri.
// Un genitore (o il cron) può chiedere una settimana precisa con { lunedi: 'YYYY-MM-DD' }.
import { apriRegistro, dbServizio } from '../_shared/ambiente.ts';
import * as C from '../../../src/lib/calendario/index.ts';
import * as R from '../../../src/lib/regole/index.ts';
import { contaChiavi, piu } from '../_shared/chiavi.ts';
import { chiChiama, cronOGenitore } from '../_shared/accesso.ts';

const db = dbServizio();

const autorizzato = async (req: Request) => cronOGenitore(await chiChiama(db, req, Deno.env.get('CRON_SEGRETO')));

const risposta = (corpo: unknown, stato = 200) =>
  new Response(JSON.stringify(corpo), { status: stato, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (!(await autorizzato(req))) return risposta({ errore: 'solo il cron o un genitore' }, 401);
  const corpo = await req.json().catch(() => ({}));
  const oggi = R.giornoRoma(new Date());
  let lun = R.lunedi(oggi);
  if (corpo.lunedi) lun = R.lunedi(R.giorno(corpo.lunedi));
  else if (oggi.getDay() !== 0 || C.oraRoma(new Date().toISOString()) < '21:00') return risposta({ saltato: 'non è domenica sera' });
  // il gioco parte con periodo.inizio: le settimane di prima non danno chiavi
  if (R.iso(piu(lun, 6)) < R.CONFIG.periodo.inizio) return risposta({ saltato: 'settimana prima dell’inizio del gioco' });

  const log = { id: await apriRegistro(db, 'chiavi') };
  try {
    const esito = await contaChiavi(db, lun);
    await db.from('sync_log').update({ finito_il: new Date().toISOString(), esito: 'ok', dettagli: esito }).eq('id', log.id);
    return risposta(esito);
  } catch (e) {
    const errore = e instanceof Error ? e.message : 'errore imprevisto';
    await db.from('sync_log').update({ finito_il: new Date().toISOString(), esito: 'errore', dettagli: { errore } }).eq('id', log.id);
    return risposta({ errore }, 500);
  }
});
