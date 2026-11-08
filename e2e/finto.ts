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

// Unisce le tabelle collegate chieste nel select, per esempio materie(nome).
function unisci(t: Tabelle, riga: Record<string, unknown>, select: string | null) {
  if (!select?.includes('materie(')) return riga;
  const m = t.materie?.find((x) => x.id === riga.materia_id);
  return { ...riga, materie: m ? { nome: m.nome } : null };
}

export async function finto(page: Page, t: Tabelle, utente = { id: 'lani', ruolo: 'lani', nome: 'Lani' }) {
  t.profili ??= [utente];
  const chiamate: { tipo: string; id: string }[] = [];

  await page.addInitScript((u) => {
    const b = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '');
    const jwt = `${b({ alg: 'HS256', typ: 'JWT' })}.${b({ sub: u.id, exp: 4102444800, role: 'authenticated' })}.firma`;
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
    if (url.pathname.startsWith('/auth/v1/')) return json({ id: utente.id });

    const nome = url.pathname.replace('/rest/v1/', '');
    const righe = (t[nome] ??= []);
    const metodo = req.method();
    const uno = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object');

    if (metodo === 'GET' || metodo === 'HEAD') {
      const trovate = filtra(righe, url.searchParams).map((r) => unisci(t, r, url.searchParams.get('select')));
      if (uno) return trovate.length ? json(trovate[0]) : json({ code: 'PGRST116', message: 'nessuna riga' }, 406);
      return json(trovate);
    }
    if (metodo === 'PATCH') {
      const corpo = req.postDataJSON();
      const cambiate = filtra(righe, url.searchParams);
      cambiate.forEach((r) => Object.assign(r, corpo));
      return json(cambiate);
    }
    if (metodo === 'POST') {
      const nuove = [req.postDataJSON()].flat();
      const chiave = url.searchParams.get('on_conflict') ?? Object.keys(nuove[0])[0];
      for (const n of nuove) {
        const c = righe.find((r) => r[chiave] === n[chiave]);
        if (c) Object.assign(c, n);
        else righe.push({ ...n });
      }
      return json(nuove, 201);
    }
    return json({ message: `non previsto: ${metodo} ${nome}` }, 400);
  });

  return { chiamate, t };
}

