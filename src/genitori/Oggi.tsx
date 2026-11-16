import { useEffect, useState } from 'react';
import { CalendarBlank, Camera, FileText, PencilSimple, ThumbsUp, TreasureChest, Volleyball } from '@phosphor-icons/react';
import * as R from '../lib/regole';
import { Attesa, AreaTesto, Elenco, Foglio, Riga, Vuoto } from '../kit';
import { Fotografa, SELECT_RICHIESTE, descrizione, type RichiestaFoto } from '../Foto';
import { CampiRisultato, approvaPartita, partiteDaApprovare, rifiutaPartita, type PartitaDaApprovare } from '../Partita';
import { FoglioAssenza, FoglioSposta, caricaVerifiche, daRecuperare, giorniDiScuola, type Verifica } from '../Assenze';
import { BALLA_MAX, FRASI_BALLA, SGRIDATE, VOCI_GESTI, bello, meno, notaBalla, oraRoma, piu, type Props } from './comune';

// Oggi (si apre qui): cosa c'è da fare per i genitori, le due azioni di ogni giorno, Lani in tre righe.

type Richiesta = RichiestaFoto & { compiti: { scadenza: string } | null; verifiche: { data: string } | null };
type Foglio_ = { id: string; titolo: string; scadenza: string | null };
type Dati = {
  partite: PartitaDaApprovare[];
  fogli: Foglio_[];
  foto: Richiesta[];
  forzieri: { n: number; premio: string | null }[];
  verifiche: Verifica[];
  assenze: string[];
  gestiOggi: number;
  date: { id: string; voce: string }[];
  passiOggi: number;
  serata: { chiusa_il: string | null } | null;
  chiusura: string | null;
  /** quando Lani ha chiuso la serata di ieri, se l'ha chiusa: il fatto vero per "Una cosa da dirle oggi" */
  ieriChiusa: string | null;
};

export default function Oggi({ client, passi, avvisa, conta }: Props & { conta: (n: number) => void }) {
  const oggi = R.iso(R.giornoRoma(new Date()));
  const [d, setD] = useState<Dati>();
  const [foglio, setFoglio] = useState<'passi' | 'segna' | 'casa' | { partita: PartitaDaApprovare } | { forziere: number } | { verifica: Verifica } | { firma: Foglio_ }>();

  async function carica() {
    const [pa, re, fo, rf, fz, ve, gm, gc, mp, se, im, ie] = await Promise.all([
      partiteDaApprovare(client),
      client.from('impostazioni').select('valore').eq('chiave', R.CHIAVE_R_EVOLUTION).maybeSingle(),
      client.from('fogli_firma').select('id, titolo, scadenza').not('dato_il', 'is', null).is('consegnato_il', null).order('scadenza'),
      client.from('richieste_foto').select(`${SELECT_RICHIESTE}, compiti(scadenza), verifiche(data)`).eq('stato', 'aperta').order('creato_il'),
      client.from('forzieri').select('n, premio').eq('stato', 'aperto').order('n'),
      caricaVerifiche(client),
      client.from('movimenti_passi').select('passi, riferimento, motivo').in('motivo', ['gesto', 'storno']).eq('giorno', oggi),
      client.from('gesti_casa').select('id, voce').eq('data', oggi),
      client.from('movimenti_passi').select('passi').eq('giorno', oggi),
      client.from('serate').select('chiusa_il').eq('data', oggi).maybeSingle(),
      client.from('impostazioni').select('valore').eq('chiave', 'ora_chiusura').maybeSingle(),
      client.from('serate').select('chiusa_il').eq('data', R.iso(piu(R.giorno(oggi), -1))).maybeSingle(),
    ]);
    const mov = gm.data ?? [];
    // gesti dati oggi e non annullati (storno "gesto:<id>")
    const annullati = new Set(mov.filter((m) => m.motivo === 'storno').map((m) => String(m.riferimento).replace(/^gesto:/, '')));
    const presi = new Set(mov.filter((m) => m.motivo === 'gesto' && m.passi > 0).map((m) => String(m.riferimento)));
    const nuovi: Dati = {
      // le partite le segna Lani solo con R-Evolution accesa
      partite: R.rEvolutionAttiva(R.giorno(oggi), typeof re.data?.valore === 'string' ? re.data.valore : null) ? pa : [],
      fogli: fo.data ?? [],
      foto: (rf.data ?? []) as unknown as Richiesta[],
      forzieri: fz.data ?? [],
      ...ve,
      // ponytail: il tetto lo conta il server sui gesti dati, anche se poi annullati; qui lo stesso
      gestiOggi: mov.filter((m) => m.motivo === 'gesto').reduce((a, m) => a + m.passi, 0),
      date: (gc.data ?? []).filter((g) => presi.has(g.id) && !annullati.has(g.id)),
      passiOggi: (mp.data ?? []).reduce((a, m) => a + m.passi, 0),
      serata: se.data ?? null,
      chiusura: (im.data?.valore as Record<string, string> | undefined)?.[R.giorno(oggi).getDay()] ?? null,
      ieriChiusa: ie.data?.chiusa_il ?? null,
    };
    setD(nuovi);
    conta(daFare(nuovi).length);
  }
  useEffect(() => {
    carica();
  }, []);
  const fatto = (s: string) => (avvisa(s), carica());

  if (!d) return <Attesa />;
  const ora = oraRoma();
  const recuperi = d.verifiche.filter((v) => daRecuperare(v, d.assenze));
  const prossima = d.verifiche.filter((v) => v.data >= oggi && !d.assenze.includes(v.data)).sort((a, b) => a.data.localeCompare(b.data))[0];
  const aCasaOggi = d.assenze.includes(oggi);
  const chiediCasa = ora < '14:00' && !aCasaOggi && giorniDiScuola(oggi, oggi).length > 0;
  const tetto = R.CONFIG.passi.gesti_casa.tetto_giornaliero;

  async function consegna(n: number) {
    const { error } = await client.from('forzieri').update({ stato: 'consegnato', consegnato_il: new Date().toISOString() }).eq('n', n);
    if (error) return avvisa(`Forziere ${n}: consegna non salvata.`, () => consegna(n));
    fatto(`Forziere ${n}: consegnato.`);
  }
  async function firmato(f: Foglio_) {
    const { error } = await client.from('fogli_firma').update({ consegnato_il: new Date().toISOString() }).eq('id', f.id);
    if (error) return avvisa(`${f.titolo}: firma non salvata.`, () => firmato(f));
    const p = await passi('foglio', f.id);
    fatto(p ? `${f.titolo}: firmato, +${p} a Lani.` : `${f.titolo}: firmato.`);
  }

  const righe = daFare(d);
  return (
    <>
      <section className="ga-sezione" aria-labelledby="da-fare">
        <h2 id="da-fare">
          Da fare per voi {righe.length > 0 && <span className="ga-conta">{righe.length}</span>}
        </h2>
        {righe.length === 0 && d.foto.length === 0 ? (
          <Vuoto titolo="Niente da fare per voi" testo="Partite, fogli, foto e forzieri sono a posto." />
        ) : righe.length > 0 && (
          <Elenco etichetta="Da fare per voi">
            {d.partite.map((p) => (
              <Riga
                key={p.id}
                icona={<Volleyball size={20} weight="bold" aria-hidden />}
                titolo={`Partita: ${p.avversaria} ${p.set_nostri}‑${p.set_loro}`}
                sotto={`${bello(p.data)} · l'ha segnata Lani`}
                azione={
                  <button type="button" className="ga-btn" onClick={() => setFoglio({ partita: p })}>
                    Approva
                  </button>
                }
              />
            ))}
            {d.fogli.map((f) => (
              <Riga
                key={f.id}
                colore="rosa"
                icona={<FileText size={20} weight="bold" aria-hidden />}
                titolo={f.titolo}
                sotto={`Lani dice di averlo dato${f.scadenza ? ` · entro ${bello(f.scadenza)}` : ''}`}
                azione={
                  <button type="button" className="ga-btn" onClick={() => setFoglio({ firma: f })}>
                    Firmato
                  </button>
                }
              />
            ))}
            {d.forzieri.map((f) => (
              <Riga
                key={f.n}
                colore="burro"
                icona={<TreasureChest size={20} weight="bold" aria-hidden />}
                titolo={`Forziere ${f.n} aperto`}
                sotto={f.premio ?? 'Premio da dare'}
                azione={
                  <button type="button" className="ga-btn" onClick={() => setFoglio({ forziere: f.n })}>
                    Consegnato
                  </button>
                }
              />
            ))}
            {recuperi.map((v) => (
              <Riga
                key={v.id}
                icona={<CalendarBlank size={20} weight="bold" aria-hidden />}
                titolo={`${v.materie?.nome ?? 'Verifica'} da recuperare`}
                sotto={`Verifica di ${bello(v.data)}, ancora senza data`}
                azione={
                  <button type="button" className="ga-btn" onClick={() => setFoglio({ verifica: v })}>
                    Metti data
                  </button>
                }
              />
            ))}
          </Elenco>
        )}
        {d.foto.length > 0 && (
          <>
          <p className="ga-nota">Da sapere</p>
          <Elenco etichetta="Da sapere">
            {d.foto.map((r) => {
              // correzione del signore del 16/11: la foto la fa Lani (+2); i genitori solo dalla scadenza o dopo le 20
              const scade = r.compiti?.scadenza ?? r.verifiche?.data;
              const tocca = ora >= '20:00' || (!!scade && scade <= oggi);
              return (
                <Riga
                  key={r.id}
                  colore="burro"
                  icona={<Camera size={20} weight="bold" aria-hidden />}
                  titolo={`Foto: ${descrizione(r)}`}
                  sotto={tocca ? 'Se la fate voi, Lani non prende i passi' : `La fa Lani · +${R.CONFIG.passi.foto_compito}`}
                  azione={tocca ? <Fotografa client={client} richiesta={r} fatto={() => fatto(`Foto salvata: ${descrizione(r)}.`)} /> : undefined}
                />
              );
            })}
          </Elenco>
          </>
        )}
      </section>

      <div className="ga-rapide">
        <button type="button" className="ga-rapida" onClick={() => setFoglio('passi')}>
          <span className="ga-icona">
            <ThumbsUp size={22} weight="bold" aria-hidden />
          </span>
          <b>Dai passi</b>
          <small>
            Gesti di casa · oggi {d.gestiOggi} su {tetto}
          </small>
        </button>
        <button type="button" className="ga-rapida" onClick={() => setFoglio('segna')}>
          <span className="ga-icona">
            <PencilSimple size={22} weight="bold" aria-hidden />
          </span>
          <b>Segna</b>
          <small>Un fatto da correggere</small>
        </button>
      </div>

      <section className="ga-sezione" aria-labelledby="lani-oggi">
        <h2 id="lani-oggi">Lani oggi</h2>
        <dl className="ga-situazione">
          <div>
            <dt>Passi di oggi</dt>
            <dd>{d.passiOggi > 0 ? `+${d.passiOggi}` : meno(d.passiOggi)}</dd>
          </div>
          <div>
            <dt>Serata</dt>
            <dd>{aCasaOggi ? 'a casa da scuola' : d.serata?.chiusa_il ? `chiusa alle ${oraRoma(new Date(d.serata.chiusa_il))}` : d.chiusura ? `da chiudere entro le ${d.chiusura}` : 'niente chiusura oggi'}</dd>
          </div>
          <div>
            <dt>Prossima verifica</dt>
            <dd>{prossima ? `${prossima.materie?.nome ?? 'Verifica'}, ${bello(prossima.data)}` : 'nessuna'}</dd>
          </div>
        </dl>
        {/* una riga da un fatto vero di ieri, che loda il gesto e non la persona; senza il fatto non compare
            (revisione del 16/11, testo da approvare) */}
        {d.ieriChiusa && (
          <p className="ga-nota ga-da-dirle">
            <b>Una cosa da dirle oggi</b>
            Ieri sera ha chiuso tutto alle {oraRoma(new Date(d.ieriChiusa))}. Per esempio: «Ho visto che ieri sera hai chiuso tutto.»
          </p>
        )}
        {chiediCasa && (
          <button type="button" className="ga-domanda" onClick={() => setFoglio('casa')}>
            Lani è a casa oggi?
          </button>
        )}
      </section>

      {foglio === 'passi' && <FoglioPassi {...{ client, passi, avvisa }} date={d.date} gestiOggi={d.gestiOggi} aggiorna={carica} chiudi={() => setFoglio(undefined)} />}
      {foglio === 'segna' && <FoglioSegna {...{ client, passi, avvisa }} chiudi={() => setFoglio(undefined)} />}
      {foglio === 'casa' && <FoglioAssenza client={client} giorno={oggi} avvisa={fatto} chiudi={() => setFoglio(undefined)} />}
      {typeof foglio === 'object' && 'verifica' in foglio && <FoglioSposta client={client} verifica={foglio.verifica} avvisa={fatto} chiudi={() => setFoglio(undefined)} />}
      {typeof foglio === 'object' && 'firma' in foglio && (
        <Foglio titolo={`${foglio.firma.titolo}: firmato?`} azione="Sì, firmato" conferma={() => (firmato(foglio.firma), setFoglio(undefined))} chiudi={() => setFoglio(undefined)}>
          <p className="ga-nota">Lani prende i passi del foglio consegnato.</p>
        </Foglio>
      )}
      {typeof foglio === 'object' && 'forziere' in foglio && (
        <Foglio titolo={`Forziere ${foglio.forziere}: consegnato?`} azione="Sì, consegnato" conferma={() => (consegna(foglio.forziere), setFoglio(undefined))} chiudi={() => setFoglio(undefined)}>
          <p className="ga-nota">Segnatelo quando Lani ha avuto il premio.</p>
        </Foglio>
      )}
      {typeof foglio === 'object' && 'partita' in foglio && (
        <FoglioPartita
          partita={foglio.partita}
          approva={async (f) => (setFoglio(undefined), fatto(await approvaPartita(client, passi, foglio.partita, f)))}
          rifiuta={async () => (setFoglio(undefined), fatto(await rifiutaPartita(client, foglio.partita)))}
          chiudi={() => setFoglio(undefined)}
        />
      )}
    </>
  );
}

/** Le righe di "Da fare per voi": quello che aspetta i genitori (le foto le fa Lani: stanno sotto, in "Da sapere"). */
function daFare(d: Dati) {
  return [...d.partite, ...d.fogli, ...d.forzieri, ...d.verifiche.filter((v) => daRecuperare(v, d.assenze))];
}

function FoglioPartita({ partita: p, approva, rifiuta, chiudi }: { partita: PartitaDaApprovare; approva: (f: FormData) => void; rifiuta: () => void; chiudi: () => void }) {
  return (
    <Foglio titolo={`Partita con ${p.avversaria}`} azione="Approva" conferma={approva} chiudi={chiudi}>
      <p className="ga-nota">{bello(p.data)} · l'ha segnata Lani. Correggete se serve, poi approvate: i passi arrivano adesso.</p>
      <CampiRisultato nostri={p.set_nostri} loro={p.set_loro} inCampo={p.in_campo ?? true} />
      <button type="button" className="ga-btn largo" onClick={rifiuta}>
        Rifiuta: non si è giocata
      </button>
    </Foglio>
  );
}

/**
 * "Dai passi": il foglio resta aperto per più gesti di fila; ogni gesto si può annullare per qualche
 * secondo con lo storno di oggi (storna_spunta, come una spunta tolta) e il popup del +2 segnato come
 * già visto, così Lani non lo vede.
 */
function FoglioPassi({ client, passi, date, gestiOggi, aggiorna, chiudi }: Props & { date: { voce: string }[]; gestiOggi: number; aggiorna: () => void; chiudi: () => void }) {
  const tetto = R.CONFIG.passi.gesti_casa.tetto_giornaliero;
  const [lavoro, setLavoro] = useState<string>();
  // l'ultimo gesto dato, con "Annulla", dentro il foglio (fuori dal foglio modale non si tocca)
  const [ultimo, setUltimo] = useState<{ testo: string; annulla?: () => void }>();
  const pieno = gestiOggi >= tetto;

  async function annulla(id: string, nome: string) {
    setUltimo(undefined);
    const { error } = await client.rpc('storna_spunta', { p_motivo: 'gesto', p_riferimento: id });
    if (error) return setUltimo({ testo: 'Non annullato. Riprova.' });
    await client.from('popup_coda').update({ mostrato_il: new Date().toISOString() }).eq('chiave', `gesto:${id}`).is('mostrato_il', null);
    setUltimo({ testo: `${nome}: annullato.` });
    aggiorna();
  }
  async function gesto(voce: string, nome: string) {
    setLavoro(voce);
    const { data, error } = await client.from('gesti_casa').insert({ voce }).select('id').single();
    if (error || !data) {
      setLavoro(undefined);
      return setUltimo({ testo: 'Non salvato. Riprova.' });
    }
    const p = await passi('gesto', data.id);
    setLavoro(undefined);
    setUltimo(p ? { testo: `${nome}: +${p} a Lani.`, annulla: () => annulla(data.id, nome) } : { testo: `${nome}: oggi il tetto dei gesti è già pieno.` });
    aggiorna();
  }

  return (
    <Foglio titolo="Dai passi" chiudi={chiudi} chiudiTesto="Fatto">
      <p className="ga-nota">
        Oggi {gestiOggi} su {tetto}. Lani vedrà la vostra faccia col pollice.{pieno ? ' Il tetto di oggi è pieno: domani si riparte.' : ''}
      </p>
      <div className="ga-opzioni">
        {VOCI_GESTI.map(([v, nome]) => {
          const gia = date.some((g) => g.voce === v);
          return (
            <button key={v} type="button" className="ga-opzione" aria-pressed={gia} disabled={pieno || gia || lavoro === v} onClick={() => gesto(v, nome)}>
              {nome}
              <span className="valore">{gia ? 'dato oggi' : `+${R.CONFIG.passi.gesti_casa.voci[v]}`}</span>
            </button>
          );
        })}
      </div>
      {ultimo && (
        <p className="ga-ultimo" role="status">
          {ultimo.testo}
          {ultimo.annulla && (
            <button type="button" onClick={ultimo.annulla}>
              Annulla
            </button>
          )}
        </p>
      )}
    </Foglio>
  );
}

/** "Segna": scelta, per la balla una frase pronta o il testo libero (al massimo 80 caratteri), conferma col numero. */
function FoglioSegna({ client, passi, avvisa, chiudi }: Props & { chiudi: () => void }) {
  const [tipo, setTipo] = useState<R.TipoSgridata>();
  const [frase, setFrase] = useState<string>(FRASI_BALLA[0][1]);
  const [libero, setLibero] = useState('');
  const altro = frase === '';
  const balla = altro ? notaBalla(libero) : { nota: frase };
  const pronto = !!tipo && (tipo !== 'balla' || 'nota' in balla);
  const dopo21 = oraRoma() >= '21:00';
  const nome = SGRIDATE.find(([t]) => t === tipo)?.[1] ?? '';

  async function segna() {
    if (!tipo) return;
    chiudi();
    const nota = tipo === 'balla' && 'nota' in balla ? balla.nota : null;
    const { data, error } = await client.from('sgridate').insert({ tipo, nota }).select('id').single();
    if (error || !data) return avvisa(`${nome}: non segnata.`, segna);
    const p = await passi('sgridata', data.id);
    avvisa(p ? `${nome}: ${meno(p)} passi.` : `${nome}: segnata.`);
  }

  return (
    <Foglio titolo="Segna" azione={tipo ? `Segna ${meno(R.passiSgridata(tipo))}` : 'Segna'} pronto={pronto} conferma={segna} chiudi={chiudi}>
      <div className="ga-opzioni">
        {/* scelta una voce, le altre si chiudono: una decisione alla volta ("Cambia voce" le riapre) */}
        {SGRIDATE.filter(([t]) => !tipo || t === tipo).map(([t, n, cosa]) => (
          <button key={t} type="button" className="ga-opzione" aria-pressed={tipo === t} onClick={() => setTipo(t)}>
            <span className="ga-opzione-testo">
              {n}
              {!tipo && <small>{cosa}</small>}
            </span>
            <span className="valore">{meno(R.passiSgridata(t))}</span>
          </button>
        ))}
        {tipo && (
          <button type="button" className="ga-domanda" onClick={() => setTipo(undefined)}>
            Cambia voce
          </button>
        )}
      </div>
      {tipo === 'balla' && (
        <fieldset className="ga-campo ga-frasi">
          <legend className="ga-etichetta">Che cosa non era vero</legend>
          {FRASI_BALLA.map(([perVoi, perLani]) => (
            <label key={perVoi} className="ga-radio">
              <input type="radio" name="frase" checked={frase === perLani} onChange={() => setFrase(perLani)} />
              <span>{perVoi}</span>
            </label>
          ))}
          <label className="ga-radio">
            <input type="radio" name="frase" checked={altro} onChange={() => setFrase('')} />
            <span>Lo scrivo io</span>
          </label>
          {altro && (
            <AreaTesto
              etichetta="Per Lani, con il tu"
              aiuto={`Lo legge nel popup. ${libero.length}/${BALLA_MAX}`}
              errore={libero && 'errore' in balla ? balla.errore : undefined}
              value={libero}
              maxLength={BALLA_MAX}
              rows={2}
              onChange={(e) => setLibero(e.target.value)}
            />
          )}
        </fieldset>
      )}
      {tipo && dopo21 && <p className="ga-avviso">Sono le {oraRoma()}: Lani lo vede domattina.</p>}
    </Foglio>
  );
}
