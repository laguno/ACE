import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react';
import { BookOpen, MoonStars, Star, Sun } from '@phosphor-icons/react';
import type { Session } from '@supabase/supabase-js';
import Accesso from './Accesso';
import Oggi from './Oggi';
import Sera from './Sera';
import CodaPopup from './Popup';
import Benvenuta, { daAccogliere } from './Benvenuta';
import { oraAdesso, useGiornata } from './giornata';
import * as C from './lib/calendario';
import { Attesa } from './kit';
import { rinnovaIscrizione } from './notifiche';
import { CHIAVE_SESSIONE, supabase, type Profilo } from './supabase';

// L'app si apre su Oggi o Sera: le altre schermate si caricano al primo tocco (il service worker
// le tiene già in memoria, anche senza rete).
const AreaGenitori = lazy(() => import('./AreaGenitori'));
const Studio = lazy(() => import('./Studio'));
const Astra = lazy(() => import('./Astra'));
const Figurina = lazy(() => import('./Figurine').then((m) => ({ default: m.Figurina })));
const Album = lazy(() => import('./Figurine').then((m) => ({ default: m.Album })));

// R-Evolution resta nascosta nello sprint 1: comparirà con un popup di annuncio.
const VOCI = ['Oggi', 'Studio', 'Sera', 'Astra'] as const;
// icone di servizio Phosphor (design/Stile.html): bold, la sezione attiva piena in fucsia scuro
const ICONE = { Oggi: Sun, Studio: BookOpen, Sera: MoonStars, Astra: Star };
type Voce = (typeof VOCI)[number] | 'Genitori' | 'Figurina' | 'Album';

// Senza rete e con il gettone scaduto Supabase non riesce a rinnovarlo e risponde "nessuna sessione",
// ma la tiene salvata (la toglie solo uscendo o con un rinnovo rifiutato): finché c'è, si resta dentro
// e si vede l'ultima situazione, invece della schermata di accesso.
function salvata(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(CHIAVE_SESSIONE) ?? 'null') as Session | null;
  } catch {
    return null;
  }
}

const sulRete = (cambia: () => void) => {
  addEventListener('online', cambia);
  addEventListener('offline', cambia);
  return () => {
    removeEventListener('online', cambia);
    removeEventListener('offline', cambia);
  };
};

/** Striscia in cima quando manca la rete: i dati sono quelli dell'ultima volta (service worker). */
export function SenzaRete() {
  const inRete = useSyncExternalStore(sulRete, () => navigator.onLine);
  if (inRete) return null;
  return (
    <p className="senza-rete" role="status">
      Sei senza rete: vedi le cose dell'ultima volta. Per spuntare aspetta la rete.
    </p>
  );
}

// Profilo dell'ultima volta (solo chi è: Lani o un genitore): la schermata parte senza aspettare il
// database, che poi lo conferma. I dati restano protetti dalle regole del database, non da questo.
const PROFILO = 'ace-profilo';
function ricordato(uid: string): Profilo | undefined {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILO) ?? 'null') as Profilo | null;
    return p?.id === uid ? p : undefined;
  } catch {
    return undefined;
  }
}

export default function App() {
  // senza rete non si aspetta il rinnovo del gettone (Supabase lo riprova per una ventina di secondi)
  const [sessione, setSessione] = useState<Session | null | undefined>(() => (navigator.onLine ? undefined : (salvata() ?? undefined)));
  const [profilo, setProfilo] = useState<Profilo | null | undefined>();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessione(data.session ?? salvata()));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSessione(s ?? salvata()));
    return () => data.subscription.unsubscribe();
  }, []);

  const uid = sessione?.user.id;
  useEffect(() => {
    setProfilo(uid ? ricordato(uid) : undefined);
    if (!uid) return;
    rinnovaIscrizione().catch(() => {});
    supabase
      .from('profili')
      .select('id, ruolo, nome')
      .eq('id', uid)
      .maybeSingle()
      // senza rete e senza copia salvata non è "profilo da creare": si aspetta (resta la striscia)
      .then(({ data, error }) => {
        if (error) return;
        setProfilo(data as Profilo | null);
        localStorage.setItem(PROFILO, JSON.stringify(data));
      });
  }, [uid]);

  if (sessione === undefined) return <Attesa />;
  if (!sessione)
    return (
      <main>
        <Accesso client={supabase} titolo="Ciao, entra in ACE" />
      </main>
    );
  if (profilo === undefined) return <Attesa />;
  if (!profilo)
    return (
      <main className="carta modulo">
        <h1>Profilo da creare</h1>
        <p>Questo accesso non ha ancora un profilo in ACE: lo crea il papà.</p>
        <button className="secondario" onClick={() => supabase.auth.signOut()}>Esci</button>
      </main>
    );
  if (profilo.ruolo === 'genitore')
    return (
      <main>
        <AreaGenitori suoDispositivo />
      </main>
    );

  return <Lani />;
}

/** Parte di Lani: si apre su Sera da un'ora prima della chiusura, altrimenti su Oggi. */
function Lani() {
  const giornata = useGiornata();
  const [accogli, setAccogli] = useState(daAccogliere);
  const [voce, setVoce] = useState<Voce>();
  // "Prova" del popup dell'enigma: Astra si apre sul forziere con il biglietto
  const [forziere, setForziere] = useState<number>();
  useEffect(() => {
    if (giornata && !voce) setVoce(C.momento(oraAdesso(), giornata.chiusura) === 'sera' ? 'Sera' : 'Oggi');
  }, [giornata]);
  if (accogli) return <Benvenuta fine={() => setAccogli(false)} />;
  if (!voce) return <Attesa />;

  if (voce === 'Genitori')
    return (
      <main>
        <AreaGenitori suoDispositivo={false} chiudi={() => setVoce('Oggi')} />
      </main>
    );

  return (
    <>
      <main>
        <Suspense fallback={null}>
          {voce === 'Sera' ? (
            <Sera />
          ) : voce === 'Oggi' ? (
            <Oggi apri={setVoce} />
          ) : voce === 'Studio' ? (
            <Studio />
          ) : voce === 'Figurina' ? (
            <Figurina chiudi={() => setVoce('Astra')} />
          ) : voce === 'Album' ? (
            <Album chiudi={() => setVoce('Astra')} />
          ) : (
            <Astra apri={setVoce} forziere={forziere} />
          )}
        </Suspense>
        <button className="link-genitori" onClick={() => setVoce('Genitori')}>
          Genitori
        </button>
      </main>
      <CodaPopup apriEnigma={(n) => (setForziere(n), setVoce('Astra'))} apriStudio={() => setVoce('Studio')} />
      <nav className="barra" aria-label="Sezioni">
        {VOCI.map((v) => {
          const attiva = v === voce || (v === 'Astra' && (voce === 'Figurina' || voce === 'Album'));
          const Icona = ICONE[v];
          return (
            <button key={v} aria-current={attiva ? 'page' : undefined} onClick={() => (setForziere(undefined), setVoce(v))}>
              <Icona size={24} weight={attiva ? 'fill' : 'bold'} aria-hidden />
              {v}
            </button>
          );
        })}
      </nav>
    </>
  );
}
