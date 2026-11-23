import { useEffect, useId, useRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { CalendarBlank, CaretDown, CaretRight, Clock } from '@phosphor-icons/react';
import { useSettimana } from './datiSettimana';

// Kit "zucchero filato" (design/Stile.html): i pezzi che si ripetono in tutte le schermate.
// Colori e misure stanno in stile.css come variabili; qui solo i pezzi con un po' di struttura.

export type Sfondo = 'mattina' | 'pomeriggio' | 'sera' | 'viola' | 'panna' | 'rosa' | 'campo';

/** Emoji decorativa: solo in R-Evolution (eccezione del 16/11), mai in popup e notifiche. Muta per i lettori di schermo. */
export const Emoji = ({ e }: { e: string }) => (
  <span className="emoji" aria-hidden>
    {e}
  </span>
);

/** Sfondo della schermata secondo il momento (bozze: mattina azzurro, pomeriggio lilla, sera lilla scuro). */
export function useSfondo(sfondo: Sfondo) {
  useEffect(() => {
    document.body.dataset.sfondo = sfondo;
    return () => {
      delete document.body.dataset.sfondo;
    };
  }, [sfondo]);
}

/** Avatar sticker: WebP grande con il contorno bianco, mai dentro un cerchio, mai piccolo. */
export function Sticker({ posa, cartella, alt = '', misura = 160, className = '' }: { posa: string; cartella?: string; alt?: string; misura?: number; className?: string }) {
  // fino a 72 px la copia a 144 px (npm run avatar:piccoli): i file da 512 pesavano troppo per Lighthouse
  const dove = cartella ?? `${misura <= 72 ? 'avatar-piccoli' : 'avatar'}/${posa.split('-')[0]}`;
  return <img className={`sticker ${className}`} src={`/assets/${dove}/${posa}.webp`} alt={alt} width={misura} height={misura} />;
}

/** Intestazione delle schermate: sopratitolo, titolo grande, una riga, e l'avatar che sborda a destra. */
export function Testata({ sopra, titolo, riga, posa, sfondo, misura = 170 }: { sopra?: ReactNode; titolo: ReactNode; riga?: ReactNode; posa?: string; sfondo: Sfondo; misura?: number }) {
  useSfondo(sfondo);
  return (
    <header className="testata">
      <div className="testata-testo">
        {sopra && <p className="sopratitolo">{sopra}</p>}
        <h1>{titolo}</h1>
        {riga && <div className="riga">{riga}</div>}
      </div>
      {posa && <Sticker posa={posa} misura={misura} className="testata-avatar" />}
    </header>
  );
}

/** Compare solo nella testata compatta (23/11): i passi della settimana e le chiavi, che mentre si scorre
 *  non si vedono più nella pillola chiusa. Muta per i lettori: le stesse cose le dicono le barre della pillola. */
function TestataMini() {
  const s = useSettimana();
  if (!s) return null;
  return (
    <span className="testata-mini" aria-hidden>
      <Sticker posa="passo" cartella="oggetti" misura={22} />
      <b>{s.passiFatti.toLocaleString('it-IT')}</b>
      <span className="testata-mini-chiavi">
        {[1, 2, 3].map((n) => (
          <Sticker key={n} posa={s.chiavi >= n ? 'chiave-piena' : 'chiave-vuota'} cartella="oggetti" misura={18} />
        ))}
      </span>
    </span>
  );
}

/** Riquadro colorato per un'icona di servizio (lista "Tre cose", Studio). */
export function Riquadro({ colore, children }: { colore: 'rosa' | 'lilla' | 'burro'; children: ReactNode }) {
  return <span className={`riquadro riquadro-${colore}`}>{children}</span>;
}

/**
 * Mentre i dati arrivano: lo sticker di Lani al centro, mai una schermata vuota (critique del 10/11).
 * Compare dopo un attimo (CSS), così con la rete veloce non lampeggia. Per i lettori di schermo "Un attimo".
 */
export function Attesa({ posa = 'lani-contenta' }: { posa?: string }) {
  return (
    <section className="schermo attesa" aria-busy="true">
      <Sticker posa={posa} misura={120} />
      <span className="solo-lettori" role="status">
        Un attimo
      </span>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Kit dei campi dell'area genitori (restyling del 16/11, docs/genitori-ux.md, design/Genitori-v2.html).
 * Ogni campo è un controllo nativo (tastiera, selettori di sistema, lettori di schermo) dentro la
 * veste della casa: nessun input con l'aspetto del browser.
 * ---------------------------------------------------------------------------------------------- */

const MESI_CORTI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
/** "2026-12-03" → "3 dic 2026" */
const dataBreve = (s: string) => {
  const [a, m, g] = s.split('-').map(Number);
  return `${g} ${MESI_CORTI[m - 1]} ${a}`;
};

/** Etichetta, aiuto ed errore intorno a un controllo. */
function Campo({ etichetta, aiuto, errore, children }: { etichetta: ReactNode; aiuto?: ReactNode; errore?: string; children: ReactNode }) {
  return (
    <label className="ga-campo">
      <span className="ga-etichetta">{etichetta}</span>
      {children}
      {aiuto && <span className="ga-aiuto">{aiuto}</span>}
      {errore && (
        <span className="ga-errore" role="alert">
          {errore}
        </span>
      )}
    </label>
  );
}

type Ingresso = InputHTMLAttributes<HTMLInputElement>;

export function CampoTesto({ etichetta, aiuto, errore, ...p }: Ingresso & { etichetta: ReactNode; aiuto?: ReactNode; errore?: string }) {
  return (
    <Campo etichetta={etichetta} aiuto={aiuto} errore={errore}>
      <input className="ga-ingresso" aria-invalid={errore ? true : undefined} {...p} />
    </Campo>
  );
}

export function AreaTesto({ etichetta, aiuto, errore, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement> & { etichetta: ReactNode; aiuto?: ReactNode; errore?: string }) {
  return (
    <Campo etichetta={etichetta} aiuto={aiuto} errore={errore}>
      <textarea className="ga-ingresso ga-area" rows={3} aria-invalid={errore ? true : undefined} {...p} />
    </Campo>
  );
}

/**
 * Data o ora: il selettore di sistema (veloce sul telefono) sta sopra, trasparente; sotto si vede il
 * valore scritto per bene ("3 dic 2026", "20:30") invece di "gg/mm/aaaa" o "--:--".
 */
export function CampoData({ etichetta, aiuto, vuoto = 'Scegli', type = 'date', value, ...p }: Ingresso & { etichetta: ReactNode; aiuto?: ReactNode; vuoto?: string }) {
  const [v, setV] = useState(String(value ?? p.defaultValue ?? ''));
  useEffect(() => {
    if (value !== undefined) setV(String(value));
  }, [value]);
  const mostra = v ? (type === 'date' ? dataBreve(v) : v) : vuoto;
  return (
    <Campo etichetta={etichetta} aiuto={aiuto}>
      <span className={`ga-ingresso ga-data${v ? '' : ' vuoto'}`}>
        <span aria-hidden>{mostra}</span>
        {type === 'date' ? <CalendarBlank size={20} weight="bold" aria-hidden /> : <Clock size={20} weight="bold" aria-hidden />}
        <input
          type={type}
          value={value}
          {...p}
          onChange={(e) => {
            setV(e.target.value);
            p.onChange?.(e);
          }}
        />
      </span>
    </Campo>
  );
}

/** Scelta da elenco: select nativa con la veste della casa. */
export function Scelta({ etichetta, opzioni, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { etichetta: ReactNode; opzioni: readonly (readonly [string, string])[] }) {
  return (
    <Campo etichetta={etichetta}>
      <span className="ga-scelta">
        <select className="ga-ingresso" {...p}>
          {opzioni.map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </select>
        <CaretDown size={18} weight="bold" aria-hidden />
      </span>
    </Campo>
  );
}

/** Interruttore acceso/spento, su una riga con titolo e spiegazione. */
export function Interruttore({ titolo, testo, acceso, onChange, disabled }: { titolo: string; testo?: ReactNode; acceso: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={acceso} className="ga-riga ga-interruttore" disabled={disabled} onClick={() => onChange(!acceso)}>
      <span className="ga-riga-testo">
        <b>{titolo}</b>
        {testo && <small>{testo}</small>}
      </span>
      <span className={`ga-levetta${acceso ? ' su' : ''}`} aria-hidden />
    </button>
  );
}

/** Elenco a righe, la forma base dell'area genitori. */
export function Elenco({ children, etichetta }: { children: ReactNode; etichetta?: string }) {
  return (
    <ul className="ga-elenco" aria-label={etichetta}>
      {children}
    </ul>
  );
}

/**
 * Una riga: icona, titolo, riga piccola e un'azione (bottone a destra) oppure tutta la riga
 * toccabile (vai), con la freccia.
 */
export function Riga({ icona, colore = 'lilla', titolo, sotto, azione, vai, className = '' }: { icona?: ReactNode; colore?: 'lilla' | 'rosa' | 'burro'; titolo: ReactNode; sotto?: ReactNode; azione?: ReactNode; vai?: () => void; className?: string }) {
  const dentro = (
    <>
      {icona && <span className={`ga-icona ${colore}`}>{icona}</span>}
      <span className="ga-riga-testo">
        <b>{titolo}</b>
        {sotto && <small>{sotto}</small>}
      </span>
      {vai && !azione && <CaretRight className="ga-freccia" size={20} weight="bold" aria-hidden />}
    </>
  );
  // con vai e azione insieme: la parte di sinistra apre il dettaglio, il bottone fa l'azione
  return (
    <li className={className}>
      <div className="ga-riga">
        {vai ? (
          <button type="button" className="ga-riga ga-riga-dentro" onClick={vai}>
            {dentro}
          </button>
        ) : (
          dentro
        )}
        {azione}
      </div>
    </li>
  );
}

/** Stato vuoto: un titolo e una riga, mai una carta vuota. */
export function Vuoto({ titolo, testo }: { titolo: string; testo?: string }) {
  return (
    <div className="ga-vuoto">
      <b>{titolo}</b>
      {testo && <span>{testo}</span>}
    </div>
  );
}

/**
 * Foglio dal basso (dialog modale): titolo, contenuto, azione principale e "Annulla". Al posto di
 * confirm/prompt del browser. Senza azione è un foglio di sole scelte (si chiude con chiudiTesto).
 */
export function Foglio({ titolo, children, azione, pronto = true, conferma, chiudi, chiudiTesto = 'Annulla' }: { titolo: string; children?: ReactNode; azione?: string; pronto?: boolean; conferma?: (f: FormData) => void; chiudi: () => void; chiudiTesto?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal?.();
  }, []);
  return (
    <dialog
      ref={ref}
      className="ga-velo"
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        chiudi();
      }}
    >
      <form
        className="ga-foglio"
        onSubmit={(e) => {
          e.preventDefault();
          if (pronto) conferma?.(new FormData(e.currentTarget));
        }}
      >
        <h2 id={id}>{titolo}</h2>
        {children}
        {azione && (
          <button className="ga-btn pieno largo" disabled={!pronto}>
            {azione}
          </button>
        )}
        <button type="button" className="ga-btn tenue largo" onClick={chiudi}>
          {chiudiTesto}
        </button>
      </form>
    </dialog>
  );
}
