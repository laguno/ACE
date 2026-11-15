import { useEffect, useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as R from './lib/regole';
import { materieDelGiorno } from './lib/nuvola';

// Genitori: "Lani a casa" (assenza da scuola, uno o più giorni) e "Sposta verifica".
// Regole del signore del 15/11 (docs/02, Assenze): le cose obbligatorie dei giorni a casa escono
// dal calcolo delle chiavi (server, _shared/chiavi.ts); i compiti in scadenza passano alla lezione
// successiva della materia, dall'orario ricavato dalle lezioni di Nuvola, con i passi pieni; le
// verifiche di quel giorno diventano "da recuperare" con la nuova data messa qui.

type Props = { client: SupabaseClient; avvisa: (s: string) => void };
type Verifica = { id: string; data: string; tipo: string; recupero_vago: boolean; data_spostata: string | null; materie: { nome: string } | null };

const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const bello = (s: string) => {
  const d = R.giorno(s);
  return `${GIORNI[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
};
const piu = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Giorni di scuola tra due date comprese (le assenze si segnano solo lì). */
export function giorniDiScuola(da: string, a: string): string[] {
  const fuori: string[] = [];
  for (let d = R.giorno(da); d <= R.giorno(a) && fuori.length < 31; d = piu(d, 1)) if (R.giornoDiScuola(d)) fuori.push(R.iso(d));
  return fuori;
}

export function LaniACasa({ client, avvisa }: Props) {
  const oggi = R.iso(R.giornoRoma(new Date()));
  const [assenze, setAssenze] = useState<string[]>();
  const [da, setDa] = useState(oggi);
  const [a, setA] = useState(oggi);

  async function carica() {
    const { data } = await client.from('assenze').select('giorno').gte('giorno', R.iso(piu(R.giorno(oggi), -14))).order('giorno');
    setAssenze((data ?? []).map((x) => x.giorno as string));
  }
  useEffect(() => {
    carica();
  }, []);

  async function segna(e: FormEvent) {
    e.preventDefault();
    const giorni = giorniDiScuola(da, a < da ? da : a);
    if (!giorni.length) return avvisa('In quei giorni non c’è scuola.');
    const { error } = await client.from('assenze').upsert(giorni.map((giorno) => ({ giorno })), { onConflict: 'giorno', ignoreDuplicates: true });
    if (error) return avvisa('Assenza non salvata. Riprova.');
    const spostati = await spostaCompiti(client, giorni);
    avvisa(`Lani a casa: ${giorni.length === 1 ? bello(giorni[0]) : `${giorni.length} giorni`}.${spostati ? ` ${spostati === 1 ? 'Un compito spostato' : `${spostati} compiti spostati`} alla lezione dopo.` : ''}`);
    carica();
  }

  async function togli(giorno: string) {
    const { error } = await client.from('assenze').delete().eq('giorno', giorno);
    avvisa(error ? 'Non tolta. Riprova.' : `Tolta l’assenza di ${bello(giorno)}.`);
    carica();
  }

  return (
    <form className="carta modulo" onSubmit={segna}>
      <h2>Lani a casa</h2>
      <p className="nota">Giorni di assenza da scuola: quel giorno niente chiavi in gioco, niente notifiche, compiti spostati alla lezione dopo.</p>
      <label>
        Dal
        <input name="da" type="date" value={da} onChange={(e) => setDa(e.target.value)} required />
      </label>
      <label>
        Al
        <input name="a" type="date" value={a} min={da} onChange={(e) => setA(e.target.value)} required />
      </label>
      <button className="principale">Segna Lani a casa</button>
      {assenze && assenze.length > 0 && (
        <ul className="spunte">
          {assenze.map((g) => (
            <li key={g} className="foglio">
              <span>A casa {bello(g)}</span>
              <button type="button" className="secondario stretto" onClick={() => togli(g)}>
                Togli
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

/**
 * Compiti non fatti in scadenza nei giorni di assenza: alla prossima lezione della materia
 * (orario dalle lezioni delle ultime tre settimane), saltando vacanze e altri giorni a casa.
 * La data va in scadenza_spostata: la sincronizzazione di Nuvola non la riporta indietro (0036).
 */
async function spostaCompiti(client: SupabaseClient, giorni: string[]): Promise<number> {
  const tre = R.iso(piu(R.giornoRoma(new Date()), -21));
  const [{ data: compiti }, { data: lezioni }, { data: tutte }] = await Promise.all([
    client.from('compiti').select('id, materia_id, scadenza').in('scadenza', giorni).is('fatto_il', null),
    client.from('lezioni').select('data, ora, materia_id').gte('data', tre),
    client.from('assenze').select('giorno'),
  ]);
  const assenze = (tutte ?? []).map((x) => x.giorno as string);
  const orario = (g: number) => materieDelGiorno(lezioni ?? [], g);
  let n = 0;
  for (const c of compiti ?? []) {
    const nuova = R.iso(R.prossimaLezione(c.materia_id, R.giorno(c.scadenza), orario, assenze));
    const { error } = await client.from('compiti').update({ scadenza_spostata: nuova }).eq('id', c.id);
    if (!error) n++;
  }
  return n;
}

/** Verifiche delle prossime settimane (e quelle da recuperare), con "Sposta verifica". */
export function SpostaVerifiche({ client, avvisa }: Props) {
  const oggi = R.giornoRoma(new Date());
  const [dati, setDati] = useState<{ verifiche: Verifica[]; assenze: string[] }>();
  const [aperta, setAperta] = useState<string | null>(null);
  const [data, setData] = useState('');

  async function carica() {
    const [{ data: v }, { data: as }] = await Promise.all([
      client.from('verifiche').select('id, data, tipo, recupero_vago, data_spostata, materie(nome)').gte('data', R.iso(piu(oggi, -14))).lte('data', R.iso(piu(oggi, 30))).order('data'),
      client.from('assenze').select('giorno'),
    ]);
    setDati({ verifiche: (v ?? []) as unknown as Verifica[], assenze: (as ?? []).map((x) => x.giorno as string) });
  }
  useEffect(() => {
    carica();
  }, []);

  async function sposta(v: Verifica, nuova: string, vago: boolean) {
    const { error } = await client.rpc('sposta_verifica', { p_id: v.id, p_data: nuova, p_vago: vago });
    if (error) return avvisa('Verifica non spostata. Riprova.');
    // il piano di ripasso si rifà sulla data nuova (le sessioni non fatte le ha tolte sposta_verifica)
    await client.functions.invoke('genera-studio').catch(() => {});
    avvisa(`${v.materie?.nome ?? 'Verifica'}: ${vago ? 'settimana prossima' : bello(nuova)}. Piano di ripasso rifatto.`);
    setAperta(null);
    carica();
  }

  if (!dati) return null;
  const daRecuperare = (v: Verifica) => dati.assenze.includes(v.data) && !v.data_spostata;
  const lista = dati.verifiche.filter((v) => v.data >= R.iso(oggi) || daRecuperare(v));
  const lunediProssimo = R.iso(piu(R.lunedi(oggi), 7));
  return (
    <div className="carta">
      <h2>Verifiche</h2>
      {lista.length === 0 && <p>Nessuna verifica in arrivo.</p>}
      <ul className="spunte">
        {lista.map((v) => (
          <li key={v.id} className="foglio">
            <span>
              {v.materie?.nome ?? 'Verifica'}
              <br />
              <small>{daRecuperare(v) ? `Da recuperare: era ${bello(v.data)}, Lani a casa` : v.recupero_vago ? 'Settimana prossima' : bello(v.data)}</small>
            </span>
            {aperta === v.id ? (
              <span className="sposta">
                <input type="date" aria-label={`Nuova data: ${v.materie?.nome ?? 'verifica'}`} value={data} min={R.iso(oggi)} onChange={(e) => setData(e.target.value)} />
                <button className="secondario stretto" disabled={!data} onClick={() => sposta(v, data, false)}>
                  Salva
                </button>
                <button className="secondario stretto" onClick={() => sposta(v, lunediProssimo, true)}>
                  Settimana prossima
                </button>
              </span>
            ) : (
              <button className="secondario stretto" onClick={() => (setAperta(v.id), setData(''))}>
                Sposta verifica
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
