import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import Accesso from './Accesso';
import AreaGenitori from './AreaGenitori';
import { supabase, type Profilo } from './supabase';

// R-Evolution resta nascosta nello sprint 1: comparirà con un popup di annuncio.
const VOCI = ['Oggi', 'Studio', 'Sera', 'Astra'] as const;
type Voce = (typeof VOCI)[number] | 'Genitori';

export default function App() {
  const [sessione, setSessione] = useState<Session | null | undefined>();
  const [profilo, setProfilo] = useState<Profilo | null | undefined>();
  const [voce, setVoce] = useState<Voce>('Oggi');

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
        <h1>{voce}</h1>
      </main>
      <nav className="barra" aria-label="Sezioni">
        {VOCI.map((v) => (
          <button key={v} aria-current={v === voce ? 'page' : undefined} onClick={() => setVoce(v)}>
            {v}
          </button>
        ))}
      </nav>
    </>
  );
}
