// Blocco D (metacognizione, 19/11/2026): piano del giorno con i minuti (Pomeriggio), voto previsto
// sulla carta della verifica e micro-lezione della settimana (Studio). Testi dal copione
// (src/lib/copione/metacognizione.ts), regole in src/lib/regole/metacognizione.ts.
import { useEffect, useState } from 'react';
import { Play, Check } from '@phosphor-icons/react';
import * as R from './lib/regole';
import * as D from './lib/regole/metacognizione';
import { MICRO_LEZIONI, PIANO, PREVISIONE } from './lib/copione/metacognizione';
import { votoScritto } from './lib/copione';
import { Sticker } from './kit';
import { supabase } from './supabase';

const M = R.CONFIG.metacognizione;

// ---------------------------------------------------------------- piano del giorno

export type CosaDelPiano = { voce: string; titolo: string };
type Voce = { voce: string; titolo: string; minuti_stimati: number; iniziata_il: string | null; finita_il: string | null; giorno: string };

export function PianoDelGiorno({ cose }: { cose: CosaDelPiano[] }) {
  const oggi = R.iso(R.giornoRoma(new Date()));
  const [voci, setVoci] = useState<Voce[]>();
  const [storico, setStorico] = useState<Voce[]>([]);
  const [errore, setErrore] = useState('');

  async function carica() {
    const da = R.iso(new Date(R.giorno(oggi).getTime() - M.piano.tendenza_giorni * 864e5));
    const { data, error } = await supabase.from('piano_voci').select('voce, titolo, minuti_stimati, iniziata_il, finita_il, giorno').gt('giorno', da);
    if (error) return setErrore('Il piano non si apre. Riprova tra poco.');
    const tutte = (data ?? []) as Voce[];
    setVoci(tutte.filter((v) => v.giorno === oggi));
    setStorico(tutte);
  }
  useEffect(() => {
    carica();
  }, []);

  async function scrivi(op: PromiseLike<{ error: unknown }>) {
    const { error } = await op;
    setErrore(error ? 'Non salvato. Riprova.' : '');
    carica();
  }
  const stima = (c: CosaDelPiano, minuti: number) => {
    const c_ = voci?.find((v) => v.voce === c.voce);
    if (c_) return scrivi(supabase.from('piano_voci').update({ minuti_stimati: minuti }).eq('giorno', oggi).eq('voce', c.voce));
    return scrivi(supabase.from('piano_voci').insert({ voce: c.voce, titolo: c.titolo, minuti_stimati: minuti }));
  };
  // l'ora la mette il server (timbra_ora): qui basta un valore qualsiasi
  const segna = (voce: string, colonna: 'iniziata_il' | 'finita_il') =>
    scrivi(supabase.from('piano_voci').update(colonna === 'iniziata_il' ? { iniziata_il: new Date().toISOString() } : { finita_il: new Date().toISOString() }).eq('giorno', oggi).eq('voce', voce));

  if (!voci || cose.length === 0) return null;
  const perVoce = new Map(voci.map((v) => [v.voce, v]));
  const stimate = cose.map((c) => perVoce.get(c.voce)).filter((v): v is Voce => !!v);
  const tendenza = D.tendenzaTempo(storico, R.giorno(oggi));

  return (
    <div className="carta piano-giorno">
      <div className="testa-carta">
        <h2>{PIANO.titolo}</h2>
        {stimate.length > 0 && <span className="valore quieto">{D.totaleStimato(stimate)} min</span>}
      </div>
      <p className="nota">{PIANO.domanda}</p>
      <ul className="piano-voci">
        {cose.map((c) => {
          const v = perVoce.get(c.voce);
          const veri = v ? D.minutiVeri(v) : null;
          return (
            <li key={c.voce}>
              <span className="piano-titolo">{c.titolo}</span>
              {veri !== null && v ? (
                <span className="piano-esito" role="status">{PIANO.confronto(v.minuti_stimati, veri)}</span>
              ) : (
                <span className="piano-azioni">
                  <select
                    aria-label={`Minuti per ${c.titolo}`}
                    value={v?.minuti_stimati ?? ''}
                    disabled={!!v?.iniziata_il}
                    onChange={(e) => e.target.value && stima(c, Number(e.target.value))}
                  >
                    <option value="">min</option>
                    {M.piano.minuti_possibili.map((m) => (
                      <option key={m} value={m}>
                        {m} min
                      </option>
                    ))}
                  </select>
                  {v && !v.iniziata_il && (
                    <button type="button" className="secondario compatto" onClick={() => segna(c.voce, 'iniziata_il')}>
                      <Play size={18} weight="bold" aria-hidden /> Inizio
                    </button>
                  )}
                  {v?.iniziata_il && (
                    <button type="button" className="secondario compatto" onClick={() => segna(c.voce, 'finita_il')}>
                      <Check size={18} weight="bold" aria-hidden /> Finito
                    </button>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {tendenza && <p className="nota accento">{PIANO.tendenza[tendenza.verso]}</p>}
      {errore && <p role="alert">{errore}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- voto previsto

type Previsione = { verifica_id: string; voto: number };
type Coppia = { previsto: number; vero: number };

/** Previsioni e voti veri già abbinati, per la tendenza e il confronto sulle carte delle verifiche. */
export function usePrevisioni() {
  const [previste, setPreviste] = useState<Map<string, number>>(new Map());
  const [veri, setVeri] = useState<Map<string, number>>(new Map());
  const [materie, setMaterie] = useState<Map<string, string>>(new Map());
  async function carica() {
    const { data } = await supabase.from('voti_previsti').select('verifica_id, voto, verifiche(id, materia_id, data, tipo, materie(nome))');
    const righe = (data ?? []) as unknown as (Previsione & { verifiche: (D.VerificaDaAbbinare & { materie: { nome: string } | null }) | null })[];
    setMaterie(new Map(righe.map((r) => [r.verifica_id, r.verifiche?.materie?.nome ?? 'Verifica'])));
    setPreviste(new Map(righe.map((r) => [r.verifica_id, Number(r.voto)])));
    const verifiche = righe.map((r) => r.verifiche).filter((v) => !!v) as D.VerificaDaAbbinare[];
    if (!verifiche.length) return setVeri(new Map());
    const da = verifiche.reduce((m, v) => (v.data < m ? v.data : m), verifiche[0].data);
    const { data: voti } = await supabase.from('voti').select('id, materia_id, data, voto, tipo').gte('data', da);
    const abbinati = D.abbinaVoti(verifiche, (voti ?? []).map((v) => ({ ...v, voto: Number(v.voto) })));
    setVeri(new Map([...abbinati].map(([k, v]) => [k, v.voto])));
  }
  useEffect(() => {
    carica();
  }, []);
  const coppie: Coppia[] = [...veri].flatMap(([id, vero]) => {
    const previsto = previste.get(id);
    return previsto === undefined ? [] : [{ previsto, vero }];
  });
  return { previste, veri, materie, tendenza: D.tendenzaPrevisioni(coppie), ricarica: carica };
}

export function VotoPrevisto({ verifica, previsto, ricarica }: { verifica: { id: string; data: string }; previsto: number | undefined; ricarica: () => void }) {
  const oggi = R.giornoRoma(new Date());
  const [errore, setErrore] = useState('');
  if (!D.siPuoPrevedere(verifica.data, oggi)) return null;
  if (previsto === undefined && !D.chiediPrevisione(verifica.data, oggi)) return null;
  async function scegli(voto: number) {
    const op =
      previsto === undefined
        ? supabase.from('voti_previsti').insert({ verifica_id: verifica.id, voto })
        : supabase.from('voti_previsti').update({ voto }).eq('verifica_id', verifica.id);
    const { error } = await op;
    setErrore(error ? 'Non salvato. Riprova.' : '');
    ricarica();
  }
  return (
    <div className="voto-previsto">
      <label>
        <span>{previsto === undefined ? PREVISIONE.domanda : PREVISIONE.detta(votoScritto(previsto))}</span>
        <select value={previsto ?? ''} onChange={(e) => e.target.value && scegli(Number(e.target.value))}>
          <option value="">Scegli</option>
          {D.votiPossibili().map((v) => (
            <option key={v} value={v}>
              {votoScritto(v)}
            </option>
          ))}
        </select>
      </label>
      {previsto === undefined && <p className="nota piccola">{PREVISIONE.aiuto}</p>}
      {errore && <p role="alert">{errore}</p>}
    </div>
  );
}

/** Carta con le previsioni passate: confronto per verifica e tendenza. Mai un rimprovero. */
export function ComeTiConosci({ previste, veri, tendenza, materie }: ReturnType<typeof usePrevisioni>) {
  const fatte = [...veri].flatMap(([id, vero]) => {
    const p = previste.get(id);
    return p === undefined ? [] : [[id, vero, p] as const];
  });
  if (!fatte.length) return null;
  const ultime = fatte.slice(-3);
  return (
    <div className="carta">
      <div className="testa-carta">
        <h2>Le tue previsioni</h2>
      </div>
      <ul className="piano-voci">
        {ultime.map(([id, vero, p]) => {
          return (
            <li key={id}>
              <span className="piano-titolo">{materie.get(id) ?? 'Verifica'}</span>
              <span className="piano-esito">
                {PREVISIONE.confronto(votoScritto(p), votoScritto(vero))}
                {D.passiPrevisione(p, vero) > 0 ? ` ${PREVISIONE.vicina}` : ''}
              </span>
            </li>
          );
        })}
      </ul>
      {tendenza && <p className="nota accento">{PREVISIONE.tendenza[tendenza.verso]}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- micro-lezione della settimana

export function MicroLezione() {
  const oggi = R.giornoRoma(new Date());
  const settimana = R.iso(R.lunedi(oggi));
  const lezione = MICRO_LEZIONI[D.lezioneDellaSettimana(oggi, MICRO_LEZIONI.length)];
  const [letta, setLetta] = useState<boolean>();
  useEffect(() => {
    supabase
      .from('micro_lezioni_lette')
      .select('settimana')
      .eq('settimana', settimana)
      .maybeSingle()
      .then(({ data, error }) => setLetta(error ? true : !!data));
  }, [settimana]);
  if (letta !== false || !lezione) return null;
  async function fatto() {
    setLetta(true);
    await supabase.from('micro_lezioni_lette').insert({ settimana, lezione: lezione.id });
  }
  return (
    <div className="carta micro-lezione">
      <Sticker posa={lezione.posa} misura={72} />
      <div>
        <p className="nota piccola">Come si studia</p>
        <h2>{lezione.titolo}</h2>
        <p>{lezione.testo}</p>
        <p className="nota">Questa settimana: {lezione.prova}</p>
        <button type="button" className="secondario compatto" onClick={fatto}>
          Ho letto
        </button>
      </div>
    </div>
  );
}
