import { useEffect, useState, type FormEvent } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import Accesso from './Accesso';
import { supabase, supabaseGenitore } from './supabase';

/**
 * Sul telefono di un genitore l'area è aperta. Sui dispositivi di Lani (iPad) serve la sessione
 * di un genitore, tenuta a parte, più il PIN a ogni ingresso; si richiude quando si esce o l'app
 * va in secondo piano.
 */
export default function AreaGenitori({ suoDispositivo, chiudi }: { suoDispositivo: boolean; chiudi?: () => void }) {
  if (suoDispositivo) return <Genitori client={supabase} />;
  return <Cancello chiudi={chiudi} />;
}

function Cancello({ chiudi }: { chiudi?: () => void }) {
  const [sessione, setSessione] = useState<Session | null | undefined>();
  const [sbloccata, setSbloccata] = useState(false);
  const [errore, setErrore] = useState('');

  useEffect(() => {
    supabaseGenitore.auth.getSession().then(({ data }) => setSessione(data.session));
    const { data } = supabaseGenitore.auth.onAuthStateChange((_e, s) => setSessione(s));
    const richiudi = () => document.hidden && setSbloccata(false);
    document.addEventListener('visibilitychange', richiudi);
    return () => {
      data.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', richiudi);
    };
  }, []);

  async function provaPin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const pin = String(new FormData(e.currentTarget).get('pin'));
    const { data, error } = await supabaseGenitore.rpc('verifica_pin', { p_pin: pin });
    if (!error && data === true) return setSbloccata(true);
    setErrore('PIN non giusto, oppure troppi tentativi: riprova tra qualche minuto.');
  }

  const torna = chiudi && <button className="secondario" onClick={chiudi}>Torna ad ACE</button>;

  if (sessione === undefined) return null;
  if (!sessione)
    return (
      <>
        <Accesso client={supabaseGenitore} titolo="Area genitori" />
        {torna}
      </>
    );
  if (!sbloccata)
    return (
      <form className="carta modulo" onSubmit={provaPin}>
        <h1>Area genitori</h1>
        <label>
          PIN
          <input name="pin" type="password" inputMode="numeric" pattern="\d{4,8}" autoComplete="off" required />
        </label>
        {errore && <p role="alert">{errore}</p>}
        <button className="principale">Apri</button>
        {torna}
      </form>
    );
  return (
    <>
      <Genitori client={supabaseGenitore} />
      {torna}
    </>
  );
}

// ponytail: segnaposto della tappa 7 (La settimana, gesti, sgridate, premi); per ora solo PIN e uscita.
function Genitori({ client }: { client: SupabaseClient }) {
  const [esito, setEsito] = useState('');

  async function impostaPin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const pin = String(new FormData(form).get('pin'));
    const { error } = await client.rpc('imposta_pin', { p_pin: pin });
    setEsito(error ? 'PIN non salvato: servono da 4 a 8 cifre.' : 'PIN salvato.');
    if (!error) form.reset();
  }

  return (
    <section className="carta modulo">
      <h1>Genitori</h1>
      <form className="modulo" onSubmit={impostaPin}>
        <label>
          Nuovo PIN dell'area genitori (per l'iPad)
          <input name="pin" type="password" inputMode="numeric" pattern="\d{4,8}" autoComplete="new-password" required />
        </label>
        <button className="principale">Salva PIN</button>
        {esito && <p role="status">{esito}</p>}
      </form>
      <button className="secondario" onClick={() => client.auth.signOut()}>Esci</button>
    </section>
  );
}
