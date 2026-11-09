// Edge Function "premi": immagini dei premi dal bucket privato "premi" (approvato dal signore il 9/11).
// L'app chiama { n? } (un forziere o tutti) e riceve URL firmati di pochi minuti:
// - Lani: la sagoma finché il premio è nascosto; l'immagine vera solo con l'enigma risolto o il
//   forziere aperto (stessa logica di premio e soluzione in forzieri_lani). Mai il testo del premio.
// - Genitori: tutte e due.
// Se un genitore ha cambiato il premio, l'immagine non vale più (immagine_per diverso dal premio):
// "manca" true e niente URL, l'app mostra il pacco regalo finché il signore non ne carica una nuova.
import { dbServizio, registraErroreServer } from '../_shared/ambiente.ts';
import { chiChiama, cors, leggiCorpo, risposte } from '../_shared/accesso.ts';

const db = dbServizio();
const DURATA = 600; // secondi

async function firma(percorso: string) {
  const { data, error } = await db.storage.from('premi').createSignedUrl(percorso, DURATA);
  return error ? null : data.signedUrl;
}

Deno.serve(async (req) => {
  const risposta = risposte(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  const chi = await chiChiama(db, req, undefined);
  if (chi?.tipo !== 'utente') return risposta({ errore: 'accesso richiesto' }, 401);
  const profilo = { ruolo: chi.ruolo };

  try {
    const { n } = await leggiCorpo<{ n: number }>(req).catch(() => ({ n: undefined }));
    let q = db.from('forzieri').select('n, stato, premio, immagine_per, enigma_risolto_il').order('n');
    if (typeof n === 'number') q = q.eq('n', n);
    const { data: forzieri, error } = await q;
    if (error) throw error;
    const genitore = profilo.ruolo === 'genitore';
    const immagini = await Promise.all(
      (forzieri ?? []).map(async (f) => {
        const sbloccato = !!f.enigma_risolto_il || ['aperto', 'consegnato'].includes(f.stato);
        const manca = !f.premio || !f.immagine_per || f.immagine_per !== f.premio;
        if (manca) return { n: f.n, sbloccato, manca: true, sagoma: null, vera: null };
        return {
          n: f.n,
          sbloccato,
          manca: false,
          sagoma: await firma(`premio-${f.n}-sagoma.webp`),
          vera: genitore || sbloccato ? await firma(`premio-${f.n}.webp`) : null,
        };
      }),
    );
    return risposta({ immagini });
  } catch (e) {
    await registraErroreServer(db, 'premi', e);
    return risposta({ errore: 'errore del server' }, 500);
  }
});
