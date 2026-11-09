// Edge Function "passi": l'app la chiama dopo una spunta o un'attività con { tipo, id }.
// La logica sta in _shared/passi.ts (la usa anche il simulatore dell'anno); qui solo l'accesso.
import { dbServizio, registraErroreServer } from '../_shared/ambiente.ts';
import { chiChiama, CorpoNonValido, cors, leggiCorpo, risposte } from '../_shared/accesso.ts';
import { creaGestori, eseguiPassi, Richiesta } from '../_shared/passi.ts';

const db = dbServizio();
const gestori = creaGestori(db);

Deno.serve(async (req) => {
  const risposta = risposte(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  try {
    if (!(await chiChiama(db, req, undefined))) return risposta({ errore: 'accesso richiesto' }, 401);
    const { tipo, id } = await leggiCorpo<{ tipo: string; id: string }>(req);
    return risposta(await eseguiPassi(db, gestori, tipo, id));
  } catch (e) {
    if (e instanceof Richiesta || e instanceof CorpoNonValido) return risposta({ errore: e.message }, 400);
    await registraErroreServer(db, 'passi', e);
    return risposta({ errore: 'errore del server' }, 500);
  }
});
