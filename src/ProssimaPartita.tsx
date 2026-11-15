import { useEffect, useState } from 'react';
import { Volleyball } from '@phosphor-icons/react';
import * as R from './lib/regole';
import { assenteDalCalendario, garaDi, oraDiRoma, pillolaPartita, traQuanto } from './lib/classifiche';
import { GIORNI, maiuscola } from './spunte';
import { supabase } from './supabase';

// Prossima partita di R-Evolution (regole del 15/11, docs/08): dal calendario gare FIPAV (gare_fipav,
// funzione classifiche), saltando i giorni che il calendario di famiglia segna "[LANI ASSENTE]".
// Carta in cima a R-Evolution, pillola in Oggi il giorno prima e il giorno stesso. Niente secondi.

type Prossima = { inizio: Date; avversaria: string; inCasa: boolean };

export function useProssimaPartita(): Prossima | null | undefined {
  const [p, setP] = useState<Prossima | null>();
  useEffect(() => {
    (async () => {
      const ora = new Date().toISOString();
      const { data: gare } = await supabase.from('gare_fipav').select('*').gt('inizio', ora).order('inizio').limit(30);
      const nostre = (gare ?? []).flatMap((g) => {
        const c = R.CONFIG.classifiche.campionati.find((x) => x.cid === g.cid);
        const x = c && garaDi(c.squadra, g);
        return x
          ? [
              {
                inizio: new Date(g.inizio),
                avversaria: x.avversaria,
                inCasa: x.inCasa,
              },
            ]
          : [];
      });
      if (!nostre.length) return setP(null);
      const { data: impegni } = await supabase
        .from('impegni_famiglia')
        .select('titolo, inizio')
        .gte('inizio', ora)
        .lte('inizio', new Date(nostre[nostre.length - 1].inizio.getTime() + 86_400_000).toISOString());
      const giorno = (t: string | Date) => R.iso(R.giornoRoma(t));
      const titoli = (g: Date) => (impegni ?? []).filter((i) => giorno(i.inizio) === giorno(g)).map((i) => i.titolo);
      setP(nostre.find((g) => !assenteDalCalendario(titoli(g.inizio))) ?? null);
    })().catch(() => setP(null));
  }, []);
  return p;
}

export function CartaProssimaPartita() {
  const p = useProssimaPartita();
  if (!p) return null;
  const g = R.giornoRoma(p.inizio);
  return (
    <div className="carta prossima-partita" aria-label="Prossima partita">
      <h2>Prossima partita</h2>
      <p>
        <b>{p.avversaria}</b>, {p.inCasa ? 'in casa' : 'in trasferta'}
      </p>
      <p>
        {maiuscola(GIORNI[g.getDay()])} {g.getDate()}/{g.getMonth() + 1} alle {oraDiRoma(p.inizio)}, {traQuanto(p.inizio, new Date())}
      </p>
    </div>
  );
}

export function PillolaPartita() {
  const p = useProssimaPartita();
  const testo = p && pillolaPartita(p.inizio, new Date());
  if (!testo) return null;
  return (
    <p className="pillola pillola-partita">
      <Volleyball size={18} weight="bold" aria-hidden /> {testo}
    </p>
  );
}
