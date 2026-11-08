import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import Accesso from './Accesso';
import AreaGenitori from './AreaGenitori';
import Oggi from './Oggi';
import Sera from './Sera';
import Studio from './Studio';
import Astra from './Astra';
import CodaPopup from './Popup';
import Benvenuta, { daAccogliere } from './Benvenuta';
import { Album, Figurina } from './Figurine';
import { oraAdesso, useGiornata } from './giornata';
import * as C from './lib/calendario';
import { supabase, type Profilo } from './supabase';

// R-Evolution resta nascosta nello sprint 1: comparirà con un popup di annuncio.
const VOCI = ['Oggi', 'Studio', 'Sera', 'Astra'] as const;
type Voce = (typeof VOCI)[number] | 'Genitori' | 'Figurina' | 'Album';

export default function App() {
  const [sessione, setSessione] = useState<Session | null | undefined>();
  const [profilo, setProfilo] = useState<Profilo | null | undefined>();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessione(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSessione(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const uid = sessione?.user.id;
  useEffect(() => {
    setProfilo(undefined);
    if (!uid) return;
    supabase
      .from('profili')
      .select('id, ruolo, nome')
      .eq('id', uid)
      .maybeSingle()
      .then(({ data }) => setProfilo(data as Profilo | null));
  }, [uid]);

  if (sessione === undefined) return null;
  if (!sessione)
    return (
      <main>
        <Accesso client={supabase} titolo="Ciao, entra in ACE" />
      </main>
    );
  if (profilo === undefined) return null;
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
  useEffect(() => {
    if (giornata && !voce) setVoce(C.momento(oraAdesso(), giornata.chiusura) === 'sera' ? 'Sera' : 'Oggi');
  }, [giornata]);
  if (accogli) return <Benvenuta fine={() => setAccogli(false)} />;
  if (!voce) return null;

  if (voce === 'Genitori')
    return (
      <main>
        <AreaGenitori suoDispositivo={false} chiudi={() => setVoce('Oggi')} />
      </main>
    );

  return (
    <>
      <main>
        <button className="angolo" onClick={() => setVoce('Genitori')}>Genitori</button>
        {voce === 'Sera' ? (
          <Sera />
        ) : voce === 'Oggi' ? (
          <Oggi />
        ) : voce === 'Studio' ? (
          <Studio />
        ) : voce === 'Figurina' ? (
          <Figurina chiudi={() => setVoce('Astra')} />
        ) : voce === 'Album' ? (
          <Album chiudi={() => setVoce('Astra')} />
        ) : (
          <Astra apri={setVoce} />
        )}
      </main>
      <CodaPopup />
      <nav className="barra" aria-label="Sezioni">
        {VOCI.map((v) => (
          <button key={v} aria-current={v === voce || (v === 'Astra' && (voce === 'Figurina' || voce === 'Album')) ? 'page' : undefined} onClick={() => setVoce(v)}>
            {v}
          </button>
        ))}
      </nav>
    </>
  );
}
