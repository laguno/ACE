import { useEffect, type ReactNode } from 'react';

// Kit "zucchero filato" (design/Stile.html): i pezzi che si ripetono in tutte le schermate.
// Colori e misure stanno in stile.css come variabili; qui solo i pezzi con un po' di struttura.

export type Sfondo = 'mattina' | 'pomeriggio' | 'sera' | 'viola' | 'panna';

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
  const dove = cartella ?? `avatar/${posa.split('-')[0]}`;
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

/** Riquadro colorato per un'icona di servizio (lista "Tre cose", Studio). */
export function Riquadro({ colore, children }: { colore: 'rosa' | 'lilla' | 'burro'; children: ReactNode }) {
  return <span className={`riquadro riquadro-${colore}`}>{children}</span>;
}
