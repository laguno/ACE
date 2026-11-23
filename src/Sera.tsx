import { useCallback, useEffect, useState } from 'react';
import * as C from './lib/calendario';
import * as N from './lib/nuvola';
import * as R from './lib/regole';
import { GIORNI, RigaCompito, SELECT_COMPITI, adesso, maiuscola, passi, spuntaCompito, useAnnulla, type Compito } from './spunte';
import { supabase } from './supabase';
import { Backpack, BookOpen, Check, Volleyball } from '@phosphor-icons/react';
import { Sticker, Testata } from './kit';
import { Frase } from './Frase';
import { GETTONI, coloreMateria, type Gettone } from './colori';

// Sera — design/Domani.html. Lani spunta; i passi li decide la funzione "passi" sul server.
// Cartella dalle lezioni di Nuvola (orario) più il materiale del giorno (impostazioni);
// borsa e "Domani in famiglia" dal calendario di famiglia.

type Foglio = { id: string; titolo: string; scadenza: string | null; dato_il: string | null };
type Impegno = { titolo: string; inizio: string; tutto_il_giorno: boolean };

// ponytail: voci fisse dalla bozza; con l'area genitori (tappa 7) passano alle impostazioni.
const VOCI_BORSA = ['Divisa', 'Ginocchiere', 'Scarpe', 'Borraccia'];
const PRIMA_DI_USCIRE_DA_SCUOLA = '16:00';
/** Lo sticker della persona dell'impegno di famiglia (dal titolo); poi Leo, mamma, papà o nonno. */
function posaPersona(titolo: string): string {
  const t = titolo.toLowerCase();
  if (/\bleo\b/.test(t)) return /tennis/.test(t) ? 'leo-tennis' : 'leo-ride';
  if (/nonn[oi]/.test(t)) return 'nonno-pollice';
  if (/mamma|lucrezia/.test(t)) return 'mamma-pollice';
  if (/pap[àa]|alessandro/.test(t)) return 'papa-applaude';
  return 'mamma-passaggio';
}

/** Riga chiusa di una cosa pronta (v2): cerchio del colore del gettone con la spunta. */
function Chiusa({ titolo, gettone, dopo, onAnnulla }: { titolo: string; gettone: Gettone; dopo: string; onAnnulla?: () => void }) {
  return (
    <div className="carta-chiusa">
      <span className="cerchio-chiuso" style={{ background: GETTONI[gettone].segno }}>
        <Check size={18} weight="bold" color="#fff" aria-hidden />
      </span>
      <b>{titolo}</b>
      <span className="dopo">{dopo}</span>
      {onAnnulla && (
        <button className="lampadina annulla" onClick={onAnnulla}>
          Annulla
        </button>
      )}
    </div>
  );
}

const ICONE_SERA: Record<Gettone, typeof Check> = { compiti: BookOpen, ripasso: BookOpen, cartella: Backpack, borsa: Volleyball };

/** Testa delle carte della sera (bozza v2): cerchio del gettone con l'icona, titolo e "N di M". */
function TestaSera({ titolo, gettone, conto, children }: { titolo: string; gettone: Gettone; conto?: string; children?: React.ReactNode }) {
  const g = GETTONI[gettone];
  const Icona = ICONE_SERA[gettone];
  return (
    <div className="testa-sera">
      <span className="cerchio-gettone" style={{ background: g.fondo, color: g.segno }} aria-hidden>
        <Icona size={24} weight="bold" />
      </span>
      <span className="testa-sera-testo">
        <h2>{titolo}</h2>
        {children}
      </span>
      {conto && (
        <span className="conto-sera" style={{ color: g.segno }}>
          {conto}
        </span>
      )}
    </div>
  );
}

/** Lista a voci (cartella, borsa): spuntate una per una sul telefono, con l'ultima è pronta. */
// ponytail: le voci spuntate si perdono se si chiude l'app prima dell'ultima.
function Voci({ titolo, voci, pronta, quandoPronta, onAnnulla, gettone, conPallini = false, children }: {
  titolo: string;
  /** passi che vale, preso dal config; null = promemoria senza passi (la borsa fuori da lun/ven) */
  valore: number | null;
  voci: string[];
  pronta: boolean;
  quandoPronta: () => void;
  onAnnulla?: () => void;
  /** colori fissi del gettone (v2): azzurro per la cartella, rosa per la borsa */
  gettone: Gettone;
  /** un pallino del colore della materia davanti a ogni voce (la cartella) */
  conPallini?: boolean;
  children?: React.ReactNode;
}) {
  const [messe, setMesse] = useState(new Set<string>());
  function metti(v: string) {
    const nuove = new Set(messe);
    if (nuove.has(v)) nuove.delete(v);
    else nuove.add(v);
    setMesse(nuove);
    if (voci.every((x) => nuove.has(x))) quandoPronta();
  }
  const g = GETTONI[gettone];
  // v2: quando una cosa è pronta la sua carta si chiude in una riga con la spunta
  if (pronta)
    return <Chiusa titolo={titolo} gettone={gettone} dopo="pronta" onAnnulla={onAnnulla} />;
  return (
    <div className="carta">
      <TestaSera titolo={titolo} gettone={gettone} conto={`${voci.filter((v) => messe.has(v)).length} di ${voci.length}`}>
        {children}
      </TestaSera>
      <ul className="pastiglie">
        {voci.map((v) => (
          <li key={v}>
            <label className="chip chip-gettone" style={{ ['--g-fondo' as string]: g.fondo, ['--g-segno' as string]: g.segno }}>
              <input type="checkbox" checked={pronta || messe.has(v)} disabled={pronta} onChange={() => metti(v)} />
              <Check size={16} weight="bold" aria-hidden className="segno" />
              {conPallini && <i className="pallino-materia" aria-hidden style={{ background: coloreMateria(v).testo }} />}
              <span>{v}</span>
            </label>
          </li>
        ))}
      </ul>
      {onAnnulla && (
        <button className="lampadina annulla" onClick={onAnnulla}>
          Annulla
        </button>
      )}
    </div>
  );
}

export default function Sera() {
  const oggi = R.giornoRoma(new Date());
  const domani = R.prossimoGiornoDiScuola(oggi);
  const dopodomaniCal = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() + 2);
  const domaniCal = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() + 1);
  const [compiti, setCompiti] = useState<Compito[]>();
  const [fogli, setFogli] = useState<Foglio[]>([]);
  const [serata, setSerata] = useState({ cartella: false, borsa: false });
  const [orario, setOrario] = useState<string[]>([]);
  const [impegni, setImpegni] = useState<Impegno[]>([]);
  const [errore, setErrore] = useState('');
  const [verificaDomani, setVerificaDomani] = useState(false);

  useEffect(() => {
    const da = new Date(oggi);
    da.setDate(da.getDate() - 21);
    Promise.all([
      supabase.from('lezioni').select('data, ora, materia_id').gte('data', R.iso(da)),
      supabase.from('materie').select('id, nome'),
      supabase.from('impostazioni').select('valore').eq('chiave', 'materiale_cartella').maybeSingle(),
      supabase
        .from('impegni_famiglia')
        .select('titolo, inizio, tutto_il_giorno')
        .gte('inizio', domaniCal.toISOString())
        .lt('inizio', dopodomaniCal.toISOString())
        .order('inizio'),
      supabase.from('verifiche').select('id', { count: 'exact', head: true }).eq('data', R.iso(domaniCal)),
    ]).then(([l, m, i, imp, vd]) => {
      setVerificaDomani((vd.count ?? 0) > 0);
      const nomi = new Map((m.data ?? []).map((x) => [x.id, x.nome]));
      const materiale = (i.data?.valore as string[][] | undefined)?.[domani.getDay()] ?? [];
      setOrario([...N.materieDelGiorno(l.data ?? [], domani.getDay()).map((id) => nomi.get(id) ?? id), ...materiale]);
      setImpegni(imp.data ?? []);
    });
  }, [R.iso(oggi)]);

  const carica = useCallback(async () => {
    const [c, f, s] = await Promise.all([
      supabase.from('compiti').select(SELECT_COMPITI).eq('scadenza', R.iso(domani)).order('creato_il'),
      supabase.from('fogli_firma').select('id, titolo, scadenza, dato_il').is('consegnato_il', null).order('scadenza'),
      supabase.from('serate').select('cartella_il, borsa_il').eq('data', R.iso(oggi)).maybeSingle(),
    ]);
    if (c.error || f.error) return setErrore('Non riesco a leggere la sera. Riprova tra poco.');
    setCompiti(c.data as unknown as Compito[]);
    setFogli(f.data ?? []);
    setSerata({ cartella: !!s.data?.cartella_il, borsa: !!s.data?.borsa_il });
  }, [R.iso(oggi)]);

  useEffect(() => {
    carica();
  }, [carica]);

  // La spunta si vede subito (subito()); per 5 secondi si può annullare, poi parte l'invio.
  // Se il salvataggio fallisce, carica() la toglie.
  const attesa = useAnnulla();
  function spunta(chiave: string, subito: () => void, azione: () => PromiseLike<{ error: unknown }>, tipo: string, id: string) {
    subito();
    setErrore('');
    attesa.avvia(chiave, () => invia(azione, tipo, id));
  }
  async function invia(azione: () => PromiseLike<{ error: unknown }>, tipo: string, id: string) {
    const { error } = await azione();
    if (error) {
      setErrore('Spunta non salvata. Riprova.');
      return carica();
    }
    await passi(tipo, id);
    carica();
  }
  const chiudiSerata = (campo: 'cartella' | 'borsa') =>
    spunta(
      campo,
      () => setSerata((s) => ({ ...s, [campo]: true })),
      () => supabase.from('serate').upsert({ data: R.iso(oggi), ...(campo === 'cartella' ? { cartella_il: adesso() } : { borsa_il: adesso() }) }),
      'serata',
      R.iso(oggi),
    );

  if (!compiti)
    return errore ? (
      <section className="schermo">
        <div className="carta errore-carta" role="alert">
          <p>{errore}</p>
          <button className="secondario" onClick={carica}>
            Riprova
          </button>
        </div>
      </section>
    ) : (
      // intestazione subito (Lighthouse, 13/11); il giorno può cambiare solo nella chiusura breve del ven/sab
      <section className="schermo sera">
        <Testata sfondo="sera" posa="lani-assonnata" misura={84} piccola sopra={`${maiuscola(GIORNI[oggi.getDay()])} sera`} titolo={`Pronta per ${GIORNI[domani.getDay()]}?`} />
      </section>
    );

  const conCartella = R.cartellaConta(oggi);
  const sport = impegni.find((i) => C.tipoImpegno(i.titolo) !== 'famiglia');
  const famiglia = impegni.find((i) => C.tipoImpegno(i.titolo) === 'famiglia');
  // la borsa conta (passi e chiavi) solo prima dello sport del lunedì e del venerdì (23/11):
  // gli altri giorni resta come promemoria, fuori dal conto delle cose pronte
  const conBorsa = !!sport && R.borsaConta(domaniCal, true);
  // venerdì e sabato con partita il giorno dopo: chiusura breve con la sola borsa (decisione 8/11)
  const soloBorsa = !conCartella && C.partitaTra(impegni);
  const visti = soloBorsa ? [] : compiti;
  const fogliVisti = soloBorsa ? [] : fogli;
  const cose = visti.length + fogliVisti.length + (conCartella ? 1 : 0) + (conBorsa ? 1 : 0);
  const fatte =
    visti.filter((c) => c.fatto_il).length +
    fogliVisti.filter((f) => f.dato_il).length +
    (conCartella && serata.cartella ? 1 : 0) +
    (conBorsa && serata.borsa ? 1 : 0);
  const mancanti = compiti.filter((c) => !c.fatto_il).length;
  // v2: un segmento per carta (compiti, cartella, borsa) nel colore del suo gettone
  const compitiFatti = visti.every((c) => c.fatto_il) && fogliVisti.every((f) => f.dato_il);
  const segmenti: { g: Gettone; fatto: boolean }[] = [
    ...(visti.length + fogliVisti.length > 0 ? [{ g: 'compiti' as Gettone, fatto: compitiFatti }] : []),
    ...(conCartella ? [{ g: 'cartella' as Gettone, fatto: serata.cartella }] : []),
    ...(conBorsa ? [{ g: 'borsa' as Gettone, fatto: serata.borsa }] : []),
  ];
  const tuttoPronto = segmenti.length > 0 && segmenti.every((x) => x.fatto);

  return (
    <section className="schermo sera">
      <Testata
        sfondo="sera"
        posa="lani-assonnata"
        misura={84}
        piccola
        sopra={`${maiuscola(GIORNI[oggi.getDay()])} sera`}
        titolo={`Pronta per ${GIORNI[(soloBorsa ? domaniCal : domani).getDay()]}?`}
        riga={
          cose > 0 && (
            <>
              <div className="segmenti-sera" style={{ gridTemplateColumns: `repeat(${segmenti.length}, minmax(0, 1fr))` }} role="progressbar" aria-label="Cose pronte per domani" aria-valuemin={0} aria-valuemax={segmenti.length} aria-valuenow={segmenti.filter((x) => x.fatto).length}>
                {segmenti.map((x) => (
                  <span key={x.g} style={{ background: x.fatto ? GETTONI[x.g].segno : 'rgba(255,255,255,0.18)' }} />
                ))}
              </div>
              <p className="conto">
                {segmenti.filter((x) => x.fatto).length} su {segmenti.length} pronte.{fatte < cose && ' Chiudi tutto e Bart va a dormire.'}
              </p>
            </>
          )
        }
      />
      {errore && <p role="alert">{errore}</p>}
      {tuttoPronto && (
        <section className="buonanotte" aria-label="Tutto pronto">
          <Sticker posa="bart-sonnecchia" misura={76} />
          <div>
            <b>Buonanotte!</b>
            <span>Domani è tutto pronto. Bart dorme.</span>
          </div>
        </section>
      )}

      {!soloBorsa && compiti.length > 0 && mancanti === 0 && <Chiusa titolo="Compiti" gettone="compiti" dopo="fatti" />}
      {!soloBorsa && !(compiti.length > 0 && mancanti === 0) && (
      <div className="carta">
        <TestaSera titolo="Compiti" gettone="compiti" conto={compiti.length ? `${compiti.length - mancanti} di ${compiti.length}` : undefined} />
        {compiti.length === 0 && <p>Nessun compito su Nuvola per domani.</p>}
        <ul className="spunte">
          {compiti.map((c) => (
            <RigaCompito
              key={c.id}
              c={c}
              onSpunta={() => {
                const segna = (fatto_il: string | null) => setCompiti((l) => l?.map((x) => (x.id === c.id ? { ...x, fatto_il } : x)));
                segna(adesso());
                attesa.avvia(c.id, () => spuntaCompito(c.id, segna, setErrore).then(carica));
              }}
              onAnnulla={
                attesa.inAttesa(c.id)
                  ? () => attesa.annulla(c.id, () => setCompiti((l) => l?.map((x) => (x.id === c.id ? { ...x, fatto_il: null } : x))))
                  : undefined
              }
              chip
            />
          ))}
        </ul>
        {mancanti > 0 && (
          <p className="lady-riga">
            <Sticker posa="lady-compiti" misura={64} />
            <span>Lady si è sdraiata sui compiti: {mancanti === 1 ? 'ne manca uno' : `ne mancano ${mancanti}`}.</span>
          </p>
        )}
      </div>
      )}

      {conCartella && (
        <Voci
          titolo="Cartella"
          valore={R.CONFIG.passi.obbligatori.cartella}
          voci={orario.length ? orario : [`Cartella pronta per ${GIORNI[domani.getDay()]}`]}
          pronta={serata.cartella}
          quandoPronta={() => chiudiSerata('cartella')}
          gettone="cartella"
          conPallini
          onAnnulla={attesa.inAttesa('cartella') ? () => attesa.annulla('cartella', () => setSerata((s) => ({ ...s, cartella: false }))) : undefined}
        />
      )}

      {sport && !conBorsa && (
        <div className="carta tratteggiata promemoria-borsa">
          <h2>Ricordati la borsa</h2>
          <p className="nota accento">
            {C.tipoImpegno(sport.titolo) === 'partita' ? 'Partita' : 'Allenamento'} domani alle {C.oraRoma(sport.inizio)}
            {R.giornoDiScuola(domaniCal) && C.oraRoma(sport.inizio) < PRIMA_DI_USCIRE_DA_SCUOLA ? ': la porti a scuola.' : '.'}
          </p>
        </div>
      )}
      {sport && conBorsa && (
        <Voci
          titolo="Borsa"
          valore={conBorsa ? R.CONFIG.passi.obbligatori.borsa : null}
          voci={VOCI_BORSA}
          pronta={serata.borsa}
          quandoPronta={() => chiudiSerata('borsa')}
          gettone="borsa"
          onAnnulla={attesa.inAttesa('borsa') ? () => attesa.annulla('borsa', () => setSerata((s) => ({ ...s, borsa: false }))) : undefined}
        >
          <p className="nota accento">
            {C.tipoImpegno(sport.titolo) === 'partita' ? 'Partita' : 'Allenamento'} domani alle {C.oraRoma(sport.inizio)}
            {R.giornoDiScuola(domaniCal) && C.oraRoma(sport.inizio) < PRIMA_DI_USCIRE_DA_SCUOLA ? ': la porti a scuola.' : '.'}
          </p>
        </Voci>
      )}

      {fogliVisti.length > 0 && (
        <div className="carta tratteggiata">
          <h2>Da far firmare</h2>
          <ul className="spunte">
            {fogli.map((f) => (
              <li key={f.id} className="foglio">
                <span>{f.titolo}</span>
                {attesa.inAttesa(f.id) ? (
                  <button className="lampadina annulla" onClick={() => attesa.annulla(f.id, () => setFogli((l) => l.map((x) => (x.id === f.id ? { ...x, dato_il: null } : x))))}>
                    Annulla
                  </button>
                ) : f.dato_il ? (
                  <span className="dato">Dato, aspetta la firma</span>
                ) : (
                  <button
                    className="secondario compatto"
                    onClick={() =>
                      spunta(
                        f.id,
                        () => setFogli((l) => l.map((x) => (x.id === f.id ? { ...x, dato_il: adesso() } : x))),
                        () => supabase.from('fogli_firma').update({ dato_il: adesso() }).eq('id', f.id),
                        'foglio',
                        f.id,
                      )
                    }
                  >
                    L'ho dato
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {famiglia && (
        <p className="famiglia nota-famiglia con-persona">
          <Sticker posa={posaPersona(famiglia.titolo)} misura={56} />
          <span>
            Domani in famiglia: {famiglia.titolo}
            {famiglia.tutto_il_giorno ? '' : ` alle ${C.oraRoma(famiglia.inizio)}`}. Tienilo a mente per la cartella e la sveglia.
          </span>
        </p>
      )}

      {/* la sera prima di una verifica; se no a chiusura finita (al massimo una frase al giorno) */}
      <Frase momento={verificaDomani ? 'verifica' : cose > 0 && fatte === cose ? 'chiusura' : null} />
    </section>
  );
}
