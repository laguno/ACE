import { useCallback, useEffect, useState } from 'react';
import * as N from './lib/nuvola';
import * as R from './lib/regole';
import { supabase } from './supabase';

// Sera — design/Domani.html. Lani spunta; i passi li decide la funzione "passi" sul server.
// Cartella dalle lezioni di Nuvola (orario). ponytail: borsa quando arriva il calendario di famiglia.

type Compito = { id: string; testo: string; fatto_il: string | null; materie: { nome: string } | null };
type Foglio = { id: string; titolo: string; scadenza: string | null; dato_il: string | null };

const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

async function passi(tipo: string, id: string) {
  // l'esito non serve qui: i passi si rileggono da movimenti_passi
  await supabase.functions.invoke('passi', { body: { tipo, id } });
}

export default function Sera() {
  const oggi = R.giornoRoma(new Date());
  const domani = R.prossimoGiornoDiScuola(oggi);
  const [compiti, setCompiti] = useState<Compito[]>();
  const [fogli, setFogli] = useState<Foglio[]>([]);
  const [cartella, setCartella] = useState(false);
  const [passiOggi, setPassiOggi] = useState(0);
  const [orario, setOrario] = useState<string[]>([]);
  const [messe, setMesse] = useState(new Set<string>());
  const [errore, setErrore] = useState('');

  useEffect(() => {
    const da = new Date(oggi);
    da.setDate(da.getDate() - 21);
    Promise.all([
      supabase.from('lezioni').select('data, ora, materia_id').gte('data', R.iso(da)),
      supabase.from('materie').select('id, nome'),
    ]).then(([l, m]) => {
      const nomi = new Map((m.data ?? []).map((x) => [x.id, x.nome]));
      setOrario(N.materieDelGiorno(l.data ?? [], domani.getDay()).map((id) => nomi.get(id) ?? id));
    });
  }, [R.iso(domani)]);

  const carica = useCallback(async () => {
    const [c, f, s, m] = await Promise.all([
      supabase.from('compiti').select('id, testo, fatto_il, materie(nome)').eq('scadenza', R.iso(domani)).order('creato_il'),
      supabase.from('fogli_firma').select('id, titolo, scadenza, dato_il').is('consegnato_il', null).order('scadenza'),
      supabase.from('serate').select('cartella_il').eq('data', R.iso(oggi)).maybeSingle(),
      supabase.from('movimenti_passi').select('passi, moltiplicatore').eq('giorno', R.iso(oggi)),
    ]);
    if (c.error || f.error) return setErrore('Non riesco a leggere la sera. Riprova tra poco.');
    setCompiti(c.data as unknown as Compito[]);
    setFogli(f.data ?? []);
    setCartella(!!s.data?.cartella_il);
    setPassiOggi((m.data ?? []).reduce((a, x) => a + Math.round(x.passi * x.moltiplicatore), 0));
  }, [R.iso(oggi)]);

  useEffect(() => {
    carica();
  }, [carica]);

  // La spunta si vede subito (subito()); se il salvataggio fallisce, carica() la toglie.
  async function spunta(subito: () => void, azione: () => PromiseLike<{ error: unknown }>, tipo: string, id: string) {
    subito();
    setErrore('');
    const { error } = await azione();
    if (error) {
      setErrore('Spunta non salvata. Riprova.');
      return carica();
    }
    await passi(tipo, id);
    carica();
  }
  const adesso = () => new Date().toISOString();

  // Cartella: voci spuntate una per una (solo sul telefono); con l'ultima la cartella è pronta.
  // ponytail: le voci spuntate si perdono se si chiude l'app prima dell'ultima.
  const voci = orario.length ? [...orario, 'Diario e astuccio'] : [`Cartella pronta per ${GIORNI[domani.getDay()]}`];
  function metti(v: string) {
    const nuove = new Set(messe);
    if (nuove.has(v)) nuove.delete(v);
    else nuove.add(v);
    setMesse(nuove);
    if (voci.every((x) => nuove.has(x)))
      spunta(
        () => setCartella(true),
        () => supabase.from('serate').upsert({ data: R.iso(oggi), cartella_il: adesso() }),
        'serata',
        R.iso(oggi),
      );
  }

  if (!compiti) return errore ? <p role="alert">{errore}</p> : null;

  const conCartella = R.cartellaConta(oggi);
  const cose = compiti.length + fogli.length + (conCartella ? 1 : 0);
  const fatte =
    compiti.filter((c) => c.fatto_il).length + fogli.filter((f) => f.dato_il).length + (conCartella && cartella ? 1 : 0);
  const mancante = compiti.find((c) => !c.fatto_il);

  return (
    <section className="sera">
      <p className="sopratitolo">{GIORNI[oggi.getDay()]} sera</p>
      <h1>Pronta per {GIORNI[domani.getDay()]}?</h1>
      {cose > 0 && (
        <>
          <div className="avanzamento" role="progressbar" aria-valuemin={0} aria-valuemax={cose} aria-valuenow={fatte}>
            <span style={{ width: `${(fatte / cose) * 100}%` }} />
          </div>
          <p>
            {fatte} su {cose}
            {passiOggi > 0 && `, già +${passiOggi} passi`}.
          </p>
        </>
      )}
      {errore && <p role="alert">{errore}</p>}

      <div className="carta">
        <h2>Compiti per domani</h2>
        {compiti.length === 0 && <p>Nessun compito su Nuvola per domani.</p>}
        <ul className="spunte">
          {compiti.map((c) => (
            <li key={c.id}>
              <label>
                <input
                  type="checkbox"
                  checked={!!c.fatto_il}
                  disabled={!!c.fatto_il}
                  onChange={() =>
                    spunta(
                      () => setCompiti((l) => l?.map((x) => (x.id === c.id ? { ...x, fatto_il: adesso() } : x))),
                      () => supabase.from('compiti').update({ fatto_il: adesso() }).eq('id', c.id),
                      'compito',
                      c.id,
                    )
                  }
                />
                <span>
                  <b>{c.materie?.nome ?? 'Compito'}</b>: {c.testo}
                </span>
              </label>
            </li>
          ))}
        </ul>
        {mancante && (
          <p className="lady">Lady si è sdraiata sul quaderno di {mancante.materie?.nome ?? 'domani'}. Si sposta solo se lo apri.</p>
        )}
      </div>

      {conCartella && (
        <div className="carta">
          <h2>Cartella</h2>
          <ul className="spunte">
            {voci.map((v) => (
              <li key={v}>
                <label>
                  <input
                    type="checkbox"
                    checked={cartella || messe.has(v)}
                    disabled={cartella}
                    onChange={() => metti(v)}
                  />
                  <span>{v}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {fogli.length > 0 && (
        <div className="carta">
          <h2>Da far firmare</h2>
          <ul className="spunte">
            {fogli.map((f) => (
              <li key={f.id} className="foglio">
                <span>{f.titolo}</span>
                {f.dato_il ? (
                  <span className="dato">Dato, aspetta la firma</span>
                ) : (
                  <button
                    className="principale"
                    onClick={() =>
                      spunta(
                        () => setFogli((l) => l.map((x) => (x.id === f.id ? { ...x, dato_il: adesso() } : x))),
                        () => supabase.from('fogli_firma').update({ dato_il: adesso() }).eq('id', f.id),
                        'foglio',
                        f.id,
                      )
                    }
                  >
                    L'ho dato
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
