import { useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import Accesso from './Accesso';
import Genitori from './Genitori';
import { supabase, supabaseGenitore } from './supabase';
import { Attesa, CampoTesto } from './kit';

/**
 * Sul telefono di un genitore l'area è aperta. Sui dispositivi di Lani (iPad) serve la sessione
 * di un genitore, tenuta a parte, più il PIN; resta aperta 10 minuti dall'ultima azione (sotto).
 */
export default function AreaGenitori({ suoDispositivo, chiudi }: { suoDispositivo: boolean; chiudi?: () => void }) {
  if (suoDispositivo) return <Genitori client={supabase} esci={() => supabase.auth.signOut()} />;
  return <Cancello chiudi={chiudi} />;
}

const ERRORE_SERVER = 'Non riesco a controllare il PIN adesso. Controlla la connessione e riprova.';
const MESSAGGI_PIN: Record<string, string> = {
  sbagliato: 'PIN non giusto. Riprova.',
  bloccato: 'Troppi tentativi sbagliati: l’area si riapre tra 15 minuti.',
  manca: 'Il PIN non è ancora impostato: si sceglie dal telefono di un genitore, in Altro, Impostazioni.',
  no: 'Questo accesso non è di un genitore.',
};

// Dal 16/11: sbloccata per 10 minuti dall'ultima azione dentro l'area, anche uscendo dall'app o
// spegnendo lo schermo; poi di nuovo il PIN. "Chiudi l'area" blocca subito.
// ponytail: la scadenza sta nel localStorage del dispositivo, come la sessione del genitore: il PIN
// tiene lontana Lani dall'area, non è una barriera contro chi smonta il browser.
const CHIAVE = 'ace-area-aperta-fino';
const DIECI_MINUTI = 10 * 60_000;
const leggi = () => {
  try {
    return Number(localStorage.getItem(CHIAVE) ?? 0);
  } catch {
    return 0;
  }
};
const scrivi = (fino: number | null) => {
  try {
    if (fino) localStorage.setItem(CHIAVE, String(fino));
    else localStorage.removeItem(CHIAVE);
  } catch {
    /* senza memoria il PIN si chiede a ogni ingresso, come prima */
  }
};
const areaAperta = () => leggi() > Date.now();

function Cancello({ chiudi }: { chiudi?: () => void }) {
  const [sessione, setSessione] = useState<Session | null | undefined>();
  const [sbloccata, setSbloccata] = useState(areaAperta);
  const [errore, setErrore] = useState('');

  useEffect(() => {
    supabaseGenitore.auth.getSession().then(({ data }) => setSessione(data.session));
    const { data } = supabaseGenitore.auth.onAuthStateChange((_e, s) => setSessione(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // ogni tocco o tasto dentro l'area sposta la scadenza; al ritorno sull'app e ogni 15 s si controlla
  useEffect(() => {
    if (!sbloccata) return;
    const proroga = () => scrivi(Date.now() + DIECI_MINUTI);
    const controlla = () => !document.hidden && !areaAperta() && setSbloccata(false);
    proroga();
    window.addEventListener('pointerdown', proroga, true);
    window.addEventListener('keydown', proroga, true);
    document.addEventListener('visibilitychange', controlla);
    const t = window.setInterval(controlla, 15_000);
    return () => {
      window.removeEventListener('pointerdown', proroga, true);
      window.removeEventListener('keydown', proroga, true);
      document.removeEventListener('visibilitychange', controlla);
      window.clearInterval(t);
    };
  }, [sbloccata]);

  async function provaPin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const pin = String(new FormData(form).get('pin'));
    const { data, error } = await supabaseGenitore.rpc('controlla_pin', { p_pin: pin });
    if (!error && data === 'ok') return setSbloccata(true);
    form.reset();
    // "PIN non giusto" solo quando è sbagliato davvero
    setErrore(error ? ERRORE_SERVER : (MESSAGGI_PIN[data as string] ?? ERRORE_SERVER));
  }
  function chiudiArea() {
    scrivi(null);
    setSbloccata(false);
    chiudi?.();
  }

  const torna = chiudi && (
    <button type="button" className="ga-btn tenue largo" onClick={chiudi}>
      Torna ad ACE
    </button>
  );

  if (sessione === undefined) return <Attesa />;
  if (!sessione)
    return (
      <>
        <Accesso client={supabaseGenitore} titolo="Area genitori" />
        {torna}
      </>
    );
  if (!sbloccata)
    return (
      <form className="ga ga-cancello" onSubmit={provaPin}>
        <h1>Area genitori</h1>
        <div className="ga-modulo">
          <CampoTesto etichetta="PIN" name="pin" type="password" inputMode="numeric" pattern="\d{4,8}" autoComplete="off" required errore={errore || undefined} />
          <button className="ga-btn pieno largo">Apri</button>
        </div>
        {torna}
      </form>
    );
  return <Genitori client={supabaseGenitore} esci={() => (scrivi(null), supabaseGenitore.auth.signOut())} chiudi={chiudiArea} />;
}
