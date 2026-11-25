import { Capacitor, registerPlugin } from '@capacitor/core';
import { useEffect, useRef, useState } from 'react';
import { Sticker } from './kit';
import {
  DIECI as T,
  durataTotale,
  esercizioInVista,
  eserciziDellaSessione,
  esitoRecord,
  faseA,
  fumetto,
  mostraRecord,
  recordDellaCarta,
  riscaldamentoDi,
  scaletta,
  segnale,
  suCosa,
  type Carta,
  type Esercizio,
  type Fase,
} from './lib/regole/dieci-minuti';
import { Sfondo } from './Sfondo';
import { supabase } from './supabase';

// La sessione dei dieci minuti a tutto schermo, uguale per le sette carte (progetto del 25/11,
// docs/dieci-minuti.md): 1' di riscaldamento, 8 blocchi da 40" + 20", 1' di record. La fase si
// calcola dall'ora di avvio timbrata dal server (serate.dieci_minuti_da), così al rientro dal
// sottofondo il timer è giusto. La carta 4 ha le animazioni dei trick e "Come si fa"; le altre uno
// sticker fisso di Lani in abiti da allenamento (le animazioni arriveranno dopo). Il record si salva
// sul server (segna_record) e si festeggia solo quando batte il migliore.

const CHIAVE_VISTI = 'ace:dieci-minuti:visti'; // trick di cui Lani ha già visto "Come si fa" (solo interfaccia)
const FASI = scaletta();
const TOTALE = durataTotale(FASI);
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const GIRO = 2 * Math.PI * 104;

// Nella WebView di ACE navigator.vibrate tace (il guscio non ha il permesso VIBRATE): lì serve il plugin
// nativo Haptics, presente dall'APK con @capacitor/haptics. Lo si chiama per nome, senza il pacchetto JS;
// nel browser resta navigator.vibrate.
const Haptics = registerPlugin<{ vibrate(o: { duration: number }): Promise<void> }>('Haptics');
export function vibra(schema: number | number[]) {
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
    /* spazio pieno o modalità privata: "Come si fa" si rivede, pazienza */
  }
}

export function useMovimentoRidotto() {
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

function Figura({ carta, esercizio, figura, ridotto }: { carta: Carta; esercizio: Esercizio; figura: string; ridotto: boolean }) {
  if (carta.figura !== 'trick')
    return (
      <div className="sessione-figura">
        <Sticker posa={figura} misura={240} />
      </div>
    );
  return (
    <div className={`sessione-figura${esercizio.id === 'muro-rimbalzo' ? ' con-muro' : ''}`}>
      <img src={src(esercizio.id, ridotto)} alt="" />
      {esercizio.id === 'muro-rimbalzo' && <span className="sessione-muro" aria-hidden />}
    </div>
  );
}

function ComeSiFa({ esercizio, chiudi }: { esercizio: Esercizio; chiudi?: () => void }) {
  return (
    <section className="sessione-come" aria-label={`Come si fa: ${esercizio.nome}`}>
      <ol>
        {(esercizio.come ?? []).map((riga, i) => (
          <li key={i}>
            <span className="numero" aria-hidden>
              {i + 1}
            </span>
            <img src={`/assets/trick/${esercizio.id}-passo${i + 1}.webp`} alt="" />
            <span>{riga}</span>
          </li>
        ))}
      </ol>
      {chiudi && (
        <button className="sessione-chiudi" onClick={chiudi}>
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
    <div className={`sessione-anello ${fase?.tipo ?? 'fine'}`}>
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

type Esito = { tipo: 'battuto' | 'primo' | 'resta'; n: number; migliore?: number };

/**
 * `avvio`: l'ora (ms) timbrata dal server all'avvio. `pronto`: true quando il server conterà i dieci minuti
 * (a sessione finita, con il margine di DieciMinuti); allora compare SEGNA FATTO.
 */
export function SessioneDieci({ carta, visore, avvio, oggi, pronto, errore, esci, segnaFatto }: { carta: Carta; visore: boolean; avvio: number; oggi: string; pronto: boolean; errore: string; esci: () => void; segnaFatto: () => void }) {
  const ridotto = useMovimentoRidotto();
  const [ora, setOra] = useState(() => Date.now());
  // la sessione si pesca una volta per giorno e carta: riaprendo il timer restano gli stessi esercizi
  const [sessione] = useState(() => leggi<{ chiave: string; ids: string[]; su: string } | null>('ace:dieci-minuti:sessione', null));
  const chiaveSessione = `${oggi}:${carta.n}:${visore ? 'v' : ''}`;
  const [{ esercizi, su }] = useState(() => {
    const tutti = [...carta.esercizi, ...(carta.visore ? [carta.visore.esercizio] : [])];
    const salvata = sessione?.chiave === chiaveSessione ? sessione.ids.map((id) => tutti.find((e) => e.id === id)) : null;
    const es = salvata?.every(Boolean) ? (salvata as Esercizio[]) : eserciziDellaSessione(carta, visore);
    const r = recordDellaCarta(carta, visore);
    const s = salvata?.every(Boolean) && sessione ? sessione.su : r ? suCosa(r, es) : '';
    scrivi('ace:dieci-minuti:sessione', { chiave: chiaveSessione, ids: es.map((e) => e.id), su: s });
    return { esercizi: es, su: s };
  });
  const rec = recordDellaCarta(carta, visore);
  const [visti, setVisti] = useState(() => new Set(leggi<string[]>(CHIAVE_VISTI, [])));
  const [come, setCome] = useState(false);
  const [numero, setNumero] = useState('');
  const [esito, setEsito] = useState<Esito>();
  const [erroreRecord, setErroreRecord] = useState('');
  const ultimo = useRef('');

  const adesso = faseA(FASI, (ora - avvio) / 1000);
  const fase = adesso?.fase ?? null;
  const mancano = adesso?.mancano ?? 0;
  const inCorso = !!fase;
  // il conto dei dieci minuti: quanto manca alla fine della sessione
  const totale = Math.max(0, Math.ceil(TOTALE - (ora - avvio) / 1000));
  useSchermoAcceso(inCorso || !pronto);

  useEffect(() => {
    const t = setInterval(() => setOra(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

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

  // un trick è "visto" quando comincia il suo lavoro: da lì "Come si fa" resta dietro al "?"
  const inLavoro = fase?.tipo === 'lavoro' && esercizi[fase.blocco].come ? esercizi[fase.blocco].id : null;
  useEffect(() => {
    if (!inLavoro || visti.has(inLavoro)) return;
    const nuovi = new Set(visti).add(inLavoro);
    setVisti(nuovi);
    scrivi(CHIAVE_VISTI, [...nuovi]);
    setCome(false);
  }, [inLavoro]);

  const vista = fase ? esercizioInVista(fase, mancano, esercizi) : null;
  const finale = !fase || fase.tipo === 'record';
  const delRecord = rec?.tipo === 'trick' ? esercizi.find((e) => e.nome === su) : undefined;
  const esercizioFinale: Esercizio | undefined = rec ? (delRecord ?? { id: 'record', nome: rec.tipo === 'trick' ? su : rec.su }) : carta.finale;
  // nell'ultima pausa arriva il record
  const esercizio: Esercizio | null = finale || (fase.tipo === 'pausa' && !vista) ? (esercizioFinale ?? null) : (vista?.esercizio ?? null);
  const base = riscaldamentoDi(carta);
  const posa: Esercizio = esercizio ?? base[Math.min(base.length - 1, Math.floor(((ora - avvio) / 1000 / (T.durate.riscaldamento - T.durate.pausa)) * base.length))];
  const striscia = !!esercizio?.come && !finale && (come || (!!vista?.prossimo && !visti.has(esercizio.id)));
  // festa con lani-cima (coppa, maglia lilla): lani-festeggia è in divisa, che nei dieci minuti non si usa
  const festa = esito?.tipo === 'battuto';
  const figura = visore && carta.visore ? carta.visore.figura : carta.figura;

  async function salva(n: number) {
    if (!rec) return;
    setErroreRecord('');
    const { data: righe, error: e1 } = await supabase.from('carte_del_giorno').select('record').eq('carta', carta.n).eq('record_su', su).lt('data', oggi).not('record', 'is', null);
    if (e1) return setErroreRecord('Record non salvato. Riprova.');
    const vecchi = (righe ?? []).map((r) => r.record as number);
    const migliore = vecchi.length ? Math.max(...vecchi) : undefined;
    const { error } = await supabase.rpc('segna_record', { p_valore: n, p_su: su });
    if (error) return setErroreRecord('Record non salvato. Riprova.');
    setEsito({ tipo: esitoRecord(migliore, n), n, migliore });
  }

  function invia(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(numero);
    if (!Number.isInteger(n) || n < 0 || n > 999) return;
    void salva(n);
  }

  const testoEsito = esito && rec && T.esito[esito.tipo].replace('{n}', mostraRecord(rec, esito.n)).replace('{migliore}', esito.migliore === undefined ? '' : mostraRecord(rec, esito.migliore));
  const posaCoach = festa || !fase ? 'allenatore-applaude' : fase.tipo === 'pausa' ? 'allenatore-timeout' : 'allenatore-pollice';

  return (
    <>
      {carta.tema && <Sfondo tema={carta.tema} esercizio={posa.id} />}
      <div className="sessione-testa">
        <button className="sessione-esci" onClick={esci}>
          Esci
        </button>
        <span className="sessione-carta">
          {carta.nome}
        </span>
        {esercizio?.come && !finale && !striscia && (
          <button className="sessione-aiuto" aria-label={`Come si fa: ${esercizio.nome}`} onClick={() => setCome(true)}>
            ?
          </button>
        )}
      </div>

      <div className="sessione-centro">
        {festa ? (
          <Sticker posa="lani-cima" misura={200} className="sessione-festa" />
        ) : striscia && esercizio ? (
          <ComeSiFa esercizio={esercizio} chiudi={come ? () => setCome(false) : undefined} />
        ) : (
          <Figura carta={carta} esercizio={posa} figura={figura} ridotto={ridotto} />
        )}
      </div>
      <Anello fase={fase} mancano={mancano} />
      <span className="sessione-totale">{mmss(totale)}</span>

      {finale && rec && (
        <div className="sessione-record">
          {esito ? (
            <p role="status" className={festa ? 'battuto' : undefined}>
              {testoEsito}
            </p>
          ) : rec.tipo === 'scelta' ? (
            <fieldset>
              <legend>{rec.domanda}</legend>
              <div className="sessione-scelte">
                {rec.valori.map((v, i) => (
                  <button key={v} type="button" onClick={() => void salva(i)}>
                    {v}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : (
            <form onSubmit={invia}>
              <label>
                {rec.domanda}
                <input type="number" inputMode="numeric" min={0} max={999} required value={numero} onChange={(e) => setNumero(e.target.value)} />
              </label>
              <button>Salva</button>
            </form>
          )}
          {erroreRecord && <p role="alert">{erroreRecord}</p>}
        </div>
      )}

      {errore && (
        <p role="alert" className="sessione-errore">
          {errore}
        </p>
      )}
      {!fase && pronto ? (
        <button className="sessione-via" onClick={segnaFatto} autoFocus>
          SEGNA FATTO
        </button>
      ) : (
        <div className="sessione-coach">
          <Sticker posa={posaCoach} misura={72} />
          <p>{fumetto(fase, mancano, carta, !!rec)}</p>
        </div>
      )}

      <div className="sessione-fascia">
        {fase?.tipo === 'pausa' && (
          <p className="sessione-pausa">
            <b>PAUSA</b> <span>Il prossimo esercizio sarà:</span>
          </p>
        )}
        <h2 className="sessione-nome">{posa.nome}</h2>
      </div>
    </>
  );
}
