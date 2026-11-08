import { useEffect, useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as R from './lib/regole';
import { GIORNI, MESI } from './spunte';

// Area genitori — design/Genitori.html. Tutto passa dal client del genitore (sul suo telefono la
// sessione normale, sull'iPad di Lani quella a parte sbloccata con il PIN): la RLS lo riconosce
// come genitore e la funzione "passi" decide i passi come per Lani.
// ponytail: "Da fotografare" (richieste di foto e Storage) è ancora da fare.

type Pagina = 'settimana' | 'premi' | 'correzioni' | 'fogli' | 'impostazioni';
const VOCI_GESTI = [
  ['scrivania', 'Scrivania in ordine'],
  ['lavastoviglie', 'Lavastoviglie fatta'],
  ['letto', 'Letto fatto'],
  ['vestiti', 'Vestiti in ordine'],
] as const;
const SGRIDATE = [
  ['bagno', 'Bagno'],
  ['antisportivo', 'Antisportiva'],
  ['balla', 'Balla'],
] as const;

export default function Genitori({ client, esci }: { client: SupabaseClient; esci: () => void }) {
  const [pagina, setPagina] = useState<Pagina>('settimana');
  const [avviso, setAvviso] = useState('');
  const passi = async (tipo: string, id: string) => {
    const { data } = await client.functions.invoke('passi', { body: { tipo, id } });
    return (data?.passi as number) ?? 0;
  };
  const props = { client, passi, avvisa: setAvviso };

  return (
    <section className="sera genitori">
      <h1>Genitori</h1>
      <nav className="schede" aria-label="Sezioni genitori">
        {(['settimana', 'premi', 'correzioni', 'fogli', 'impostazioni'] as Pagina[]).map((p) => (
          <button key={p} aria-current={p === pagina ? 'page' : undefined} onClick={() => (setPagina(p), setAvviso(''))}>
            {p.replace(/^./, (c) => c.toUpperCase())}
          </button>
        ))}
      </nav>
      {avviso && <p role="status" className="pillola">{avviso}</p>}
      {pagina === 'settimana' && <Settimana {...props} />}
      {pagina === 'premi' && <Premi {...props} />}
      {pagina === 'correzioni' && <Correzioni {...props} />}
      {pagina === 'fogli' && <Fogli {...props} />}
      {pagina === 'impostazioni' && <Impostazioni {...props} />}
      <button className="secondario" onClick={esci}>Esci</button>
    </section>
  );
}

type Props = { client: SupabaseClient; passi: (tipo: string, id: string) => Promise<number>; avvisa: (s: string) => void };

function Settimana({ client, passi, avvisa }: Props) {
  const oggi = R.giornoRoma(new Date());
  const lun = R.lunedi(oggi);
  const dom = new Date(lun.getFullYear(), lun.getMonth(), lun.getDate() + 6);
  const [d, setD] = useState<{ media: number | null; obiettivo: number; note: number; serate: number; gestiOggi: number }>();

  async function carica() {
    const [v, o, n, s, g] = await Promise.all([
      client.from('voti').select('voto'),
      client.from('impostazioni').select('valore').eq('chiave', 'obiettivo_media').maybeSingle(),
      client.from('note').select('id', { count: 'exact', head: true }).gte('data', R.iso(lun)).lte('data', R.iso(dom)),
      client.from('serate').select('data').gte('data', R.iso(lun)).lte('data', R.iso(dom)).not('cartella_il', 'is', null),
      client.from('movimenti_passi').select('passi').eq('motivo', 'gesto').eq('giorno', R.iso(oggi)),
    ]);
    const voti = (v.data ?? []).map((x) => Number(x.voto));
    setD({
      media: voti.length ? voti.reduce((a, b) => a + b, 0) / voti.length : null,
      obiettivo: Number(o.data?.valore ?? 7.35),
      note: n.count ?? 0,
      serate: (s.data ?? []).length,
      gestiOggi: (g.data ?? []).reduce((a, x) => a + x.passi, 0),
    });
  }
  useEffect(() => {
    carica();
  }, []);

  async function gesto(voce: string, nome: string) {
    const { data, error } = await client.from('gesti_casa').insert({ voce }).select('id').single();
    if (error || !data) return avvisa('Non salvato. Riprova.');
    const p = await passi('gesto', data.id);
    avvisa(p ? `${nome}: +${p}. Lani lo vedrà con la tua faccia.` : `${nome}: oggi il tetto dei gesti è già pieno.`);
    carica();
  }

  async function sgrida(tipo: string, nome: string) {
    let nota: string | null = null;
    if (tipo === 'balla') {
      nota = window.prompt('Che cosa ha detto di non vero? (lo legge Lani)');
      if (!nota) return;
    } else if (!window.confirm(`Segnare "${nome}"? Lani perde passi e vede il popup.`)) return;
    const { data, error } = await client.from('sgridate').insert({ tipo, nota }).select('id').single();
    if (error || !data) return avvisa('Non salvato. Riprova.');
    const p = await passi('sgridata', data.id);
    avvisa(p ? `${nome}: ${String(p).replace('-', '−')} passi.` : `${nome} segnata.`);
  }

  if (!d) return null;
  const fmt = (n: number | null) => (n === null ? '–' : n.toLocaleString('it-IT', { maximumFractionDigits: 2 }));
  const tetto = R.CONFIG.passi.gesti_casa.tetto_giornaliero;
  return (
    <>
      <p className="nota">
        Dal {lun.getDate()} al {dom.getDate()} {MESI[dom.getMonth()]}
      </p>
      <dl className="numeri">
        <div>
          <dt>Media</dt>
          <dd>{fmt(d.media)}</dd>
          <dt>obiettivo {fmt(d.obiettivo)}</dt>
        </div>
        <div>
          <dt>Note</dt>
          <dd>{d.note}</dd>
          <dt>questa settimana</dt>
        </div>
        <div>
          <dt>Cartelle</dt>
          <dd>{d.serate}</dd>
          <dt>sere chiuse</dt>
        </div>
      </dl>
      <div className="carta">
        <h2>Dai qualche passo</h2>
        <p className="nota">
          Oggi {d.gestiOggi} su {tetto}
        </p>
        <div className="griglia">
          {VOCI_GESTI.map(([v, nome]) => (
            <button key={v} className="secondario" disabled={d.gestiOggi >= tetto} onClick={() => gesto(v, nome)}>
              {nome} +{R.CONFIG.passi.gesti_casa.voci[v]}
            </button>
          ))}
        </div>
      </div>
      <div className="carta">
        <h2>Da segnare, se serve</h2>
        <div className="griglia">
          {SGRIDATE.map(([t, nome]) => (
            <button key={t} className="secondario" onClick={() => sgrida(t, nome)}>
              {nome} {String(R.passiSgridata(t)).replace('-', '−')}
            </button>
          ))}
        </div>
        <p className="nota">Dopo le 21 il popup aspetta la mattina.</p>
      </div>
    </>
  );
}

type Forziere = { n: number; premio: string | null; enigma: string | null; soluzione: string | null; stato: string };

function Premi({ client, avvisa }: Props) {
  const [forzieri, setForzieri] = useState<Forziere[]>();
  const [lavoro, setLavoro] = useState<number>();
  const carica = () => client.from('forzieri').select('n, premio, enigma, soluzione, stato').order('n').then(({ data }) => setForzieri(data ?? []));
  useEffect(() => {
    carica();
  }, []);

  async function salva(e: FormEvent<HTMLFormElement>, n: number) {
    e.preventDefault();
    const premio = String(new FormData(e.currentTarget).get('premio')).trim();
    if (!premio) return;
    setLavoro(n);
    const { error } = await client.from('forzieri').update({ premio }).eq('n', n);
    if (error) {
      setLavoro(undefined);
      return avvisa('Premio non salvato.');
    }
    const { data } = await client.functions.invoke('enigma', { body: { azione: 'genera', n } });
    setLavoro(undefined);
    avvisa(data?.enigma ? `Forziere ${n}: premio salvato ed enigma pronto.` : `Forziere ${n}: premio salvato; l'enigma non è riuscito, riprova.`);
    carica();
  }

  async function consegnato(n: number) {
    await client.from('forzieri').update({ stato: 'consegnato', consegnato_il: new Date().toISOString() }).eq('n', n);
    carica();
  }

  if (!forzieri) return null;
  const senza = forzieri.filter((f) => !f.premio).length;
  return (
    <>
      <p className="nota">
        {senza ? `${senza} forzieri ancora senza premio.` : 'Tutti i forzieri hanno un premio.'} I primi piccoli, poi sempre più importanti; la cima legata alla pagella di giugno.
      </p>
      {forzieri.map((f) => {
        const conf = R.CONFIG.forzieri.find((x) => x.n === f.n)!;
        return (
          <div className="carta" key={f.n}>
            <h2>
              {f.n === 9 ? 'Cima' : `Forziere ${f.n}`} · tappa {conf.tappa}, {conf.chiavi} chiavi
            </h2>
            {f.stato === 'chiuso' ? (
              <form className="modulo" onSubmit={(e) => salva(e, f.n)}>
                <label>
                  Premio
                  <input name="premio" defaultValue={f.premio ?? ''} maxLength={120} />
                </label>
                <button className="principale" disabled={lavoro === f.n}>
                  {lavoro === f.n ? 'Scrivo l’enigma…' : f.premio ? 'Cambia e rifai l’enigma' : 'Salva e crea l’enigma'}
                </button>
              </form>
            ) : (
              <p>
                <b>{f.premio ?? 'senza premio'}</b> · {f.stato}
              </p>
            )}
            {f.enigma && (
              <details>
                <summary>Enigma e soluzione</summary>
                <p className="biglietto">{f.enigma}</p>
                <p className="nota">Soluzione: {f.soluzione}</p>
              </details>
            )}
            {f.stato === 'aperto' && (
              <button className="secondario" onClick={() => consegnato(f.n)}>
                Segna come consegnato
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}

type Spuntato = { id: string; testo: string; fatto_il: string; materie: { nome: string } | null };

function Correzioni({ client, avvisa }: Props) {
  const [compiti, setCompiti] = useState<Spuntato[]>();
  const carica = () =>
    client
      .from('compiti')
      .select('id, testo, fatto_il, materie(nome)')
      .not('fatto_il', 'is', null)
      .gte('fatto_il', new Date(Date.now() - 7 * 864e5).toISOString())
      .order('fatto_il', { ascending: false })
      .then(({ data }) => setCompiti((data ?? []) as unknown as Spuntato[]));
  useEffect(() => {
    carica();
  }, []);

  async function togli(c: Spuntato) {
    if (!window.confirm('Togliere la spunta? Lani perde i passi di questo compito e vede chi l’ha corretta.')) return;
    const { data: stornato, error } = await client.rpc('storna_spunta', { p_motivo: 'compito', p_riferimento: c.id });
    if (error) return avvisa('Correzione non riuscita.');
    const { data: u } = await client.auth.getUser();
    await client.from('compiti').update({ fatto_il: null, corretto_da: u.user?.id, corretto_il: new Date().toISOString() }).eq('id', c.id);
    avvisa(stornato ? 'Spunta tolta e passi annullati.' : 'Spunta tolta (i passi erano già chiusi con le chiavi della settimana).');
    carica();
  }

  if (!compiti) return null;
  return (
    <div className="carta">
      <h2>Spunte degli ultimi 7 giorni</h2>
      <p className="nota">Se un compito era spuntato ma non fatto. Per un imbroglio voluto c’è anche “Balla”.</p>
      {compiti.length === 0 && <p>Nessuna spunta.</p>}
      <ul className="spunte">
        {compiti.map((c) => {
          const g = R.giornoRoma(c.fatto_il);
          return (
            <li key={c.id} className="foglio">
              <span>
                <b>{c.materie?.nome ?? 'Compito'}</b>: {c.testo}
                <br />
                <small>{GIORNI[g.getDay()]}</small>
              </span>
              <button className="secondario stretto" onClick={() => togli(c)}>Togli</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type Foglio = { id: string; titolo: string; scadenza: string | null; dato_il: string | null; consegnato_il: string | null };

function Fogli({ client, passi, avvisa }: Props) {
  const [fogli, setFogli] = useState<Foglio[]>();
  const carica = () =>
    client
      .from('fogli_firma')
      .select('id, titolo, scadenza, dato_il, consegnato_il')
      .is('consegnato_il', null)
      .order('scadenza')
      .then(({ data }) => setFogli(data ?? []));
  useEffect(() => {
    carica();
  }, []);

  async function aggiungi(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const form = e.currentTarget;
    const { error } = await client.from('fogli_firma').insert({ titolo: String(f.get('titolo')), scadenza: f.get('scadenza') || null });
    if (error) return avvisa('Foglio non salvato.');
    form.reset();
    carica();
  }

  async function consegnato(id: string) {
    await client.from('fogli_firma').update({ consegnato_il: new Date().toISOString() }).eq('id', id);
    const p = await passi('foglio', id);
    avvisa(p ? `Foglio consegnato: +${p} a Lani.` : 'Foglio consegnato.');
    carica();
  }

  if (!fogli) return null;
  return (
    <>
      <form className="carta modulo" onSubmit={aggiungi}>
        <h2>Nuovo foglio da firmare</h2>
        <label>
          Che foglio è
          <input name="titolo" required maxLength={80} />
        </label>
        <label>
          Entro il
          <input name="scadenza" type="date" />
        </label>
        <button className="principale">Aggiungi</button>
      </form>
      <div className="carta">
        <h2>Da firmare</h2>
        {fogli.length === 0 && <p>Nessun foglio in sospeso.</p>}
        <ul className="spunte">
          {fogli.map((f) => (
            <li key={f.id} className="foglio">
              <span>
                {f.titolo}
                <br />
                <small>{f.dato_il ? 'Lani dice di averlo dato' : 'Lani non l’ha ancora dato'}</small>
              </span>
              <button className="secondario stretto" onClick={() => consegnato(f.id)}>Firmato</button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function Impostazioni({ client, avvisa }: Props) {
  const [v, setV] = useState<{ chiusura: Record<string, string>; materiale: Record<string, string[]>; obiettivo: number }>();
  useEffect(() => {
    client
      .from('impostazioni')
      .select('chiave, valore')
      .in('chiave', ['ora_chiusura', 'materiale_cartella', 'obiettivo_media'])
      .then(({ data }) => {
        const m = Object.fromEntries((data ?? []).map((r) => [r.chiave, r.valore]));
        setV({ chiusura: m.ora_chiusura ?? {}, materiale: m.materiale_cartella ?? {}, obiettivo: Number(m.obiettivo_media ?? 7.35) });
      });
  }, []);

  async function salva(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const chiusura: Record<string, string> = {};
    const materiale: Record<string, string[]> = {};
    for (let g = 0; g < 7; g++) {
      const ora = String(f.get(`chiusura${g}`) ?? '');
      if (ora) chiusura[g] = ora;
      const righe = String(f.get(`materiale${g}`) ?? '').split('\n').map((s) => s.trim()).filter(Boolean);
      if (righe.length) materiale[g] = righe;
    }
    const { error } = await client.from('impostazioni').upsert([
      { chiave: 'ora_chiusura', valore: chiusura },
      { chiave: 'materiale_cartella', valore: materiale },
      { chiave: 'obiettivo_media', valore: Number(String(f.get('obiettivo')).replace(',', '.')) },
    ]);
    avvisa(error ? 'Impostazioni non salvate.' : 'Impostazioni salvate.');
  }

  async function pin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const { error } = await client.rpc('imposta_pin', { p_pin: String(new FormData(form).get('pin')) });
    avvisa(error ? 'PIN non salvato: servono da 4 a 8 cifre.' : 'PIN salvato.');
    if (!error) form.reset();
  }

  if (!v) return null;
  return (
    <>
      <form className="carta modulo" onSubmit={salva}>
        <h2>Sera e cartella</h2>
        <p className="nota">Ora della chiusura (vuota: niente chiusura). Con allenamento o partita dopo le 17 l’app chiude mezz’ora prima.</p>
        {[1, 2, 3, 4, 5, 6, 0].map((g) => (
          <fieldset key={g} className="giorno">
            <legend>{GIORNI[g]}</legend>
            <label>
              Chiusura
              <input name={`chiusura${g}`} type="time" defaultValue={v.chiusura[g] ?? ''} />
            </label>
            <label>
              Materiale per {GIORNI[(g + 1) % 7]} (uno per riga)
              <textarea name={`materiale${(g + 1) % 7}`} rows={2} defaultValue={(v.materiale[(g + 1) % 7] ?? []).join('\n')} />
            </label>
          </fieldset>
        ))}
        <label>
          Obiettivo media del liceo
          <input name="obiettivo" inputMode="decimal" defaultValue={String(v.obiettivo).replace('.', ',')} />
        </label>
        <button className="principale">Salva</button>
      </form>
      <form className="carta modulo" onSubmit={pin}>
        <h2>PIN dell’area genitori (iPad)</h2>
        <label>
          Nuovo PIN
          <input name="pin" type="password" inputMode="numeric" pattern="\d{4,8}" autoComplete="new-password" required />
        </label>
        <button className="principale">Salva PIN</button>
      </form>
    </>
  );
}
