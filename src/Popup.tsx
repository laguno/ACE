import { useEffect, useRef, useState } from 'react';
import manifest from '../data/manifest.json' with { type: 'json' };
import { oraAdesso } from './giornata';
import * as K from './lib/copione';
import * as R from './lib/regole';
import { adesso } from './spunte';
import { supabase } from './supabase';
import { MOMENTO_DEL_POPUP, VistaFrase, fraseDelGiorno, type FraseDelGiorno } from './Frase';
import { immaginiPremi } from './ImmaginePremio';

// Un popup per apertura dell'app (docs/05): il più importante in coda (bastone, voto, forziere e
// tappa, altro), poi il più vecchio. Dopo le 21 i rimproveri di mamma e papà aspettano il mattino.
// I popup più vecchi di 3 giorni non si mostrano più.
// Aspetto: lo stampo delle bozze Popup-forziere, -lucchetto, -bastone, -enigma (anello colorato,
// avatar che sborda, titolo grande, riga della figurina in fondo).

export type Popup = { id: string; priorita: number; situazione: string; posa: string; titolo: string; testo: string; figurina: string | null; frase?: FraseDelGiorno | null; chiave?: string | null; immagine?: string | null; chiavi?: { prese: number; servono: number } | null };
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

/** Il pulsante dice il gesto, come nelle bozze (design/Popup-*.html); forziere e cima "Evviva!" (decisione del 9/11). */
function pulsante(p: Popup): string {
  if (CON_CORIANDOLI.includes(p.situazione)) return 'Evviva!';
  if (p.situazione?.startsWith('bagno')) return 'Vado a sistemare';
  if (p.situazione === 'forziere_lucchetto') return 'Ho capito';
  if (p.situazione === 'enigma_comparso') return 'Prova';
  return 'Ok';
}
/** Numero del forziere dalla chiave dell'evento ("forziere:3:enigma"). */
const forziereDi = (p: Popup) => Number(String(p.chiave ?? '').split(':')[1]) || undefined;
const FILA_MASSIMA = 12;

/** La coda dei popup di Lani; apriEnigma porta su Astra al biglietto (pulsante "Prova"). */
export default function CodaPopup({ apriEnigma }: { apriEnigma?: (n: number) => void }) {
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
      // lucchetto: la fila di chiavi, prese e mancanti, come nella bozza
      const conf = scelto?.situazione === 'forziere_lucchetto' && forziereDi(scelto) ? R.forziere(forziereDi(scelto) as number) : undefined;
      const prese = conf ? ((await supabase.from('chiavi_totali').select('chiavi').maybeSingle()).data?.chiavi ?? 0) : 0;
      setP(scelto && { ...scelto, frase: momento ? await fraseDelGiorno(momento) : null, immagine: premio?.vera ?? null, chiavi: conf ? { prese: Math.min(prese, conf.chiavi), servono: conf.chiavi } : null });
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
  const n = forziereDi(p);
  const azione = p.situazione === 'enigma_comparso' && apriEnigma && n ? () => (chiudi(), apriEnigma(n)) : undefined;
  return <PopupVista p={p} chiudi={chiudi} azione={azione} />;
}

/** Il popup com'è davvero: lo usano la coda di Lani e la Vetrina dei genitori (che non scrive niente). */
export function PopupVista({ p, chiudi, azione }: { p: Popup; chiudi: () => void; azione?: () => void }) {
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
        {p.chiavi && <FilaChiavi {...p.chiavi} />}
        {t === 'lucchetto' && <p className="popup-riquadro">I passi ti fanno camminare, le chiavi aprono i forzieri.</p>}
        {p.frase && <VistaFrase frase={p.frase} className="frase-popup" />}
        <button className="principale largo" onClick={azione ?? chiudi}>
          {pulsante(p)}
        </button>
        {p.figurina && <p className="riga-figurina">{p.figurina}</p>}
      </div>
    </dialog>
  );
}

/** Chiavi del lucchetto: prese piene e mancanti vuote; oltre 12 si mostrano solo le mancanti. */
function FilaChiavi({ prese, servono }: { prese: number; servono: number }) {
  const mancano = servono - prese;
  const fila = servono <= FILA_MASSIMA ? Array.from({ length: servono }, (_, i) => i < prese) : Array.from({ length: Math.min(mancano, FILA_MASSIMA) }, () => false);
  return (
    <span className="popup-chiavi" role="img" aria-label={`${prese} chiavi su ${servono}`}>
      {fila.map((piena, i) => (
        <img key={i} src={`/assets/oggetti/${piena ? 'chiave-piena' : 'chiave-vuota'}.webp`} alt="" width={30} height={30} />
      ))}
    </span>
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
