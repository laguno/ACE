import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Sticker } from './kit';
import * as R from './lib/regole';
import { carta as cartaN, usciteInSettimana, type Carta } from './lib/regole/dieci-minuti';
import { Ruota } from './Ruota';
import { SessioneDieci } from './SessioneDieci';
import { adesso, passi } from './spunte';
import { supabase } from './supabase';

// Dieci minuti di allenamento (sprint 2, decisione del 13/11; dal 23/11 dalle 6:00 alle 21:20). Dal 25/11 a carte
// (progetto del signore con Jarvis, docs/dieci-minuti.md): Lani non sceglie, ogni giorno gira la ruota e il server
// fissa la carta (gira_ruota, mazzo della settimana senza ripetizioni). Poi VIA: la sessione a tutto schermo
// (SessioneDieci) e, arrivata in fondo, SEGNA FATTO. Le ore stanno sulla riga di serate del giorno e le mette il
// server (trigger timbra_ora); la funzione "passi" (tipo dieci_minuti) ricontrolla finestra e timer, come prima.
// Si vede solo con R-Evolution accesa.

type Stato = { da: string | null; il: string | null; carta: number | null; uscite: number[] };

const SECONDI = R.CONFIG.dieci_minuti.secondi;
// l'avvio lo timbra il server, il timer gira sull'orologio del telefono: qualche secondo in più
// perché un telefono un po' avanti non faccia spuntare prima del tempo misurato dal server
const MARGINE = 5;
const FINESTRA = R.CONFIG.dieci_minuti.finestra;
const CHIAVE_VISORE = 'ace:dieci-minuti:visore';

// il collegamento del coach in R-Evolution: Oggi si apre e la carta scorre in vista appena c'è
let cercata = false;
export const vaiAiDieciMinuti = () => {
  cercata = true;
};

function lunediDi(data: string) {
  const g = new Date(`${data}T12:00:00Z`);
  return new Date(g.getTime() - ((g.getUTCDay() + 6) % 7) * 86400000).toISOString().slice(0, 10);
}

export function DieciMinuti({ oggi }: { oggi: Date }) {
  const fascia = useRef<HTMLElement>(null);
  const [stato, setStato] = useState<Stato>();
  const [visore, setVisore] = useState(() => localStorage.getItem(CHIAVE_VISORE) === '1');
  const [ora, setOra] = useState(Date.now());
  const [errore, setErrore] = useState('');
  const [aperto, setAperto] = useState(false);

  const data = R.iso(oggi);
  useEffect(() => {
    Promise.all([
      supabase.from('serate').select('dieci_minuti_da, dieci_minuti_il').eq('data', data).maybeSingle(),
      supabase.from('carte_del_giorno').select('data, carta').gte('data', lunediDi(data)).lte('data', data),
    ]).then(([s, c]) => {
      const giorni = c.data ?? [];
      setStato({
        da: s.data?.dieci_minuti_da ?? null,
        il: s.data?.dieci_minuti_il ?? null,
        carta: giorni.find((g) => g.data === data)?.carta ?? null,
        uscite: usciteInSettimana(giorni, data),
      });
    });
  }, [data]);

  const inCorso = !!stato?.da && !stato.il;
  useEffect(() => {
    if (!inCorso) return;
    const t = setInterval(() => setOra(Date.now()), 1000);
    return () => clearInterval(t);
  }, [inCorso]);

  useEffect(() => {
    if (!cercata || !fascia.current) return;
    cercata = false;
    fascia.current.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });

  useEffect(() => {
    if (!aperto) return;
    const esci = (e: KeyboardEvent) => e.key === 'Escape' && setAperto(false);
    window.addEventListener('keydown', esci);
    return () => window.removeEventListener('keydown', esci);
  }, [aperto]);

  if (!stato) return null;
  // prima di avviarli: solo nella finestra
  if (!stato.da && !R.dentroFinestraDieciMinuti(new Date())) return null;
  const c: Carta | undefined = stato.carta ? cartaN(stato.carta) : undefined;
  const trascorsi = stato.da ? Math.floor((ora - new Date(stato.da).getTime()) / 1000) : 0;
  const pronto = inCorso && trascorsi >= SECONDI + MARGINE;

  async function gira() {
    setErrore('');
    const { data: n, error } = await supabase.rpc('gira_ruota');
    if (error || !n) {
      setErrore('La ruota si è inceppata. Riprova.');
      return null;
    }
    return n as number;
  }

  function scegliVisore(v: boolean) {
    setVisore(v);
    localStorage.setItem(CHIAVE_VISORE, v ? '1' : '0');
  }

  async function avvia() {
    if (!c) return;
    setErrore('');
    const { data: s, error } = await supabase
      .from('serate')
      .upsert({ data, dieci_minuti_da: adesso(), dieci_minuti_esercizio: `carta-${c.n}` })
      .select('dieci_minuti_da, dieci_minuti_il')
      .single();
    if (error) return setErrore('Timer non partito. Riprova.');
    setOra(Date.now());
    setStato((x) => x && { ...x, da: s.dieci_minuti_da, il: s.dieci_minuti_il });
    setAperto(true);
  }

  async function fatto() {
    setErrore('');
    const { error } = await supabase.from('serate').update({ dieci_minuti_il: adesso() }).eq('data', data);
    if (error) return setErrore('Spunta non salvata. Riprova.');
    setStato((s) => s && { ...s, il: adesso() });
    setAperto(false);
    if (!(await passi('dieci_minuti', data))) setErrore("Questa volta non li ho potuti contare: l'ora del telefono non torna. Domani si riprova.");
  }

  const conVisore = !!c?.visore && visore;

  return (
    <>
      <section className={`fascia-dieci${stato.il ? ' fatta' : ''}`} id="dieci-minuti" ref={fascia} aria-label="Dieci minuti">
        <svg className="campo-righe" viewBox="0 0 390 240" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <path d="M-20 200 L410 120 M-20 225 L410 145" stroke="#c6ff3d" strokeOpacity="0.18" strokeWidth="10" />
          <path d="M195 14 V240 M20 70 H370 M20 210 H370" stroke="#fff" strokeOpacity="0.07" strokeWidth="3" />
          <circle cx="195" cy="140" r="46" fill="none" stroke="#fff" strokeOpacity="0.07" strokeWidth="3" />
        </svg>
        <div className="fascia-testa">
          <span className="tag">{c ? `CARTA ${c.n}` : stato.il ? 'DIECI MINUTI' : 'LA CARTA DI OGGI'}</span>
          <span className="entro">{stato.il ? 'fatti' : `entro le ${FINESTRA.ultimo_avvio}`}</span>
        </div>

        {!c && stato.il ? (
          // fatti prima delle carte (il giorno del passaggio, col menu di prima): niente ruota
          <div className="fascia-corpo">
            <div className="fascia-testo">
              <b className="grande">FATTI!</b>
              <span>10 minuti. Il coach approva.</span>
            </div>
            <Sticker posa="allenatore-applaude" misura={96} className="fascia-allenatore" />
          </div>
        ) : !c ? (
          <Ruota uscite={stato.uscite} gira={gira} fermata={(n) => setStato((x) => x && { ...x, carta: n, uscite: [...new Set([...x.uscite, n])] })} />
        ) : (
          <>
            <div className="fascia-corpo">
              <div className="fascia-testo">
                {stato.il ? (
                  errore ? (
                    <span>Segnati, ma i passi non sono arrivati.</span>
                  ) : (
                    <>
                      <b className="grande">FATTI!</b>
                      <span>{c.nome}, 10 minuti. Il coach approva.</span>
                    </>
                  )
                ) : (
                  <>
                    <b className="grande">{c.nome.toUpperCase()}</b>
                    <span>{conVisore ? 'Beat Saber col visore, 10 minuti.' : c.figura === 'trick' ? '10 minuti, 8 trick a sorpresa.' : '10 minuti, 8 blocchi da 40 secondi.'}</span>
                  </>
                )}
              </div>
              <Sticker posa={stato.il ? 'allenatore-applaude' : 'allenatore-pollice'} misura={96} className="fascia-allenatore" />
            </div>
            {c.visore && !stato.da && (
              <label className="interruttore-visore">
                <input type="checkbox" checked={visore} onChange={(e) => scegliVisore(e.target.checked)} />
                <span>{c.visore.interruttore}</span>
              </label>
            )}
            {!stato.il && (
              <button className="via" onClick={inCorso ? () => setAperto(true) : avvia}>
                {inCorso ? 'APRI IL TIMER' : 'VIA'}
              </button>
            )}
          </>
        )}
        {errore && (
          <p role="alert" className="fascia-errore">
            {errore}
          </p>
        )}
      </section>

      {aperto && inCorso && c && stato.da && (
        <div className={c.tema ? 'sessione tema' : 'sessione'} style={c.tema && ({ '--anello': c.tema.anello } as CSSProperties)} role="dialog" aria-modal="true" aria-label={`Dieci minuti: ${c.nome}`}>
          <SessioneDieci carta={c} visore={conVisore} avvio={new Date(stato.da).getTime()} oggi={data} pronto={pronto} errore={errore} esci={() => setAperto(false)} segnaFatto={fatto} />
        </div>
      )}
    </>
  );
}
