import { Capacitor, registerPlugin } from '@capacitor/core';
import { useEffect, useRef, useState } from 'react';
import { Sticker } from './kit';
import { TRICK_CONFIG as T, esitoRecord, faseA, fumetto, pescaTrick, scaletta, segnale, trickDelRecord, trickInVista, type Fase, type Trick } from './lib/regole/trick';

// Carta 4 dei dieci minuti, "Palla al muro: trick" — PROTOTIPO (24/11), solo nelle build di prova
// (ACE Prova, `vite --mode locale`, e il server di sviluppo): Oggi la importa solo lì, in produzione
// non c'è. Niente server e niente passi: i trick già visti e i record stanno in localStorage
// (chiavi ace-prova:trick:*), in modo PROVVISORIO. Regole in src/lib/regole/trick.ts, durate e
// testi in data/config-trick.json, asset in public/assets/trick (docs/carta4-trick.md).

const CHIAVE_VISTI = 'ace-prova:trick:visti';
const CHIAVE_RECORD = 'ace-prova:trick:record';
const FASI = scaletta();
const GIRO = 2 * Math.PI * 104;
type Posa = { id: string; nome: string };

// Nella WebView di ACE/ACE Prova navigator.vibrate tace (il guscio non ha il permesso VIBRATE): lì serve
// il plugin nativo Haptics, presente dall'APK con @capacitor/haptics. Lo si chiama per nome, senza il
// pacchetto JS, così il prototipo non aggiunge dipendenze; nel browser resta navigator.vibrate.
const Haptics = registerPlugin<{ vibrate(o: { duration: number }): Promise<void> }>('Haptics');
function vibra(schema: number | number[]) {
  if (!(Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Haptics'))) return void navigator.vibrate?.(schema);
  // [vibra, pausa, vibra, ...] come navigator.vibrate
  let t = 0;
  [schema].flat().forEach((ms, i) => {
    if (i % 2 === 0) setTimeout(() => void Haptics.vibrate({ duration: ms }).catch(() => {}), t);
    t += ms;
  });
}

function leggi<V>(chiave: string, vuoto: V): V {
  try {
    return (JSON.parse(localStorage.getItem(chiave) ?? 'null') as V) ?? vuoto;
  } catch {
    return vuoto;
  }
}
function scrivi(chiave: string, valore: unknown) {
  try {
    localStorage.setItem(chiave, JSON.stringify(valore));
  } catch {
    /* spazio pieno o modalità privata: il prototipo va avanti senza ricordare */
  }
}

function useMovimentoRidotto() {
  const [ridotto, setRidotto] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const m = matchMedia('(prefers-reduced-motion: reduce)');
    const cambia = () => setRidotto(m.matches);
    m.addEventListener('change', cambia);
    return () => m.removeEventListener('change', cambia);
  }, []);
  return ridotto;
}

/** Schermo acceso durante la sessione, dove il telefono lo permette; si richiede a ogni rientro. */
function useSchermoAcceso(attivo: boolean) {
  useEffect(() => {
    if (!attivo || !('wakeLock' in navigator)) return;
    let blocco: WakeLockSentinel | null = null;
    const chiedi = () => {
      if (document.visibilityState === 'visible')
        navigator.wakeLock.request('screen').then(
          (b) => (blocco = b),
          () => {},
        );
    };
    chiedi();
    document.addEventListener('visibilitychange', chiedi);
    return () => {
      document.removeEventListener('visibilitychange', chiedi);
      blocco?.release().catch(() => {});
    };
  }, [attivo]);
}

const src = (id: string, ridotto: boolean) => `/assets/trick/${id}${ridotto ? '-fermo' : ''}.webp`;

function Figura({ posa, ridotto }: { posa: Posa; ridotto: boolean }) {
  return (
    <div className={`carta4-figura${posa.id === 'muro-rimbalzo' ? ' con-muro' : ''}`}>
      <img src={src(posa.id, ridotto)} alt="" />
      {posa.id === 'muro-rimbalzo' && <span className="carta4-muro" aria-hidden />}
    </div>
  );
}

function ComeSiFa({ trick, chiudi }: { trick: Trick; chiudi?: () => void }) {
  return (
    <section className="carta4-come" aria-label={`Come si fa: ${trick.nome}`}>
      <ol>
        {trick.come.map((riga, i) => (
          <li key={i}>
            <span className="numero" aria-hidden>
              {i + 1}
            </span>
            <img src={`/assets/trick/${trick.id}-passo${i + 1}.webp`} alt="" />
            <span>{riga}</span>
          </li>
        ))}
      </ol>
      {chiudi && (
        <button className="carta4-chiudi" onClick={chiudi}>
          Ho capito
        </button>
      )}
    </section>
  );
}

function Anello({ fase, mancano }: { fase: Fase | null; mancano: number }) {
  const durata = fase ? fase.a - fase.da : 1;
  const resto = fase ? mancano / durata : 0;
  return (
    <div className={`carta4-anello ${fase?.tipo ?? 'fine'}`}>
      <svg viewBox="0 0 240 240" aria-hidden>
        <circle className="pista" cx="120" cy="120" r="104" />
        <circle className="tempo" cx="120" cy="120" r="104" strokeDasharray={GIRO} strokeDashoffset={GIRO * (1 - resto)} transform="rotate(-90 120 120)" />
      </svg>
      <span role="timer" aria-live="off" aria-label={fase ? `Mancano ${mancano} secondi` : 'Finito'}>
        {fase ? mancano : 'FATTO'}
      </span>
    </div>
  );
}

function Sessione({ esci }: { esci: () => void }) {
  const ridotto = useMovimentoRidotto();
  const [avvio] = useState(() => Date.now());
  const [ora, setOra] = useState(avvio);
  const [sessione] = useState(() => pescaTrick(T.trick, T.durate.blocchi));
  const [delRecord] = useState(() => trickDelRecord(sessione));
  const [visti, setVisti] = useState(() => new Set(leggi<string[]>(CHIAVE_VISTI, [])));
  const [come, setCome] = useState(false);
  const [numero, setNumero] = useState('');
  const [esito, setEsito] = useState<{
    tipo: 'battuto' | 'primo' | 'resta';
    n: number;
    migliore?: number;
  }>();
  const ultimo = useRef('');

  const adesso = faseA(FASI, (ora - avvio) / 1000);
  const fase = adesso?.fase ?? null;
  const mancano = adesso?.mancano ?? 0;
  const inCorso = !!fase;
  useSchermoAcceso(inCorso);

  useEffect(() => {
    if (!inCorso) return;
    const t = setInterval(() => setOra(Date.now()), 250);
    return () => clearInterval(t);
  }, [inCorso]);

  // "3, 2, 1, cambio": vibrazione dove c'è, mai col movimento ridotto (come i sensi di ACE)
  const chiave = `${fase?.da}:${mancano}`;
  useEffect(() => {
    if (!fase || ultimo.current === chiave) return;
    ultimo.current = chiave;
    const s = segnale(fase, mancano);
    if (ridotto || document.visibilityState !== 'visible') return;
    if (s === 'conto') vibra(T.vibrazione_ms.conto);
    if (s === 'cambio') vibra(T.vibrazione_ms.cambio);
  }, [chiave]);

  // un trick è "visto" quando comincia il suo lavoro: da lì la striscia resta dietro al "?"
  const inLavoro = fase?.tipo === 'lavoro' ? sessione[fase.blocco].id : null;
  useEffect(() => {
    if (!inLavoro || visti.has(inLavoro)) return;
    const nuovi = new Set(visti).add(inLavoro);
    setVisti(nuovi);
    scrivi(CHIAVE_VISTI, [...nuovi]);
    setCome(false);
  }, [inLavoro]);

  const vista = fase ? trickInVista(fase, mancano, sessione) : null;
  const record = !fase || fase.tipo === 'record';
  // nell'ultima pausa arriva il record
  const trick: Trick | null = record || (fase.tipo === 'pausa' && !vista) ? delRecord : (vista?.trick ?? null);
  const base = T.riscaldamento;
  const posa: Posa = trick ?? base[Math.min(base.length - 1, Math.floor(((ora - avvio) / 1000 / (T.durate.riscaldamento - T.durate.pausa)) * base.length))];
  const striscia = !!trick && !record && (come || (!!vista?.prossimo && !visti.has(trick.id)));
  // festa con lani-cima (coppa, maglia lilla): lani-festeggia è in divisa, che nella carta 4 non si usa
  const festa = esito?.tipo === 'battuto';

  function salva(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(numero);
    if (!Number.isInteger(n) || n < 0) return;
    const tutti = leggi<Record<string, number>>(CHIAVE_RECORD, {});
    const migliore = tutti[delRecord.id];
    const tipo = esitoRecord(migliore, n);
    if (tipo !== 'resta') scrivi(CHIAVE_RECORD, { ...tutti, [delRecord.id]: n });
    setEsito({ tipo, n, migliore });
  }

  const testoEsito = esito && T.record[esito.tipo].replace('{n}', String(esito.n)).replace('{migliore}', String(esito.migliore ?? ''));
  const posaCoach = festa || !fase ? 'allenatore-applaude' : fase.tipo === 'pausa' ? 'allenatore-timeout' : 'allenatore-pollice';

  return (
    <>
      <div className="carta4-testa">
        <button className="carta4-esci" onClick={esci}>
          Esci
        </button>
        {trick && !record && !striscia && (
          <button className="carta4-aiuto" aria-label={`Come si fa: ${trick.nome}`} onClick={() => setCome(true)}>
            ?
          </button>
        )}
      </div>

      <div className="carta4-centro">
        {festa ? (
          <Sticker posa="lani-cima" misura={200} className="carta4-festa" />
        ) : striscia && trick ? (
          <ComeSiFa trick={trick} chiudi={come ? () => setCome(false) : undefined} />
        ) : (
          <Figura posa={posa} ridotto={ridotto} />
        )}
      </div>
      <h2 className="carta4-nome">{posa.nome}</h2>
      <Anello fase={fase} mancano={mancano} />

      {record && (
        <div className="carta4-record">
          {esito ? (
            <p role="status" className={festa ? 'battuto' : undefined}>
              {testoEsito}
            </p>
          ) : (
            <form onSubmit={salva}>
              <label>
                {T.record.domanda}
                <input type="number" inputMode="numeric" min={0} max={999} required value={numero} onChange={(e) => setNumero(e.target.value)} />
              </label>
              <button>Salva</button>
            </form>
          )}
        </div>
      )}

      <div className="carta4-coach">
        <Sticker posa={posaCoach} misura={72} />
        <p>{fumetto(fase, mancano)}</p>
      </div>
    </>
  );
}

/** In fondo a Oggi, solo nelle build di prova: la fascia della carta 4 e, dopo VIA, la sessione a tutto schermo. */
export default function Carta4() {
  const [aperta, setAperta] = useState(false);
  useEffect(() => {
    if (!aperta) return;
    const esci = (e: KeyboardEvent) => e.key === 'Escape' && setAperta(false);
    window.addEventListener('keydown', esci);
    return () => window.removeEventListener('keydown', esci);
  }, [aperta]);

  return (
    <>
      <section className="carta4-fascia" aria-label="Carta 4, prova">
        <span className="carta4-prova">PROVA</span>
        <h2>Palla al muro: trick</h2>
        <p>10 minuti, 8 trick a sorpresa.</p>
        <button className="carta4-via" onClick={() => setAperta(true)}>
          VIA
        </button>
      </section>
      {aperta && (
        <div className="carta4" role="dialog" aria-modal="true" aria-label="Palla al muro: trick">
          <Sessione esci={() => setAperta(false)} />
        </div>
      )}
    </>
  );
}
