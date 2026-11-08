import { useEffect, useState } from 'react';
import { impegniTra, piuGiorni, oraAdesso, useGiornata, type Impegno } from './giornata';
import * as C from './lib/calendario';
import * as N from './lib/nuvola';
import * as R from './lib/regole';
import { GIORNI, MESI, RigaCompito, SELECT_COMPITI, maiuscola, spuntaCompito, type Compito } from './spunte';
import { supabase } from './supabase';

// Oggi — design/Oggi.html (mattina) e design/Pomeriggio.html (pomeriggio).
// ponytail: chiavi della settimana con Astra (tappa 5); ripasso, carte, lampadina e foto con lo
// Studio (tappa 4); riga dell'umore facoltativa, più avanti.

type Cosa = { titolo: string; sotto: string };

export default function Oggi() {
  const giornata = useGiornata();
  if (!giornata) return null;
  return C.momento(oraAdesso(), giornata.chiusura) === 'mattina' ? (
    <Mattina impegni={giornata.impegni} />
  ) : (
    <Pomeriggio chiusura={giornata.chiusura} />
  );
}

function Mattina({ impegni }: { impegni: Impegno[] }) {
  const oggi = R.giornoRoma(new Date());
  const [cose, setCose] = useState<Cosa[]>();
  const [ieri, setIeri] = useState(0);
  const [famiglia, setFamiglia] = useState<Impegno[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from('verifiche').select('tipo, materie(nome)').eq('data', R.iso(oggi)),
      supabase.from('impostazioni').select('valore').eq('chiave', 'materiale_cartella').maybeSingle(),
      supabase.from('fogli_firma').select('titolo').is('dato_il', null).is('consegnato_il', null).limit(1),
      supabase.from('movimenti_passi').select('passi, moltiplicatore').eq('giorno', R.iso(piuGiorni(oggi, -1))),
      impegniTra(new Date(), piuGiorni(oggi, 8)),
    ]).then(([v, m, f, mov, prossimi]) => {
      const lista: Cosa[] = [];
      for (const x of (v.data ?? []) as unknown as { tipo: string; materie: { nome: string } | null }[])
        lista.push({ titolo: `${maiuscola(x.tipo)} di ${x.materie?.nome ?? 'oggi'}`, sotto: 'Oggi, in classe' });
      const sport = impegni.find((i) => C.tipoImpegno(i.titolo) !== 'famiglia');
      if (sport) {
        const ora = C.oraRoma(sport.inizio);
        const partita = C.tipoImpegno(sport.titolo) === 'partita';
        lista.push({
          titolo: `${partita ? 'Partita' : 'Allenamento'} alle ${ora}`,
          sotto: R.giornoDiScuola(oggi) && ora < '16:00' ? 'Esci con cartella e borsa insieme' : partita ? 'Borsa pronta prima di uscire' : 'Borsa pronta per il pomeriggio',
        });
      }
      const materiale: string[] = m.data?.valore?.[oggi.getDay()] ?? [];
      if (materiale[0]) lista.push({ titolo: materiale[0], sotto: 'Controlla che ci sia nello zaino' });
      else if (f.data?.[0]) lista.push({ titolo: f.data[0].titolo, sotto: 'Da far firmare: portalo a mamma o papà' });
      setCose(lista.slice(0, 3));
      setIeri((mov.data ?? []).reduce((a, x) => a + Math.round(x.passi * x.moltiplicatore), 0));
      setFamiglia(prossimi.filter((i) => C.tipoImpegno(i.titolo) === 'famiglia').slice(0, 3));
    });
  }, []);

  if (!cose) return null;
  const sport = impegni.find((i) => C.tipoImpegno(i.titolo) !== 'famiglia');
  const riga = R.giornoDiScuola(oggi)
    ? sport
      ? `Scuola, poi ${C.tipoImpegno(sport.titolo) === 'partita' ? 'partita' : 'allenamento'}.`
      : 'Scuola, poi pomeriggio a casa.'
    : sport
      ? `Oggi ${C.tipoImpegno(sport.titolo) === 'partita' ? 'partita' : 'allenamento'}.`
      : 'Niente scuola oggi.';

  return (
    <section className="sera">
      <p className="sopratitolo">
        {maiuscola(GIORNI[oggi.getDay()])} {oggi.getDate()} {MESI[oggi.getMonth()]}
      </p>
      <h1>Buongiorno, Lani</h1>
      <p>{riga}</p>

      <div className="carta">
        <h2>Tre cose per oggi</h2>
        {cose.length === 0 ? (
          <p>Giornata tranquilla.</p>
        ) : (
          <ol className="cose">
            {cose.map((c) => (
              <li key={c.titolo}>
                <b>{c.titolo}</b>
                <span>{c.sotto}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {ieri > 0 && <p className="pillola">Ieri hai preso +{ieri} passi</p>}

      {famiglia.length > 0 && (
        <details className="carta famiglia" open>
          <summary>
            <h2>In famiglia</h2>
          </summary>
          <ul>
            {famiglia.map((i) => {
              const g = R.giornoRoma(i.inizio);
              const quando = R.iso(g) === R.iso(oggi) ? '' : `${GIORNI[g.getDay()].slice(0, 3)} `;
              return (
                <li key={i.inizio + i.titolo}>
                  <b>
                    {quando}
                    {i.tutto_il_giorno ? '' : C.oraRoma(i.inizio)}
                  </b>{' '}
                  {i.titolo}
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </section>
  );
}

function Pomeriggio({ chiusura }: { chiusura: string | null }) {
  const oggi = R.giornoRoma(new Date());
  const domani = R.prossimoGiornoDiScuola(oggi);
  const [compiti, setCompiti] = useState<Compito[]>();
  const [errore, setErrore] = useState('');
  const [aiuto, setAiuto] = useState<Compito>();

  useEffect(() => {
    supabase
      .from('compiti')
      .select(SELECT_COMPITI)
      .eq('scadenza', R.iso(domani))
      .then(({ data, error }) => {
        if (error) return setErrore('Non riesco a leggere i compiti. Riprova tra poco.');
        const lista = (data ?? []) as unknown as Compito[];
        setCompiti(lista.sort((a, b) => N.peso(b.testo) - N.peso(a.testo)));
      });
  }, []);

  if (!compiti) return errore ? <p role="alert">{errore}</p> : null;
  if (aiuto) return <Aiuto compito={aiuto} chiudi={() => setAiuto(undefined)} />;
  const daFare = compiti.filter((c) => !c.fatto_il);
  const segna = (id: string) => (fatto_il: string | null) =>
    setCompiti((l) => l?.map((x) => (x.id === id ? { ...x, fatto_il } : x)));

  return (
    <section className="sera">
      <p className="sopratitolo">{maiuscola(GIORNI[oggi.getDay()])} pomeriggio</p>
      <h1>Compiti per {GIORNI[domani.getDay()]}</h1>
      {chiusura && compiti.length > 0 && <p>Hai tempo fino alle {chiusura}.</p>}
      {errore && <p role="alert">{errore}</p>}

      <div className="carta">
        {compiti.length === 0 ? (
          <p>Nessun compito su Nuvola per {GIORNI[domani.getDay()]}.</p>
        ) : (
          <>
            <h2>In quest'ordine</h2>
            <ul className="spunte">
              {compiti.map((c, i) => (
                <RigaCompito
                  key={c.id}
                  c={c}
                  numero={i + 1}
                  onSpunta={() => spuntaCompito(c.id, segna(c.id), setErrore)}
                  onAiuto={() => setAiuto(c)}
                />
              ))}
            </ul>
            {daFare.length > 0 && daFare[0] === compiti[0] && <p className="nota">Inizia dal primo: è il più lungo.</p>}
            {daFare.length === 0 && <p className="lady">Compiti finiti. Il resto del pomeriggio è tuo.</p>}
          </>
        )}
      </div>
    </section>
  );
}

/** Lampadina "Non ho capito": l'argomento con un altro esempio, poi un indizio alla volta. */
function Aiuto({ compito, chiudi }: { compito: Compito; chiudi: () => void }) {
  const [r, setR] = useState<{ spiegazione: string; indizi: string[] } | null>();
  const [visti, setVisti] = useState(0);
  useEffect(() => {
    supabase.functions.invoke('spiega', { body: { compito_id: compito.id } }).then(({ data, error }) => {
      setR(error || !data?.spiegazione ? null : data);
    });
  }, [compito.id]);

  return (
    <section className="sera">
      <p className="sopratitolo">{compito.materie?.nome ?? 'Compito'}</p>
      <h1>Non ho capito</h1>
      <p className="nota">{compito.testo}</p>
      <div className="carta" aria-live="polite">
        {r === undefined && <p>Ok, vediamola con un altro esempio…</p>}
        {r === null && <p>Adesso la lampadina non si accende. Riprova tra poco, oppure chiedi a mamma o papà.</p>}
        {r && (
          <>
            <p>Ok, vediamola con un altro esempio.</p>
            <p>{r.spiegazione}</p>
            {r.indizi.slice(0, visti).map((x, n) => (
              <p key={n} className="indizio">
                <b>Indizio {n + 1}.</b> {x}
              </p>
            ))}
            {visti < r.indizi.length && (
              <button className="secondario" onClick={() => setVisti(visti + 1)}>
                {visti ? 'Un altro indizio' : 'Un indizio'}
              </button>
            )}
          </>
        )}
      </div>
      <button className="principale largo" onClick={chiudi}>Torna ai compiti</button>
    </section>
  );
}
