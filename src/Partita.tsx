import { useEffect, useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as C from './lib/calendario';
import * as R from './lib/regole';

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
      in_campo: f.get('in_campo') === 'on',
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

  return (
    <div className="carta">
      <div className="testa-carta">
        <h2>{genitore ? 'Partita' : 'Segna la partita'}</h2>
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
          <SceltaSet nome="nostri" etichetta={genitore ? 'Set di Lani' : 'Set nostri'} valore={3} />
          <SceltaSet nome="loro" etichetta="Set loro" valore={0} />
        </div>
        <label className="riga-spunta">
          <input name="in_campo" type="checkbox" defaultChecked />
          {genitore ? 'Lani è entrata in campo' : 'Sono entrata in campo'}
        </label>
        <p className="nota">
          Tutta la partita in panchina: +{P.panchina}, vinta +{P.panchina + P.panchina_vinta_in_piu}.
        </p>
        <button className="principale" disabled={lavoro}>
          {lavoro ? 'Salvo…' : genitore ? 'Segna la partita' : 'Manda da approvare'}
        </button>
      </form>
    </div>
  );
}

/** Area genitori: partite segnate da Lani, da correggere se serve e approvare, oppure rifiutare. */
export function PartiteDaApprovare({ client, passi, avvisa }: { client: SupabaseClient; passi: Passi; avvisa: Avvisa }) {
  const [partite, setPartite] = useState<PartitaDaApprovare[]>([]);
  const [fipav, setFipav] = useState<PartitaFipav[]>([]);
  const carica = () => {
    // col risultato FIPAV la partita la approva Lani rispondendo al popup (docs/08): qui solo se non
    // ha risposto in 3 giorni (il popup scade)
    const scaduto = new Date(Date.now() - 3 * 86_400_000).toISOString();
    client
      .from('partite')
      .select('id, data, avversaria, set_nostri, set_loro, in_campo')
      .is('approvata_il', null)
      .or(`in_campo.not.is.null,creato_il.lt.${scaduto}`)
      .order('data')
      .then(({ data }) => setPartite((data ?? []) as PartitaDaApprovare[]));
    client
      .from('partite')
      .select('id, data, avversaria, set_nostri, set_loro, in_campo, approvata_il')
      .not('gara', 'is', null)
      .not('approvata_il', 'is', null)
      .gte('data', R.iso(new Date(Date.now() - 14 * 86_400_000)))
      .order('data', { ascending: false })
      .then(({ data }) => setFipav((data ?? []) as PartitaFipav[]));
  };
  useEffect(() => {
    carica();
  }, [client]);

  async function approva(e: FormEvent<HTMLFormElement>, p: PartitaDaApprovare) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const riga = { set_nostri: Number(f.get('nostri')), set_loro: Number(f.get('loro')), in_campo: f.get('in_campo') === 'on' };
    if (riga.set_nostri === riga.set_loro) return avvisa(pareggio);
    const { error } = await client
      .from('partite')
      .update({ ...riga, approvata_il: new Date().toISOString() })
      .eq('id', p.id);
    if (error) return avvisa('Partita non approvata. Riprova.');
    const presi = await passi('partita', p.id);
    avvisa(`Partita ${riga.set_nostri}-${riga.set_loro} con ${p.avversaria} approvata: +${presi} passi.`);
    carica();
  }
  // come per le spunte: storno dei passi dati e giro nuovo (correggi_partita, 0037)
  async function correggi(p: PartitaFipav) {
    const { data, error } = await client.rpc('correggi_partita', { p_id: p.id, p_in_campo: !p.in_campo });
    if (error || !data) return avvisa('Non si può più correggere: le chiavi di quella settimana sono già date.');
    const presi = await passi('partita', p.id);
    avvisa(`Partita con ${p.avversaria} corretta: ${p.in_campo ? 'in panchina' : 'in campo'}, +${presi} passi.`);
    carica();
  }
  async function rifiuta(p: PartitaDaApprovare) {
    const { error } = await client.from('partite').delete().eq('id', p.id);
    avvisa(error ? 'Partita non tolta. Riprova.' : `Partita con ${p.avversaria} rifiutata.`);
    carica();
  }

  if (!partite.length && !fipav.length) return null;
  return (
    <>
    {fipav.length > 0 && (
      <div className="carta">
        <h2>Partite dalla FIPAV</h2>
        <p className="nota">Risultato ufficiale; in campo o in panchina l'ha detto Lani. Se non torna, correggete.</p>
        <ul className="lista-semplice">
          {fipav.map((p) => {
            const g = R.giorno(p.data);
            return (
              <li key={p.id}>
                <b>{p.avversaria}</b>, {g.getDate()}/{g.getMonth() + 1}, {p.set_nostri}-{p.set_loro}, {p.in_campo ? 'in campo' : 'in panchina'}{' '}
                <button type="button" className="secondario" onClick={() => correggi(p)}>
                  {p.in_campo ? 'Era in panchina' : 'Era in campo'}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    )}
    {partite.length > 0 && (
    <div className="carta">
      <h2>Partite da approvare</h2>
      <p className="nota">Le ha segnate Lani. Correggete i set se serve, poi approvate: i passi arrivano adesso.</p>
      {partite.map((p) => {
        const g = R.giorno(p.data);
        return (
          <form key={p.id} className="modulo partita-da-approvare" onSubmit={(e) => approva(e, p)} aria-label={`Partita con ${p.avversaria}`}>
            <p>
              <b>{p.avversaria}</b>, {g.getDate()}/{g.getMonth() + 1}
            </p>
            <div className="griglia">
              <SceltaSet nome="nostri" etichetta="Set di Lani" valore={p.set_nostri} />
              <SceltaSet nome="loro" etichetta="Set loro" valore={p.set_loro} />
            </div>
            <label className="riga-spunta">
              <input name="in_campo" type="checkbox" defaultChecked={p.in_campo ?? true} />
              Lani è entrata in campo
            </label>
            <div className="griglia">
              <button className="principale">Approva</button>
              <button type="button" className="secondario" onClick={() => rifiuta(p)}>
                Rifiuta
              </button>
            </div>
          </form>
        );
      })}
    </div>
    )}
    </>
  );
}
