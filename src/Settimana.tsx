import { Check, X } from '@phosphor-icons/react';
import * as R from './lib/regole';
import { prossimeCose, type Casella, type Settimana } from './lib/regole/settimana';
import { Attesa, Sticker, Testata } from './kit';
import { GIORNI, MESI, maiuscola } from './spunte';
import { useSettimana } from './datiSettimana';

// La mia settimana (23/11, prototipo approvato dal signore): due barre sempre visibili, passi e
// cose obbligatorie, con la tacca della soglia di ogni chiave; sotto il dettaglio giorno per giorno.
// La striscia sopra la barra di navigazione è la versione piccola delle stesse barre.

const SIGLE = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'];
const SOGLIA_PASSI = R.CONFIG.chiavi_settimana.soglia_passi_prima * 100;
const SOGLIA_COSE = R.CONFIG.chiavi_settimana.soglia_cose_terza * 100;

/** Le tre chiavi della domenica: presa o no, se la settimana finisse adesso. */
export function chiaviPrese(s: Settimana) {
  return [
    { nome: 'Quota passi', presa: s.chiavi >= 1 },
    { nome: 'Nessuna nota', presa: s.chiavi >= 2 },
    { nome: 'Tutto fatto', presa: s.chiavi >= 3 },
  ];
}

function Barra({ tipo, valore, soglia, etichetta, alto = 14 }: { tipo: 'passi' | 'cose'; valore: number; soglia: number; etichetta: string; alto?: number }) {
  return (
    <div className={`barra-settimana ${tipo}`} style={{ height: alto }} role="progressbar" aria-label={etichetta} aria-valuemin={0} aria-valuemax={100} aria-valuenow={valore}>
      <span className="riempita" style={{ width: `${valore}%` }} />
      <span className="tacca" style={{ left: `${soglia}%` }} aria-hidden />
    </div>
  );
}

/** Sotto la barra: il conto a sinistra e il nome della chiave sotto la tacca (bozza del 23/11). */
function Etichette({ sinistra, tacca, soglia, allineaFine = false }: { sinistra: string; tacca: string; soglia: number; allineaFine?: boolean }) {
  return (
    <div className="etichette-barra">
      <span className="conto">{sinistra}</span>
      <span className={`nome-tacca${allineaFine ? ' fine' : ''}`} style={{ left: `${soglia}%` }} aria-hidden>
        {tacca}
      </span>
    </div>
  );
}

/** Le due barre con numeri e soglie (La mia settimana, Settimana dei genitori). */
export function Barre({ s, genitori = false }: { s: Settimana; genitori?: boolean }) {
  return (
    <div className="barre-settimana">
      <div>
        <p className="riga-barra">
          <b>{genitori ? 'Passi obbligatori' : 'Passi della settimana'}</b>
          <span className="numero passi">{s.percentualePassi}%</span>
        </p>
        <Barra tipo="passi" valore={s.percentualePassi} soglia={SOGLIA_PASSI} etichetta="Passi della settimana" />
        <Etichette sinistra={`${s.passiFatti} di ${s.passiPossibili} passi`} tacca="1ª chiave" soglia={SOGLIA_PASSI} />
      </div>
      <div>
        <p className="riga-barra">
          <b>{genitori ? 'Cose obbligatorie' : 'Cose fatte'}</b>
          <span className="numero cose">{s.percentualeCose}%</span>
        </p>
        <Barra tipo="cose" valore={s.percentualeCose} soglia={SOGLIA_COSE} etichetta="Cose fatte" />
        <Etichette sinistra={`${s.coseFatte} di ${s.cosePossibili} cose`} tacca="3ª chiave" soglia={SOGLIA_COSE} allineaFine />
      </div>
      <ul className="chiavi-settimana" aria-label={`Chiavi se la settimana finisse adesso: ${s.chiavi} su 3`}>
        {chiaviPrese(s).map((k) => (
          <li key={k.nome} className={k.presa ? 'presa' : ''}>
            <Sticker posa={k.presa ? 'chiave-piena' : 'chiave-vuota'} cartella="oggetti" misura={36} />
            <span>{k.nome}</span>
          </li>
        ))}
      </ul>
      {genitori && (
        <p className="chiavi-previste">
          <span>Note in settimana: {s.note > 0 ? s.note : 'nessuna'}</span>
          <b>Chiavi previste: {s.chiavi}</b>
        </p>
      )}
      {s.note > 0 && <p className="sotto-barra">Questa settimana c'è una nota: la seconda e la terza chiave sono andate. La prima si prende ancora.</p>}
    </div>
  );
}

const STATI: Record<NonNullable<Casella['stato']>, string> = { fatta: 'fatta', da_fare: 'da fare', persa: 'persa', jolly: 'saltato, non conta' };

function Cella({ c, nome }: { c: Casella; nome: string }) {
  const g = R.giorno(c.giorno);
  if (!c.stato)
    return (
      <td className="cella vuota" aria-label={`${GIORNI[g.getDay()]}: ${nome.toLowerCase()} non serve`}>
        <span aria-hidden />
      </td>
    );
  const conto = c.possibili > 1 ? `${c.fatte}/${c.possibili}` : '';
  return (
    <td className={`cella ${c.stato}`} aria-label={`${GIORNI[g.getDay()]}: ${nome.toLowerCase()} ${STATI[c.stato]}${conto ? `, ${c.fatte} su ${c.possibili}` : ''}`}>
      <span aria-hidden>
        {c.stato === 'fatta' ? (c.possibili > 1 ? conto : <Check size={16} weight="bold" />) : c.stato === 'persa' ? <X size={14} weight="bold" /> : c.stato === 'jolly' ? 'J' : conto}
      </span>
    </td>
  );
}

/** Griglia giorno per giorno: una riga per cosa obbligatoria che c'è questa settimana. */
export function Griglia({ s, oggi }: { s: Settimana; oggi: Date }) {
  const righe = s.righe.filter((r) => r.caselle.some((c) => c.possibili > 0));
  const giorniIso = s.righe[0].caselle.map((c) => c.giorno);
  return (
    <div className="griglia-settimana-box">
      <table className="griglia-settimana">
        <caption className="solo-lettori">Cose obbligatorie della settimana, giorno per giorno</caption>
        <thead>
          <tr>
            <th scope="col">
              <span className="solo-lettori">Cosa</span>
            </th>
            {giorniIso.map((g, i) => (
              <th key={g} scope="col" className={g === R.iso(oggi) ? 'oggi' : ''}>
                {SIGLE[i]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {righe.map((r) => (
            <tr key={r.voce}>
              <th scope="row">
                <b>{r.nome}</b>
                <small>+{r.valore} passi</small>
              </th>
              {r.caselle.map((c) => (
                <Cella key={c.giorno} c={c} nome={r.nome} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="legenda-settimana" aria-hidden>
        <li>
          <span className="cella fatta">
            <span>
              <Check size={12} weight="bold" />
            </span>
          </span>
          fatta
        </li>
        <li>
          <span className="cella da_fare">
            <span />
          </span>
          da fare
        </li>
        <li>
          <span className="cella persa">
            <span>
              <X size={10} weight="bold" />
            </span>
          </span>
          persa
        </li>
        {s.righe.some((r) => r.caselle.some((c) => c.stato === 'jolly')) && (
          <li>
            <span className="cella jolly">
              <span>J</span>
            </span>
            jolly
          </li>
        )}
      </ul>
    </div>
  );
}

const quando = (g: string, oggi: Date) => {
  const d = R.giorno(g);
  const diff = Math.round((d.getTime() - oggi.getTime()) / 86_400_000);
  return diff === 0 ? 'Oggi' : diff === 1 ? 'Domani' : maiuscola(GIORNI[d.getDay()]);
};

/** "La mia settimana" di Lani: si apre dalla striscia sopra la barra. */
export default function LaMiaSettimana() {
  const s = useSettimana();
  const oggi = R.giornoRoma(new Date());
  const lun = R.lunedi(oggi);
  const dom = new Date(lun.getFullYear(), lun.getMonth(), lun.getDate() + 6);
  const sopra = `${lun.getDate()} ${lun.getMonth() === dom.getMonth() ? '' : MESI[lun.getMonth()] + ' '}– ${dom.getDate()} ${MESI[dom.getMonth()]}`;
  if (s === undefined)
    return (
      <section className="schermo">
        <Testata sfondo="rosa" posa="lani-determinata" misura={130} sopra={sopra} titolo="La mia settimana" />
        <Attesa />
      </section>
    );
  if (s === null)
    return (
      <section className="schermo">
        <Testata sfondo="rosa" posa="lani-determinata" misura={130} sopra={sopra} titolo="La mia settimana" />
        <p className="carta" role="alert">
          Non riesco a leggere la settimana. Riprova tra poco.
        </p>
      </section>
    );
  const prossime = prossimeCose(s, oggi);
  const tutto = s.chiavi === 3 && s.coseFatte >= s.cosePossibili;
  return (
    <section className="schermo settimana">
      <Testata sfondo="rosa" posa="lani-determinata" misura={130} sopra={sopra} titolo="La mia settimana" />
      <div className="carta">
        <Barre s={s} />
      </div>

      <div className="carta">
        <h2>Per restare in rotta</h2>
        {tutto ? (
          <p>Tutto fatto: le chiavi sono al sicuro.</p>
        ) : prossime.length === 0 ? (
          <p>Per oggi niente altro da fare: le prossime cose arrivano da Nuvola.</p>
        ) : (
          <ul className="prossime">
            {prossime.map((p) => (
              <li key={p.voce + p.giorno}>
                <span className="cerchio-vuoto" aria-hidden />
                <span>
                  <b>{quando(p.giorno, oggi)}</b>: {p.nome.toLowerCase()}
                  {p.quante > 1 ? ` (${p.quante})` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="carta">
        <h2>Giorno per giorno</h2>
        <Griglia s={s} oggi={oggi} />
      </div>

      <p className="nota piccola">
        Cartella la sera prima di scuola. Le chiavi si contano domenica alle {R.CONFIG.chiavi_settimana.ora_conteggio}. Dieci minuti: per le chiavi ne contano {s.dieciTetto} a settimana.
      </p>
    </section>
  );
}
