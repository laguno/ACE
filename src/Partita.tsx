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
export type PartitaDaApprovare = { id: string; data: string; avversaria: string; set_nostri: number; set_loro: number; in_campo: boolean };

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
        if (p) setGiorno(R.iso(R.giornoRoma(p.inizio)));
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
          <input name="avversaria" maxLength={60} required autoComplete="off" />
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
  const carica = () =>
    client
      .from('partite')
      .select('id, data, avversaria, set_nostri, set_loro, in_campo')
      .is('approvata_il', null)
      .order('data')
      .then(({ data }) => setPartite((data ?? []) as PartitaDaApprovare[]));
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
  async function rifiuta(p: PartitaDaApprovare) {
    const { error } = await client.from('partite').delete().eq('id', p.id);
    avvisa(error ? 'Partita non tolta. Riprova.' : `Partita con ${p.avversaria} rifiutata.`);
    carica();
  }

  if (!partite.length) return null;
  return (
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
              <input name="in_campo" type="checkbox" defaultChecked={p.in_campo} />
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
  );
}
