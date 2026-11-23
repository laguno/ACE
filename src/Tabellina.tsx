import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CaretDown, CaretRight, CheckCircle } from '@phosphor-icons/react';
import { supabase } from './supabase';
import * as R from './lib/regole';
import { perLeChiavi, type Dove, type VoceTabellina } from './lib/regole/tabellina';
import { GIORNI } from './spunte';

// Tabellina dei passi (18/11): sempre in vista il contatore di oggi, sotto (chiuso) cosa manca e
// cosa è già preso negli ultimi giorni. I dati arrivano dalla Edge Function "tabellina": qui non
// si calcola né si scrive nessun passo. La stessa tabellina sta nell'area genitori, con "chi".

type Preso = { giorno: string; ora: string; testo: string; passi: number; chi?: string };
export type DatiTabellina = { giorno: string; voci: VoceTabellina[]; presi: number; disponibili: number; storico: Preso[] };

const segno = (n: number) => (n < 0 ? `−${-n}` : `+${n}`);

function nomeGiorno(giorno: string, oggi: string) {
  if (giorno === oggi) return 'Oggi';
  const g = R.giorno(giorno);
  const ieri = R.giorno(oggi);
  ieri.setDate(ieri.getDate() - 1);
  if (R.iso(ieri) === giorno) return 'Ieri';
  return `${GIORNI[g.getDay()]} ${g.getDate()}`;
}

/** La tabellina del giorno dalla funzione: undefined mentre arriva, null se non risponde. */
export function useTabellina(client: SupabaseClient = supabase): DatiTabellina | null | undefined {
  const [dati, setDati] = useState<DatiTabellina | null>();
  useEffect(() => {
    client.functions.invoke('tabellina', { method: 'GET' }).then(({ data, error }) => setDati(error || !data?.voci ? null : (data as DatiTabellina)));
  }, [client]);
  return dati;
}

export default function Tabellina({ vai, genitori = false, client = supabase }: { vai?: (d: Dove) => void; genitori?: boolean; client?: SupabaseClient }) {
  const dati = useTabellina(client);

  if (dati === undefined) return <div className="carta tabellina" aria-busy="true" style={{ minHeight: 64 }} />;
  if (dati === null) return null;

  // i gesti di casa si fermano al tetto del giorno: raggiunto, non mancano più
  const casa = dati.voci.filter((v) => v.gruppo === 'casa');
  const casaPiena = casa.reduce((a, v) => a + v.presi, 0) >= R.CONFIG.passi.gesti_casa.tetto_giornaliero;
  const mancano = dati.voci.filter((v) => v.presi < v.valore && !(v.gruppo === 'casa' && casaPiena));
  // 23/11: le cose di oggi che contano per le chiavi, una tacca ciascuna; il resto sono passi in più
  const obbligatorie = dati.voci.filter(perLeChiavi);
  const fatteOggi = obbligatorie.filter((v) => v.presi >= v.valore).length;
  const mancanoChiavi = mancano.filter(perLeChiavi);
  // i passi in più stanno sempre in vista (bozza del 23/11): fatti con la spunta, gli altri col valore che manca
  const inPiu = dati.voci.filter((v) => !perLeChiavi(v) && (v.presi >= v.valore || !(v.gruppo === 'casa' && casaPiena)));
  const giorni = [...new Set(dati.storico.map((p) => p.giorno))];
  // nell'area genitori la tabellina sta dentro "Lani oggi" (h2): i titoli scendono di un livello
  const Titolo = genitori ? 'h3' : 'h2';
  const Data = genitori ? 'h4' : 'h3';

  return (
    <div className="carta tabellina">
      {obbligatorie.length > 0 && (
        <div className="cose-di-oggi">
          <p className="riga-barra">
            <b>{genitori ? 'Le cose di oggi di Lani' : 'Le cose di oggi'}</b>
            <span className="numero passi">
              {fatteOggi} di {obbligatorie.length}
            </span>
          </p>
          <div className="segmenti" role="img" aria-label={`Cose di oggi per le chiavi: ${fatteOggi} fatte su ${obbligatorie.length}`}>
            {obbligatorie.map((v) => (
              <span key={v.id} className={v.presi >= v.valore ? 'fatto' : ''} />
            ))}
          </div>
        </div>
      )}
      <p className="tabellina-conto" role="status">
        {genitori ? 'Oggi Lani ha preso' : 'Oggi hai preso'} <b>{dati.presi}</b> passi su <b>{dati.disponibili}</b> disponibili
      </p>
      {inPiu.length > 0 && (
        <section className="passi-in-piu" aria-label="Passi in più">
          <div className="passi-in-piu-testata">
            <Titolo className="tabellina-titolo">Passi in più</Titolo>
            <span>fanno salire Astra, non le chiavi</span>
          </div>
          <Voci voci={inPiu} vai={vai} />
          {casaPiena && <p className="nota">Gesti di casa: per oggi il massimo è preso.</p>}
        </section>
      )}
      <details className="tabellina-dettagli">
        <summary>
          <span>Guarda cosa manca</span>
          <CaretDown className="freccia-famiglia" size={20} weight="bold" aria-hidden />
        </summary>

        <Titolo className="tabellina-titolo">Per le chiavi, oggi</Titolo>
        {mancanoChiavi.length === 0 ? (
          <p className="nota">{obbligatorie.length === 0 ? 'Oggi niente di obbligatorio.' : genitori ? 'Lani ha fatto tutto quello che conta per le chiavi.' : 'Fatto tutto quello che conta per le chiavi.'}</p>
        ) : (
          <Voci voci={mancanoChiavi} vai={vai} />
        )}

        <Titolo className="tabellina-titolo">Già presi</Titolo>
        {giorni.length === 0 ? (
          <p className="nota">Ancora nessun passo in questi giorni.</p>
        ) : (
          giorni.map((g) => (
            <section key={g} className="tabellina-giorno">
              <Data className="tabellina-data">{nomeGiorno(g, dati.giorno)}</Data>
              <ul>
                {dati.storico
                  .filter((p) => p.giorno === g)
                  .map((p, i) => (
                    <li key={i}>
                      <CheckCircle size={20} weight="fill" aria-hidden />
                      <span>
                        {p.testo}
                        <small>
                          {p.ora}
                          {p.chi ? ` · da ${p.chi}` : ''}
                        </small>
                      </span>
                      <b className="valore">{segno(p.passi)}</b>
                    </li>
                  ))}
              </ul>
            </section>
          ))
        )}
      </details>
    </div>
  );
}

export function Voci({ voci, vai }: { voci: VoceTabellina[]; vai?: (d: Dove) => void }) {
  return (
    <ul className="tabellina-voci">
      {voci.map((v) => {
        const dentro = (
          <>
            {v.presi >= v.valore && <CheckCircle size={20} weight="fill" aria-label="fatto" role="img" />}
            <span>
              <b>{v.testo}</b>
              <small>{v.come}</small>
            </span>
            <b className={`valore${v.presi >= v.valore ? ' fatta' : ''}`}>{v.presi >= v.valore ? segno(v.presi) : segno(v.valore - v.presi)}</b>
            {vai && <CaretRight size={18} weight="bold" aria-hidden />}
          </>
        );
        return (
          <li key={v.id}>
            {vai ? (
              <button className="tabellina-vai" onClick={() => vai(v.dove)}>
                {dentro}
              </button>
            ) : (
              <div className="tabellina-vai">{dentro}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
