import { useEffect, useState } from 'react';
import { CaretDown, CaretRight, CheckCircle } from '@phosphor-icons/react';
import { supabase } from './supabase';
import * as R from './lib/regole';
import type { Dove, VoceTabellina } from './lib/regole/tabellina';
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

export default function Tabellina({ vai, genitori = false }: { vai?: (d: Dove) => void; genitori?: boolean }) {
  const [dati, setDati] = useState<DatiTabellina | null>();
  useEffect(() => {
    supabase.functions.invoke('tabellina').then(({ data, error }) => setDati(error || !data?.voci ? null : (data as DatiTabellina)));
  }, []);

  if (dati === undefined) return <div className="carta tabellina" aria-busy="true" style={{ minHeight: 64 }} />;
  if (dati === null) return null;

  // i gesti di casa si fermano al tetto del giorno: raggiunto, non mancano più
  const casa = dati.voci.filter((v) => v.gruppo === 'casa');
  const casaPiena = casa.reduce((a, v) => a + v.presi, 0) >= R.CONFIG.passi.gesti_casa.tetto_giornaliero;
  const mancano = dati.voci.filter((v) => v.presi < v.valore && !(v.gruppo === 'casa' && casaPiena));
  const giorni = [...new Set(dati.storico.map((p) => p.giorno))];

  return (
    <div className="carta tabellina">
      <p className="tabellina-conto" role="status">
        {genitori ? 'Oggi Lani ha preso' : 'Oggi hai preso'} <b>{dati.presi}</b> passi su <b>{dati.disponibili}</b> disponibili
      </p>
      <details>
        <summary>
          <span>Guarda cosa manca</span>
          <CaretDown className="freccia-famiglia" size={20} weight="bold" aria-hidden />
        </summary>

        <h2>Da prendere oggi</h2>
        {mancano.length === 0 ? (
          <p className="nota">{genitori ? 'Oggi Lani ha preso tutto.' : 'Oggi hai preso tutto.'}</p>
        ) : (
          <ul className="tabellina-voci">
            {mancano.map((v) => {
              const dentro = (
                <>
                  <span>
                    <b>{v.testo}</b>
                    <small>{v.come}</small>
                  </span>
                  <b className="valore">{segno(v.valore - v.presi)}</b>
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
        )}
        {casaPiena && <p className="nota">Gesti di casa: per oggi il massimo è preso.</p>}

        <h2>Già presi</h2>
        {giorni.length === 0 ? (
          <p className="nota">Ancora nessun passo in questi giorni.</p>
        ) : (
          giorni.map((g) => (
            <section key={g} className="tabellina-giorno">
              <h3>{nomeGiorno(g, dati.giorno)}</h3>
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
