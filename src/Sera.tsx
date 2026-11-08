import { useCallback, useEffect, useState } from 'react';
import * as C from './lib/calendario';
import * as N from './lib/nuvola';
import * as R from './lib/regole';
import { GIORNI, RigaCompito, SELECT_COMPITI, adesso, maiuscola, passi, spuntaCompito, type Compito } from './spunte';
import { supabase } from './supabase';

// Sera — design/Domani.html. Lani spunta; i passi li decide la funzione "passi" sul server.
// Cartella dalle lezioni di Nuvola (orario) più il materiale del giorno (impostazioni);
// borsa e "Domani in famiglia" dal calendario di famiglia.

type Foglio = { id: string; titolo: string; scadenza: string | null; dato_il: string | null };
type Impegno = { titolo: string; inizio: string; tutto_il_giorno: boolean };

// ponytail: voci fisse dalla bozza; con l'area genitori (tappa 7) passano alle impostazioni.
const VOCI_BORSA = ['Divisa', 'Ginocchiere', 'Scarpe', 'Borraccia'];
const PRIMA_DI_USCIRE_DA_SCUOLA = '16:00';

/** Lista a voci (cartella, borsa): spuntate una per una sul telefono, con l'ultima è pronta. */
// ponytail: le voci spuntate si perdono se si chiude l'app prima dell'ultima.
function Voci({ titolo, voci, pronta, quandoPronta, children }: {
  titolo: string;
  voci: string[];
  pronta: boolean;
  quandoPronta: () => void;
  children?: React.ReactNode;
}) {
  const [messe, setMesse] = useState(new Set<string>());
  function metti(v: string) {
    const nuove = new Set(messe);
    if (nuove.has(v)) nuove.delete(v);
    else nuove.add(v);
    setMesse(nuove);
    if (voci.every((x) => nuove.has(x))) quandoPronta();
  }
  return (
    <div className="carta">
      <h2>{titolo}</h2>
      {children}
      <ul className="spunte">
        {voci.map((v) => (
          <li key={v}>
            <label>
              <input type="checkbox" checked={pronta || messe.has(v)} disabled={pronta} onChange={() => metti(v)} />
              <span>{v}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Sera() {
  const oggi = R.giornoRoma(new Date());
  const domani = R.prossimoGiornoDiScuola(oggi);
  const dopodomaniCal = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() + 2);
  const domaniCal = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() + 1);
  const [compiti, setCompiti] = useState<Compito[]>();
  const [fogli, setFogli] = useState<Foglio[]>([]);
  const [serata, setSerata] = useState({ cartella: false, borsa: false });
  const [passiOggi, setPassiOggi] = useState(0);
  const [orario, setOrario] = useState<string[]>([]);
  const [impegni, setImpegni] = useState<Impegno[]>([]);
  const [errore, setErrore] = useState('');

  useEffect(() => {
    const da = new Date(oggi);
    da.setDate(da.getDate() - 21);
    Promise.all([
      supabase.from('lezioni').select('data, ora, materia_id').gte('data', R.iso(da)),
      supabase.from('materie').select('id, nome'),
      supabase.from('impostazioni').select('valore').eq('chiave', 'materiale_cartella').maybeSingle(),
      supabase
        .from('impegni_famiglia')
        .select('titolo, inizio, tutto_il_giorno')
        .gte('inizio', domaniCal.toISOString())
        .lt('inizio', dopodomaniCal.toISOString())
        .order('inizio'),
    ]).then(([l, m, i, imp]) => {
      const nomi = new Map((m.data ?? []).map((x) => [x.id, x.nome]));
      const materiale: string[] = i.data?.valore?.[domani.getDay()] ?? [];
      setOrario([...N.materieDelGiorno(l.data ?? [], domani.getDay()).map((id) => nomi.get(id) ?? id), ...materiale]);
      setImpegni(imp.data ?? []);
    });
  }, [R.iso(oggi)]);

  const carica = useCallback(async () => {
    const [c, f, s, m] = await Promise.all([
      supabase.from('compiti').select(SELECT_COMPITI).eq('scadenza', R.iso(domani)).order('creato_il'),
      supabase.from('fogli_firma').select('id, titolo, scadenza, dato_il').is('consegnato_il', null).order('scadenza'),
      supabase.from('serate').select('cartella_il, borsa_il').eq('data', R.iso(oggi)).maybeSingle(),
      supabase.from('movimenti_passi').select('passi, moltiplicatore').eq('giorno', R.iso(oggi)),
    ]);
    if (c.error || f.error) return setErrore('Non riesco a leggere la sera. Riprova tra poco.');
    setCompiti(c.data as unknown as Compito[]);
    setFogli(f.data ?? []);
    setSerata({ cartella: !!s.data?.cartella_il, borsa: !!s.data?.borsa_il });
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
  const chiudiSerata = (campo: 'cartella' | 'borsa') =>
    spunta(
      () => setSerata((s) => ({ ...s, [campo]: true })),
      () => supabase.from('serate').upsert({ data: R.iso(oggi), [`${campo}_il`]: adesso() }),
      'serata',
      R.iso(oggi),
    );

  if (!compiti) return errore ? <p role="alert">{errore}</p> : null;

  const conCartella = R.cartellaConta(oggi);
  const sport = impegni.find((i) => C.tipoImpegno(i.titolo) !== 'famiglia');
  const famiglia = impegni.find((i) => C.tipoImpegno(i.titolo) === 'famiglia');
  const conBorsa = !!sport;
  const cose = compiti.length + fogli.length + (conCartella ? 1 : 0) + (conBorsa ? 1 : 0);
  const fatte =
    compiti.filter((c) => c.fatto_il).length +
    fogli.filter((f) => f.dato_il).length +
    (conCartella && serata.cartella ? 1 : 0) +
    (conBorsa && serata.borsa ? 1 : 0);
  const mancante = compiti.find((c) => !c.fatto_il);

  return (
    <section className="sera">
      <p className="sopratitolo">{maiuscola(GIORNI[oggi.getDay()])} sera</p>
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
            <RigaCompito
              key={c.id}
              c={c}
              onSpunta={() =>
                spuntaCompito(
                  c.id,
                  (fatto_il) => setCompiti((l) => l?.map((x) => (x.id === c.id ? { ...x, fatto_il } : x))),
                  setErrore,
                ).then(carica)
              }
            />
          ))}
        </ul>
        {mancante && (
          <p className="lady">Lady si è sdraiata sul quaderno di {mancante.materie?.nome ?? 'domani'}. Si sposta solo se lo apri.</p>
        )}
      </div>

      {conCartella && (
        <Voci
          titolo="Cartella"
          voci={orario.length ? orario : [`Cartella pronta per ${GIORNI[domani.getDay()]}`]}
          pronta={serata.cartella}
          quandoPronta={() => chiudiSerata('cartella')}
        />
      )}

      {sport && (
        <Voci titolo="Borsa" voci={VOCI_BORSA} pronta={serata.borsa} quandoPronta={() => chiudiSerata('borsa')}>
          <p className="nota">
            {C.tipoImpegno(sport.titolo) === 'partita' ? 'Partita' : 'Allenamento'} domani alle {C.oraRoma(sport.inizio)}
            {R.giornoDiScuola(domaniCal) && C.oraRoma(sport.inizio) < PRIMA_DI_USCIRE_DA_SCUOLA ? ': la porti a scuola.' : '.'}
          </p>
        </Voci>
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

      {famiglia && (
        <p className="carta nota">
          Domani in famiglia: {famiglia.titolo}
          {famiglia.tutto_il_giorno ? '' : ` alle ${C.oraRoma(famiglia.inizio)}`}. Tienilo a mente per la cartella e la sveglia.
        </p>
      )}
    </section>
  );
}
