import { useEffect, useState } from 'react';
import { Bell, CaretRight, Cards, ClipboardText, Lightbulb, Volleyball } from '@phosphor-icons/react';
import { impegniTra, piuGiorni, oraAdesso, useGiornata, type Impegno } from './giornata';
import { Riquadro, Sticker, Testata } from './kit';
import { PillolaSaldo } from './Contapassi';
import * as C from './lib/calendario';
import * as N from './lib/nuvola';
import * as R from './lib/regole';
import { GIORNI, MESI, RigaCompito, SELECT_COMPITI, adesso, maiuscola, spuntaCompito, useAnnulla, type Compito } from './spunte';
import { attivaNotifiche, notifichePossibili } from './notifiche';
import { supabase } from './supabase';

// Oggi — design/Oggi.html (mattina) e design/Pomeriggio.html (pomeriggio).
// ponytail: riga dell'umore facoltativa e foto dei compiti, più avanti.

type Cosa = { titolo: string; sotto: string; icona: 'verifica' | 'sport' | 'promemoria' };
type Apri = (v: 'Studio' | 'Astra') => void;
const ICONE = {
  verifica: (
    <Riquadro colore="rosa">
      <ClipboardText size={26} weight="bold" />
    </Riquadro>
  ),
  sport: (
    <Riquadro colore="lilla">
      <Volleyball size={26} weight="bold" />
    </Riquadro>
  ),
  promemoria: (
    <Riquadro colore="burro">
      <Bell size={26} weight="bold" />
    </Riquadro>
  ),
};

export default function Oggi({ apri = () => {} }: { apri?: Apri }) {
  const giornata = useGiornata();
  if (!giornata) return null;
  return (
    <>
      {C.momento(oraAdesso(), giornata.chiusura) === 'mattina' ? (
        <Mattina impegni={giornata.impegni} apri={apri} />
      ) : (
        <Pomeriggio chiusura={giornata.chiusura} apri={apri} />
      )}
      <AttivaNotifiche />
    </>
  );
}

function Mattina({ impegni, apri }: { impegni: Impegno[]; apri: Apri }) {
  const oggi = R.giornoRoma(new Date());
  const [cose, setCose] = useState<Cosa[]>();
  const [ieri, setIeri] = useState(0);
  const [ieriChiusa, setIeriChiusa] = useState(false);
  const [famiglia, setFamiglia] = useState<Impegno[]>([]);
  const [chiavi, setChiavi] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from('verifiche').select('tipo, materie(nome)').eq('data', R.iso(oggi)),
      supabase.from('impostazioni').select('valore').eq('chiave', 'materiale_cartella').maybeSingle(),
      supabase.from('fogli_firma').select('titolo').is('dato_il', null).is('consegnato_il', null).limit(1),
      supabase.from('movimenti_passi').select('passi, moltiplicatore').eq('giorno', R.iso(piuGiorni(oggi, -1))),
      impegniTra(new Date(), piuGiorni(oggi, 8)),
      supabase.from('settimane').select('chiavi').not('chiavi', 'is', null).order('inizio', { ascending: false }).limit(1),
      supabase.from('serate').select('cartella_il').eq('data', R.iso(piuGiorni(oggi, -1))).not('cartella_il', 'is', null).limit(1),
    ]).then(([v, m, f, mov, prossimi, w, sera]) => {
      const lista: Cosa[] = [];
      for (const x of (v.data ?? []) as unknown as { tipo: string; materie: { nome: string } | null }[])
        lista.push({ titolo: `${maiuscola(x.tipo)} di ${x.materie?.nome ?? 'oggi'}`, sotto: 'Oggi, in classe', icona: 'verifica' });
      const sport = impegni.find((i) => C.tipoImpegno(i.titolo) !== 'famiglia');
      if (sport) {
        const ora = C.oraRoma(sport.inizio);
        const partita = C.tipoImpegno(sport.titolo) === 'partita';
        lista.push({
          titolo: `${partita ? 'Partita' : 'Allenamento'} alle ${ora}`,
          sotto: R.giornoDiScuola(oggi) && ora < '16:00' ? 'Esci con cartella e borsa insieme' : partita ? 'Borsa pronta prima di uscire' : 'Borsa pronta per il pomeriggio',
          icona: 'sport',
        });
      }
      const materiale: string[] = m.data?.valore?.[oggi.getDay()] ?? [];
      if (materiale[0]) lista.push({ titolo: materiale[0], sotto: 'Controlla che ci sia nello zaino', icona: 'promemoria' });
      else if (f.data?.[0]) lista.push({ titolo: f.data[0].titolo, sotto: 'Da far firmare: portalo a mamma o papà', icona: 'promemoria' });
      setCose(lista.slice(0, 3));
      setIeri((mov.data ?? []).reduce((a, x) => a + Math.round(x.passi * x.moltiplicatore), 0));
      setIeriChiusa((sera.data ?? []).length > 0);
      setFamiglia(prossimi.filter((i) => C.tipoImpegno(i.titolo) === 'famiglia').slice(0, 3));
      setChiavi(w.data?.[0]?.chiavi ?? null);
    });
  }, []);

  if (!cose) return null;
  const sport = impegni.find((i) => C.tipoImpegno(i.titolo) !== 'famiglia');
  const riga = R.giornoDiScuola(oggi)
    ? sport
      ? `Scuola, poi ${C.tipoImpegno(sport.titolo) === 'partita' ? 'partita' : 'allenamento'}.`
      : 'Scuola, poi pomeriggio a casa.'
    : sport
      ? `Oggi ${C.tipoImpegno(sport.titolo) === 'partita' ? 'partita' : 'allenamento'}.`
      : 'Niente scuola oggi.';

  return (
    <section className="schermo">
      <Testata
        sfondo="mattina"
        posa="lani-buongiorno"
        sopra={`${maiuscola(GIORNI[oggi.getDay()])} ${oggi.getDate()} ${MESI[oggi.getMonth()]}`}
        titolo="Buongiorno, Lani"
        riga={
          <>
            <p>{riga}</p>
            <PillolaSaldo />
          </>
        }
      />

      <div className="carta">
        <h2>Tre cose per oggi</h2>
        {cose.length === 0 ? (
          <p>Giornata tranquilla.</p>
        ) : (
          <ol className="cose">
            {cose.map((c) => (
              <li key={c.titolo}>
                {ICONE[c.icona]}
                <span>
                  <b>{c.titolo}</b>
                  <small>{c.sotto}</small>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {ieri > 0 && (
        <p className="pillola-oro">
          <Sticker posa="bart-sonnecchia" misura={52} />
          <span>{ieriChiusa ? 'Ieri sera hai chiuso tutto: Bart ha dormito tranquillo' : 'Passi di ieri'}</span>
          <b className="numero" aria-label={`${ieri} passi`}>
            +{ieri}
          </b>
        </p>
      )}

      {famiglia.length > 0 && (
        <details className="famiglia" open>
          <summary>
            <span className="famiglia-avatar">
              <Sticker posa="nonno-pollice" misura={40} />
              <Sticker posa="mamma-passaggio" misura={40} />
            </span>
            <h2>In famiglia</h2>
          </summary>
          <ul>
            {famiglia.map((i) => {
              const g = R.giornoRoma(i.inizio);
              const quando = R.iso(g) === R.iso(oggi) ? '' : `${GIORNI[g.getDay()].slice(0, 3)} `;
              return (
                <li key={i.inizio + i.titolo}>
                  <b>
                    {quando}
                    {i.tutto_il_giorno ? '' : C.oraRoma(i.inizio)}
                  </b>{' '}
                  {i.titolo}
                </li>
              );
            })}
          </ul>
        </details>
      )}

      {chiavi !== null && (
        <div className="carta riga-chiavi">
          <span>
            <small>Chiavi della settimana</small>
            <span className="chiavi" aria-label={`${chiavi} chiavi su 3`}>
              {[1, 2, 3].map((k) => (
                <Sticker key={k} posa={k <= chiavi ? 'chiave-piena' : 'chiave-vuota'} cartella="oggetti" misura={40} />
              ))}
            </span>
          </span>
          <button className="collegamento" onClick={() => apri('Astra')}>
            Vai su Astra <CaretRight size={18} weight="bold" aria-hidden />
          </button>
        </div>
      )}
    </section>
  );
}

type Sessione = { id: string; numero: number; tipo: string; verifica_id: string; verifiche: { data: string; materie: { nome: string } | null } | null };
type Pallino = { id: string; numero: number; data_prevista: string; fatta_il: string | null };
const COSA_SESSIONE: Record<string, string> = { rilettura_flashcard: 'rilettura e flash card', flashcard_mappa: 'flash card e mappa', quiz: 'quiz', quiz_errori: 'quiz breve sugli errori' };
const P = R.CONFIG.passi.obbligatori;

function Pomeriggio({ chiusura, apri }: { chiusura: string | null; apri: Apri }) {
  const oggi = R.giornoRoma(new Date());
  const domani = R.prossimoGiornoDiScuola(oggi);
  const [compiti, setCompiti] = useState<Compito[]>();
  const [ripasso, setRipasso] = useState<Sessione | null>(null);
  const [pallini, setPallini] = useState<Pallino[]>([]);
  const [carte, setCarte] = useState(0);
  const [errore, setErrore] = useState('');
  const [aiuto, setAiuto] = useState<Compito>();
  const attesa = useAnnulla();

  useEffect(() => {
    Promise.all([
      supabase.from('compiti').select(SELECT_COMPITI).eq('scadenza', R.iso(domani)),
      supabase
        .from('sessioni_ripasso')
        .select('id, numero, tipo, verifica_id, verifiche(data, materie(nome))')
        .eq('data_prevista', R.iso(oggi))
        .is('fatta_il', null)
        .limit(1),
      supabase.from('flashcard').select('id', { count: 'exact', head: true }).lte('prossima_revisione', R.iso(oggi)).eq('segnalata_sbagliata', false),
    ]).then(([c, s, k]) => {
      if (c.error) return setErrore('Non riesco a leggere i compiti. Riprova tra poco.');
      const lista = (c.data ?? []) as unknown as Compito[];
      setCompiti(lista.sort((a, b) => N.peso(b.testo) - N.peso(a.testo)));
      const sessione = ((s.data ?? [])[0] as unknown as Sessione) ?? null;
      setRipasso(sessione);
      if (sessione)
        supabase
          .from('sessioni_ripasso')
          .select('id, numero, data_prevista, fatta_il')
          .eq('verifica_id', sessione.verifica_id)
          .order('numero')
          .then(({ data }) => setPallini((data ?? []) as Pallino[]));
      setCarte(k.count ?? 0);
    });
  }, []);

  if (!compiti) return errore ? <p role="alert">{errore}</p> : null;
  if (aiuto) return <Aiuto compito={aiuto} chiudi={() => setAiuto(undefined)} />;
  const daFare = compiti.filter((c) => !c.fatto_il);
  const segna = (id: string) => (fatto_il: string | null) => setCompiti((l) => l?.map((x) => (x.id === id ? { ...x, fatto_il } : x)));
  const ver = ripasso?.verifiche;

  return (
    <section className="schermo pomeriggio">
      <Testata
        sfondo="pomeriggio"
        posa="lani-concentrata"
        misura={140}
        sopra={`${maiuscola(GIORNI[oggi.getDay()])} pomeriggio`}
        titolo={`Compiti per ${GIORNI[domani.getDay()]}`}
        riga={
          <>
            {chiusura && compiti.length > 0 && <p>Hai tempo fino alle {chiusura}.</p>}
            <PillolaSaldo />
          </>
        }
      />
      {errore && <p role="alert">{errore}</p>}

      <div className="carta">
        {compiti.length === 0 ? (
          <p>Nessun compito su Nuvola per {GIORNI[domani.getDay()]}.</p>
        ) : (
          <>
            <div className="testa-carta">
              <h2>In quest'ordine</h2>
              <span className="valore">+{P.compiti} ciascuno</span>
            </div>
            <ul className="spunte ordine">
              {compiti.map((c, i) => (
                <RigaCompito
                  key={c.id}
                  c={c}
                  numero={i + 1}
                  nota={i === 0 && !c.fatto_il ? 'Inizia da qui: è il più lungo' : undefined}
                  onSpunta={() => {
                    segna(c.id)(adesso());
                    attesa.avvia(c.id, () => spuntaCompito(c.id, segna(c.id), setErrore));
                  }}
                  onAnnulla={attesa.inAttesa(c.id) ? () => attesa.annulla(c.id, () => segna(c.id)(null)) : undefined}
                  onAiuto={() => setAiuto(c)}
                />
              ))}
            </ul>
            {daFare.length === 0 && <p className="lady">Compiti finiti. Il resto del pomeriggio è tuo.</p>}
            {daFare.length > 0 && (
              <p className="nota piccola">
                <Lightbulb size={16} weight="bold" aria-hidden /> Bloccata? Tocca la lampadina: ti spiego l'argomento, non l'esercizio.
              </p>
            )}
          </>
        )}
      </div>

      {ripasso && ver?.data && (
        <div className="carta">
          <div className="testa-carta">
            <h2>Ripasso: {ver.materie?.nome?.toLowerCase() ?? 'verifica'}</h2>
            <span className="valore">+{P.ripasso}</span>
          </div>
          <p>
            Verifica {GIORNI[R.giorno(ver.data).getDay()]} {R.giorno(ver.data).getDate()}. Oggi la sessione {ripasso.numero}
            {pallini.length ? ` di ${pallini.length}` : ''}: {COSA_SESSIONE[ripasso.tipo] ?? 'ripasso'}, 15 minuti.
          </p>
          <div className="riga-pallini">
            <ol className="pallini" aria-label="Sessioni di ripasso">
              {pallini.map((s) => (
                <li key={s.id} className={s.fatta_il ? 'fatta' : s.data_prevista === R.iso(oggi) ? 'oggi' : ''}>
                  <span aria-hidden />
                  {s.data_prevista === R.iso(oggi) ? 'oggi' : GIORNI[R.giorno(s.data_prevista).getDay()].slice(0, 3)}
                </li>
              ))}
            </ol>
            <button className="secondario compatto" onClick={() => apri('Studio')}>
              <Cards size={20} weight="bold" aria-hidden /> Inizia
            </button>
          </div>
        </div>
      )}

      {carte > 0 && (
        <button className="pillola-lilla" onClick={() => apri('Studio')}>
          <Sticker posa="passo" cartella="oggetti" misura={52} />
          <span>
            Carte del giorno: {carte} carte, circa {Math.max(2, Math.round((Math.min(carte, 12) * 25) / 60))} minuti
          </span>
        </button>
      )}
    </section>
  );
}

/** Lampadina "Non ho capito": l'argomento con un altro esempio, poi un indizio alla volta. */
function Aiuto({ compito, chiudi }: { compito: Compito; chiudi: () => void }) {
  const [r, setR] = useState<{ spiegazione: string; indizi: string[] } | null>();
  const [visti, setVisti] = useState(0);
  useEffect(() => {
    supabase.functions.invoke('spiega', { body: { compito_id: compito.id } }).then(({ data, error }) => {
      setR(error || !data?.spiegazione ? null : data);
    });
  }, [compito.id]);

  return (
    <section className="schermo">
      <Testata sfondo="pomeriggio" posa="lani-pensierosa" sopra={compito.materie?.nome ?? 'Compito'} titolo="Non ho capito" riga={<p>{compito.testo}</p>} />
      <div className="carta" aria-live="polite">
        {r === undefined && <p>Ok, vediamola con un altro esempio…</p>}
        {r === null && <p>Adesso la lampadina non si accende. Riprova tra poco, oppure chiedi a mamma o papà.</p>}
        {r && (
          <>
            <p>Ok, vediamola con un altro esempio.</p>
            <p>{r.spiegazione}</p>
            {r.indizi.slice(0, visti).map((x, n) => (
              <p key={n} className="indizio">
                <b>Indizio {n + 1}.</b> {x}
              </p>
            ))}
            {visti < r.indizi.length && (
              <button className="secondario" onClick={() => setVisti(visti + 1)}>
                {visti ? 'Un altro indizio' : 'Un indizio'}
              </button>
            )}
          </>
        )}
      </div>
      <button className="principale largo" onClick={chiudi}>
        Torna ai compiti
      </button>
    </section>
  );
}

/** Invito ad attivare i promemoria, finché il telefono non ha risposto (sì o no). */
function AttivaNotifiche() {
  const [vedi, setVedi] = useState(notifichePossibili);
  if (!vedi) return null;
  return (
    <div className="carta promemoria">
      <p>Vuoi i promemoria di ACE? Al massimo 3 al giorno.</p>
      <button className="secondario" onClick={() => attivaNotifiche().finally(() => setVedi(false))}>
        Attiva i promemoria
      </button>
    </div>
  );
}
