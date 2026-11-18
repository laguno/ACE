import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CalendarBlank } from '@phosphor-icons/react';
import * as R from './lib/regole';
import { materieDelGiorno } from './lib/nuvola';
import { CampoData, Elenco, Foglio, Riga, Vuoto } from './kit';

// Genitori: "Lani a casa" (assenza da scuola, uno o più giorni) e "Sposta verifica".
// Regole del signore del 15/11 (docs/02, Assenze): le cose obbligatorie dei giorni a casa escono
// dal calcolo delle chiavi (server, _shared/chiavi.ts); i compiti in scadenza passano alla lezione
// successiva della materia, dall'orario ricavato dalle lezioni di Nuvola, con i passi pieni; le
// verifiche di quel giorno diventano "da recuperare" con la nuova data messa qui.
// Dal restyling del 16/11 "Lani a casa" si segna dal giorno (Settimana) o da Oggi, con "fino a".

type Avvisa = (s: string) => void;
export type Verifica = { id: string; data: string; tipo: string; recupero_vago: boolean; data_spostata: string | null; materie: { nome: string } | null };

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

/** Segna Lani a casa da un giorno a un altro (compresi) e sposta i compiti. Il messaggio per l'avviso. */
async function segnaAssenza(client: SupabaseClient, da: string, a: string): Promise<string> {
  const giorni = giorniDiScuola(da, a < da ? da : a);
  if (!giorni.length) return 'In quei giorni non c’è scuola.';
  const { error } = await client.from('assenze').upsert(giorni.map((giorno) => ({ giorno })), { onConflict: 'giorno', ignoreDuplicates: true });
  if (error) return 'Assenza non salvata. Riprova.';
  const spostati = await spostaCompiti(client, giorni);
  return `Lani a casa: ${giorni.length === 1 ? bello(giorni[0]) : `${giorni.length} giorni`}.${spostati ? ` ${spostati === 1 ? 'Un compito spostato' : `${spostati} compiti spostati`} alla lezione dopo.` : ''}`;
}

export async function togliAssenza(client: SupabaseClient, giorno: string): Promise<string> {
  const { error } = await client.from('assenze').delete().eq('giorno', giorno);
  return error ? 'Non tolta. Riprova.' : `Tolta l’assenza di ${bello(giorno)}.`;
}

/** Foglio "Lani a casa": dal giorno scelto, "fino a" per più giorni. */
export function FoglioAssenza({ client, giorno, avvisa, chiudi }: { client: SupabaseClient; giorno: string; avvisa: Avvisa; chiudi: () => void }) {
  const [a, setA] = useState(giorno);
  return (
    <Foglio
      titolo={`Lani a casa ${bello(giorno)}`}
      azione="Segna Lani a casa"
      conferma={async () => {
        chiudi();
        avvisa(await segnaAssenza(client, giorno, a));
      }}
      chiudi={chiudi}
    >
      <p className="ga-nota">Quel giorno niente chiavi in gioco, niente notifiche né rimproveri; i compiti passano alla lezione dopo.</p>
      <CampoData etichetta="Fino a" aiuto="Per un giorno solo lasciate questo." value={a} min={giorno} onChange={(e) => setA(e.target.value || giorno)} />
    </Foglio>
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

/** Verifiche delle prossime settimane e quelle da recuperare (giorno a casa, non ancora spostate). */
export async function caricaVerifiche(client: SupabaseClient): Promise<{ verifiche: Verifica[]; assenze: string[] }> {
  const oggi = R.giornoRoma(new Date());
  const [{ data: v }, { data: as }] = await Promise.all([
    client.from('verifiche').select('id, data, tipo, recupero_vago, data_spostata, materie(nome)').gte('data', R.iso(piu(oggi, -14))).lte('data', R.iso(piu(oggi, 30))).order('data'),
    client.from('assenze').select('giorno'),
  ]);
  return { verifiche: (v ?? []) as unknown as Verifica[], assenze: (as ?? []).map((x) => x.giorno as string) };
}
export const daRecuperare = (v: Verifica, assenze: string[]) => assenze.includes(v.data) && !v.data_spostata;

/** Foglio "Sposta verifica": una data nuova, oppure "settimana prossima"; poi il piano di ripasso si rifà. */
export function FoglioSposta({ client, verifica: v, avvisa, chiudi }: { client: SupabaseClient; verifica: Verifica; avvisa: Avvisa; chiudi: () => void }) {
  const oggi = R.giornoRoma(new Date());
  const [data, setData] = useState('');
  async function sposta(nuova: string, vago: boolean) {
    chiudi();
    const { error } = await client.rpc('sposta_verifica', { p_id: v.id, p_data: nuova, p_vago: vago });
    if (error) return avvisa('Verifica non spostata. Riprova.');
    // il piano di ripasso si rifà sulla data nuova (le sessioni non fatte le ha tolte sposta_verifica)
    await client.functions.invoke('genera-studio').catch(() => {});
    avvisa(`${v.materie?.nome ?? 'Verifica'}: ${vago ? 'settimana prossima' : bello(nuova)}. Piano di ripasso rifatto.`);
  }
  // il tipo scelto qui resta anche dopo la sincronizzazione di Nuvola (migrazione 0040)
  async function cambiaTipo(tipo: 'verifica' | 'interrogazione') {
    chiudi();
    const { error } = await client.rpc('segna_tipo_verifica', { p_id: v.id, p_tipo: tipo });
    avvisa(error ? 'Tipo non cambiato. Riprova.' : `${v.materie?.nome ?? 'Prova'}: ${tipo === 'interrogazione' ? 'interrogazione' : 'verifica scritta'}.`);
  }
  return (
    <Foglio titolo={`Sposta ${v.materie?.nome ?? 'la verifica'}`} azione="Salva la data" pronto={!!data} conferma={() => sposta(data, false)} chiudi={chiudi}>
      <CampoData etichetta="Nuova data" value={data} min={R.iso(oggi)} onChange={(e) => setData(e.target.value)} />
      <button type="button" className="ga-btn tenue largo" onClick={() => sposta(R.iso(piu(R.lunedi(oggi), 7)), true)}>
        Settimana prossima, giorno da sapere
      </button>
      <p className="ga-nota">Tipo di prova: {v.tipo === 'interrogazione' ? 'interrogazione' : 'verifica scritta'}</p>
      <button type="button" className="ga-btn tenue largo" onClick={() => cambiaTipo(v.tipo === 'interrogazione' ? 'verifica' : 'interrogazione')}>
        {v.tipo === 'interrogazione' ? 'È una verifica scritta' : 'È un’interrogazione'}
      </button>
    </Foglio>
  );
}

/** Verifiche in arrivo (e da recuperare), con "Sposta". */
export function SpostaVerifiche({ client, avvisa }: { client: SupabaseClient; avvisa: Avvisa }) {
  const oggi = R.giornoRoma(new Date());
  const [dati, setDati] = useState<{ verifiche: Verifica[]; assenze: string[] }>();
  const [aperta, setAperta] = useState<Verifica>();
  const carica = () => caricaVerifiche(client).then(setDati);
  useEffect(() => {
    carica();
  }, []);

  if (!dati) return null;
  const lista = dati.verifiche.filter((v) => v.data >= R.iso(oggi) || daRecuperare(v, dati.assenze));
  if (!lista.length) return <Vuoto titolo="Nessuna verifica in arrivo" />;
  return (
    <>
      <Elenco etichetta="Verifiche">
        {lista.map((v) => (
          <Riga
            key={v.id}
            icona={<CalendarBlank size={20} weight="bold" aria-hidden />}
            titolo={v.materie?.nome ?? 'Verifica'}
            sotto={daRecuperare(v, dati.assenze) ? `Da recuperare: era ${bello(v.data)}, Lani a casa` : v.recupero_vago ? 'Settimana prossima' : bello(v.data)}
            azione={
              <button type="button" className="ga-btn tenue" onClick={() => setAperta(v)} aria-label={`Sposta: ${v.materie?.nome ?? 'verifica'}`}>
                Sposta
              </button>
            }
          />
        ))}
      </Elenco>
      {aperta && (
        <FoglioSposta
          client={client}
          verifica={aperta}
          avvisa={(s) => (avvisa(s), carica())}
          chiudi={() => setAperta(undefined)}
        />
      )}
    </>
  );
}
