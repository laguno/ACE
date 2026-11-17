import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as R from './lib/regole';
import { Volleyball } from '@phosphor-icons/react';
import { Riga } from './kit';
import { PANCHINA, PopupVista, type Popup } from './Popup';
import { adesso } from './spunte';
import { supabase } from './supabase';

// Partite di R-Evolution (dal 17/11, decisione del signore): il risultato arriva solo dalla FIPAV
// (funzione classifiche), Lani non lo scrive e i genitori non approvano né rifiutano niente.
// Col risultato il server accoda "Com'è andata?": lo apre R-Evolution al primo tocco dopo la lettura
// della FIPAV, con il coach, il risultato, due parole sulla classifica e la domanda in campo /
// panchina. Niente "chiudi": la risposta fa i passi (funzione "passi", tipo partita).
// I genitori possono solo correggere in campo / panchina dopo (PartiteFipav).

type Avvisa = (s: string) => void;
type Passi = (tipo: string, id: string) => Promise<number>;
type PartitaFipav = { id: string; data: string; avversaria: string; set_nostri: number; set_loro: number; in_campo: boolean | null; approvata_il: string };

/** "Com'è andata?" in R-Evolution: il popup più vecchio non ancora visto, finché Lani non risponde. */
export function PopupPartita({ quandoRisposto, avvisa }: { quandoRisposto: () => void; avvisa: Avvisa }) {
  const [p, setP] = useState<Popup & { partita: string }>();
  const [occupato, setOccupato] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: coda } = await supabase
        .from('popup_coda')
        .select('id, priorita, situazione, posa, titolo, testo, figurina, chiave')
        .eq('situazione', 'partita_com_e_andata')
        .is('mostrato_il', null)
        .order('creato_il')
        .limit(5);
      for (const x of coda ?? []) {
        const id = String(x.chiave ?? '').split(':')[1] ?? '';
        const { data: partita } = await supabase.from('partite').select('set_nostri, set_loro, in_campo').eq('id', id).maybeSingle();
        // già risposta (o tolta): il popup non serve più
        if (!partita || partita.in_campo !== null) {
          await supabase.from('popup_coda').update({ mostrato_il: adesso() }).eq('id', x.id);
          continue;
        }
        const posa = partita.set_nostri > partita.set_loro ? 'allenatore-applaude' : 'allenatore-timeout';
        return setP({ ...x, posa, partita: id });
      }
    })().catch(() => {});
  }, []);

  if (!p) return null;
  const rispondi = (inCampo: boolean) => async () => {
    if (occupato) return;
    setOccupato(true);
    const { error } = await supabase.rpc('rispondi_partita', { p_id: p.partita, p_in_campo: inCampo });
    if (error) {
      setOccupato(false);
      return avvisa('Risposta non salvata. Riprova tra poco.');
    }
    await supabase.functions.invoke('passi', { body: { tipo: 'partita', id: p.partita } });
    await supabase.from('popup_coda').update({ mostrato_il: adesso() }).eq('id', p.id);
    setP(undefined);
    quandoRisposto();
  };
  // Esc non chiude: si risponde con uno dei due pulsanti (scelta del signore, 17/11)
  return <PopupVista p={p} chiudi={() => {}} azione={rispondi(true)} altra={{ etichetta: PANCHINA, fai: rispondi(false) }} />;
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
