import { useEffect, useState, type FormEvent } from 'react';
import { Backpack, Bag, CalendarBlank, Check, FileText, House } from '@phosphor-icons/react';
import * as R from '../lib/regole';
import { mediaGenerale } from '../lib/media';
import { Attesa, CampoData, CampoTesto, Elenco, Foglio, Riga, Vuoto } from '../kit';
import { FotoSalvate } from '../Foto';
import { PartiteFipav } from '../Partita';
import { FoglioAssenza, SpostaVerifiche, togliAssenza } from '../Assenze';
import { GIORNI } from '../spunte';
import { bello, piu, type Props } from './comune';
import Riepilogo from './Riepilogo';
import { StoricoTutor } from './Tutor';
import { Barre, Griglia } from '../Settimana';
import { avvisaPassi, useSettimana } from '../settimana';

// Settimana: giorno per giorno compiti e spunte (con "Togli" sul posto) e "Lani a casa"; sotto
// verifiche, partite, fogli da firmare e foto salvate. Assorbe Correzioni, Fogli e Lani a casa.

type Compito = { id: string; testo: string; scadenza: string; scadenza_spostata: string | null; fatto_il: string | null; materie: { nome: string } | null };
type Foglio_ = { id: string; titolo: string; scadenza: string | null; dato_il: string | null };
type Sera = { data: string; cartella_il: string | null; borsa_il: string | null };
type Segnato = { motivo: string; riferimento: string; passi: number; giorno: string };
type Dati = { media: number | null; obiettivo: number; note: number; serate: string[]; sere: Sera[]; chiusura: Record<string, string>; compiti: Compito[]; assenze: string[]; fogli: Foglio_[]; rEvolutionDa: string | null; segnati: Segnato[] };
const quando = (c: Compito) => c.scadenza_spostata ?? c.scadenza;
// Tutto quello che Lani segna e le dà passi, oltre a compiti e sera (che hanno il loro Togli sopra).
// Togli = storno dei passi (storna_spunta) e, dove c'è, la spunta rimessa a zero.
const SEGNATI: Record<string, string> = {
  dieci_minuti: 'Dieci minuti di allenamento',
  foglio: 'Foglio consegnato',
  ripasso: 'Ripasso per la verifica',
  pillola: 'Pillola del giorno',
  flashcard: 'Giro di flash card',
  quiz: 'Quiz',
  matematica: 'Serie di matematica',
  video: 'Video',
  foto: 'Foto delle pagine',
  partita: 'Partita',
  partita_vinta: 'Partita vinta',
};

export default function Settimana({ client, passi, avvisa }: Props) {
  const oggi = R.giornoRoma(new Date());
  const lun = R.lunedi(oggi);
  const dom = piu(lun, 6);
  const [giorno, setGiorno] = useState(R.iso(oggi));
  const [d, setD] = useState<Dati>();
  const [vista, setVista] = useState<'foglio'>();
  // le due barre e la griglia di Lani (23/11): lo stesso calcolo delle chiavi della domenica
  const sett = useSettimana(client);
  const [chiede, setChiede] = useState<'casa' | 'togliCasa' | { togli: Compito } | { sera: 'cartella' | 'borsa' } | { firma: Foglio_ } | { foto: () => void } | { revoca: Segnato }>();

  async function carica() {
    const [v, o, n, s, c, a, f, re, ch, mp] = await Promise.all([
      client.from('voti').select('materia_id, voto, peso, fa_media'),
      client.from('impostazioni').select('valore').eq('chiave', 'obiettivo_media').maybeSingle(),
      client.from('note').select('id', { count: 'exact', head: true }).gte('data', R.iso(lun)).lte('data', R.iso(dom)),
      client.from('serate').select('data, cartella_il, borsa_il').gte('data', R.iso(lun)).lte('data', R.iso(dom)),
      // ponytail: per scadenza; una spunta della domenica per un compito del lunedì dopo non compare (la settimana chiude la domenica sera)
      client.from('compiti').select('id, testo, scadenza, scadenza_spostata, fatto_il, materie(nome)').gte('scadenza', R.iso(piu(lun, -7))).lte('scadenza', R.iso(dom)),
      client.from('assenze').select('giorno').gte('giorno', R.iso(lun)).lte('giorno', R.iso(dom)),
      client.from('fogli_firma').select('id, titolo, scadenza, dato_il').is('consegnato_il', null).order('scadenza'),
      client.from('impostazioni').select('valore').eq('chiave', R.CHIAVE_R_EVOLUTION).maybeSingle(),
      client.from('impostazioni').select('valore').eq('chiave', 'ora_chiusura').maybeSingle(),
      client.from('movimenti_passi').select('motivo, riferimento, passi, giorno').gte('giorno', R.iso(lun)).lte('giorno', R.iso(dom)).in('motivo', [...Object.keys(SEGNATI), 'storno']),
    ]);
    const righe = (mp.data ?? []) as Segnato[];
    // uno storno arriva il giorno in cui si toglie: basta che sia della stessa settimana (le chiavi chiudono la domenica)
    const stornati = new Set(righe.filter((x) => x.motivo === 'storno').map((x) => x.riferimento));
    setD({
      media: mediaGenerale(v.data ?? []),
      obiettivo: Number(o.data?.valore ?? 7.35),
      note: n.count ?? 0,
      serate: (s.data ?? []).filter((x) => x.cartella_il).map((x) => x.data as string),
      sere: (s.data ?? []) as Sera[],
      chiusura: (ch.data?.valore as Record<string, string> | undefined) ?? {},
      compiti: (c.data ?? []) as unknown as Compito[],
      assenze: (a.data ?? []).map((x) => x.giorno as string),
      fogli: f.data ?? [],
      rEvolutionDa: typeof re.data?.valore === 'string' ? re.data.valore : null,
      segnati: righe.filter((x) => x.motivo !== 'storno' && x.passi > 0 && !stornati.has(`${x.motivo}:${x.riferimento}`)),
    });
  }
  useEffect(() => {
    carica();
  }, []);
  // dopo un Togli o una spunta dei genitori si ricarica: anche le barre si rileggono
  const ricarica = () => carica().then(avvisaPassi);
  const fatto = (s: string) => (avvisa(s), ricarica());

  async function togli(c: Compito) {
    setChiede(undefined);
    const { data: stornato, error } = await client.rpc('storna_spunta', { p_motivo: 'compito', p_riferimento: c.id });
    if (error) return avvisa(`${c.materie?.nome ?? 'Compito'}: spunta non tolta.`, () => togli(c));
    const { data: u } = await client.auth.getUser();
    const { error: e2 } = await client.from('compiti').update({ fatto_il: null, corretto_da: u.user?.id, corretto_il: new Date().toISOString() }).eq('id', c.id);
    // lo storno è già fatto e si può ripetere: basta ritoccare Togli
    if (e2) return avvisa('Passi annullati, ma la spunta è rimasta.', () => togli(c));
    fatto(stornato ? 'Spunta tolta e passi annullati.' : 'Spunta tolta (i passi erano già chiusi con le chiavi della settimana).');
  }
  /** Cartella o borsa segnate ma non fatte: via i passi (storno) e via la spunta, così la sera non conta per le chiavi. */
  async function togliSera(cosa: 'cartella' | 'borsa') {
    setChiede(undefined);
    const nome = cosa === 'cartella' ? 'Cartella' : 'Borsa';
    const { data: stornato, error } = await client.rpc('storna_spunta', { p_motivo: cosa, p_riferimento: `serata:${giorno}` });
    if (error) return avvisa(`${nome}: spunta non tolta.`, () => togliSera(cosa));
    const { error: e2 } = await client.from('serate').update({ [`${cosa}_il`]: null }).eq('data', giorno);
    if (e2) return avvisa('Passi annullati, ma la spunta è rimasta.', () => togliSera(cosa));
    fatto(stornato ? `${nome}: spunta tolta e passi annullati.` : `${nome}: spunta tolta.`);
  }
  /** Qualunque altra cosa segnata da Lani: via i passi e, dove c'è, via la spunta (così può rifarla). */
  async function revoca(m: Segnato) {
    setChiede(undefined);
    const nome = SEGNATI[m.motivo] ?? m.motivo;
    const { data: stornato, error } = await client.rpc('storna_spunta', { p_motivo: m.motivo, p_riferimento: m.riferimento });
    if (error) return avvisa(`${nome}: non tolto.`, () => revoca(m));
    let e2 = null;
    if (m.motivo === 'dieci_minuti') {
      ({ error: e2 } = await client.from('serate').update({ dieci_minuti_da: null, dieci_minuti_il: null, dieci_minuti_esercizio: null }).eq('data', m.riferimento.split(':')[1]));
    } else if (m.motivo === 'foglio') {
      ({ error: e2 } = await client.from('fogli_firma').update({ dato_il: null, consegnato_il: null }).eq('id', m.riferimento));
    }
    if (e2) return avvisa('Passi annullati, ma la spunta è rimasta.', () => revoca(m));
    fatto(stornato ? `${nome}: tolto, passi annullati.` : `${nome}: i passi erano già chiusi con le chiavi della settimana.`);
  }
  async function firma(f: Foglio_) {
    setChiede(undefined);
    const { error } = await client.from('fogli_firma').update({ consegnato_il: new Date().toISOString() }).eq('id', f.id);
    if (error) return avvisa(`${f.titolo}: firma non salvata.`, () => firma(f));
    const p = await passi('foglio', f.id);
    if (p === null) return avvisa(`${f.titolo}: firmato, ma i passi non sono arrivati.`, () => firma(f));
    fatto(p ? `${f.titolo}: firmato, +${p} a Lani.` : `${f.titolo}: firmato.`);
  }
  async function aggiungi(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    nuovo(String(f.get('titolo')).trim(), String(f.get('scadenza') ?? '') || null);
  }
  async function nuovo(titolo: string, scadenza: string | null) {
    const { error } = await client.from('fogli_firma').insert({ titolo, scadenza });
    if (error) return avvisa(`${titolo}: foglio non salvato.`, () => nuovo(titolo, scadenza));
    setVista(undefined);
    fatto('Foglio aggiunto: Lani lo vede la sera, nella cartella.');
  }

  if (!d) return <Attesa />;
  const fmt = (x: number | null) => (x === null ? '–' : x.toLocaleString('it-IT', { maximumFractionDigits: 2 }));
  const indietro = (
    <button type="button" className="ga-indietro" onClick={() => setVista(undefined)}>
      ‹ Settimana
    </button>
  );
  if (vista === 'foglio')
    return (
      <>
        {indietro}
        <form className="ga-modulo" onSubmit={aggiungi} aria-labelledby="nuovo-foglio">
          <h2 id="nuovo-foglio">Nuovo foglio da firmare</h2>
          <CampoTesto etichetta="Che foglio è" name="titolo" required maxLength={80} placeholder="Gita, autorizzazione, pagella…" />
          <CampoData etichetta="Entro il" name="scadenza" vuoto="Nessuna scadenza" min={R.iso(oggi)} />
          <button className="ga-btn pieno largo">Aggiungi il foglio</button>
        </form>
      </>
    );

  const giorni = Array.from({ length: 7 }, (_, i) => R.iso(piu(lun, i)));
  const delGiorno = d.compiti.filter((c) => quando(c) === giorno);
  const aCasa = d.assenze.includes(giorno);
  const sera = d.sere.find((s) => s.data === giorno);
  const segnati = d.segnati.filter((m) => m.giorno === giorno);
  const scuola = R.giornoDiScuola(R.giorno(giorno));
  // serate da chiudere finora: i giorni passati con una chiusura, più oggi se è già chiusa
  const oggiIso = R.iso(oggi);
  const attese = giorni.filter((g) => (g < oggiIso && d.chiusura[R.giorno(g).getDay()]) || (g === oggiIso && d.serate.includes(g))).length;
  return (
    <>
      {sett && (
        <section className="ga-sezione carta settimana-genitori" aria-labelledby="settimana-chiavi">
          <h2 id="settimana-chiavi">Verso le chiavi</h2>
          <Barre s={sett} genitori />
          <Griglia s={sett} oggi={oggi} />
          <p className="ga-nota">Le chiavi si contano domenica alle {R.CONFIG.chiavi_settimana.ora_conteggio}. Ogni Togli qui sotto aggiorna le barre.</p>
        </section>
      )}
      <ul className="ga-riassunto" aria-label="La settimana in numeri">
        <li>
          {fmt(d.media)} <span>{d.media === null ? 'media' : `media, ${d.media >= d.obiettivo ? 'sopra' : 'sotto'} l’obiettivo ${fmt(d.obiettivo)}`}</span>
        </li>
        <li>{d.note ? <>{d.note} <span>{d.note === 1 ? 'nota della scuola' : 'note della scuola'}</span></> : <span>Nessuna nota</span>}</li>
        <li>
          {attese ? <>{d.serate.length} su {attese} <span>serate chiuse finora</span></> : <span>Nessuna serata da chiudere finora</span>}
        </li>
      </ul>

      <Riepilogo client={client} />

      <div className="ga-giorni" role="group" aria-label="Giorno della settimana">
        {giorni.map((g) => {
          const data = R.giorno(g);
          const qualcosa = d.compiti.some((c) => quando(c) === g && !c.fatto_il) || d.assenze.includes(g);
          return (
            <button key={g} type="button" aria-pressed={g === giorno} onClick={() => setGiorno(g)}>
              {GIORNI[data.getDay()].slice(0, 3).replace(/^./, (x) => x.toUpperCase())}{' '}
              <small>{data.getDate()}</small>
              {qualcosa && (
                <>
                  <span className="punto" aria-hidden />
                  <span className="solo-lettori">, da guardare</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      <section className="ga-sezione" aria-labelledby="giorno-scelto">
        <h2 id="giorno-scelto">{bello(giorno).replace(/^./, (x) => x.toUpperCase())}</h2>
        {delGiorno.length > 0 ? (
          <Elenco etichetta="Compiti del giorno">
            {delGiorno.map((c) => (
              <Riga
                key={c.id}
                icona={<span className={`ga-spunta${c.fatto_il ? ' si' : ''}`}>{c.fatto_il && <Check size={16} weight="bold" aria-hidden />}</span>}
                colore="lilla"
                titolo={`${c.materie?.nome ?? 'Compito'}: ${c.testo}`}
                sotto={c.fatto_il ? `Spuntato ${bello(R.iso(R.giornoRoma(c.fatto_il)))}` : c.scadenza_spostata ? 'Spostato: era a casa' : 'Da fare'}
                azione={
                  c.fatto_il ? (
                    <button type="button" className="ga-btn tenue" aria-label={`Togli la spunta: ${c.testo}`} onClick={() => setChiede({ togli: c })}>
                      Togli
                    </button>
                  ) : undefined
                }
              />
            ))}
          </Elenco>
        ) : (
          <Vuoto titolo="Nessun compito per questo giorno" />
        )}
        {scuola && (
          <Elenco>
            {aCasa ? (
              <Riga
                icona={<House size={20} weight="bold" aria-hidden />}
                titolo="Lani a casa"
                sotto="Niente chiavi in gioco questo giorno"
                azione={
                  <button type="button" className="ga-btn tenue" onClick={() => setChiede('togliCasa')}>
                    Togli
                  </button>
                }
              />
            ) : (
              <Riga icona={<House size={20} weight="bold" aria-hidden />} titolo={`Lani a casa ${bello(giorno)}`} sotto="Compiti alla lezione dopo, niente chiavi in gioco" vai={() => setChiede('casa')} />
            )}
          </Elenco>
        )}
        {sera && (sera.cartella_il || sera.borsa_il) && (
          <Elenco etichetta="La sera">
            {(['cartella', 'borsa'] as const)
              .filter((cosa) => sera[`${cosa}_il`])
              .map((cosa) => (
                <Riga
                  key={cosa}
                  icona={cosa === 'cartella' ? <Backpack size={20} weight="bold" aria-hidden /> : <Bag size={20} weight="bold" aria-hidden />}
                  titolo={cosa === 'cartella' ? 'Cartella pronta' : 'Borsa pronta'}
                  sotto={`Spuntata alle ${new Date(sera[`${cosa}_il`]!).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })}`}
                  azione={
                    <button type="button" className="ga-btn tenue" aria-label={`Togli la spunta: ${cosa}`} onClick={() => setChiede({ sera: cosa })}>
                      Togli
                    </button>
                  }
                />
              ))}
          </Elenco>
        )}
        {segnati.length > 0 && (
          <Elenco etichetta="Segnato da Lani">
            {segnati.map((m) => (
              <Riga
                key={`${m.motivo}:${m.riferimento}`}
                icona={<span className="ga-spunta si"><Check size={16} weight="bold" aria-hidden /></span>}
                titolo={SEGNATI[m.motivo] ?? m.motivo}
                sotto={`+${m.passi} passi`}
                azione={
                  <button type="button" className="ga-btn tenue" aria-label={`Togli: ${SEGNATI[m.motivo] ?? m.motivo}`} onClick={() => setChiede({ revoca: m })}>
                    Togli
                  </button>
                }
              />
            ))}
          </Elenco>
        )}
      </section>

      <section className="ga-sezione" aria-labelledby="verifiche">
        <h2 id="verifiche">Verifiche in arrivo</h2>
        <SpostaVerifiche client={client} avvisa={avvisa} />
      </section>

      {R.rEvolutionAttiva(oggi, d.rEvolutionDa) && (
        // si usa di rado (correggere in campo / in panchina; il risultato arriva solo dalla FIPAV): chiusa
        <details className="ga-chiusa">
          <summary>Partite</summary>
          <Elenco>
            <PartiteFipav client={client} passi={passi} avvisa={avvisa} />
          </Elenco>
        </details>
      )}

      {/* chiusa se non c'è niente da firmare */}
      <details className="ga-chiusa" open={d.fogli.length > 0}>
        <summary>Fogli da firmare{d.fogli.length > 0 && ` (${d.fogli.length})`}</summary>
        <Elenco>
          {d.fogli.map((f) => (
            <Riga
              key={f.id}
              colore="rosa"
              icona={<FileText size={20} weight="bold" aria-hidden />}
              titolo={f.titolo}
              sotto={`${f.dato_il ? 'Lani dice di averlo dato' : 'Lani non l’ha ancora dato'}${f.scadenza ? ` · entro ${bello(f.scadenza)}` : ''}`}
              azione={
                <button type="button" className="ga-btn" onClick={() => setChiede({ firma: f })}>
                  Firmato
                </button>
              }
            />
          ))}
          <Riga icona={<CalendarBlank size={20} weight="bold" aria-hidden />} titolo="Aggiungi un foglio" vai={() => setVista('foglio')} />
        </Elenco>
      </details>

      <FotoSalvate client={client} avvisa={avvisa} conferma={(si) => setChiede({ foto: si })} />

      <StoricoTutor client={client} />

      {chiede === 'casa' && <FoglioAssenza client={client} giorno={giorno} avvisa={fatto} chiudi={() => setChiede(undefined)} />}
      {chiede === 'togliCasa' && (
        <Foglio titolo={`Togliere l’assenza di ${bello(giorno)}?`} azione="Togli l’assenza" conferma={async () => (setChiede(undefined), fatto(await togliAssenza(client, giorno)))} chiudi={() => setChiede(undefined)}>
          <p className="ga-nota">Quel giorno torna di scuola: chiavi in gioco come sempre. I compiti già spostati restano dove sono.</p>
        </Foglio>
      )}
      {typeof chiede === 'object' && 'togli' in chiede && (
        <Foglio titolo="Togliere la spunta?" azione="Togli la spunta" conferma={() => togli(chiede.togli)} chiudi={() => setChiede(undefined)}>
          <p className="ga-nota">
            {chiede.togli.materie?.nome ?? 'Compito'}: {chiede.togli.testo}. Lani perde i passi di questo compito e vede chi l’ha corretta. Se l’ha fatto apposta, in Oggi c’è Segna, Balla.
          </p>
        </Foglio>
      )}
      {typeof chiede === 'object' && 'sera' in chiede && (
        <Foglio titolo={`Togliere la ${chiede.sera}?`} azione="Togli la spunta" conferma={() => togliSera(chiede.sera)} chiudi={() => setChiede(undefined)}>
          <p className="ga-nota">
            {chiede.sera === 'cartella' ? 'Cartella' : 'Borsa'} di {bello(giorno)} segnata ma non fatta: Lani perde i passi
            {chiede.sera === 'cartella' ? ' e la sera non conta per le chiavi della domenica' : ''}.
          </p>
        </Foglio>
      )}
      {typeof chiede === 'object' && 'revoca' in chiede && (
        <Foglio titolo="Togliere?" azione="Togli" conferma={() => revoca(chiede.revoca)} chiudi={() => setChiede(undefined)}>
          <p className="ga-nota">
            {SEGNATI[chiede.revoca.motivo] ?? chiede.revoca.motivo} di {bello(chiede.revoca.giorno)}: Lani perde {chiede.revoca.passi} passi
            {chiede.revoca.motivo === 'dieci_minuti' || chiede.revoca.motivo === 'foglio' ? ' e la spunta torna da fare' : ''}.
          </p>
        </Foglio>
      )}
      {typeof chiede === 'object' && 'firma' in chiede && (
        <Foglio titolo={`${chiede.firma.titolo}: firmato?`} azione="Sì, firmato" conferma={() => firma(chiede.firma)} chiudi={() => setChiede(undefined)}>
          <p className="ga-nota">Lani prende i passi del foglio consegnato.{chiede.firma.dato_il ? '' : ' Non l’ha ancora segnato come dato.'}</p>
        </Foglio>
      )}
      {typeof chiede === 'object' && 'foto' in chiede && (
        <Foglio titolo="Cancellare la foto?" azione="Cancella" conferma={() => (setChiede(undefined), chiede.foto())} chiudi={() => setChiede(undefined)}>
          <p className="ga-nota">La foto si cancella per sempre. Lani perde i passi della foto e la può rifare.</p>
        </Foglio>
      )}
    </>
  );
}
