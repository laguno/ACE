// Accesso comune alle Edge Functions (filone A del piano): chi chiama, da dove, con quanto.
// - CORS solo per le origini di ACE (produzione, anteprime di Vercel, sviluppo in locale).
// - Corpo della richiesta con un tetto: niente JSON enormi.
// - Il segreto del cron confrontato a tempo costante.
// - Chi chiama: il cron, un genitore o Lani (dal token e dal profilo).
// Niente Deno qui dentro, così le prove girano anche con vitest.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const PRODUZIONE = 'https://ace-passino.vercel.app';
const ORIGINI = /^(https:\/\/ace-passino\.vercel\.app|https:\/\/ace-[a-z0-9-]+-lagunos-projects\.vercel\.app|http:\/\/localhost:\d{2,5})$/;

export const origineAmmessa = (origine: string | null) => !!origine && ORIGINI.test(origine);

export function cors(req: Request): Record<string, string> {
  const origine = req.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': origineAmmessa(origine) ? origine : PRODUZIONE,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  };
}

/** Risposte JSON di una richiesta, con le sue intestazioni CORS. */
export const risposte =
  (req: Request) =>
  (corpo: unknown, stato = 200) =>
    new Response(JSON.stringify(corpo), { status: stato, headers: { ...cors(req), 'Content-Type': 'application/json' } });

export class CorpoNonValido extends Error {}

/** Il corpo JSON della richiesta, al massimo `massimo` byte; vuoto o non oggetto = {}. */
export async function leggiCorpo<T extends Record<string, unknown>>(req: Request, massimo = 4096): Promise<Partial<T>> {
  if (Number(req.headers.get('content-length') ?? 0) > massimo) throw new CorpoNonValido('richiesta troppo grande');
  const byte = new Uint8Array(await req.arrayBuffer());
  if (byte.length > massimo) throw new CorpoNonValido('richiesta troppo grande');
  if (!byte.length) return {};
  let v: unknown;
  try {
    v = JSON.parse(new TextDecoder().decode(byte));
  } catch {
    throw new CorpoNonValido('richiesta non valida');
  }
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Partial<T>) : {};
}

/** Confronto a tempo costante: il tempo non dice quante lettere del segreto sono giuste. */
export function stessoSegreto(dato: string | null, atteso: string | undefined): boolean {
  if (!dato || !atteso) return false;
  const a = new TextEncoder().encode(dato);
  const b = new TextEncoder().encode(atteso);
  let diverso = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) diverso |= (a[i] ?? 0) ^ b[i];
  return diverso === 0;
}

export type Chi = { tipo: 'cron' } | { tipo: 'utente'; id: string; ruolo: 'lani' | 'genitore' };

/** Chi chiama: il cron (segreto giusto), un utente con profilo, o nessuno (null). */
export async function chiChiama(db: SupabaseClient, req: Request, segretoCron: string | undefined): Promise<Chi | null> {
  if (stessoSegreto(req.headers.get('x-cron-segreto'), segretoCron)) return { tipo: 'cron' };
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '');
  if (!token) return null;
  const { data } = await db.auth.getUser(token);
  if (!data.user) return null;
  const { data: p } = await db.from('profili').select('ruolo').eq('id', data.user.id).maybeSingle();
  return p ? { tipo: 'utente', id: data.user.id, ruolo: p.ruolo } : null;
}

export const cronOGenitore = (c: Chi | null) => c?.tipo === 'cron' || (c?.tipo === 'utente' && c.ruolo === 'genitore');
