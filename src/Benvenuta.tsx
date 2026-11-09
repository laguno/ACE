import { useEffect, useRef, useState } from 'react';
import { attivaNotifiche, notifichePossibili } from './notifiche';
import { Sticker, useSfondo } from './kit';

// Prima accensione di Lani (design/Benvenuta.html): tre schermate, una volta per dispositivo.
// Il ricordo sta nel localStorage del dispositivo: se si perde, la benvenuta torna, niente di grave.

const CHIAVE = 'ace-benvenuta';
export const daAccogliere = () => {
  try {
    return localStorage.getItem(CHIAVE) !== 'fatta';
  } catch {
    return false;
  }
};
export const installata = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
const iPhone = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const SCHERMATE = 3;

export default function Benvenuta({ fine }: { fine: () => void }) {
  useSfondo('rosa');
  const [passo, setPasso] = useState(0);
  const titolo = useRef<HTMLHeadingElement>(null);
  // il bottone premuto sparisce con la schermata: il fuoco va sul titolo nuovo, così il lettore di schermo riparte da lì
  useEffect(() => {
    if (passo > 0) titolo.current?.focus();
  }, [passo]);
  const chiudi = () => {
    try {
      localStorage.setItem(CHIAVE, 'fatta');
    } catch {
      /* senza storage la benvenuta tornerà: va bene lo stesso */
    }
    fine();
  };
  const avanti = () => setPasso((p) => p + 1);

  return (
    <main className="benvenuta">
      {passo === 0 && (
        <>
          <Sticker posa="lani-timida" misura={230} className="benvenuta-eroe" />
          <div className="benvenuta-testo">
            <h1 ref={titolo} tabIndex={-1}>Ciao, Lani!</h1>
            <p>Questa è ACE, la tua app. Ogni giorno ti dice cosa fare, ti aiuta a studiare e ti porta fino alla cima.</p>
          </div>
          <ul className="sezioni">
            <li>
              <Sticker posa="lani-buongiorno" misura={44} />
              <span><b>Oggi</b>: le cose da fare, mattina e pomeriggio</span>
            </li>
            <li>
              <Sticker posa="lani-concentrata" misura={44} />
              <span><b>Studio</b>: flash card e quiz per le verifiche</span>
            </li>
            <li>
              <Sticker posa="passo" cartella="oggetti" misura={44} />
              <span><b>Astra</b>: ogni cosa fatta è un passo verso la cima</span>
            </li>
          </ul>
          <p className="mantra">Ogni giorno, passino passino.</p>
        </>
      )}
      {passo === 1 && (
        <>
          <Sticker posa="lani-determinata" misura={230} className="benvenuta-eroe" />
          <div className="benvenuta-testo">
            <h1 ref={titolo} tabIndex={-1}>Passi e chiavi</h1>
            <p className="frase">I passi ti fanno camminare, le chiavi aprono i forzieri.</p>
            <p>Ogni cosa fatta dà passi. La domenica sera arrivano le chiavi della settimana, da 0 a 3. Nei forzieri ci sono i premi scelti da mamma e papà.</p>
          </div>
        </>
      )}
      {passo === 2 && (
        <>
          <Sticker posa="bart-contento" misura={230} className="benvenuta-eroe" />
          <div className="benvenuta-testo">
            <h1 ref={titolo} tabIndex={-1}>Ultima cosa</h1>
            {!installata() && iPhone() && (
              <p>
                Metti ACE sulla schermata Home: in Safari tocca <b>Condividi</b>, poi <b>Aggiungi alla schermata Home</b>. Senza, i promemoria non arrivano.
              </p>
            )}
            {notifichePossibili() && (
              <button className="secondario" onClick={() => attivaNotifiche()}>
                Attiva i promemoria (al massimo 3 al giorno)
              </button>
            )}
          </div>
        </>
      )}
      <div className="benvenuta-piede">
        <div className="pallini-passi" role="img" aria-label={`Passo ${passo + 1} di ${SCHERMATE}`}>
          {Array.from({ length: SCHERMATE }, (_, i) => (
            <span key={i} className={i === passo ? 'attivo' : undefined} />
          ))}
        </div>
        {passo < SCHERMATE - 1 ? (
          <button className="principale largo" onClick={avanti}>Avanti</button>
        ) : (
          <button className="principale largo" onClick={chiudi}>Inizia</button>
        )}
      </div>
    </main>
  );
}
