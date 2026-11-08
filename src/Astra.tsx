import { useEffect, useState } from 'react';
import * as R from './lib/regole';
import { supabase } from './supabase';

// Astra — design/Main.html. Percorso di 27 tappe dalla terra alle stelle: Lani "sei qui",
// forzieri ogni 3 tappe con passi e chiavi, bandierina del calendario, traguardo di Natale.
// Il premio di un forziere arriva solo dalla vista forzieri_lani, e solo quando è aperto.

type Forziere = { n: number; stato: 'chiuso' | 'enigma' | 'aperto' | 'consegnato'; enigma: string | null; premio: string | null; tentativi_enigma: number; enigma_risolto_il: string | null };

const MONDI = [
  { nome: 'Colline di caramelle', sfondo: 'sfondo-1-colline' },
  { nome: 'Montagne di zucchero', sfondo: 'sfondo-2-montagne' },
  { nome: 'Nuvole di zucchero filato', sfondo: 'sfondo-3-nuvole' },
  { nome: 'Lo spazio', sfondo: 'sfondo-4-spazio' },
];
const img = (cartella: string, id: string) => `/assets/${cartella}/${id}.webp`;
const SOGLIE = R.soglieTappe();
const tappaDi = (passi: number) => Math.min(SOGLIE.length, R.posizione(passi).tappeFatte + 1);

export default function Astra({ apri }: { apri: (pagina: 'Figurina' | 'Album') => void }) {
  const [dati, setDati] = useState<{ passi: number; chiavi: number; settimana: number | null; forzieri: Forziere[] }>();
  const [scelto, setScelto] = useState<number>();

  async function carica() {
    const [s, c, w, f] = await Promise.all([
      supabase.from('saldo_passi').select('passi').maybeSingle(),
      supabase.from('chiavi_totali').select('chiavi').maybeSingle(),
      supabase.from('settimane').select('chiavi').not('chiavi', 'is', null).order('inizio', { ascending: false }).limit(1),
      supabase.from('forzieri_lani').select('n, stato, enigma, premio, tentativi_enigma, enigma_risolto_il').order('n'),
    ]);
    setDati({ passi: s.data?.passi ?? 0, chiavi: c.data?.chiavi ?? 0, settimana: w.data?.[0]?.chiavi ?? null, forzieri: (f.data ?? []) as Forziere[] });
  }
  useEffect(() => {
    carica();
  }, []);
  // il percorso va dall'alto (la cima) in basso: si parte mostrando dove è Lani
  useEffect(() => {
    if (dati && !scelto) document.querySelector('.qui')?.scrollIntoView({ block: 'center' });
  }, [dati, scelto]);
  if (!dati) return null;

  const pos = R.posizione(dati.passi);
  const mondo = MONDI[R.mondo(pos.tappeFatte)];
  const qui = tappaDi(dati.passi);
  const oggi = R.giornoRoma(new Date());
  const bandierina = tappaDi(R.bandierina(oggi));
  const natale = tappaDi(R.bandierina(new Date(oggi.getFullYear(), 11, 23)));
  const forziere = (n: number) => dati.forzieri.find((f) => f.n === n);

  if (scelto) return <SchedaForziere f={forziere(scelto)} n={scelto} passi={dati.passi} chiavi={dati.chiavi} chiudi={() => (setScelto(undefined), carica())} />;

  const righe = [];
  for (let t = SOGLIE.length; t >= 1; t--) {
    const conf = R.CONFIG.forzieri.find((x) => x.tappa === t);
    const stato = t <= pos.tappeFatte ? 'fatta' : t === qui ? 'attuale' : 'da-fare';
    righe.push(
      <li key={t} className={`tappa ${stato}`}>
        <img src={img('oggetti', `tappa-${stato}`)} alt="" width={40} height={40} />
        <span className="nome-tappa">
          Tappa {t}
          <small>{SOGLIE[t - 1].toLocaleString('it-IT')} passi</small>
        </span>
        {t === qui && !pos.inCima && (
          <span className="qui">
            <img src={img('avatar/lani', 'lani-saluta')} alt="Lani" width={56} height={56} />
            Sei qui: mancano {pos.mancanoPassi}
          </span>
        )}
        {t === bandierina && (
          <span className="bandiera">
            <img src={img('oggetti', 'bandierina')} alt="" width={28} height={28} />
            Il calendario è qui
          </span>
        )}
        {t === natale && t !== bandierina && <span className="traguardo">Vacanze di Natale</span>}
        {conf && (
          <button className={`forziere ${forziere(conf.n)?.stato ?? 'chiuso'}`} onClick={() => setScelto(conf.n)} aria-label={`Forziere ${conf.n}`}>
            <img
              src={img('oggetti', conf.n === 9 ? 'forziere-cima' : ['aperto', 'consegnato'].includes(forziere(conf.n)?.stato ?? '') ? 'forziere-aperto' : 'forziere-chiuso')}
              alt=""
              width={48}
              height={48}
            />
            <small>{conf.chiavi} chiavi</small>
          </button>
        )}
      </li>,
    );
  }

  return (
    <section className="astra">
      <div className="mondo" style={{ backgroundImage: `url(${img('sfondi', mondo.sfondo)})` }}>
        <p className="sopratitolo">{mondo.nome}</p>
        <h1>Astra</h1>
        <p className="mantra">Ogni giorno, passino passino.</p>
        <div className="saldi">
          <span>
            <img src={img('oggetti', 'passo')} alt="" width={32} height={32} />
            {dati.passi.toLocaleString('it-IT')} passi
          </span>
          <span>
            <img src={img('oggetti', 'mazzo-chiavi')} alt="" width={32} height={32} />
            {dati.chiavi} {dati.chiavi === 1 ? 'chiave' : 'chiavi'}
          </span>
        </div>
        {dati.settimana !== null && (
          <p className="chiavi-settimana" aria-label={`Chiavi dell'ultima settimana: ${dati.settimana} su 3`}>
            {[1, 2, 3].map((k) => (
              <img key={k} src={img('oggetti', k <= dati.settimana! ? 'chiave-piena' : 'chiave-vuota')} alt="" width={36} height={36} />
            ))}
          </p>
        )}
      </div>
      <div className="collegamenti">
        <button className="secondario" onClick={() => apri('Figurina')}>La tua figurina</button>
        <button className="secondario" onClick={() => apri('Album')}>Album</button>
      </div>
      <ol className="percorso">{righe}</ol>
    </section>
  );
}

function SchedaForziere({ f, n, passi, chiavi, chiudi }: { f?: Forziere; n: number; passi: number; chiavi: number; chiudi: () => void }) {
  const conf = R.CONFIG.forzieri.find((x) => x.n === n)!;
  const arrivata = R.posizione(passi).tappeFatte >= conf.tappa;
  const [risposta, setRisposta] = useState('');
  const [esito, setEsito] = useState<string>();
  const [rimasti, setRimasti] = useState(R.CONFIG.enigma.tentativi - (f?.tentativi_enigma ?? 0));
  const [attesa, setAttesa] = useState(false);

  async function prova(e: React.FormEvent) {
    e.preventDefault();
    setAttesa(true);
    const { data } = await supabase.functions.invoke('enigma', { body: { azione: 'rispondi', n, risposta } });
    setAttesa(false);
    if (!data || data.errore) return setEsito('Adesso non riesco a controllare. Riprova tra poco.');
    setRimasti(data.rimasti);
    setEsito(data.giusta ? `Indovinato!${data.passi ? ` +${data.passi} passi.` : ''}` : data.rimasti ? `Non è questo. Ti restano ${data.rimasti} tentativi.` : 'Tentativi finiti: il forziere si aprirà quando ci arrivi.');
  }

  let corpo;
  if (f && ['aperto', 'consegnato'].includes(f.stato)) {
    corpo = (
      <>
        <img src={`/assets/avatar/lani/lani-sorpresa.webp`} alt="" width={140} height={140} />
        <p>Dentro c'era: <b>{f.premio ?? 'un premio da scegliere con mamma e papà'}</b></p>
        {f.stato === 'consegnato' && <p className="nota">Già consegnato.</p>}
      </>
    );
  } else if (arrivata) {
    corpo = (
      <>
        <img src="/assets/oggetti/lucchetto.webp" alt="" width={120} height={120} />
        <p>
          Servono {conf.chiavi} chiavi: ne hai {chiavi}.
        </p>
        <p className="nota">I passi ti fanno camminare, le chiavi aprono i forzieri.</p>
      </>
    );
  } else if (f?.stato === 'enigma' && f.enigma) {
    corpo = (
      <>
        <img src="/assets/avatar/lani/lani-detective.webp" alt="" width={120} height={120} />
        <p className="biglietto">{f.enigma}</p>
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
        <img src={`/assets/oggetti/${n === 9 ? 'forziere-cima' : 'forziere-chiuso'}.webp`} alt="" width={120} height={120} />
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
