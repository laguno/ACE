import { useEffect, useRef, useState } from 'react';
import { ImageSquare } from '@phosphor-icons/react';
import { useSfondo } from './kit';
import { Contapassi, vediSaldo } from './Contapassi';
import { Biglietto } from './Biglietto';
import { ImmaginePremio, immaginiPremi, type Immagine } from './ImmaginePremio';
import * as R from './lib/regole';
import { supabase } from './supabase';

// Astra — design/Main.html. Percorso di 27 tappe dalla terra alle stelle: Lani "sei qui",
// forzieri ogni 3 tappe con passi e chiavi, bandierina del calendario, traguardo di Natale.
// Il premio di un forziere arriva solo dalla vista forzieri_lani, e solo quando è aperto.

type Forziere = { n: number; stato: 'chiuso' | 'enigma' | 'aperto' | 'consegnato'; enigma: string | null; premio: string | null; tentativi_enigma: number; enigma_risolto_il: string | null; aiutino?: string | null };

const MONDI = [
  { nome: 'Colline di caramelle', sfondo: 'sfondo-1-colline' },
  { nome: 'Montagne di zucchero', sfondo: 'sfondo-2-montagne' },
  { nome: 'Nuvole di zucchero filato', sfondo: 'sfondo-3-nuvole' },
  { nome: 'Lo spazio', sfondo: 'sfondo-4-spazio' },
];
const img = (cartella: string, id: string) => `/assets/${cartella}/${id}.webp`;
const SOGLIE = R.soglieTappe();
const tappaDi = (passi: number) => Math.min(SOGLIE.length, R.posizione(passi).tappeFatte + 1);

// Mappa del sentiero (bozza Main): 27 tappe dal basso (la terra) all'alto (le stelle), a serpentina.
// Unico posto con posizioni assolute (indicazioni di Jarvis). x in percentuale, y in px.
const PASSO = 130;
const MARGINE = 90;
const ALTEZZA = MARGINE * 2 + (SOGLIE.length - 1) * PASSO;
const punto = (t: number) => ({ x: 50 + 19 * Math.sin(t * 0.85), y: MARGINE + (SOGLIE.length - t) * PASSO });

/** Curva morbida per i punti (Catmull-Rom convertita in Bézier), in coordinate x% / y px. */
function curva(punti: { x: number; y: number }[]) {
  if (punti.length < 2) return '';
  let d = `M ${punti[0].x} ${punti[0].y}`;
  for (let i = 0; i < punti.length - 1; i++) {
    const [p0, p1, p2, p3] = [punti[i - 1] ?? punti[i], punti[i], punti[i + 1], punti[i + 2] ?? punti[i + 1]];
    d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export default function Astra({ apri }: { apri: (pagina: 'Figurina' | 'Album') => void }) {
  const [dati, setDati] = useState<{ passi: number; prima: number; chiavi: number; settimana: number | null; forzieri: Forziere[]; album: number }>();
  const [scelto, setScelto] = useState<number>();
  useSfondo('panna');

  async function carica() {
    const [s, c, w, f, a] = await Promise.all([
      vediSaldo(),
      supabase.from('chiavi_totali').select('chiavi').maybeSingle(),
      supabase.from('settimane').select('chiavi').not('chiavi', 'is', null).order('inizio', { ascending: false }).limit(1),
      supabase.from('forzieri_lani').select('n, stato, enigma, premio, tentativi_enigma, enigma_risolto_il, aiutino').order('n'),
      supabase.from('figurine').select('posa', { count: 'exact', head: true }).not('sbloccata_il', 'is', null),
    ]);
    setDati({
      passi: s.adesso,
      prima: s.prima,
      chiavi: c.data?.chiavi ?? 0,
      settimana: w.data?.[0]?.chiavi ?? null,
      forzieri: (f.data ?? []) as Forziere[],
      album: a.count ?? 0,
    });
  }
  useEffect(() => {
    carica();
  }, []);
  // il sentiero va dall'alto (la cima) in basso: si parte mostrando dove è Lani
  // una volta per apertura (e al ritorno da un forziere), non a ogni ricarica dei dati
  const scesa = useRef(false);
  useEffect(() => {
    if (scelto) scesa.current = false;
    else if (dati && !scesa.current) {
      document.querySelector('.qui')?.scrollIntoView({ block: 'center' });
      scesa.current = true;
    }
  }, [dati, scelto]);
  if (!dati) return null;

  const pos = R.posizione(dati.passi);
  const nMondo = R.mondo(pos.tappeFatte);
  const mondo = MONDI[nMondo];
  const qui = tappaDi(dati.passi);
  const oggi = R.giornoRoma(new Date());
  const bandierina = tappaDi(R.bandierina(oggi));
  const natale = tappaDi(R.bandierina(new Date(oggi.getFullYear(), 11, 23)));
  const forziere = (n: number) => dati.forzieri.find((f) => f.n === n);

  if (scelto) return <SchedaForziere f={forziere(scelto)} n={scelto} passi={dati.passi} chiavi={dati.chiavi} chiudi={() => (setScelto(undefined), carica())} />;

  const punti = SOGLIE.map((_, i) => punto(i + 1));
  // Lani sta dal lato largo della tappa attuale; la bandierina, se è su un'altra tappa, dal lato opposto
  const latoLani = punto(qui).x < 50 ? 'destra' : 'sinistra';
  const fatti = punti.slice(0, qui);

  return (
    <section className="astra">
      <Compatta />
      <div className="astra-sfondo" style={{ backgroundImage: `url(${img('sfondi', mondo.sfondo)})` }} aria-hidden />
      <header className="carta astra-testata">
        <div className="astra-titolo">
          <span>
            <p className="sopratitolo">Mondo {nMondo + 1} di 4</p>
            <h1>{mondo.nome}</h1>
            <p className="mantra">Ogni giorno, passino passino.</p>
          </span>
          <button className="astra-figurina" onClick={() => apri('Figurina')} aria-label="La tua figurina">
            <img src={img('avatar/lani', 'lani-contenta')} alt="" width={50} height={50} />
          </button>
        </div>
        <div className="astra-saldi">
          {dati.settimana !== null ? (
            <span className="chiavi-settimana">
              <small>Chiavi della settimana</small>
              <span aria-label={`Chiavi dell'ultima settimana: ${dati.settimana} su 3`}>
                {[1, 2, 3].map((k) => (
                  <img key={k} src={img('oggetti', k <= (dati.settimana ?? 0) ? 'chiave-piena' : 'chiave-vuota')} alt="" width={30} height={30} />
                ))}
              </span>
            </span>
          ) : (
            <span className="chiavi-settimana">
              <img src={img('oggetti', 'mazzo-chiavi')} alt="" width={30} height={30} />
              <small>
                {dati.chiavi} {dati.chiavi === 1 ? 'chiave' : 'chiavi'}
              </small>
            </span>
          )}
          <span className="saldo">
            <img src={img('oggetti', 'passo')} alt="" width={30} height={30} />
            <Contapassi prima={dati.prima} adesso={dati.passi} />
          </span>
        </div>
        {dati.settimana !== null && (
          <p className="nota astra-chiavi-totali">
            <span>
              {dati.chiavi} {dati.chiavi === 1 ? 'chiave' : 'chiavi'}
            </span>{' '}
            in tutto
          </p>
        )}
        {Math.abs(bandierina - qui) >= 2 && (
          // la bandierina è lontana e fuori dallo schermo: lo dice la testata (revisione di Jarvis)
          <p className="chip-bandiera">
            <img src={img('oggetti', 'bandierina')} alt="" width={24} height={24} />
            {bandierina > qui
              ? `Bandierina: ${bandierina - qui} tappe avanti`
              : `Sei avanti di ${qui - bandierina} tappe`}
          </p>
        )}
      </header>

      <div className="mappa" style={{ height: ALTEZZA }}>
        <svg className="sentiero" viewBox={`0 0 100 ${ALTEZZA}`} preserveAspectRatio="none" aria-hidden>
          <path d={curva(punti)} className="strada" />
          <path d={curva(punti)} className="puntini" />
          <path d={curva(fatti)} className="fatta" />
        </svg>
        <ol className="tappe">
        {punti.map((p, i) => {
          const t = i + 1;
          const conf = R.CONFIG.forzieri.find((x) => x.tappa === t);
          const stato = t <= pos.tappeFatte ? 'fatta' : t === qui ? 'attuale' : 'da-fare';
          const aDestra = p.x < 50; // etichette e forzieri dalla parte con più spazio
          const fz = conf && forziere(conf.n);
          return (
            <li key={t} className={`tappa ${stato}`} style={{ left: `${p.x}%`, top: p.y }}>
              <img className="sasso" src={img('oggetti', `tappa-${stato}`)} alt="" width={stato === 'attuale' ? 66 : 50} height={stato === 'attuale' ? 66 : 50} />
              <span className="solo-lettori">Tappa {t}</span>
              {t === qui && !pos.inCima && (
                <>
                  <p className="qui">
                    <b>{SOGLIE[t - 1].toLocaleString('it-IT')}</b>
                    <span>Sei qui: mancano {pos.mancanoPassi}</span>
                  </p>
                  <img className={`lani-sentiero ${aDestra ? 'destra' : 'sinistra'}`} src={img('avatar/lani', 'lani-saluta')} alt="Lani" width={120} height={120} />
                </>
              )}
              {t === bandierina && (
                <p className={`bandiera ${t === qui ? (t === natale ? 'sopra sopra-2' : 'sopra') : latoLani === 'destra' ? 'a-sinistra' : 'a-destra'}`}>
                  <img src={img('oggetti', 'bandierina')} alt="" width={36} height={36} />
                  <span>Il calendario è qui</span>
                </p>
              )}
              {t === natale && t !== bandierina && (
                <p className={`traguardo ${t === qui ? 'sopra' : aDestra ? 'destra' : 'sinistra'}`}>
                  <b>Vacanze di Natale</b>
                </p>
              )}
              {conf && (
                <button className={`forziere ${fz?.stato ?? 'chiuso'} ${aDestra !== (t === qui) ? 'destra' : 'sinistra'}`} onClick={() => setScelto(conf.n)} aria-label={`Forziere ${conf.n}: ${SOGLIE[conf.tappa - 1].toLocaleString('it-IT')} · ${conf.chiavi} chiavi`}>
                  <img
                    src={img('oggetti', conf.n === 9 ? 'forziere-cima' : ['aperto', 'consegnato'].includes(fz?.stato ?? '') ? 'forziere-aperto' : 'forziere-chiuso')}
                    alt=""
                    width={76}
                    height={76}
                  />
                  <small>
                    {SOGLIE[conf.tappa - 1].toLocaleString('it-IT')} · {conf.chiavi} chiavi
                  </small>
                </button>
              )}
            </li>
          );
        })}
        </ol>
      </div>

      <button className="album-fluttuante" onClick={() => apri('Album')}>
        <ImageSquare size={24} weight="bold" aria-hidden /> Album {dati.album}/64
      </button>
    </section>
  );
}

function SchedaForziere({ f, n, passi, chiavi, chiudi }: { f?: Forziere; n: number; passi: number; chiavi: number; chiudi: () => void }) {
  const conf = R.forziere(n);
  const arrivata = R.posizione(passi).tappeFatte >= conf.tappa;
  const [risposta, setRisposta] = useState('');
  const [esito, setEsito] = useState<string>();
  const [rimasti, setRimasti] = useState(R.CONFIG.enigma.tentativi - (f?.tentativi_enigma ?? 0));
  const [attesa, setAttesa] = useState(false);
  const [aiutino, setAiutino] = useState<string | null>(null);
  // immagine del premio dal server: sagoma finché è nascosto, vera con l'enigma risolto o il forziere aperto
  const [img, setImg] = useState<Immagine | null>();
  const caricaImg = () => immaginiPremi(n).then((l) => setImg(l.find((x) => x.n === n) ?? null));
  useEffect(() => {
    caricaImg();
  }, [n]);

  async function prova(e: React.FormEvent) {
    e.preventDefault();
    setAttesa(true);
    const { data } = await supabase.functions.invoke('enigma', { body: { azione: 'rispondi', n, risposta } });
    setAttesa(false);
    if (!data || data.errore) return setEsito('Adesso non riesco a controllare. Riprova tra poco.');
    setRimasti(data.rimasti);
    if (data.aiutino) setAiutino(data.aiutino);
    if (data.giusta) caricaImg();
    setEsito(data.giusta ? `Indovinato!${data.passi ? ` +${data.passi} passi.` : ''}` : data.rimasti ? `Non è questo. Ti ${data.rimasti === 1 ? 'resta un tentativo' : `restano ${data.rimasti} tentativi`}.` : 'Tentativi finiti: il forziere si aprirà quando ci arrivi.');
  }

  const apertoGia = !!f && ['aperto', 'consegnato'].includes(f.stato);
  const figura = (
    <figure className="premio-figura">
      <ImmaginePremio img={img} vera={!!img?.sbloccato} />
      {!apertoGia && img !== undefined && <figcaption>{img?.sbloccato ? 'Hai indovinato!' : 'Indovini cos’è?'}</figcaption>}
    </figure>
  );
  let corpo;
  if (apertoGia) {
    corpo = (
      <>
        {figura}
        <p>Dentro c'era: <b>{f.premio ?? 'un premio da scegliere con mamma e papà'}</b></p>
        {f.stato === 'consegnato' && <p className="nota">Già consegnato.</p>}
      </>
    );
  } else if (arrivata) {
    corpo = (
      <>
        {figura}
        <img src="/assets/oggetti/lucchetto.webp" alt="" width={72} height={72} />
        <p>
          Servono {conf.chiavi} chiavi: ne hai {chiavi}.
        </p>
        <p className="nota">I passi ti fanno camminare, le chiavi aprono i forzieri.</p>
      </>
    );
  } else if (f?.stato === 'enigma' && f.enigma) {
    corpo = (
      <>
        {figura}
        <Biglietto testo={f.enigma} aiutino={f.enigma_risolto_il || esito?.startsWith('Indovinato') ? null : (aiutino ?? f.aiutino)} />
        {f.enigma_risolto_il || esito?.startsWith('Indovinato') ? (
          <p>{esito ?? 'Enigma risolto: ora arriva fino al forziere.'}</p>
        ) : rimasti > 0 ? (
          <form className="modulo" onSubmit={prova}>
            <label>
              Cosa c'è nel forziere?
              <input value={risposta} onChange={(e) => setRisposta(e.target.value)} maxLength={200} required />
            </label>
            <p className="nota">
              {rimasti} tentativi · +{R.CONFIG.passi.enigma_risolto} passi se indovini
            </p>
            {esito && <p role="status">{esito}</p>}
            <button className="principale" disabled={attesa}>Prova</button>
          </form>
        ) : (
          <p>{esito ?? 'Tentativi finiti: il forziere si aprirà quando ci arrivi.'}</p>
        )}
      </>
    );
  } else {
    corpo = (
      <>
        {figura}
        <p>
          Alla tappa {conf.tappa} ({SOGLIE[conf.tappa - 1].toLocaleString('it-IT')} passi), con {conf.chiavi} chiavi.
        </p>
        <p className="nota">L'enigma compare quando manca una tappa.</p>
      </>
    );
  }

  return (
    <section className="carta modulo scheda-forziere">
      <h1>{n === 9 ? 'Il forziere della cima' : `Forziere ${n}`}</h1>
      {corpo}
      <button className="secondario" onClick={chiudi}>Torna al percorso</button>
    </section>
  );
}

/** Scendendo nella mappa la testata fissa si compatta (a 360 px prendeva più di un quarto dello schermo). */
function Compatta() {
  useEffect(() => {
    const segna = () => document.body.classList.toggle('astra-scesa', window.scrollY > 48);
    segna();
    window.addEventListener('scroll', segna, { passive: true });
    return () => {
      window.removeEventListener('scroll', segna);
      document.body.classList.remove('astra-scesa');
    };
  }, []);
  return null;
}
