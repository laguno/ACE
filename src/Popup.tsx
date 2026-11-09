import { useEffect, useRef, useState } from 'react';
import manifest from '../data/manifest.json' with { type: 'json' };
import { oraAdesso } from './giornata';
import * as K from './lib/copione';
import { adesso } from './spunte';
import { supabase } from './supabase';
import { MOMENTO_DEL_POPUP, VistaFrase, fraseDelGiorno, type FraseDelGiorno } from './Frase';
import { immaginiPremi } from './ImmaginePremio';

// Un popup per apertura dell'app (docs/05): il più importante in coda (bastone, voto, forziere e
// tappa, altro), poi il più vecchio. Dopo le 21 i rimproveri di mamma e papà aspettano il mattino.
// I popup più vecchi di 3 giorni non si mostrano più.
// Aspetto: lo stampo delle bozze Popup-forziere, -lucchetto, -bastone, -enigma (anello colorato,
// avatar che sborda, titolo grande, riga della figurina in fondo).

export type Popup = { id: string; priorita: number; situazione: string; posa: string; titolo: string; testo: string; figurina: string | null; frase?: FraseDelGiorno | null; chiave?: string | null; immagine?: string | null };
const GIORNI_VALIDO = 3;
const immagine = (posa: string) => manifest.avatar.find((a) => a.id === posa)?.webp ?? manifest.oggetti.find((o) => o.id === posa)?.webp;

/** Tono del popup: decide l'anello, il colore del titolo e del pulsante. */
function tono(p: Popup): 'festa' | 'lucchetto' | 'bastone' | 'enigma' | 'calmo' {
  if (p.priorita === 1) return 'bastone';
  if (p.situazione === 'forziere_lucchetto') return 'lucchetto';
  if (p.situazione === 'enigma_comparso') return 'enigma';
  if (['forziere_aperto', 'cima', 'tappa', 'chiavi_3', 'voto_9', 'voto_recupero', 'voto_migliorato', 'nota_merito'].includes(p.situazione)) return 'festa';
  return 'calmo';
}
const CON_CORIANDOLI = ['forziere_aperto', 'cima'];

export default function CodaPopup() {
  const [p, setP] = useState<Popup>();

  useEffect(() => {
    async function apri() {
      const da = new Date(Date.now() - GIORNI_VALIDO * 864e5).toISOString();
      const { data } = await supabase
        .from('popup_coda')
        .select('id, priorita, situazione, posa, titolo, testo, figurina, chiave')
        .is('mostrato_il', null)
        .gte('creato_il', da)
        .order('priorita')
        .order('creato_il')
        .limit(10);
      const ora = oraAdesso();
      const scelto = (data ?? []).find((x) => K.popupMostrabile(x, ora));
      // tappa, lucchetto e cima possono portare la frase del giorno (i rimproveri mai)
      const momento = scelto && MOMENTO_DEL_POPUP[scelto.situazione];
      // forziere aperto: l'immagine vera del premio (la dà il server solo a forziere aperto)
      const n = scelto?.situazione === 'forziere_aperto' ? Number(String(scelto.chiave ?? '').split(':')[1]) : NaN;
      const premio = n ? (await immaginiPremi(n)).find((x) => x.n === n && x.vera) : undefined;
      setP(scelto && { ...scelto, frase: momento ? await fraseDelGiorno(momento) : null, immagine: premio?.vera ?? null });
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
  return <PopupVista p={p} chiudi={chiudi} />;
}

/** Il popup com'è davvero: lo usano la coda di Lani e la Vetrina dei genitori (che non scrive niente). */
export function PopupVista({ p, chiudi }: { p: Popup; chiudi: () => void }) {
  const t = tono(p);
  const src = immagine(p.posa);
  const malus = t === 'bastone' ? p.testo.match(/[−-]\d+/)?.[0] : undefined;

  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal?.();
    d?.focus(); // il focus sul dialog: si legge il titolo, Tab porta a Ok, niente anello a chi tocca
  }, []);

  return (
    <dialog
      ref={ref}
      className="velo"
      aria-labelledby="popup-titolo"
      tabIndex={-1}
      onCancel={(e) => {
        e.preventDefault();
        chiudi();
      }}
    >
      {CON_CORIANDOLI.includes(p.situazione) && <Coriandoli />}
      <div className={`popup popup-${t}`}>
        <div className="popup-avatar" aria-hidden>
          {p.situazione === 'forziere_lucchetto' && <img src="/assets/oggetti/lucchetto.webp" alt="" width={110} height={110} />}
          {src && <img src={`/${src}`} alt="" width={t === 'lucchetto' ? 120 : 200} height={t === 'lucchetto' ? 120 : 200} />}
          {p.situazione === 'forziere_aperto' && !p.immagine && <img className="popup-oggetto" src="/assets/oggetti/forziere-aperto.webp" alt="" width={110} height={110} />}
        </div>
        {malus && <span className="bollino-malus">{malus}</span>}
        <h2 id="popup-titolo">{p.titolo}</h2>
        {p.immagine && <img className="popup-premio" src={p.immagine} alt="Il premio del forziere" width={160} height={160} />}
        <p>{p.testo}</p>
        {t === 'lucchetto' && <p className="popup-riquadro">I passi ti fanno camminare, le chiavi aprono i forzieri.</p>}
        {p.frase && <VistaFrase frase={p.frase} className="frase-popup" />}
        <button className="principale largo" onClick={chiudi}>
          {CON_CORIANDOLI.includes(p.situazione) ? 'Evviva!' : 'Ok'}
        </button>
        {p.figurina && <p className="riga-figurina">{p.figurina}</p>}
      </div>
    </dialog>
  );
}

/** Coriandoli leggeri, solo per forziere e cima; spenti con prefers-reduced-motion (CSS). */
function Coriandoli() {
  return (
    <div className="coriandoli" aria-hidden>
      {Array.from({ length: 18 }, (_, i) => (
        <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 6) * 0.15}s`, background: ['var(--fucsia)', 'var(--burro)', 'var(--lilla-medio)', 'var(--azzurrino)'][i % 4] }} />
      ))}
    </div>
  );
}
