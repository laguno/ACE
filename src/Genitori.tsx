import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CaretRight, Eye, GearSix, Pulse } from '@phosphor-icons/react';
import { Attesa, Riquadro, Sticker } from './kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as R from './lib/regole';
import { installata } from './Benvenuta';
import { GIORNI, MESI } from './spunte';
import Vetrina from './Vetrina';
import { Biglietto } from './Biglietto';
import { ImmaginePremio, immaginiPremi, type Immagine } from './ImmaginePremio';
import { FotoSalvate, Fotografa, SELECT_RICHIESTE, descrizione, type RichiestaFoto } from './Foto';
import Stato from './Stato';

// Area genitori — design/Genitori.html. Tutto passa dal client del genitore (sul suo telefono la
// sessione normale, sull'iPad di Lani quella a parte sbloccata con il PIN): la RLS lo riconosce
// come genitore e la funzione "passi" decide i passi come per Lani.

type Pagina = 'settimana' | 'premi' | 'correzioni' | 'fogli' | 'altro' | 'impostazioni' | 'stato' | 'vetrina';
/** Quattro schede più "Altro" (Impostazioni, Stato e Vetrina stanno lì dentro). */
const SCHEDE: [Pagina, string][] = [
  ['settimana', 'Settimana'],
  ['premi', 'Premi'],
  ['correzioni', 'Correzioni'],
  ['fogli', 'Fogli'],
  ['altro', 'Altro'],
];
const TITOLI: Record<Pagina, string> = {
  settimana: 'La settimana di Lani',
  premi: 'Premi dei forzieri',
  correzioni: 'Correzioni',
  fogli: 'Fogli da firmare',
  altro: 'Altro',
  impostazioni: 'Impostazioni',
  stato: 'Stato di ACE',
  vetrina: 'Vetrina',
};
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
  const [avvio, setAvvio] = useState(() => {
    try {
      return localStorage.getItem('ace-avvio-genitori') !== 'fatto';
    } catch {
      return false;
    }
  });
  if (avvio)
    return (
      <Avvio
        client={client}
        vai={(p) => {
          try {
            localStorage.setItem('ace-avvio-genitori', 'fatto');
          } catch {
            /* tornerà la prossima volta */
          }
          setPagina(p);
          setAvvio(false);
        }}
      />
    );

  const oggi = R.giornoRoma(new Date());
  const lun = R.lunedi(oggi);
  const dom = new Date(lun.getFullYear(), lun.getMonth(), lun.getDate() + 6);
  const vai = (p: Pagina) => (setPagina(p), setAvviso(''));
  const scheda = pagina === 'impostazioni' || pagina === 'stato' || pagina === 'vetrina' ? 'altro' : pagina;
  return (
    <section className="sera genitori">
      <header className="testa-genitori">
        <Sticker posa="lani-contenta" misura={72} />
        <div>
          <p className="sopratitolo">
            Dal {lun.getDate()} al {dom.getDate()} {MESI[dom.getMonth()]}
          </p>
          <h1>{TITOLI[pagina]}</h1>
        </div>
      </header>
      <nav className="schede" aria-label="Sezioni genitori">
        {SCHEDE.map(([p, nome]) => (
          <button key={p} aria-current={p === scheda ? 'page' : undefined} onClick={() => vai(p)}>
            {nome}
          </button>
        ))}
      </nav>
      {avviso && <p role="status" className="pillola">{avviso}</p>}
      {pagina === 'settimana' && <Settimana {...props} />}
      {pagina === 'premi' && <Premi {...props} />}
      {pagina === 'correzioni' && <Correzioni {...props} />}
      {pagina === 'fogli' && <Fogli {...props} />}
      {pagina === 'altro' && <Altro vai={vai} />}
      {pagina === 'impostazioni' && <Impostazioni {...props} />}
      {pagina === 'stato' && <Stato client={client} />}
      {pagina === 'vetrina' && <Vetrina />}
      <button className="link esci" onClick={esci}>
        Esci dall'area genitori
      </button>
    </section>
  );
}

type Props = { client: SupabaseClient; passi: (tipo: string, id: string) => Promise<number>; avvisa: (s: string) => void };

/** "Altro": Impostazioni, Stato e Vetrina, come le righe della bozza. */
function Altro({ vai }: { vai: (p: Pagina) => void }) {
  const righe: [Pagina, string, string, typeof GearSix][] = [
    ['impostazioni', 'Impostazioni', 'Orari, materiale, PIN', GearSix],
    ['stato', 'Stato di ACE', 'Sincronizzazioni, chiavi, errori', Pulse],
    ['vetrina', 'Vetrina', 'Popup, animazioni e notifiche, come li vede Lani', Eye],
  ];
  return (
    <div className="carta elenco">
      {righe.map(([p, nome, testo, Icona]) => (
        <button key={p} className="riga-elenco" onClick={() => vai(p)}>
          <Riquadro colore="lilla">
            <Icona size={24} weight="bold" aria-hidden />
          </Riquadro>
          <span>
            <b>{nome}</b>
            <small>{testo}</small>
          </span>
          <CaretRight size={20} weight="bold" aria-hidden />
        </button>
      ))}
    </div>
  );
}

/** Foglio dell'app al posto di confirm/prompt del browser: conferma, con un campo di testo se serve. */
function FoglioApp({ titolo, testo, campo, azione = 'Segna', conferma, chiudi }: { titolo: string; testo: string; campo?: string; azione?: string; conferma: (nota: string | null) => void; chiudi: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [nota, setNota] = useState('');
  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal?.();
  }, []);
  return (
    <dialog
      ref={ref}
      className="velo foglio-app"
      aria-labelledby="foglio-titolo"
      onCancel={(e) => {
        e.preventDefault();
        chiudi();
      }}
    >
      <form
        className="carta modulo"
        onSubmit={(e) => {
          e.preventDefault();
          if (campo && !nota.trim()) return;
          conferma(campo ? nota.trim() : null);
        }}
      >
        <h2 id="foglio-titolo">{titolo}</h2>
        <p>{testo}</p>
        {campo && (
          <label>
            {campo}
            <textarea rows={3} value={nota} onChange={(e) => setNota(e.target.value)} autoFocus />
          </label>
        )}
        <button className="principale" disabled={!!campo && !nota.trim()}>
          {azione}
        </button>
        <button type="button" className="link" onClick={chiudi}>
          Annulla
        </button>
      </form>
    </dialog>
  );
}

function Settimana({ client, passi, avvisa }: Props) {
  const oggi = R.giornoRoma(new Date());
  const lun = R.lunedi(oggi);
  const dom = new Date(lun.getFullYear(), lun.getMonth(), lun.getDate() + 6);
  const [d, setD] = useState<{ media: number | null; obiettivo: number; note: number; serate: number; gestiOggi: number; foto: RichiestaFoto[] }>();

  async function carica() {
    const [v, o, n, s, g, rf] = await Promise.all([
      client.from('voti').select('voto'),
      client.from('impostazioni').select('valore').eq('chiave', 'obiettivo_media').maybeSingle(),
      client.from('note').select('id', { count: 'exact', head: true }).gte('data', R.iso(lun)).lte('data', R.iso(dom)),
      client.from('serate').select('data').gte('data', R.iso(lun)).lte('data', R.iso(dom)).not('cartella_il', 'is', null),
      client.from('movimenti_passi').select('passi').eq('motivo', 'gesto').eq('giorno', R.iso(oggi)),
      client.from('richieste_foto').select(SELECT_RICHIESTE).eq('stato', 'aperta').order('creato_il'),
    ]);
    const voti = (v.data ?? []).map((x) => Number(x.voto));
    setD({
      media: voti.length ? voti.reduce((a, b) => a + b, 0) / voti.length : null,
      obiettivo: Number(o.data?.valore ?? 7.35),
      note: n.count ?? 0,
      serate: (s.data ?? []).length,
      gestiOggi: (g.data ?? []).reduce((a, x) => a + x.passi, 0),
      foto: (rf.data ?? []) as unknown as RichiestaFoto[],
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

  const [chiede, setChiede] = useState<{ tipo: R.TipoSgridata; nome: string }>();
  async function sgrida(tipo: string, nome: string, nota: string | null) {
    setChiede(undefined);
    const { data, error } = await client.from('sgridate').insert({ tipo, nota }).select('id').single();
    if (error || !data) return avvisa('Non salvato. Riprova.');
    const p = await passi('sgridata', data.id);
    avvisa(p ? `${nome}: ${String(p).replace('-', '−')} passi.` : `${nome} segnata.`);
  }

  if (!d) return <Attesa />;
  const fmt = (n: number | null) => (n === null ? '–' : n.toLocaleString('it-IT', { maximumFractionDigits: 2 }));
  const tetto = R.CONFIG.passi.gesti_casa.tetto_giornaliero;
  return (
    <>
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
          <dt>Serate chiuse</dt>
          <dd>{d.serate}</dd>
          <dt>cartella e compiti</dt>
        </div>
      </dl>
      {d.foto.length > 0 && (
        <div className="carta">
          <div className="testa-carta">
            <h2>Da fotografare</h2>
            <span className="valore">{d.foto.length}</span>
          </div>
          <p className="nota">Pagine del libro di carta per lo studio di Lani. Se le fotografa lei durante i compiti, prende +{R.CONFIG.passi.foto_compito}.</p>
          <ul className="lista-foto">
            {d.foto.map((r) => (
              <li key={r.id}>
                <span>
                  {descrizione(r)}
                  <small>{r.motivo === 'verifica' ? 'Per una verifica' : 'Per un compito'}</small>
                </span>
                <Fotografa
                  client={client}
                  richiesta={r}
                  fatto={() => {
                    avvisa(`Foto salvata: ${descrizione(r)}.`);
                    carica();
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="carta">
        <div className="testa-carta">
          <h2>Dai qualche passo</h2>
          <span className="valore">
            oggi {d.gestiOggi} su {tetto}
          </span>
        </div>
        <div className="griglia">
          {VOCI_GESTI.map(([v, nome]) => (
            <button key={v} className="gesto" disabled={d.gestiOggi >= tetto} onClick={() => gesto(v, nome)}>
              {nome} <span>+{R.CONFIG.passi.gesti_casa.voci[v]}</span>
            </button>
          ))}
        </div>
        <p className="nota piccola">Lani vedrà la tua faccia col pollice.</p>
      </div>
      <div className="carta">
        <h2>Da segnare, se serve</h2>
        <div className="griglia tre">
          {SGRIDATE.map(([t, nome]) => (
            <button key={t} className="sgridata" onClick={() => setChiede({ tipo: t, nome })}>
              {nome} {String(R.passiSgridata(t)).replace('-', '−')}
            </button>
          ))}
        </div>
        <p className="nota piccola">Dopo le 21 il popup aspetta la mattina.</p>
      </div>
      {chiede && (
        <FoglioApp
          titolo={`${chiede.nome} ${String(R.passiSgridata(chiede.tipo)).replace('-', '−')}`}
          testo={chiede.tipo === 'balla' ? 'Scrivi che cosa ha detto di non vero: Lani lo leggerà nel popup.' : 'Lani perde i passi e vede il popup.'}
          campo={chiede.tipo === 'balla' ? 'Che cosa non era vero' : undefined}
          conferma={(nota) => sgrida(chiede.tipo, chiede.nome, nota)}
          chiudi={() => setChiede(undefined)}
        />
      )}
    </>
  );
}

type Forziere = { n: number; premio: string | null; enigma: string | null; soluzione: string | null; aiutino: string | null; parola: string | null; stato: string };

function Premi({ client, avvisa }: Props) {
  const [forzieri, setForzieri] = useState<Forziere[]>();
  const [lavoro, setLavoro] = useState<number>();
  const [immagini, setImmagini] = useState<Immagine[]>([]);
  const carica = () => {
    client.from('forzieri').select('n, premio, enigma, soluzione, aiutino, parola, stato').order('n').then(({ data }) => setForzieri(data ?? []));
    immaginiPremi(undefined, client).then(setImmagini);
  };
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
    const { data, error: e2 } = await client.functions.invoke('enigma', { body: { azione: 'genera', n } });
    setLavoro(undefined);
    // la funzione spiega perché non è riuscito (per la cima: prima gli enigmi dei forzieri 1-8)
    const perche = e2 && 'context' in e2 ? ((await (e2.context as Response).json().catch(() => null))?.errore as string | undefined) : undefined;
    avvisa(data?.enigma ? `Forziere ${n}: premio salvato ed enigma pronto.` : `Forziere ${n}: premio salvato; l'enigma non è riuscito${perche ? ` (${perche})` : ''}, riprova.`);
    // cambiando un premio cambia la sua parola chiave: la cima va rifatta
    if (data?.enigma && n < 9) {
      const cima = forzieri?.find((x) => x.n === 9);
      if (cima?.enigma && cima.stato === 'chiuso') avvisa(`Forziere ${n}: enigma pronto. Rifate anche l'enigma della cima: usa le parole dei forzieri.`);
    }
    carica();
  }

  async function consegnato(n: number) {
    await client.from('forzieri').update({ stato: 'consegnato', consegnato_il: new Date().toISOString() }).eq('n', n);
    carica();
  }

  if (!forzieri) return <Attesa />;
  const senza = forzieri.filter((f) => !f.premio).length;
  return (
    <>
      <p className="nota">
        {senza ? `${senza} forzieri ancora senza premio.` : 'Tutti i forzieri hanno un premio.'} I primi piccoli, poi sempre più importanti; la cima legata alla pagella di giugno.
      </p>
      {forzieri.map((f) => {
        const conf = R.forziere(f.n);
        return (
          <div className="carta" key={f.n}>
            <h2>
              {f.n === 9 ? 'Cima' : `Forziere ${f.n}`} · tappa {conf.tappa}, {conf.chiavi} chiavi
            </h2>
            {f.premio && (
              <div className="premio-genitori">
                <ImmaginePremio img={immagini.find((x) => x.n === f.n) ?? null} misura={96} vera />
                {immagini.find((x) => x.n === f.n)?.manca !== false && (
                  <p className="nota">Immagine da rifare: il premio è cambiato. Lani vede il pacco regalo finché non arriva quella nuova.</p>
                )}
              </div>
            )}
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
              <>
                <p>
                  <b>{f.premio ?? 'senza premio'}</b> · {f.stato}
                </p>
                <button className="principale" disabled>Cambia e rifai l’enigma</button>
                <p className="nota">L’enigma è già comparso a Lani: premio ed enigma non si cambiano più.</p>
              </>
            )}
            {f.enigma && (
              <details>
                <summary>Enigma e soluzione</summary>
                <Biglietto testo={f.enigma} />
                <p className="nota">Soluzione: {f.soluzione}</p>
                {f.aiutino && <p className="nota">Aiutino (dopo il primo errore): {f.aiutino}</p>}
                {f.parola && <p className="nota">Parola chiave per la cima: {f.parola}</p>}
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

  const [chiede, setChiede] = useState<Spuntato>();
  const [cancellaFoto, setCancellaFoto] = useState<() => void>();
  async function togli(c: Spuntato) {
    setChiede(undefined);
    const { data: stornato, error } = await client.rpc('storna_spunta', { p_motivo: 'compito', p_riferimento: c.id });
    if (error) return avvisa('Correzione non riuscita.');
    const { data: u } = await client.auth.getUser();
    await client.from('compiti').update({ fatto_il: null, corretto_da: u.user?.id, corretto_il: new Date().toISOString() }).eq('id', c.id);
    avvisa(stornato ? 'Spunta tolta e passi annullati.' : 'Spunta tolta (i passi erano già chiusi con le chiavi della settimana).');
    carica();
  }

  if (!compiti) return <Attesa />;
  return (
    <>
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
              <button className="secondario stretto" onClick={() => setChiede(c)}>Togli</button>
            </li>
          );
        })}
      </ul>
      {chiede && (
        <FoglioApp
          titolo="Togliere la spunta?"
          azione="Togli"
          testo="Lani perde i passi di questo compito e vede chi l’ha corretta."
          conferma={() => togli(chiede)}
          chiudi={() => setChiede(undefined)}
        />
      )}
      </div>
      <FotoSalvate client={client} avvisa={avvisa} conferma={(si) => setCancellaFoto(() => si)} />
      {cancellaFoto && (
        <FoglioApp
          titolo="Cancellare la foto?"
          azione="Cancella"
          testo="La foto si cancella per sempre. I passi di Lani restano."
          conferma={() => (setCancellaFoto(undefined), cancellaFoto())}
          chiudi={() => setCancellaFoto(undefined)}
        />
      )}
    </>
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

  if (!fogli) return <Attesa />;
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

  if (!v) return <Attesa />;
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
      <FrasiDiFamiglia client={client} avvisa={avvisa} />
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

/** Frasi di famiglia (docs/05): le aggiungono i genitori e passano davanti alle altre, in qualsiasi momento. */
function FrasiDiFamiglia({ client, avvisa }: Pick<Props, 'client' | 'avvisa'>) {
  const [frasi, setFrasi] = useState<{ id: string; testo: string; autore: string | null }[]>([]);
  const carica = () =>
    client
      .from('frasi')
      .select('id, testo, autore')
      .eq('di_famiglia', true)
      .order('testo')
      .then(({ data }) => setFrasi(data ?? []));
  useEffect(() => {
    carica();
  }, []);

  async function aggiungi(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const testo = String(f.get('testo')).trim();
    const autore = String(f.get('autore')).trim() || null;
    const { error } = await client.from('frasi').insert({ testo, autore, di_famiglia: true });
    avvisa(error ? 'Frase non salvata: forse c’è già.' : 'Frase salvata: Lani la vedrà in uno dei prossimi giorni.');
    if (!error) {
      form.reset();
      carica();
    }
  }
  async function togli(id: string) {
    const { error } = await client.from('frasi').delete().eq('id', id);
    avvisa(error ? 'Frase non tolta.' : 'Frase tolta.');
    carica();
  }

  return (
    <form className="carta modulo" onSubmit={aggiungi}>
      <h2>Frasi di famiglia</h2>
      <p className="nota">Una frase al giorno al massimo, mai nei rimproveri. Le vostre passano davanti alle altre.</p>
      {frasi.length > 0 && (
        <ul className="spunte">
          {frasi.map((x) => (
            <li key={x.id} className="foglio">
              <span>
                «{x.testo}»
                {x.autore && (
                  <>
                    <br />
                    <small>{x.autore}</small>
                  </>
                )}
              </span>
              <button type="button" className="secondario stretto" onClick={() => togli(x.id)} aria-label={`Togli: ${x.testo}`}>
                Togli
              </button>
            </li>
          ))}
        </ul>
      )}
      <label>
        Frase
        <textarea name="testo" rows={2} maxLength={140} required />
      </label>
      <label>
        Di chi (facoltativo)
        <input name="autore" maxLength={40} placeholder="papà, nonna, un proverbio…" />
      </label>
      <button className="principale">Aggiungi la frase</button>
    </form>
  );
}

/** Prima accensione dei genitori (design/Genitori-avvio.html): quattro cose, una volta sola. */
function Avvio({ client, vai }: { client: SupabaseClient; vai: (p: Pagina) => void }) {
  const [s, setS] = useState<{ nuvola: boolean; senzaPremio: number }>();
  useEffect(() => {
    Promise.all([
      client.from('sync_log').select('esito').eq('fonte', 'nuvola').order('iniziato_il', { ascending: false }).limit(1),
      client.from('forzieri').select('n', { count: 'exact', head: true }).is('premio', null),
    ]).then(([l, f]) => setS({ nuvola: l.data?.[0]?.esito === 'ok', senzaPremio: f.count ?? 9 }));
  }, []);
  if (!s) return <Attesa />;
  const g = R.CONFIG.passi.gesti_casa;
  const cose = [
    { fatto: s.nuvola, titolo: 'Collega Nuvola', testo: 'Compiti, verifiche e voti arrivano alle 14:30 e alle 19:30' },
    {
      fatto: s.senzaPremio === 0,
      titolo: 'Scegli i premi dei 9 forzieri',
      testo: `Lani non li vede: vede solo l'enigma, vicino al forziere${s.senzaPremio ? ` (ne mancano ${s.senzaPremio})` : ''}`,
    },
    { fatto: false, titolo: 'Controlla gesti di casa e orari', testo: `Scrivania, lavastoviglie, letto, vestiti: +${g.voci.scrivania} ciascuno, al massimo ${g.tetto_giornaliero} al giorno` },
    { fatto: installata(), titolo: 'Metti ACE sulla schermata Home', testo: 'Da Safari: Condividi, poi Aggiungi alla schermata Home. Senza, niente notifiche' },
  ];
  return (
    <section className="avvio">
      <header className="avvio-testa">
        <span className="coppia">
          <Sticker posa="papa-passaggio" misura={70} />
          <Sticker posa="mamma-passaggio" misura={70} />
        </span>
        <div>
          <p className="sopratitolo">Per mamma e papà</p>
          <h1>Prepariamo ACE</h1>
        </div>
      </header>
      <p>Quattro cose, una volta sola. Il resto lo fa ACE da solo, due volte al giorno.</p>
      <ol>
        {cose.map((c, i) => (
          <li key={c.titolo} className={`carta${c.fatto ? ' fatto' : ''}`}>
            <span className="segno" aria-hidden>{c.fatto ? '✓' : i + 1}</span>
            <span>
              <b>{c.titolo}</b>
              <span className="solo-lettori">{c.fatto ? ' (fatto)' : ' (da fare)'}</span>
              <small>{c.testo}</small>
            </span>
          </li>
        ))}
      </ol>
      <div className="avvio-piede">
        <button className="principale largo" onClick={() => vai('premi')}>Scegli i premi</button>
        <button className="link" onClick={() => vai('settimana')}>Lo faccio dopo</button>
      </div>
    </section>
  );
}
