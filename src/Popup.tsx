import { useEffect, useState } from 'react';
import manifest from '../data/manifest.json' with { type: 'json' };
import { oraAdesso } from './giornata';
import * as K from './lib/copione';
import { adesso } from './spunte';
import { supabase } from './supabase';

// Un popup per apertura dell'app (docs/05): il più importante in coda (bastone, voto, forziere e
// tappa, altro), poi il più vecchio. Dopo le 21 i rimproveri di mamma e papà aspettano il mattino.
// I popup più vecchi di 3 giorni non si mostrano più.

type Popup = { id: string; priorita: number; posa: string; titolo: string; testo: string; figurina: string | null };
const GIORNI_VALIDO = 3;
const immagine = (posa: string) => manifest.avatar.find((a) => a.id === posa)?.webp ?? manifest.oggetti.find((o) => o.id === posa)?.webp;

export default function CodaPopup() {
  const [p, setP] = useState<Popup>();

  useEffect(() => {
    async function apri() {
      const da = new Date(Date.now() - GIORNI_VALIDO * 864e5).toISOString();
      const { data } = await supabase
        .from('popup_coda')
        .select('id, priorita, posa, titolo, testo, figurina')
        .is('mostrato_il', null)
        .gte('creato_il', da)
        .order('priorita')
        .order('creato_il')
        .limit(10);
      const ora = oraAdesso();
      setP((data ?? []).find((x) => K.popupMostrabile(x, ora)));
    }
    apri();
    const tornata = () => document.visibilityState === 'visible' && apri();
    document.addEventListener('visibilitychange', tornata);
    return () => document.removeEventListener('visibilitychange', tornata);
  }, []);

  if (!p) return null;
  const chiudi = () => {
    supabase.from('popup_coda').update({ mostrato_il: adesso() }).eq('id', p.id).then();
    setP(undefined);
  };
  const src = immagine(p.posa);

  return (
    <div className="velo" role="dialog" aria-modal="true" aria-labelledby="popup-titolo">
      <div className="popup">
        {src && <img src={`/${src}`} alt="" width={160} height={160} />}
        <h2 id="popup-titolo">{p.titolo}</h2>
        <p>{p.testo}</p>
        {p.figurina && <p className="riga-figurina">{p.figurina}</p>}
        <button className="principale largo" onClick={chiudi} autoFocus>
          Ok
        </button>
      </div>
    </div>
  );
}
