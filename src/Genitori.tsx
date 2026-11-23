import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CalendarBlank, CaretRight, GearSix, LockSimple, Sun, TreasureChest } from '@phosphor-icons/react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Attesa, CampoTesto, Foglio, Sticker } from './kit';
import * as R from './lib/regole';
import { installata } from './Benvenuta';
import { GIORNI, MESI } from './spunte';
import Oggi from './genitori/Oggi';
import Settimana from './genitori/Settimana';
import Forzieri from './genitori/Forzieri';
import Impostazioni from './genitori/Impostazioni';

// Area genitori, restyling del 16/11 (docs/genitori-ux.md, design/Genitori-v2.html): quattro schede
// per quello che fanno i genitori, la barra in basso. Tutto passa dal client del genitore (sul suo
// telefono la sessione normale, sull'iPad di Lani quella a parte sbloccata con il PIN): la RLS lo
// riconosce come genitore e la funzione "passi" decide i passi come per Lani.

type Scheda = 'oggi' | 'settimana' | 'forzieri' | 'impostazioni';
// 23/11: i premi escono dalla barra (al loro posto la Settimana con le barre delle chiavi): si
// aprono dal fondo della Settimana e chiedono il PIN ogni volta, anche sul telefono di un genitore.
const SCHEDE = [
  ['oggi', 'Oggi', Sun],
  ['settimana', 'Settimana', CalendarBlank],
  ['impostazioni', 'Impostazioni', GearSix],
] as const;
const TITOLI: Record<Scheda, string> = { oggi: 'Oggi', settimana: 'Settimana', forzieri: 'Premi e forzieri', impostazioni: 'Impostazioni' };

/** esci: sul telefono di un genitore (logout, in Impostazioni). chiudi: sui dispositivi di Lani ("Chiudi l'area"). */
export default function Genitori({ client, esci, chiudi }: { client: SupabaseClient; esci?: () => void; chiudi?: () => void }) {
  const [scheda, setScheda] = useState<Scheda>('oggi');
  const [avviso, setAvviso] = useState<{ testo: string; riprova?: () => void }>();
  const [daFare, setDaFare] = useState(0);
  // Impostazioni con modifiche non salvate: prima di cambiare scheda si chiede
  const [sospeso, setSospeso] = useState(false);
  const [vaiA, setVaiA] = useState<Scheda>();
  // i premi si sbloccano col PIN e si richiudono appena si cambia scheda
  const [premiAperti, setPremiAperti] = useState(false);
  const cambia = (s: Scheda) => (setScheda(s), setAvviso(undefined), setSospeso(false), setVaiA(undefined), setPremiAperti(false));
  const timer = useRef<number>(undefined);
  const passi = async (tipo: string, id: string) => {
    // null = la funzione non ha risposto: distinto da 0 (tetto pieno, già dati), così l'errore non si legge come "tetto pieno"
    const { data, error } = await client.functions.invoke('passi', { body: { tipo, id } });
    if (error) return null;
    return (data?.passi as number) ?? 0;
  };
  // avviso in basso per 10 secondi; con "Riprova" resta finché non si tocca o si cambia scheda
  const avvisa = (testo: string, riprova?: () => void) => {
    setAvviso({ testo, riprova });
    window.clearTimeout(timer.current);
    if (!riprova) timer.current = window.setTimeout(() => setAvviso(undefined), 10000);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const [avvio, setAvvio] = useState(() => {
    try {
      return localStorage.getItem('ace-avvio-genitori') !== 'fatto';
    } catch {
      return false;
    }
  });
  if (avvio)
    return (
      <Avvio
        client={client}
        vai={(s) => {
          try {
            localStorage.setItem('ace-avvio-genitori', 'fatto');
          } catch {
            /* tornerà la prossima volta */
          }
          setScheda(s);
          setAvvio(false);
        }}
      />
    );

  const oggi = R.giornoRoma(new Date());
  const lun = R.lunedi(oggi);
  const dom = new Date(lun.getFullYear(), lun.getMonth(), lun.getDate() + 6);
  const sopra = scheda === 'settimana' ? `Dal ${lun.getDate()} al ${dom.getDate()} ${MESI[dom.getMonth()]}` : scheda === 'oggi' ? `${GIORNI[oggi.getDay()].replace(/^./, (x) => x.toUpperCase())} ${oggi.getDate()} ${MESI[oggi.getMonth()]}` : 'Area genitori';
  const props = { client, passi, avvisa };
  return (
    <section className="ga" aria-labelledby="titolo-area">
      <header className="ga-testa">
        <div>
          <p>{sopra}</p>
          <h1 id="titolo-area">{TITOLI[scheda]}</h1>
        </div>
        {chiudi && (
          <button type="button" className="ga-btn tenue" onClick={chiudi}>
            <LockSimple size={18} weight="bold" aria-hidden />
            Chiudi l’area
          </button>
        )}
      </header>
      {scheda === 'oggi' && <Oggi {...props} conta={setDaFare} />}
      {scheda === 'settimana' && (
        <>
          <Settimana {...props} />
          <button type="button" className="ga-premi" onClick={() => cambia('forzieri')}>
            <TreasureChest size={22} weight="bold" aria-hidden />
            <span>
              <b>Premi e forzieri</b>
              <small>Protetti dal PIN</small>
            </span>
            <CaretRight size={18} weight="bold" aria-hidden />
          </button>
        </>
      )}
      {scheda === 'forzieri' && (premiAperti ? <Forzieri {...props} /> : <PinPremi client={client} apri={() => setPremiAperti(true)} torna={() => cambia('settimana')} />)}
      {scheda === 'impostazioni' && <Impostazioni {...props} esci={esci} sospeso={setSospeso} />}
      {vaiA && (
        <Foglio titolo="Modifiche non salvate" azione="Esci senza salvare" conferma={() => cambia(vaiA)} chiudi={() => setVaiA(undefined)} chiudiTesto="Resta qui">
          <p className="ga-nota">Gli orari e il materiale che avete cambiato non sono salvati.</p>
        </Foglio>
      )}
      {avviso && (
        <p role="status" className="ga-pillola">
          {avviso.testo}
          {avviso.riprova && (
            <button type="button" onClick={() => (setAvviso(undefined), avviso.riprova?.())}>
              Riprova
            </button>
          )}
        </p>
      )}
      <nav className="ga-schede" aria-label="Sezioni genitori">
        {SCHEDE.map(([s, nome, Icona]) => (
          <button key={s} type="button" aria-current={s === scheda ? 'page' : undefined} onClick={() => (sospeso && s !== scheda ? setVaiA(s) : cambia(s))}>
            <Icona size={22} weight={s === scheda ? 'fill' : 'bold'} aria-hidden />
            {nome}
            {s === 'oggi' && daFare > 0 && (
              <span className="ga-bollino">
                {daFare}
                <span className="solo-lettori"> da fare</span>
              </span>
            )}
          </button>
        ))}
      </nav>
    </section>
  );
}

const MESSAGGI_PIN: Record<string, string> = {
  sbagliato: 'PIN non giusto. Riprova.',
  bloccato: 'Troppi tentativi sbagliati: si riprova tra 15 minuti.',
  manca: 'Il PIN non è ancora impostato: si sceglie in Impostazioni.',
  no: 'Questo accesso non è di un genitore.',
};

/** Il PIN prima dei premi: Lani può avere in mano il telefono di mamma o papà. */
function PinPremi({ client, apri, torna }: { client: SupabaseClient; apri: () => void; torna: () => void }) {
  const [errore, setErrore] = useState('');
  async function prova(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const { data, error } = await client.rpc('controlla_pin', { p_pin: String(new FormData(form).get('pin')) });
    if (!error && data === 'ok') return apri();
    form.reset();
    setErrore(error ? 'Non riesco a controllare il PIN adesso. Riprova.' : (MESSAGGI_PIN[data as string] ?? 'Non riesco a controllare il PIN adesso. Riprova.'));
  }
  return (
    <form className="ga-modulo ga-pin-premi" onSubmit={prova}>
      <p className="ga-nota">I premi dei forzieri sono una sorpresa per Lani: per vederli serve il PIN.</p>
      <CampoTesto etichetta="PIN" name="pin" type="password" inputMode="numeric" pattern="\d{4,8}" autoComplete="off" required errore={errore || undefined} />
      <button className="ga-btn pieno largo">Apri i premi</button>
      <button type="button" className="ga-btn tenue largo" onClick={torna}>
        Torna alla settimana
      </button>
    </form>
  );
}

/** Prima accensione dei genitori (design/Genitori-avvio.html): quattro cose, una volta sola. */
function Avvio({ client, vai }: { client: SupabaseClient; vai: (s: Scheda) => void }) {
  const [s, setS] = useState<{ nuvola: boolean; senzaPremio: number }>();
  useEffect(() => {
    Promise.all([
      client.from('sync_log').select('esito').eq('fonte', 'nuvola').order('iniziato_il', { ascending: false }).limit(1),
      client.from('forzieri').select('n', { count: 'exact', head: true }).is('premio', null),
    ]).then(([l, f]) => setS({ nuvola: l.data?.[0]?.esito === 'ok', senzaPremio: f.count ?? 9 }));
  }, []);
  if (!s) return <Attesa />;
  const g = R.CONFIG.passi.gesti_casa;
  const cose = [
    { fatto: s.nuvola, titolo: 'Collega Nuvola', testo: 'Compiti, verifiche e voti arrivano alle 14:30 e alle 19:30' },
    {
      fatto: s.senzaPremio === 0,
      titolo: 'Scegli i premi dei 9 forzieri',
      testo: `Lani non li vede: vede solo l'enigma, vicino al forziere${s.senzaPremio ? ` (ne mancano ${s.senzaPremio})` : ''}`,
    },
    { fatto: false, titolo: 'Controlla gesti di casa e orari', testo: `Scrivania, lavastoviglie, letto, vestiti: +${g.voci.scrivania} ciascuno, al massimo ${g.tetto_giornaliero} al giorno` },
    { fatto: installata(), titolo: 'Metti ACE sulla schermata Home', testo: 'Da Safari: Condividi, poi Aggiungi alla schermata Home. Senza, niente notifiche' },
  ];
  return (
    <section className="avvio">
      <header className="avvio-testa">
        <span className="coppia">
          <Sticker posa="papa-passaggio" misura={70} />
          <Sticker posa="mamma-passaggio" misura={70} />
        </span>
        <div>
          <p className="sopratitolo">Per mamma e papà</p>
          <h1>Prepariamo ACE</h1>
        </div>
      </header>
      <p>Quattro cose, una volta sola. Il resto lo fa ACE da solo, due volte al giorno.</p>
      <ol>
        {cose.map((c, i) => (
          <li key={c.titolo} className={`carta${c.fatto ? ' fatto' : ''}`}>
            <span className="segno" aria-hidden>{c.fatto ? '✓' : i + 1}</span>
            <span>
              <b>{c.titolo}</b>
              <span className="solo-lettori">{c.fatto ? ' (fatto)' : ' (da fare)'}</span>
              <small>{c.testo}</small>
            </span>
          </li>
        ))}
      </ol>
      <div className="avvio-piede">
        <button className="principale largo" onClick={() => vai('forzieri')}>Scegli i premi</button>
        <button className="link" onClick={() => vai('oggi')}>Lo faccio dopo</button>
      </div>
    </section>
  );
}
