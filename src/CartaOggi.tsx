import { useEffect, useState } from 'react';
import { BookOpen, Backpack, Cards, Handbag, Check, Plus } from '@phosphor-icons/react';
import { Sticker } from './kit';
import { useTabellina, Voci } from './Tabellina';
import { GETTONI, type Gettone } from './colori';
import { perLeChiavi, type Dove, type VoceTabellina } from './lib/regole/tabellina';
import * as C from './lib/calendario';
import * as R from './lib/regole';
import { impegniTra, piuGiorni, type Impegno } from './giornata';

// Oggi v2 (23/11): "Oggi N di 4" con un gettone per cosa obbligatoria (compiti, ripasso, cartella,
// borsa) più i dieci minuti, gli impegni di famiglia a pillola e "+ Passi in più". I dati sono quelli
// della tabellina del server: qui non si calcola né si scrive nessun passo.

const ICONE = { compiti: BookOpen, ripasso: Cards, cartella: Backpack, borsa: Handbag };
const NOMI: Record<Gettone, string> = { compiti: 'Compiti', ripasso: 'Ripasso', cartella: 'Cartella', borsa: 'Borsa' };
const PREFISSI: Record<Gettone, string[]> = { compiti: ['compito', 'foglio'], ripasso: ['ripasso'], cartella: ['cartella'], borsa: ['borsa'] };

const fatta = (v: VoceTabellina) => v.presi >= v.valore;

export function gettoniDi(voci: VoceTabellina[]) {
  return (Object.keys(PREFISSI) as Gettone[])
    .map((g) => ({ g, voci: voci.filter((v) => PREFISSI[g].includes(v.id.split(':')[0])) }))
    .filter((x) => x.voci.length > 0)
    .map(({ g, voci: vv }) => {
      const mancano = vv.filter((v) => !fatta(v));
      const sotto = mancano.length === 0 ? 'fatto' : g === 'compiti' ? `${mancano.length} da fare` : g === 'ripasso' ? (mancano[0].testo.replace(/^ripasso( di)?\s*/i, '') || 'oggi') : 'stasera';
      return { g, nome: NOMI[g], fatto: mancano.length === 0, sotto, dove: (mancano[0] ?? vv[0]).dove };
    });
}

export default function CartaOggi({ vai, promemoria }: { vai?: (d: Dove) => void; promemoria?: string }) {
  const dati = useTabellina();
  const [impegni, setImpegni] = useState<Impegno[]>([]);
  useEffect(() => {
    const oggi = R.giornoRoma(new Date());
    impegniTra(oggi, piuGiorni(oggi, 1)).then(setImpegni, () => setImpegni([]));
  }, []);

  const partita = impegni.find((i) => C.tipoImpegno(i.titolo) === 'partita');
  const pillole = impegni.filter((i) => i !== partita && !i.tutto_il_giorno);
  const gettoni = dati ? gettoniDi(dati.voci) : [];
  const dieci = dati?.voci.find((v) => v.id === 'dieci_minuti');
  const totale = gettoni.length + (dieci ? 1 : 0);
  const fatte = gettoni.filter((x) => x.fatto).length + (dieci && fatta(dieci) ? 1 : 0);
  const inPiu = dati?.voci.filter((v) => !perLeChiavi(v)) ?? [];

  return (
    <>
      {partita && (
        <section className="evento partita" aria-label="Partita di oggi">
          <span className="nove" aria-hidden>9</span>
          <Sticker posa="lani-divisa" misura={96} className="evento-sticker" />
          <div className="evento-ora">
            <small>OGGI</small>
            <b>{C.oraRoma(partita.inizio)}</b>
          </div>
          <div className="evento-testo">
            <small>PARTITA</small>
            <b>{partita.titolo.replace(/^[^:]+:\s*/, '')}</b>
          </div>
        </section>
      )}

      {dati && totale > 0 && (
        <section className="carta oggi-gettoni" aria-label="Per le chiavi, oggi">
          <div className="testa-carta">
            <h2>Oggi</h2>
            <span className="valore">
              {fatte} di {totale}
            </span>
          </div>
          <ul className="gettoni">
            {gettoni.map((x) => {
              const Icona = ICONE[x.g];
              const c = GETTONI[x.g];
              return (
                <li key={x.g}>
                  <button
                    className={`gettone${x.fatto ? ' fatto' : ''}`}
                    style={{ background: c.fondo, color: '#3D2350' }}
                    aria-label={`${x.nome}: ${x.sotto}`}
                    onClick={() => vai?.(x.dove)}
                  >
                    <span className="cerchio" style={{ background: x.fatto ? c.segno : '#fff' }}>
                      {x.fatto ? <Check size={26} weight="bold" color="#fff" aria-hidden /> : <Icona size={28} weight="bold" color={c.segno} aria-hidden />}
                    </span>
                    <b>{x.nome}</b>
                    <small style={{ color: c.segno }}>{x.sotto}</small>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {pillole.length > 0 && (
        <ul className="impegni-pillole" aria-label="Impegni di oggi">
          {pillole.map((i) => (
            <li key={i.inizio + i.titolo}>
              <b>{C.oraRoma(i.inizio)}</b> {i.titolo.toLowerCase().replace(/\s+lani\b.*$/, '')}
            </li>
          ))}
        </ul>
      )}
      {promemoria && <p className="promemoria-giorno">{promemoria}</p>}

      {inPiu.length > 0 && (
        <details className="passi-in-piu-riga">
          <summary>
            <Plus size={18} weight="bold" aria-hidden /> <b>Passi in più</b> <span>flash card, quiz, casa</span>
          </summary>
          <Voci voci={inPiu} vai={vai} />
        </details>
      )}
    </>
  );
}
