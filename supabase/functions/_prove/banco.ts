// Banco di prova delle Edge Functions vere in Node (vitest): Deno.serve finto che cattura il
// gestore, database PGlite con le migrazioni vere (client del simulatore, come service role),
// accesso con gettoni finti, Storage finto sopra storage.objects. Anthropic e web-push sono finti
// (alias in vite.config.ts, file in questa cartella). Dati tutti finti.
import { vi } from 'vitest';
import { client } from '../../../scripts/simulatore/database.ts';
// @ts-expect-error modulo JavaScript senza tipi
import { creaDatabase, LANI, PAPA } from '../../../scripts/supabase-finto.mjs';

export { LANI, PAPA };
const SEGRETO = 'segreto-del-cron';
const GETTONI: Record<string, string> = { 'gettone-lani': LANI, 'gettone-papa': PAPA };

type Banco = Awaited<ReturnType<typeof creaBanco>>;
/** Il banco della prova in corso: lo legge il finto di ambiente.ts (vi.mock nei file di prova). Su
 * globalThis perché vi.resetModules (una funzione caricata da capo) rifà anche questo modulo. */
const g = globalThis as unknown as { __bancoAce?: { banco?: Banco } };
export const stato: { banco?: Banco } = (g.__bancoAce ??= {});

export async function creaBanco(env: Record<string, string> = {}) {
  const { db, come } = await creaDatabase();
  const base = client(db);
  const s = {
    ...base,
    auth: {
      async getUser(t: string) {
        const id = GETTONI[t];
        return { data: { user: id ? { id } : null }, error: null };
      },
    },
    storage: {
      from: (bucket: string) => ({
        async createSignedUrl(nome: string, durata: number) {
          const r = await db.query('select 1 from storage.objects where bucket_id = $1 and name = $2', [bucket, nome]);
          return r.rows.length ? { data: { signedUrl: `https://firmato.test/${bucket}/${nome}?per=${durata}` }, error: null } : { data: null, error: { message: 'Object not found' } };
        },
      }),
    },
  };
  const banco = { db, come, s, env: { SUPABASE_URL: 'https://finto.supabase.test', CRON_SEGRETO: SEGRETO, ...env } };
  stato.banco = banco;
  return banco;
}

/** Importa la funzione (da capo) e restituisce il gestore passato a Deno.serve. */
export async function carica(nome: string): Promise<(req: Request) => Promise<Response>> {
  let gestore: ((req: Request) => Promise<Response>) | undefined;
  (globalThis as unknown as { Deno: unknown }).Deno = {
    env: { get: (n: string) => stato.banco?.env[n as keyof Banco['env']] },
    serve: (g: typeof gestore) => (gestore = g),
  };
  vi.resetModules();
  await import(`../${nome}/index.ts`);
  if (!gestore) throw new Error(`${nome}: nessun Deno.serve`);
  return gestore;
}

/** Una richiesta come la manda l'app (gettone) o il cron (segreto). */
export function richiesta(corpo: unknown = {}, o: { gettone?: string; cron?: boolean; metodo?: string; origine?: string } = {}) {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (o.gettone) h.Authorization = `Bearer ${o.gettone}`;
  if (o.cron) h['x-cron-segreto'] = SEGRETO;
  if (o.origine) h.Origin = o.origine;
  return new Request('https://finto.supabase.test/functions/v1/x', { method: o.metodo ?? 'POST', headers: h, body: o.metodo === 'OPTIONS' ? undefined : JSON.stringify(corpo) });
}

export async function valore(sql: string) {
  if (!stato.banco) throw new Error('prima creaBanco()');
  return Object.values((await stato.banco.db.query(sql)).rows[0] ?? {})[0];
}
