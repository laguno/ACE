import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from '@phosphor-icons/react';
import { Sticker } from './kit';
import * as C from './lib/calendario';
import * as R from './lib/regole';
import { adesso, passi } from './spunte';
import { supabase } from './supabase';

// Dieci minuti di allenamento (sprint 2, decisione del 13/11; dal 23/11 dalle 6:00 alle 21:20): si avviano nella finestra
// del config, Lani sceglie l'esercizio dal menu dei genitori (tabella esercizi_dieci_minuti),
// avvia il timer e spunta solo quando arriva in fondo. Le ore stanno sulla riga di serate del
// giorno e le mette il server (trigger timbra_ora); la funzione "passi" (tipo dieci_minuti)
// ricontrolla finestra e timer. Si vede solo con R-Evolution accesa.
// v2 (23/11): in Oggi è una fascia in stile allenamento con VIA; il timer gira a tutto schermo.

type Stato = { da: string | null; il: string | null; esercizio: string | null };

const SECONDI = R.CONFIG.dieci_minuti.secondi;
// l'avvio lo timbra il server, il timer gira sull'orologio del telefono: qualche secondo in più
// perché un telefono un po' avanti non faccia spuntare prima del tempo misurato dal server
const MARGINE = 5;
const FINESTRA = R.CONFIG.dieci_minuti.finestra;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// il collegamento del coach in R-Evolution: Oggi si apre e la carta scorre in vista appena c'è
let cercata = false;
export const vaiAiDieciMinuti = () => {
  cercata = true;
};

export function DieciMinuti({ oggi }: { oggi: Date }) {
  const carta = useRef<HTMLElement>(null);
  const [stato, setStato] = useState<Stato>();
  const [menu, setMenu] = useState<R.EsercizioDieciMinuti[]>([]);
  const [pallavolo, setPallavolo] = useState(false);
  const [scelta, setScelta] = useState<string>();
  const [cambia, setCambia] = useState(false);
  const [ora, setOra] = useState(Date.now());
  const [errore, setErrore] = useState('');
  // v2: il timer sta a tutto schermo; la pausa allunga solo l'attesa (il server conta dall'avvio)
  const [aperto, setAperto] = useState(false);
  const [pausaDa, setPausaDa] = useState<number | null>(null);
  const [pausato, setPausato] = useState(0);

  const data = R.iso(oggi);
  useEffect(() => {
    const domani = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() + 1);
    Promise.all([
      supabase.from('serate').select('dieci_minuti_da, dieci_minuti_il, dieci_minuti_esercizio').eq('data', data).maybeSingle(),
      supabase.from('impegni_famiglia').select('titolo').gte('inizio', oggi.toISOString()).lt('inizio', domani.toISOString()),
      supabase.from('esercizi_dieci_minuti').select('id, nome, tipo').order('creato_il'),
    ]).then(([s, i, m]) => {
      setStato({ da: s.data?.dieci_minuti_da ?? null, il: s.data?.dieci_minuti_il ?? null, esercizio: s.data?.dieci_minuti_esercizio ?? null });
      setPallavolo((i.data ?? []).some((x) => C.tipoImpegno(x.titolo) !== 'famiglia'));
      setMenu(m.data ?? []);
    });
  }, [data]);

  const inCorso = !!stato?.da && !stato.il;
  useEffect(() => {
    if (!inCorso) return;
    const t = setInterval(() => setOra(Date.now()), 1000);
    return () => clearInterval(t);
  }, [inCorso]);

  useEffect(() => {
    if (!cercata || !carta.current) return;
    cercata = false;
    carta.current.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });

  useEffect(() => {
    if (!aperto) return;
    const esci = (e: KeyboardEvent) => e.key === 'Escape' && setAperto(false);
    window.addEventListener('keydown', esci);
    return () => window.removeEventListener('keydown', esci);
  }, [aperto]);

  if (!stato) return null;
  const proposto = R.esercizioDelGiorno(oggi, pallavolo, menu);
  const esercizio = menu.find((e) => e.id === (stato.esercizio ?? scelta)) ?? proposto;
  const nome = (esercizio?.nome ?? 'allenamento').toLowerCase();
  const Nome = nome[0].toUpperCase() + nome.slice(1);
  const tipo = esercizio?.tipo === 'recupero' ? 'RECUPERO' : esercizio?.tipo === 'forza_riflessi' ? 'FORZA E RIFLESSI' : 'ALLENAMENTO';
  const fermo = pausaDa !== null ? ora - pausaDa : 0;
  const trascorsi = stato.da ? Math.floor((ora - new Date(stato.da).getTime() - pausato - fermo) / 1000) : 0;
  const mancano = stato.da ? Math.max(0, SECONDI + MARGINE - trascorsi) : SECONDI;
  const tempo = Math.min(mancano, SECONDI);
  // prima di avviarli: solo nella finestra e con un menu
  if (!stato.da && (!R.dentroFinestraDieciMinuti(new Date()) || !proposto)) return null;

  async function avvia() {
    setErrore('');
    const { data: s, error } = await supabase
      .from('serate')
      .upsert({ data, dieci_minuti_da: adesso(), dieci_minuti_esercizio: esercizio?.id ?? null })
      .select('dieci_minuti_da, dieci_minuti_il, dieci_minuti_esercizio')
      .single();
    if (error) return setErrore('Timer non partito. Riprova.');
    setOra(Date.now());
    setPausaDa(null);
    setPausato(0);
    setStato({ da: s.dieci_minuti_da, il: s.dieci_minuti_il, esercizio: s.dieci_minuti_esercizio });
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

  function pausa() {
    if (pausaDa === null) setPausaDa(Date.now());
    else {
      setPausato((p) => p + (Date.now() - pausaDa));
      setPausaDa(null);
    }
  }

  const finito = inCorso && mancano === 0;
  const giro = 741.4;
  const offset = Math.round(giro * (1 - tempo / SECONDI) * 10) / 10; // l'anello mostra il tempo che resta

  return (
    <>
      <section className={`fascia-dieci${stato.il ? ' fatta' : ''}`} id="dieci-minuti" ref={carta} aria-label="Dieci minuti">
        <svg className="campo-righe" viewBox="0 0 390 240" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <path d="M-20 200 L410 120 M-20 225 L410 145" stroke="#c6ff3d" strokeOpacity="0.18" strokeWidth="10" />
          <path d="M195 14 V240 M20 70 H370 M20 210 H370" stroke="#fff" strokeOpacity="0.07" strokeWidth="3" />
          <circle cx="195" cy="140" r="46" fill="none" stroke="#fff" strokeOpacity="0.07" strokeWidth="3" />
        </svg>
        <div className="fascia-testa">
          <span className="tag">{tipo}</span>
          <span className="entro">{stato.il ? 'fatti' : `entro le ${FINESTRA.ultimo_avvio}`}</span>
        </div>
        <div className="fascia-corpo">
          <div className="fascia-testo">
            {stato.il ? (
              errore ? (
                <span>Segnati, ma i passi non sono arrivati.</span>
              ) : (
                <>
                  <b className="grande">FATTI!</b>
                  <span>{Nome}, 10 minuti. Il coach approva.</span>
                </>
              )
            ) : (
              <>
                <span className="tempo-grande">{mmss(inCorso ? tempo : SECONDI)}</span>
                <b className="grande">DIECI MINUTI</b>
                <span>{Nome}</span>
              </>
            )}
          </div>
          <Sticker posa={stato.il ? 'allenatore-applaude' : 'allenatore-pollice'} misura={96} className="fascia-allenatore" />
        </div>
        {errore && (
          <p role="alert" className="fascia-errore">
            {errore}
          </p>
        )}
        {!stato.il && (
          <>
            <button className="via" onClick={inCorso ? () => setAperto(true) : avvia}>
              {inCorso ? 'APRI IL TIMER' : 'VIA'}
            </button>
            {!inCorso && menu.length > 1 && (
              <>
                <button className="cambia" aria-expanded={cambia} onClick={() => setCambia((c) => !c)}>
                  Cambia esercizio
                </button>
                {cambia && (
                  <ul className="pastiglie-dieci" aria-label="Scegli l'esercizio">
                    {menu.map((e) => (
                      <li key={e.id}>
                        <label className="chip-dieci">
                          <input type="radio" name="dieci-minuti" checked={esercizio?.id === e.id} onChange={() => setScelta(e.id)} />
                          <span>{e.nome}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </>
        )}
      </section>

      {aperto && inCorso && (
        <div className="timer-dieci" role="dialog" aria-modal="true" aria-label="Dieci minuti, timer">
          <svg className="campo-righe" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" aria-hidden>
            <path d="M-40 640 L430 470 M-40 680 L430 510" stroke="#c6ff3d" strokeOpacity="0.14" strokeWidth="14" />
            <path d="M195 0 V844 M20 130 H370 M20 720 H370" stroke="#fff" strokeOpacity="0.06" strokeWidth="3" />
          </svg>
          <div className="timer-testa">
            <span className="tag">{tipo}</span>
            <button className="esci" onClick={() => setAperto(false)}>
              Esci
            </button>
          </div>
          <div className="anello">
            <svg width="270" height="270" viewBox="0 0 270 270" aria-hidden>
              <circle cx="135" cy="135" r="118" fill="none" stroke="#24274A" strokeWidth="18" />
              <circle cx="135" cy="135" r="118" fill="none" stroke="#C6FF3D" strokeWidth="18" strokeLinecap="round" strokeDasharray={giro} strokeDashoffset={finito ? 0 : offset} transform="rotate(-90 135 135)" />
            </svg>
            <div className="anello-dentro">
              {finito ? (
                <Sticker posa="lani-festeggia" misura={190} />
              ) : (
                <>
                  <span className="tempo" role="timer" aria-live="off" aria-label={`Mancano ${mmss(tempo)}`}>
                    {mmss(tempo)}
                  </span>
                  <span className="sotto-tempo">{pausaDa !== null ? 'in pausa' : `di ${mmss(SECONDI)}`}</span>
                </>
              )}
            </div>
          </div>
          <div className="timer-titolo">
            <h2>{finito ? 'FATTI!' : nome.toUpperCase()}</h2>
          </div>
          {errore && (
            <p role="alert" className="fascia-errore">
              {errore}
            </p>
          )}
          <div className="timer-coach">
            <Sticker posa={finito ? 'allenatore-applaude' : 'allenatore-pollice'} misura={84} />
            <span>{finito ? 'Allenamento fatto. Brava, così si lavora.' : 'Timer partito. Fino in fondo, poi spunta.'}</span>
          </div>
          {finito ? (
            <button className="segna" onClick={fatto} autoFocus>
              SEGNA FATTO
            </button>
          ) : (
            <button className="pausa" onClick={pausa}>
              {pausaDa !== null ? <Play size={22} weight="fill" aria-hidden /> : <Pause size={22} weight="fill" aria-hidden />}
              {pausaDa !== null ? 'RIPRENDI' : 'PAUSA'}
            </button>
          )}
        </div>
      )}
    </>
  );
}
