import { useEffect, useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as C from './lib/calendario';
import * as R from './lib/regole';
import { Volleyball } from '@phosphor-icons/react';
import { CampoData, CampoTesto, Numero, Riga, Segmenti } from './kit';

// Sprint 2 (decisione del 13/11): la partita la segna Lani, con il risultato in set e se è entrata
// in campo; un genitore corregge se serve e approva, oppure rifiuta. I passi (in campo +10 e +15 se
// vinta, in panchina +5 e +5) li decide la funzione "passi" sul server, dopo l'approvazione.
// Un genitore può anche segnarla lui: allora è già approvata.

type Avvisa = (s: string) => void;
type Passi = (tipo: string, id: string) => Promise<number>;
export type PartitaDaApprovare = { id: string; data: string; avversaria: string; set_nostri: number; set_loro: number; in_campo: boolean | null };
type PartitaFipav = PartitaDaApprovare & { approvata_il: string };

const SET = [0, 1, 2, 3];
const P = R.CONFIG.passi.partite;
const pareggio = 'Nella pallavolo non c’è il pareggio: controlla i set.';

function SceltaSet({ nome, etichetta, valore }: { nome: string; etichetta: string; valore: number }) {
  return (
    <label>
      {etichetta}
      <select name={nome} defaultValue={valore}>
        {SET.map((n) => (
          <option key={n}>{n}</option>
        ))}
      </select>
    </label>
  );
}

/** Modulo della partita: Lani la manda da approvare, un genitore (passi dato) la segna già approvata. */
export function SegnaPartita({ client, avvisa, passi, quandoSegnata }: { client: SupabaseClient; avvisa: Avvisa; passi?: Passi; quandoSegnata?: () => void }) {
  const genitore = !!passi;
  const [lavoro, setLavoro] = useState(false);
  const oggi = R.giornoRoma(new Date());
  // giorno proposto: l'ultima partita di Lani nel calendario di famiglia negli ultimi 7 giorni, se c'è
  const [giorno, setGiorno] = useState(R.iso(oggi));
  // e l'avversaria dal titolo dell'evento ("Partita Lani: FOXES VOLLEY vs U14R-EVOLUTION")
  const [proposta, setProposta] = useState('');
  useEffect(() => {
    const da = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() - 7);
    client
      .from('impegni_famiglia')
      .select('titolo, inizio')
      .gte('inizio', da.toISOString())
      .lte('inizio', new Date().toISOString())
      .order('inizio', { ascending: false })
      .then(({ data }) => {
        const p = (data ?? []).find((i: { titolo: string }) => C.tipoImpegno(i.titolo) === 'partita');
        if (!p) return;
        setGiorno(R.iso(R.giornoRoma(p.inizio)));
        setProposta(C.avversariaDelTitolo(p.titolo) ?? '');
      });
  }, [client]);

  async function salva(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const riga = {
      data: String(f.get('data')),
      avversaria: String(f.get('avversaria')).trim(),
      set_nostri: Number(f.get('nostri')),
      set_loro: Number(f.get('loro')),
      in_campo: inCampo(f),
      ...(genitore ? { approvata_il: new Date().toISOString() } : {}),
    };
    if (riga.set_nostri === riga.set_loro) return avvisa(pareggio);
    setLavoro(true);
    const modulo = e.currentTarget;
    const { data, error } = await client.from('partite').insert(riga).select('id').single();
    if (error || !data) {
      setLavoro(false);
      return avvisa('Partita non salvata. Riprova.');
    }
    const presi = passi ? await passi('partita', data.id) : 0;
    setLavoro(false);
    modulo.reset();
    avvisa(
      genitore
        ? `Partita ${riga.set_nostri}-${riga.set_loro} con ${riga.avversaria}: +${presi} passi.`
        : `Partita ${riga.set_nostri}-${riga.set_loro} segnata. I passi arrivano quando mamma o papà la approvano.`,
    );
    quandoSegnata?.();
  }

  if (genitore)
    return (
      <form className="ga-modulo" onSubmit={salva} aria-label="Segna una partita">
        <p className="ga-nota">
          In campo +{P.giocata}, vinta +{P.giocata + P.vinta_in_piu}. Tutta in panchina +{P.panchina}, vinta +{P.panchina + P.panchina_vinta_in_piu}.
        </p>
        <CampoData etichetta="Giorno" name="data" value={giorno} max={R.iso(oggi)} onChange={(e) => setGiorno(e.target.value)} required />
        <CampoTesto key={proposta} etichetta="Contro" name="avversaria" defaultValue={proposta} maxLength={60} required autoComplete="off" />
        <CampiRisultato nostri={3} loro={0} inCampo />
        <button className="ga-btn pieno largo" disabled={lavoro}>
          {lavoro ? 'Salvo…' : 'Segna la partita'}
        </button>
      </form>
    );
  return (
    <div className="carta">
      <div className="testa-carta">
        <h2>Segna la partita</h2>
        <span className="valore">
          +{P.giocata}, vinta +{P.giocata + P.vinta_in_piu}
        </span>
      </div>
      <form className="modulo" onSubmit={salva}>
        <label>
          Giorno
          <input name="data" type="date" value={giorno} max={R.iso(oggi)} onChange={(e) => setGiorno(e.target.value)} required />
        </label>
        <label>
          Contro
          <input key={proposta} name="avversaria" defaultValue={proposta} maxLength={60} required autoComplete="off" />
        </label>
        <div className="griglia">
          <SceltaSet nome="nostri" etichetta="Set nostri" valore={3} />
          <SceltaSet nome="loro" etichetta="Set loro" valore={0} />
        </div>
        <label className="riga-spunta">
          <input name="in_campo" type="checkbox" defaultChecked />
          Sono entrata in campo
        </label>
        <p className="nota">
          Tutta la partita in panchina: +{P.panchina}, vinta +{P.panchina + P.panchina_vinta_in_piu}.
        </p>
        <button className="principale" disabled={lavoro}>
          {lavoro ? 'Salvo…' : 'Manda da approvare'}
        </button>
      </form>
    </div>
  );
}

/** Set e in campo / in panchina, con i campi del kit (area genitori). */
export function CampiRisultato({ nostri, loro, inCampo }: { nostri: number; loro: number; inCampo: boolean }) {
  return (
    <>
      <div className="ga-due">
        <Numero etichetta="Set di Lani" name="nostri" valore={nostri} />
        <Numero etichetta="Set loro" name="loro" valore={loro} />
      </div>
      <Segmenti etichetta="Lani in campo" name="in_campo" opzioni={IN_CAMPO} valore={inCampo ? 'si' : 'no'} />
    </>
  );
}
const IN_CAMPO = [
  ['si', 'In campo'],
  ['no', 'In panchina'],
] as const;
// casella di Lani ('on') o segmenti dei genitori ('si')
const inCampo = (f: FormData) => f.get('in_campo') === 'on' || f.get('in_campo') === 'si';

/**
 * Partite segnate da Lani da approvare. Col risultato FIPAV la partita la approva Lani rispondendo
 * al popup (docs/08): qui solo se non ha risposto in 3 giorni (il popup scade).
 */
export async function partiteDaApprovare(client: SupabaseClient): Promise<PartitaDaApprovare[]> {
  const scaduto = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const { data } = await client
    .from('partite')
    .select('id, data, avversaria, set_nostri, set_loro, in_campo')
    .is('approvata_il', null)
    .or(`in_campo.not.is.null,creato_il.lt.${scaduto}`)
    .order('data');
  return (data ?? []) as PartitaDaApprovare[];
}

/** Approva (con i set corretti, se il modulo c'è) e chiede i passi. Il messaggio per l'avviso. */
export async function approvaPartita(client: SupabaseClient, passi: Passi, p: PartitaDaApprovare, f?: FormData): Promise<string> {
  const riga = f ? { set_nostri: Number(f.get('nostri')), set_loro: Number(f.get('loro')), in_campo: inCampo(f) } : { set_nostri: p.set_nostri, set_loro: p.set_loro, in_campo: p.in_campo ?? true };
  if (riga.set_nostri === riga.set_loro) return pareggio;
  const { error } = await client
    .from('partite')
    .update({ ...riga, approvata_il: new Date().toISOString() })
    .eq('id', p.id);
  if (error) return 'Partita non approvata. Riprova.';
  const presi = await passi('partita', p.id);
  return `Partita ${riga.set_nostri}-${riga.set_loro} con ${p.avversaria} approvata: +${presi} passi.`;
}

export async function rifiutaPartita(client: SupabaseClient, p: PartitaDaApprovare): Promise<string> {
  const { error } = await client.from('partite').delete().eq('id', p.id);
  return error ? 'Partita non tolta. Riprova.' : `Partita con ${p.avversaria} rifiutata.`;
}

/** Partite col risultato FIPAV delle ultime due settimane: in campo o in panchina si corregge qui. */
export function PartiteFipav({ client, passi, avvisa }: { client: SupabaseClient; passi: Passi; avvisa: Avvisa }) {
  const [fipav, setFipav] = useState<PartitaFipav[]>([]);
  const carica = () =>
    client
      .from('partite')
      .select('id, data, avversaria, set_nostri, set_loro, in_campo, approvata_il')
      .not('gara', 'is', null)
      .not('approvata_il', 'is', null)
      .gte('data', R.iso(new Date(Date.now() - 14 * 86_400_000)))
      .order('data', { ascending: false })
      .then(({ data }) => setFipav((data ?? []) as PartitaFipav[]));
  useEffect(() => {
    carica();
  }, [client]);

  // come per le spunte: storno dei passi dati e giro nuovo (correggi_partita, 0037)
  async function correggi(p: PartitaFipav) {
    const { data, error } = await client.rpc('correggi_partita', { p_id: p.id, p_in_campo: !p.in_campo });
    if (error || !data) return avvisa('Non si può più correggere: le chiavi di quella settimana sono già date.');
    const presi = await passi('partita', p.id);
    avvisa(`Partita con ${p.avversaria} corretta: ${p.in_campo ? 'in panchina' : 'in campo'}, +${presi} passi.`);
    carica();
  }

  return (
    <>
      {fipav.map((p) => {
        const g = R.giorno(p.data);
        return (
          <Riga
            key={p.id}
            icona={<Volleyball size={20} weight="bold" aria-hidden />}
            titolo={`${p.avversaria} ${p.set_nostri}-${p.set_loro}`}
            sotto={`${g.getDate()}/${g.getMonth() + 1} · FIPAV · ${p.in_campo ? 'in campo' : 'in panchina'}`}
            azione={
              <button type="button" className="ga-btn tenue" onClick={() => correggi(p)}>
                {p.in_campo ? 'Era in panchina' : 'Era in campo'}
              </button>
            }
          />
        );
      })}
    </>
  );
}
