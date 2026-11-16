import { useEffect, useState } from 'react';
import { Volleyball } from '@phosphor-icons/react';
import * as R from './lib/regole';
import { assenteDalCalendario, garaDi, oraDiRoma, pillolaPartita, traQuanto } from './lib/classifiche';
import { Emoji } from './kit';
import { GIORNI, MESI } from './spunte';
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

/** Le righe del nastro "Ultim'ora" sulla prossima partita: avversaria, giorno e ora, quanto manca. */
export function notizieProssima(p: Prossima, ora: Date): string[] {
  const g = R.giornoRoma(p.inizio);
  return [`Prossima partita: ${p.avversaria}`, `${GIORNI[g.getDay()]} ${g.getDate()} ${MESI[g.getMonth()]} alle ${oraDiRoma(p.inizio)}`, traQuanto(p.inizio, ora)];
}

export function CartaProssimaPartita({ p }: { p: Prossima | null | undefined }) {
  if (!p) return null;
  const g = R.giornoRoma(p.inizio);
  return (
    <div className="carta prossima-partita" aria-label="Prossima partita">
      <div className="giorno">
        {GIORNI[g.getDay()].slice(0, 3)} <b>{g.getDate()}</b> {MESI[g.getMonth()]}
      </div>
      <div>
        <h2>
          <Emoji e="🏐" /> Prossima partita
        </h2>
        <p className="avversaria">{p.avversaria}</p>
        <p>
          Alle {oraDiRoma(p.inizio)}, {p.inCasa ? 'in casa' : 'in trasferta'} <Emoji e={p.inCasa ? '🏠' : '🚌'} />
        </p>
        <span className="quanto">
          <Emoji e="⏳" /> {traQuanto(p.inizio, new Date())}
        </span>
      </div>
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
