// Selezione dei personaggi (docs/11 §3.1): "Tu" a sinistra, "CPU" a destra, anche "A caso" per ciascuno.
// "A caso" si risolve a "Gioca": è interfaccia, quindi Math.random va bene.
import { useRef, useState, type KeyboardEvent } from 'react';
import config from '../../data/config-gioco.json' with { type: 'json' };
import './selezione.css';

const P = config.pallavolo;
type Scheda = { nome: string; figura: string; mossa: string };
const SCHEDE = P.personaggi as Record<string, Scheda>;
const IDS = Object.keys(SCHEDE);
const CASO = 'caso';
const OPZIONI = [...IDS, CASO];
const CHIAVE = 'ace-gioco-scelta';
const COLONNE = [
  { lato: 'tu', titolo: 'Tu' },
  { lato: 'cpu', titolo: 'CPU' },
] as const;

const valido = (v: unknown): v is string => typeof v === 'string' && OPZIONI.includes(v);
function letta(): [string, string] {
  try {
    const s = JSON.parse(localStorage.getItem(CHIAVE) ?? '{}');
    if (valido(s.tu) && valido(s.cpu)) return [s.tu, s.cpu];
  } catch {
    /* niente memoria: si parte dai primi */
  }
  return [IDS[0], IDS[1]];
}
const vero = (v: string) => (v === CASO ? IDS[Math.floor(Math.random() * IDS.length)] : v);

export default function Selezione(props: { onGioca: (scelta: { tu: string; cpu: string }) => void }) {
  const [scelta, setScelta] = useState<[string, string]>(letta);
  const radice = useRef<HTMLDivElement>(null);

  const gioca = () => {
    try {
      localStorage.setItem(CHIAVE, JSON.stringify({ tu: scelta[0], cpu: scelta[1] }));
    } catch {
      /* pazienza */
    }
    props.onGioca({ tu: vero(scelta[0]), cpu: vero(scelta[1]) });
  };
  const scegli = (c: number, id: string) => setScelta((s) => (c === 0 ? [id, s[1]] : [s[0], id]));
  const fuoco = (c: number, i: number) => radice.current?.querySelector<HTMLElement>(`[data-c="${c}"][data-i="${i}"]`)?.focus();

  const tasto = (e: KeyboardEvent, c: number, i: number) => {
    const passo: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 };
    if (e.key in passo) {
      e.preventDefault();
      const j = i + passo[e.key];
      if (j >= 0 && j < OPZIONI.length) {
        scegli(c, OPZIONI[j]);
        fuoco(c, j);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      gioca();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      fuoco(1 - c, OPZIONI.indexOf(scelta[1 - c]));
    }
  };

  return (
    <div className="selezione" ref={radice}>
      <div className="selezione-colonne">
        {COLONNE.map(({ lato, titolo }, c) => (
          <section key={lato} className={`selezione-col ${lato}`} aria-labelledby={`sel-${lato}`}>
            <h2 id={`sel-${lato}`}>{titolo}</h2>
            <div className="selezione-griglia" role="radiogroup" aria-labelledby={`sel-${lato}`}>
              {OPZIONI.map((id, i) => {
                const attiva = scelta[c] === id;
                const s = SCHEDE[id];
                const cm = (P.altezze_cm as Record<string, number>)[id] ?? P.altezza_default_cm;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={attiva}
                    tabIndex={attiva ? 0 : -1}
                    data-c={c}
                    data-i={i}
                    data-id={id}
                    className={`scheda${attiva ? ' attiva' : ''}${id === CASO ? ' caso' : ''}`}
                    onClick={() => scegli(c, id)}
                    onKeyDown={(e) => tasto(e, c, i)}
                  >
                    {s ? (
                      <>
                        <img src={s.figura} alt="" draggable={false} />
                        <span className="testo">
                          <b>{s.nome}</b>
                          <small>{cm} cm</small>
                          <span className="mossa" title={s.mossa}>{s.mossa}</span>
                        </span>
                      </>
                    ) : (
                      <span className="testo">
                        <b>A caso</b>
                        <span className="mossa">La sorte</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <button type="button" className="selezione-gioca" onClick={gioca}>
        Gioca
      </button>
    </div>
  );
}
