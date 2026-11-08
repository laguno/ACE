// Edge Function "sync-nuvola": legge compiti, verifiche, voti e note da Nuvola (sola lettura) e li
// scrive nel database. La chiamano il cron (14:30 e 19:30, con l'intestazione x-cron-segreto) o un
// genitore dall'app. Credenziali solo nei segreti NUVOLA_UTENTE / NUVOLA_PASSWORD.
//
// Accesso (mappato l'8 novembre 2026): nuvola.madisoft.it rimanda al Keycloak
// auth.nuvola.madisoft.it/realms/nuvola (da /connect/authentication-service); si invia il modulo (username, password, credentialId), si
// seguono i rimandi con i cookie fino all'area tutore, poi /api-studente/v1/login-from-web dà il token.
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as N from '../../../src/lib/nuvola/index.ts';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const NUVOLA = 'https://nuvola.madisoft.it';
const API = `${NUVOLA}/api-studente/v1`;

class Passo extends Error {}

// ---------------------------------------------------------------- sessione con i cookie

// ponytail: cookie per dominio senza path né scadenza; basta per un accesso di pochi secondi.
const biscotti: { dominio: string; nome: string; valore: string }[] = [];

function salvaCookie(url: URL, r: Response) {
  for (const c of r.headers.getSetCookie()) {
    const [coppia, ...attr] = c.split(';');
    const i = coppia.indexOf('=');
    const nome = coppia.slice(0, i).trim();
    const dom = attr.map((a) => a.trim()).find((a) => /^domain=/i.test(a))?.slice(7).replace(/^\./, '') ?? url.hostname;
    const j = biscotti.findIndex((b) => b.nome === nome && b.dominio === dom);
    if (j >= 0) biscotti.splice(j, 1);
    biscotti.push({ dominio: dom, nome, valore: coppia.slice(i + 1).trim() });
  }
}

function cookiePer(url: URL) {
  return biscotti
    .filter((b) => url.hostname === b.dominio || url.hostname.endsWith('.' + b.dominio))
    .map((b) => `${b.nome}=${b.valore}`)
    .join('; ');
}

/** fetch che segue i rimandi a mano, così tiene i cookie di ogni passaggio. */
async function vai(indirizzo: string, init: RequestInit = {}): Promise<{ url: URL; r: Response }> {
  let url = new URL(indirizzo);
  for (let salti = 0; salti < 10; salti++) {
    const headers = new Headers(init.headers);
    const c = cookiePer(url);
    if (c) headers.set('Cookie', c);
    const r = await fetch(url, { ...init, headers, redirect: 'manual' });
    salvaCookie(url, r);
    const dove = r.headers.get('location');
    if (r.status < 300 || r.status >= 400 || !dove) return { url, r };
    await r.body?.cancel();
    url = new URL(dove, url);
    init = {}; // dopo un rimando si prosegue in GET
  }
  throw new Passo('troppi rimandi');
}

const entita = (s: string) => s.replace(/&amp;/g, '&').replace(/&#x3D;/g, '=').replace(/&quot;/g, '"');

async function accedi(): Promise<string> {
  biscotti.length = 0; // la funzione può restare calda tra due chiamate: si riparte sempre puliti
  // /login ha solo un collegamento a questo indirizzo, che rimanda al modulo di Keycloak
  const pagina = await vai(`${NUVOLA}/connect/authentication-service`);
  const html = await pagina.r.text();
  // la pagina di Keycloak è disegnata in JavaScript: l'indirizzo del modulo sta in "loginAction"
  const azione = html.match(/"loginAction":\s*"([^"]+)"/)?.[1]?.replace(/\\\//g, '/');
  if (!azione) throw new Passo(`modulo di accesso non trovato (${pagina.url.host}${pagina.url.pathname})`);

  const corpo = new URLSearchParams({
    username: Deno.env.get('NUVOLA_UTENTE') ?? '',
    password: Deno.env.get('NUVOLA_PASSWORD') ?? '',
    credentialId: '',
  });
  const dopo = await vai(new URL(entita(azione), pagina.url).href, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: corpo,
  });
  await dopo.r.body?.cancel();
  if (dopo.url.hostname !== 'nuvola.madisoft.it') throw new Passo('accesso rifiutato: utente o password di Nuvola');

  const { r } = await vai(`${API}/login-from-web`, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Passo(`login-from-web: ${r.status}`);
  const { token } = await r.json();
  if (!token) throw new Passo('login-from-web senza token');
  return token;
}

// ---------------------------------------------------------------- letture

async function leggi<T = any>(token: string, percorso: string, alunno?: number): Promise<T[]> {
  const url = new URL(`${API}${percorso}`);
  if (alunno) url.searchParams.set('contextAlunno', String(alunno));
  const { r } = await vai(url.href, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Passo(`${percorso.replace(/\d{2}-\d{2}-\d{4}/g, 'gg')}: ${r.status}`);
  return (await r.json()).valori ?? [];
}

const ggmmaaaa = (d: Date) => d.toISOString().slice(0, 10).split('-').reverse().join('-');
const oggiRoma = () => new Date(new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' }));

async function scarica(token: string) {
  // /alunni dà più schede (una per anno, e nel 2026 due per la 2A: la più vecchia risponde 403).
  // ponytail: si prende anno più recente e poi id più alto; se Nuvola cambia, provare le schede in ordine.
  const schede = await leggi(token, '/alunni');
  const [alunno] = schede
    .filter((s) => s.apiAttive)
    .sort((x, y) => y.annoScolastico - x.annoScolastico || y.id - x.id);
  if (!alunno) throw new Passo(`nessuna scheda attiva tra ${schede.length}`);
  const a = `/alunno/${alunno.id}`;

  // compiti da una settimana fa a quattro settimane avanti, a blocchi di 7 giorni come fa Nuvola
  const compiti: any[] = [];
  const lezioni: any[] = [];
  const oggi = oggiRoma();
  for (let s = -1; s < 4; s++) {
    const da = new Date(oggi.getTime() + s * 7 * 864e5);
    const a7 = new Date(da.getTime() + 6 * 864e5);
    compiti.push(...(await leggi(token, `${a}/compito/elenco/${ggmmaaaa(da)}/${ggmmaaaa(a7)}`, alunno.id)));
    if (s === -1)
      lezioni.push(...(await leggi(token, `${a}/argomento-lezione/elenco/${ggmmaaaa(da)}/${ggmmaaaa(a7)}`, alunno.id)));
  }
  const eventi = await leggi(token, `${a}/eventi-classe?soloVisibiliPlanner=true`, alunno.id);
  const quadrimestri = await leggi(token, `${a}/frazioni-temporali`, alunno.id);
  const corrente = quadrimestri.find((q) => q.corrente) ?? quadrimestri.at(-1);
  const voti = corrente ? await leggi(token, `${a}/frazione-temporale/${corrente.id}/voti/materie`, alunno.id) : [];
  const note = await leggi(token, `${a}/note`, alunno.id);
  return { compiti, lezioni: lezioni.flatMap((v) => v.ore.flatMap((o: any) => o.argomenti)), eventi, voti, note };
}

// ---------------------------------------------------------------- scrittura

async function scrivi(tabella: string, righe: object[], soloNuove = false) {
  if (!righe.length) return 0;
  const chiave = tabella === 'materie' ? 'id' : 'nuvola_id';
  const { error } = await db.from(tabella).upsert(righe, { onConflict: chiave, ignoreDuplicates: soloNuove });
  if (error) throw new Passo(`${tabella}: ${error.message}`);
  return righe.length;
}

async function sincronizza() {
  const d = await scarica(await accedi());
  const docenti = N.mappaDocenti([...d.compiti, ...d.lezioni]);
  const nomi = new Set<string>([...d.compiti, ...d.lezioni, ...d.voti].map((x) => x.materia).filter(Boolean));
  const materie = await scrivi('materie', [...nomi].map(N.materia), true);
  // la materia di una verifica è dedotta dal nome: se non esiste ancora, resta vuota
  const { data: esistenti } = await db.from('materie').select('id');
  const ids = new Set((esistenti ?? []).map((m) => m.id));
  const verifiche = N.verifiche(d.eventi, docenti);
  for (const v of verifiche) if (v.materia_id && !ids.has(v.materia_id)) v.materia_id = null;
  const voti = N.voti(d.voti);
  const note = N.note(d.note);
  const compiti = N.compiti(d.compiti);

  return {
    materie,
    compiti: await scrivi('compiti', compiti),
    verifiche: await scrivi('verifiche', verifiche),
    voti: await scrivi('voti', voti),
    note: await scrivi('note', note),
  };
}

// ---------------------------------------------------------------- ingresso

async function autorizzato(req: Request): Promise<boolean> {
  const segreto = Deno.env.get('CRON_SEGRETO');
  if (segreto && req.headers.get('x-cron-segreto') === segreto) return true;
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '');
  const { data } = await db.auth.getUser(token);
  if (!data.user) return false;
  const { count } = await db
    .from('profili')
    .select('id', { count: 'exact', head: true })
    .eq('id', data.user.id)
    .eq('ruolo', 'genitore');
  return !!count;
}

const risposta = (corpo: unknown, stato = 200) =>
  new Response(JSON.stringify(corpo), { status: stato, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (!(await autorizzato(req))) return risposta({ errore: 'solo il cron o un genitore' }, 401);

  const { data: log } = await db.from('sync_log').insert({ fonte: 'nuvola' }).select('id').single();
  let esito: 'ok' | 'errore' = 'ok';
  let dettagli: Record<string, unknown>;
  try {
    dettagli = await sincronizza();
  } catch (e) {
    esito = 'errore';
    dettagli = { errore: e instanceof Passo ? e.message : 'errore imprevisto' };
    if (!(e instanceof Passo)) console.error(e);
    // ponytail: l'avviso ai genitori arriva con le notifiche push (tappa 6); per ora resta nel sync_log.
  }
  await db.from('sync_log').update({ finito_il: new Date().toISOString(), esito, dettagli }).eq('id', log!.id);
  return risposta({ esito, ...dettagli }, esito === 'ok' ? 200 : 502);
});
