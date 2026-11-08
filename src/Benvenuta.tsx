import { useState } from 'react';
import { attivaNotifiche, notifichePossibili } from './notifiche';

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

export default function Benvenuta({ fine }: { fine: () => void }) {
  const [passo, setPasso] = useState(0);
  const chiudi = () => {
    try {
      localStorage.setItem(CHIAVE, 'fatta');
    } catch {
      /* senza storage la benvenuta tornerà: va bene lo stesso */
    }
    fine();
  };

  return (
    <main className="benvenuta">
      {passo === 0 && (
        <section className="carta modulo">
          <img src="/assets/avatar/lani/lani-saluta.webp" alt="" width={130} height={130} />
          <h1>Ciao, Lani!</h1>
          <p>Questa è ACE, la tua app. Ogni giorno ti dice cosa fare, ti aiuta a studiare e ti porta fino alla cima.</p>
          <ul className="sezioni">
            <li>
              <img src="/assets/avatar/lani/lani-buongiorno.webp" alt="" width={56} height={56} />
              <span><b>Oggi</b>: le cose da fare, mattina e pomeriggio</span>
            </li>
            <li>
              <img src="/assets/avatar/lani/lani-concentrata.webp" alt="" width={56} height={56} />
              <span><b>Studio</b>: flash card e quiz per le verifiche</span>
            </li>
            <li>
              <img src="/assets/oggetti/passo.webp" alt="" width={56} height={56} />
              <span><b>Astra</b>: ogni cosa fatta è un passo verso la cima</span>
            </li>
          </ul>
          <p className="mantra">Ogni giorno, passino passino.</p>
          <button className="principale" onClick={() => setPasso(1)}>Avanti</button>
        </section>
      )}
      {passo === 1 && (
        <section className="carta modulo">
          <img src="/assets/avatar/lani/lani-timida.webp" alt="" width={180} height={180} />
          <h1>Passi e chiavi</h1>
          <p className="frase">I passi ti fanno camminare, le chiavi aprono i forzieri.</p>
          <p>Ogni cosa fatta dà passi. La domenica sera arrivano le chiavi della settimana, da 0 a 3. Nei forzieri ci sono i premi scelti da mamma e papà.</p>
          <button className="principale" onClick={() => setPasso(2)}>Avanti</button>
        </section>
      )}
      {passo === 2 && (
        <section className="carta modulo">
          <img src="/assets/avatar/bart/bart-contento.webp" alt="" width={160} height={160} />
          <h1>Ultima cosa</h1>
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
          <button className="principale" onClick={chiudi}>Inizia</button>
        </section>
      )}
    </main>
  );
}
