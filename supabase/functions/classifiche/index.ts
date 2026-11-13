// Edge Function "classifiche" (sprint 2): legge dal portale FIPAV Reggio Emilia le classifiche dei
// campionati di Lani (config classifiche.campionati) e le copia in classifiche. Pagine pubbliche,
// nessun segreto. La chiamano il cron (ogni mattina) o un genitore.
import { apriRegistro, dbServizio } from '../_shared/ambiente.ts';
import { avvisaSeFallita } from '../_shared/push.ts';
import { chiChiama, cronOGenitore } from '../_shared/accesso.ts';
import * as R from '../../../src/lib/regole/index.ts';
import { leggiClassifica } from '../../../src/lib/classifiche/index.ts';

const db = dbServizio();
const C = R.CONFIG.classifiche;

const autorizzato = async (req: Request) => cronOGenitore(await chiChiama(db, req, Deno.env.get('CRON_SEGRETO')));

const risposta = (corpo: unknown, stato = 200) =>
  new Response(JSON.stringify(corpo), { status: stato, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (!(await autorizzato(req))) return risposta({ errore: 'solo il cron o un genitore' }, 401);
  const log = { id: await apriRegistro(db, 'classifiche') };
  let esito: 'ok' | 'errore' = 'ok';
  let dettagli: Record<string, unknown> = {};
  try {
    for (const c of C.campionati) {
      const r = await fetch(C.portale + c.cid);
      if (!r.ok) throw new Error(`${c.nome}: portale ${r.status}`);
      const righe = leggiClassifica(await r.text());
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
      dettagli[c.nome] = righe.length;
    }
  } catch (e) {
    esito = 'errore';
    dettagli = { errore: e instanceof Error ? e.message : 'errore imprevisto' };
    await avvisaSeFallita(db, 'classifiche', 'La classifica', log.id).catch((x) => console.error('avviso', x));
  }
  await db.from('sync_log').update({ finito_il: new Date().toISOString(), esito, dettagli }).eq('id', log.id);
  return risposta({ esito, ...dettagli }, esito === 'ok' ? 200 : 502);
});
