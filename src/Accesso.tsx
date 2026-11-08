import { useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

export default function Accesso({ client, titolo }: { client: SupabaseClient; titolo: string }) {
  const [errore, setErrore] = useState('');
  const [attesa, setAttesa] = useState(false);

  async function entra(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dati = new FormData(e.currentTarget);
    setAttesa(true);
    const { error } = await client.auth.signInWithPassword({
      email: String(dati.get('email')).trim(),
      password: String(dati.get('password')),
    });
    setAttesa(false);
    if (error) setErrore('Mail o password non giuste. Riprova.');
  }

  return (
    <form className="carta modulo" onSubmit={entra}>
      <h1>{titolo}</h1>
      <label>
        Mail
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {errore && <p role="alert">{errore}</p>}
      <button className="principale" disabled={attesa}>Entra</button>
    </form>
  );
}
