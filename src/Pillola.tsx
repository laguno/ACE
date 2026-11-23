import type { ReactNode } from 'react';
import { Sticker } from './kit';
import { chiaviPrese } from './Settimana';
import { useSettimana } from './datiSettimana';
import * as R from './lib/regole';
import { tacceDiOggi } from './lib/regole/settimana';

// Pillola di navigazione (v2, 23/11): la barra di sempre chiusa tra le due barre della settimana.
// Passi sopra con le tre chiavi, Cose sotto con "N di M". La tacca scura è dove dovrebbe essere la
// barra a fine giornata per restare in pari. Al tocco sulle barre si apre La mia settimana.

export default function Pillola({ apri, children }: { apri: () => void; children: ReactNode }) {
  const s = useSettimana();
  const t = s ? tacceDiOggi(s, R.giornoRoma(new Date())) : null;
  return (
    <div className="pillola">
      {s && t && (
        <button className="pillola-barra p-passi" onClick={apri} aria-label={`La mia settimana: passi ${s.percentualePassi} per cento, ${s.chiavi} chiavi su 3`}>
          <span className="et" aria-hidden>Passi</span>
          <span className="pista" aria-hidden>
            <span className="piena" style={{ width: `${s.percentualePassi}%` }} />
            <span className="tacca-oggi" style={{ left: `${t.passi}%` }} />
          </span>
          <span className="chiavi-p" aria-hidden>
            {chiaviPrese(s).map((k) => (
              <Sticker key={k.nome} posa={k.presa ? 'chiave-piena' : 'chiave-vuota'} cartella="oggetti" misura={20} />
            ))}
          </span>
        </button>
      )}
      {children}
      {s && t && (
        <button className="pillola-barra p-cose" onClick={apri} aria-label={`Cose della settimana: ${s.coseFatte} di ${s.cosePossibili}`}>
          <span className="et" aria-hidden>Cose</span>
          <span className="pista" aria-hidden>
            <span className="piena" style={{ width: `${s.percentualeCose}%` }} />
            <span className="tacca-oggi" style={{ left: `${t.cose}%` }} />
          </span>
          <span className="conto-p" aria-hidden>{s.coseFatte} di {s.cosePossibili}</span>
        </button>
      )}
    </div>
  );
}
