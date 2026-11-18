// Edge Function "tabellina": i passi di oggi (disponibili e presi) e quelli degli ultimi giorni.
// Sola lettura: la chiamano l'Oggi di Lani e l'area genitori. La logica sta in _shared/tabellina.ts.
import { dbServizio, registraErroreServer } from '../_shared/ambiente.ts';
import { chiChiama, cors, risposte } from '../_shared/accesso.ts';
import { leggiTabellina } from '../_shared/tabellina.ts';

const db = dbServizio();

Deno.serve(async (req) => {
  const risposta = risposte(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  try {
    const chi = await chiChiama(db, req, undefined);
    if (chi?.tipo !== 'utente') return risposta({ errore: 'accesso richiesto' }, 401);
    return risposta(await leggiTabellina(db, new Date(), chi.ruolo === 'genitore'));
  } catch (e) {
    await registraErroreServer(db, 'tabellina', e);
    return risposta({ errore: 'errore del server' }, 500);
  }
});
