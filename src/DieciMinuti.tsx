import { useEffect, useState } from 'react';
import { Check } from '@phosphor-icons/react';
import * as C from './lib/calendario';
import * as R from './lib/regole';
import { adesso, passi } from './spunte';
import { supabase } from './supabase';

// Dieci minuti di allenamento (sprint 2, docs/01 "Il menu dei dieci minuti"): Lani sceglie
// l'esercizio, avvia il timer e spunta solo quando arriva in fondo. Le ore le mette il server
// (trigger timbra_ora) e la funzione "passi" ricontrolla che il timer sia arrivato in fondo.
// Si vede solo da R-Evolution (periodo.r_evolution_da).

type Stato = { da: string | null; il: string | null; esercizio: string | null };

const SECONDI = R.CONFIG.dieci_minuti.secondi;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function DieciMinuti({ oggi, quandoFatto }: { oggi: Date; quandoFatto: () => void }) {
  const [stato, setStato] = useState<Stato>();
  const [pallavolo, setPallavolo] = useState(false);
  const [scelta, setScelta] = useState<string>();
  const [ora, setOra] = useState(Date.now());
  const [errore, setErrore] = useState('');

  const data = R.iso(oggi);
  useEffect(() => {
    const domani = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() + 1);
    Promise.all([
      supabase.from('serate').select('dieci_minuti_da, dieci_minuti_il, dieci_minuti_esercizio').eq('data', data).maybeSingle(),
      supabase.from('impegni_famiglia').select('titolo').gte('inizio', oggi.toISOString()).lt('inizio', domani.toISOString()),
    ]).then(([s, i]) => {
      setStato({ da: s.data?.dieci_minuti_da ?? null, il: s.data?.dieci_minuti_il ?? null, esercizio: s.data?.dieci_minuti_esercizio ?? null });
      setPallavolo((i.data ?? []).some((x) => C.tipoImpegno(x.titolo) !== 'famiglia'));
    });
  }, [data]);

  const inCorso = !!stato?.da && !stato.il;
  useEffect(() => {
    if (!inCorso) return;
    const t = setInterval(() => setOra(Date.now()), 1000);
    return () => clearInterval(t);
  }, [inCorso]);

  if (!stato) return null;
  const proposto = R.esercizioDelGiorno(oggi, pallavolo);
  const esercizio = R.CONFIG.dieci_minuti.menu.find((e) => e.id === (stato.esercizio ?? scelta ?? proposto.id)) ?? proposto;
  const mancano = stato.da ? Math.max(0, SECONDI - Math.floor((ora - new Date(stato.da).getTime()) / 1000)) : SECONDI;

  async function avvia() {
    setErrore('');
    const { data: s, error } = await supabase
      .from('serate')
      .upsert({ data, dieci_minuti_da: adesso(), dieci_minuti_esercizio: esercizio.id })
      .select('dieci_minuti_da, dieci_minuti_il, dieci_minuti_esercizio')
      .single();
    if (error) return setErrore('Timer non partito. Riprova.');
    setOra(Date.now());
    setStato({ da: s.dieci_minuti_da, il: s.dieci_minuti_il, esercizio: s.dieci_minuti_esercizio });
  }

  async function fatto() {
    setErrore('');
    const { error } = await supabase.from('serate').update({ dieci_minuti_il: adesso() }).eq('data', data);
    if (error) return setErrore('Spunta non salvata. Riprova.');
    setStato((s) => s && { ...s, il: adesso() });
    await passi('serata', data);
    quandoFatto();
  }

  return (
    <div className="carta dieci-minuti">
      <div className="testa-carta">
        <h2>Dieci minuti</h2>
        <span className="valore">+{R.CONFIG.passi.obbligatori.dieci_minuti}</span>
      </div>
      {errore && <p role="alert">{errore}</p>}

      {stato.il ? (
        <p className="nota accento">
          <Check size={16} weight="bold" aria-hidden /> Fatto: {esercizio.nome.toLowerCase()}. Bart approva.
        </p>
      ) : stato.da ? (
        <>
          <p className="nota">Oggi: {esercizio.nome.toLowerCase()}.</p>
          <p className="timer" role="timer" aria-live="off" aria-label={`Mancano ${mmss(mancano)}`}>
            {mmss(mancano)}
          </p>
          <button className="principale largo" disabled={mancano > 0} onClick={fatto}>
            {mancano > 0 ? 'Vai fino in fondo' : 'Fatto'}
          </button>
        </>
      ) : (
        <>
          <p className="nota">Dieci minuti: oggi {proposto.nome.toLowerCase()}. Pronta?</p>
          <ul className="pastiglie" aria-label="Scegli l'esercizio">
            {R.CONFIG.dieci_minuti.menu.map((e) => (
              <li key={e.id}>
                <label className="chip chip-lilla">
                  <input type="radio" name="dieci-minuti" checked={esercizio.id === e.id} onChange={() => setScelta(e.id)} />
                  <Check size={16} weight="bold" aria-hidden className="segno" />
                  <span>{e.nome}</span>
                </label>
              </li>
            ))}
          </ul>
          <button className="principale largo" onClick={avvia}>
            Avvia il timer
          </button>
        </>
      )}
    </div>
  );
}
