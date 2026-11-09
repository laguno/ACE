// Client minimo con l'interfaccia di supabase-js sopra PGlite, come service role: la parte che usano
// davvero i moduli condivisi delle funzioni (passi, chiavi, voti, forzieri, popup). Così il
// simulatore esegue lo stesso codice delle Edge Functions, sul database con le migrazioni vere.
// Le righe escono come JSON di Postgres (date "AAAA-MM-GG", ore ISO), come da PostgREST.
// ponytail: solo gli operatori usati oggi (eq, neq, gt, gte, lt, lte, in, is, not is, or, order,
// limit); un operatore nuovo nelle funzioni fallisce qui con "operatore non previsto".
import type { PGlite } from '@electric-sql/pglite';

type Riga = Record<string, unknown>;
type Esito = { data: unknown; error: { message: string } | null; count?: number | null };

class Catalogo {
  private colonne = new Map<string, Map<string, string>>();
  private chiavi = new Map<string, string[]>();
  private legami = new Map<string, { col: string; verso: 'genitore' | 'figli'; destinazione: string } | null>();
  constructor(private db: PGlite) {}

  async tipi(t: string) {
    if (!this.colonne.has(t)) {
      const r = await this.db.query<{ c: string; t: string }>(`select column_name c, data_type t from information_schema.columns where table_schema = 'public' and table_name = $1`, [t]);
      this.colonne.set(t, new Map(r.rows.map((x) => [x.c, x.t])));
    }
    return this.colonne.get(t)!;
  }

  async primaria(t: string) {
    if (!this.chiavi.has(t)) {
      const r = await this.db.query<{ c: string }>(
        `select a.attname c from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey) where i.indrelid = ('public.' || $1)::regclass and i.indisprimary`,
        [t],
      );
      this.chiavi.set(t, r.rows.map((x) => x.c));
    }
    return this.chiavi.get(t)!;
  }

  /** Legame per l'embed di PostgREST: da t a x (colonna di t verso x, o figli di x che puntano a t). */
  async legame(t: string, x: string) {
    const k = `${t}>${x}`;
    if (!this.legami.has(k)) {
      const fk = `select a.attname col from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
                  where c.contype = 'f' and c.conrelid = ('public.' || $1)::regclass and c.confrelid = ('public.' || $2)::regclass limit 1`;
      const su = await this.db.query<{ col: string }>(fk, [t, x]);
      const giu = su.rows[0] ? null : (await this.db.query<{ col: string }>(fk, [x, t])).rows[0];
      this.legami.set(k, su.rows[0] ? { col: su.rows[0].col, verso: 'genitore', destinazione: x } : giu ? { col: giu.col, verso: 'figli', destinazione: x } : null);
    }
    return this.legami.get(k)!;
  }
}

/** Divide sulle virgole fuori dalle parentesi. */
function pezzi(s: string): string[] {
  const fuori: string[] = [];
  let livello = 0;
  let pezzo = '';
  for (const c of s) {
    if (c === '(') livello++;
    if (c === ')') livello--;
    if (c === ',' && livello === 0) {
      fuori.push(pezzo.trim());
      pezzo = '';
    } else pezzo += c;
  }
  if (pezzo.trim()) fuori.push(pezzo.trim());
  return fuori;
}

const OPERATORI: Record<string, string> = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' };
const nome = (c: string) => `"${c.replace(/"/g, '')}"`;

class Query implements PromiseLike<Esito> {
  private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private colonne = '*';
  private ritorna = false;
  private conta = false;
  private testa = false;
  private valori: Riga[] = [];
  private conflitto?: string;
  private ignora = false;
  private dove: string[] = [];
  private par: unknown[] = [];
  private ordini: string[] = [];
  private limite?: number;
  private uno?: 'single' | 'maybe';

  constructor(
    private db: PGlite,
    private cat: Catalogo,
    private t: string,
  ) {}

  private p(v: unknown) {
    this.par.push(v);
    return `$${this.par.length}`;
  }

  select(colonne = '*', o?: { count?: 'exact'; head?: boolean }) {
    if (this.op === 'select') {
      this.conta = o?.count === 'exact';
      this.testa = !!o?.head;
    } else this.ritorna = true;
    this.colonne = colonne;
    return this;
  }
  insert(v: Riga | Riga[]) {
    this.op = 'insert';
    this.valori = Array.isArray(v) ? v : [v];
    return this;
  }
  upsert(v: Riga | Riga[], o?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.op = 'upsert';
    this.valori = Array.isArray(v) ? v : [v];
    this.conflitto = o?.onConflict;
    this.ignora = !!o?.ignoreDuplicates;
    return this;
  }
  update(v: Riga) {
    this.op = 'update';
    this.valori = [v];
    return this;
  }
  delete() {
    this.op = 'delete';
    return this;
  }

  private confronto(c: string, op: string, v: unknown) {
    if (op === 'is') return `${nome(c)} is ${v === null || v === 'null' ? 'null' : v ? 'true' : 'false'}`;
    if (op === 'in') {
      const lista = (Array.isArray(v) ? v : String(v).replace(/^\(|\)$/g, '').split(',')) as unknown[];
      return lista.length ? `${nome(c)} in (${lista.map((x) => this.p(x)).join(', ')})` : 'false';
    }
    if (!OPERATORI[op]) throw new Error(`operatore non previsto: ${op}`);
    return `${nome(c)} ${OPERATORI[op]} ${this.p(v)}`;
  }
  private f(c: string, op: string, v: unknown) {
    this.dove.push(this.confronto(c, op, v));
    return this;
  }
  eq(c: string, v: unknown) { return this.f(c, 'eq', v); }
  neq(c: string, v: unknown) { return this.f(c, 'neq', v); }
  gt(c: string, v: unknown) { return this.f(c, 'gt', v); }
  gte(c: string, v: unknown) { return this.f(c, 'gte', v); }
  lt(c: string, v: unknown) { return this.f(c, 'lt', v); }
  lte(c: string, v: unknown) { return this.f(c, 'lte', v); }
  in(c: string, v: unknown[]) { return this.f(c, 'in', v); }
  is(c: string, v: unknown) { return this.f(c, 'is', v); }
  not(c: string, op: string, v: unknown) {
    this.dove.push(`not (${this.confronto(c, op, v)})`);
    return this;
  }
  /** Sintassi di PostgREST: "a.gte.1,and(b.lte.2,c.eq.x)". */
  or(espressione: string) {
    const parte = (s: string): string => {
      const m = s.match(/^(and|or)\((.*)\)$/);
      if (m) return `(${pezzi(m[2]).map(parte).join(m[1] === 'and' ? ' and ' : ' or ')})`;
      const [c, op, ...resto] = s.split('.');
      return this.confronto(c, op, resto.join('.'));
    };
    this.dove.push(`(${pezzi(espressione).map(parte).join(' or ')})`);
    return this;
  }
  order(c: string, o?: { ascending?: boolean }) {
    this.ordini.push(`${nome(c)} ${o?.ascending === false ? 'desc' : 'asc'}`);
    return this;
  }
  limit(n: number) {
    this.limite = n;
    return this;
  }
  single() {
    this.uno = 'single';
    return this;
  }
  maybeSingle() {
    this.uno = 'maybe';
    return this;
  }

  /** Colonne di un select con gli embed (rel(colonne)) come sottoquery JSON. */
  private async proiezione(t: string, alias: string, colonne: string, livello = 0): Promise<string> {
    const fuori: string[] = [];
    for (const c of pezzi(colonne)) {
      const m = c.match(/^(\w+)\((.*)\)$/);
      if (!m) {
        fuori.push(c === '*' ? `${alias}.*` : `${alias}.${nome(c)}`);
        continue;
      }
      const l = await this.cat.legame(t, m[1]);
      if (!l) throw new Error(`embed sconosciuto: ${t} -> ${m[1]}`);
      const a = `e${livello + 1}`;
      const cols = await this.proiezione(m[1], a, m[2], livello + 1);
      if (l.verso === 'genitore') {
        const pk = (await this.cat.primaria(m[1]))[0];
        fuori.push(`(select to_jsonb(q) from (select ${cols} from public.${nome(m[1])} ${a} where ${a}.${nome(pk)} = ${alias}.${nome(l.col)}) q) as ${nome(m[1])}`);
      } else {
        const pk = (await this.cat.primaria(t))[0];
        fuori.push(`(select coalesce(jsonb_agg(to_jsonb(q)), '[]') from (select ${cols} from public.${nome(m[1])} ${a} where ${a}.${nome(l.col)} = ${alias}.${nome(pk)}) q) as ${nome(m[1])}`);
      }
    }
    return fuori.join(', ');
  }

  /** Valore di una colonna per Postgres: oggetti in JSON, array come array di Postgres. */
  private async valore(c: string, v: unknown) {
    if (v === null || v === undefined || typeof v !== 'object' || v instanceof Date) return v;
    const tipo = (await this.cat.tipi(this.t)).get(c);
    if (Array.isArray(v) && tipo === 'ARRAY') return `{${v.map((x) => JSON.stringify(x)).join(',')}}`;
    return JSON.stringify(v);
  }

  private async sql(): Promise<string> {
    const where = this.dove.length ? ` where ${this.dove.join(' and ')}` : '';
    const t = `public.${nome(this.t)}`;
    if (this.op === 'select') {
      if (this.testa) return `select count(*)::int as n from ${t} t0${where}`;
      const ordine = this.ordini.length ? ` order by ${this.ordini.join(', ')}` : '';
      const limite = this.limite ? ` limit ${this.limite}` : '';
      return `select to_jsonb(q) as r, count(*) over ()::int as n from (select ${await this.proiezione(this.t, 't0', this.colonne)} from ${t} t0${where}${ordine}${limite}) q`;
    }
    const ritorno = ' returning to_jsonb(t0) as r';
    if (this.op === 'delete') return `delete from ${t} t0${where}${ritorno}`;
    if (this.op === 'update') {
      const set = [];
      for (const [c, v] of Object.entries(this.valori[0])) set.push(`${nome(c)} = ${this.p(await this.valore(c, v))}`);
      return `update ${t} t0 set ${set.join(', ')}${where}${ritorno}`;
    }
    const cols = [...new Set(this.valori.flatMap((v) => Object.keys(v)))];
    const righe = [];
    for (const v of this.valori) {
      const celle = [];
      for (const c of cols) celle.push(c in v ? this.p(await this.valore(c, v[c])) : 'default');
      righe.push(`(${celle.join(', ')})`);
    }
    let sql = `insert into ${t} as t0 (${cols.map(nome).join(', ')}) values ${righe.join(', ')}`;
    if (this.op === 'upsert') {
      const su = this.conflitto ? this.conflitto.split(',').map((x) => x.trim()) : await this.cat.primaria(this.t);
      const altre = cols.filter((c) => !su.includes(c));
      sql += ` on conflict (${su.map(nome).join(', ')}) ${this.ignora || !altre.length ? 'do nothing' : `do update set ${altre.map((c) => `${nome(c)} = excluded.${nome(c)}`).join(', ')}`}`;
    }
    return sql + ritorno;
  }

  private async esegui(): Promise<Esito> {
    try {
      const r = await this.db.query<{ r: Riga; n: number }>(await this.sql(), this.par);
      if (this.testa) return { data: null, error: null, count: r.rows[0]?.n ?? 0 };
      let righe = r.rows.map((x) => x.r);
      // dopo una scrittura, select('id') restituisce solo quelle colonne
      if (this.op !== 'select' && this.colonne !== '*') {
        const tenere = pezzi(this.colonne);
        righe = righe.map((x) => Object.fromEntries(tenere.map((c) => [c, x[c]])));
      }
      const count = this.conta ? (r.rows[0]?.n ?? 0) : null;
      if (this.op !== 'select' && !this.ritorna && !this.uno) return { data: null, error: null, count };
      if (this.uno) {
        if (righe.length > 1 || (this.uno === 'single' && righe.length === 0)) return { data: null, error: { message: `attesa una riga, trovate ${righe.length}` }, count };
        return { data: righe[0] ?? null, error: null, count };
      }
      return { data: righe, error: null, count };
    } catch (e) {
      return { data: null, error: { message: e instanceof Error ? e.message : String(e) }, count: null };
    }
  }

  then<A = Esito, B = never>(ok?: ((v: Esito) => A | PromiseLike<A>) | null, ko?: ((e: unknown) => B | PromiseLike<B>) | null): PromiseLike<A | B> {
    return this.esegui().then(ok, ko);
  }
}

/** Client "service role" su PGlite: from(tabella) e rpc(funzione, parametri). */
export function client(db: PGlite) {
  const cat = new Catalogo(db);
  return {
    from: (t: string) => new Query(db, cat, t),
    async rpc(f: string, parametri: Riga = {}): Promise<Esito> {
      try {
        const nomi = Object.keys(parametri);
        const r = await db.query<{ r: unknown }>(
          `select to_jsonb(public.${nome(f)}(${nomi.map((k, i) => `${nome(k)} => $${i + 1}`).join(', ')})) as r`,
          nomi.map((k) => parametri[k]),
        );
        return { data: r.rows[0]?.r ?? null, error: null };
      } catch (e) {
        return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
      }
    },
  };
}
