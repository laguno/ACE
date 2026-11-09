// Supabase finto per le prove: tabelle in memoria, filtri eq/is/gte/in, select/update/upsert.
// Basta per le schermate; le regole vere stanno nei test di src/lib e in prova:schema.
import type { Page } from '@playwright/test';

export type Tabelle = Record<string, Record<string, unknown>[]>;

function filtra(righe: Record<string, unknown>[], q: URLSearchParams) {
  return righe.filter((r) =>
    [...q.entries()].every(([k, v]) => {
      if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) return true;
      const [op, ...resto] = v.split('.');
      const val = resto.join('.');
      const x = r[k];
      if (op === 'eq') return String(x) === val;
      if (op === 'is') return val === 'null' ? x == null : String(x) === val;
      if (op === 'gte') return String(x) >= val;
      if (op === 'lte') return String(x) <= val;
      if (op === 'lt') return String(x) < val;
      if (op === 'gt') return String(x) > val;
      if (op === 'in') return val.slice(1, -1).split(',').includes(String(x));
      return true;
    }),
  );
}

// Unisce le tabelle collegate chieste nel select: materie(nome) è il genitore (materia_id), le
// altre sono figlie collegate con <singolare>_id (verifiche -> verifica_id).
const SINGOLARE: Record<string, string> = { verifiche: 'verifica', quiz: 'quiz' };
function unisci(t: Tabelle, nome: string, riga: Record<string, unknown>, select: string | null) {
  const fuori = { ...riga };
  for (const [, x] of (select ?? '').matchAll(/(\w+)\(/g)) {
    if (x === 'materie') {
      const m = t.materie?.find((y) => y.id === riga.materia_id);
      fuori.materie = m ? { nome: m.nome, abbreviazione: m.abbreviazione } : null;
    } else if (`${SINGOLARE[x] ?? x}_id` in riga) {
      // genitore (es. sessioni_ripasso.verifiche): un oggetto, con le sue materie
      const g = (t[x] ?? []).find((y) => y.id === riga[`${SINGOLARE[x] ?? x}_id`]);
      fuori[x] = g ? unisci(t, x, g, 'materie(nome)') : null;
    } else fuori[x] = (t[x] ?? []).filter((c) => c[`${SINGOLARE[nome] ?? nome}_id`] === riga.id);
  }
  return fuori;
}

/** funzioni: risposte delle Edge Functions diverse da passi, per nome (es. { spiega: {...} }). */
export async function finto(page: Page, t: Tabelle, funzioni: Record<string, unknown> = {}) {
  const utente = { id: 'lani', ruolo: 'lani', nome: 'Lani' };
  t.profili ??= [utente];
  const chiamate: { tipo: string; id: string }[] = [];

  await page.addInitScript((u) => {
    const b = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '');
    const jwt = `${b({ alg: 'HS256', typ: 'JWT' })}.${b({ sub: u.id, exp: 4102444800, role: 'authenticated' })}.firma`;
    // le accoglienze della prima accensione hanno le loro prove: qui risultano già viste
    if (!sessionStorage.getItem('prova-accoglienza')) {
      localStorage.setItem('ace-benvenuta', 'fatta');
      localStorage.setItem('ace-avvio-genitori', 'fatto');
    }
    localStorage.setItem(
      'ace-sessione',
      JSON.stringify({
        access_token: jwt,
        refresh_token: 'finto',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: 4102444800,
        user: { id: u.id, aud: 'authenticated', role: 'authenticated', email: 'lani@finto.test' },
      }),
    );
  }, utente);

  await page.route('https://finto.supabase.test/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const json = (corpo: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(corpo) });

    if (url.pathname.startsWith('/functions/v1/passi')) {
      chiamate.push(req.postDataJSON());
      return json({ passi: 0 });
    }
    if (url.pathname.startsWith('/functions/v1/')) return json(funzioni[url.pathname.split('/')[3]] ?? {});
    if (url.pathname.startsWith('/auth/v1/')) return json({ id: utente.id });

    const nome = url.pathname.replace('/rest/v1/', '');
    const righe = (t[nome] ??= []);
    const metodo = req.method();
    const uno = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object');

    // come la funzione vera: saldo visto prima (o quello attuale, la prima volta), poi lo aggiorna
    if (nome === 'rpc/vedi_saldo') {
      const adesso = Number(t.saldo_passi?.[0]?.passi ?? 0);
      const prima = Number(t.saldo_visto?.[0]?.passi ?? adesso);
      t.saldo_visto = [{ passi: adesso }];
      return json(uno ? { prima, adesso } : [{ prima, adesso }]);
    }

    if (metodo === 'GET' || metodo === 'HEAD') {
      const trovate = ordina(filtra(righe, url.searchParams), url.searchParams.get('order')).map((r) => unisci(t, nome, r, url.searchParams.get('select')));
      if (uno) return trovate.length ? json(trovate[0]) : json({ code: 'PGRST116', message: 'nessuna riga' }, 406);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'content-range': `0-${Math.max(0, trovate.length - 1)}/${trovate.length}`,
          'access-control-expose-headers': 'content-range',
          'access-control-allow-origin': '*',
        },
        body: JSON.stringify(trovate),
      });
    }
    if (metodo === 'PATCH') {
      const corpo = req.postDataJSON();
      const cambiate = filtra(righe, url.searchParams);
      cambiate.forEach((r) => Object.assign(r, corpo));
      return json(cambiate);
    }
    if (metodo === 'POST') {
      const nuove = [req.postDataJSON()].flat();
      const chiave = url.searchParams.get('on_conflict');
      const salvate = nuove.map((n) => {
        const c = chiave && righe.find((r) => r[chiave] === n[chiave]);
        if (c) return Object.assign(c, n);
        const riga = { id: `nuovo-${righe.length + 1}`, numero: 1, ...n };
        righe.push(riga);
        return riga;
      });
      return json(uno ? salvate[0] : salvate, 201);
    }
    return json({ message: `non previsto: ${metodo} ${nome}` }, 400);
  });

  return { chiamate, t };
}


/** order=priorita.asc,creato_il.asc */
function ordina(righe: Record<string, unknown>[], order: string | null) {
  if (!order) return righe;
  const chiavi = order.split(',').map((o) => o.split('.'));
  return [...righe].sort((a, b) => {
    for (const [k, dir] of chiavi) {
      const x = String(a[k] ?? ''), y = String(b[k] ?? '');
      if (x !== y) return (x < y ? -1 : 1) * (dir === 'desc' ? -1 : 1);
    }
    return 0;
  });
}
