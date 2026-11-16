import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import * as R from '../lib/regole';
import { AreaTesto, Attesa, CampoData, CampoTesto, Elenco, Foglio, Interruttore, Riga, Scelta } from '../kit';
import { GIORNI, MESI } from '../spunte';
import Stato from '../Stato';
import Vetrina from '../Vetrina';
import ComePassi from '../ComePassi';
import type { Props } from './comune';

// Impostazioni: un indice a righe; ogni voce apre la sua pagina con un solo "Salva". In fondo le
// pagine per controllare (Stato di ACE, Vetrina, Regole) e, sul telefono di un genitore, l'uscita.

type Pagina = 'sera' | 'obiettivo' | 'dieci' | 'frasi' | 'pin' | 'stato' | 'vetrina' | 'regole';
type Valori = { chiusura: Record<string, string>; materiale: Record<string, string[]>; obiettivo: number; rEvolutionDa: string | null | 'errore'; esercizi: number; frasi: number };
const SETTIMANA = [1, 2, 3, 4, 5, 6, 0];
const TITOLI: Record<Pagina, string> = { sera: 'Sera e cartella', obiettivo: 'Obiettivo media', dieci: 'Dieci minuti', frasi: 'Frasi di famiglia', pin: 'PIN dell’area', stato: 'Stato di ACE', vetrina: 'Vetrina', regole: 'Regole del gioco' };

export default function Impostazioni({ client, avvisa, esci }: Props & { esci?: () => void }) {
  const [pagina, setPagina] = useState<Pagina>();
  const [v, setV] = useState<Valori>();
  const [chiede, setChiede] = useState<'accendi' | 'spegni' | 'esci'>();

  async function carica() {
    const [im, re, es, fr] = await Promise.all([
      client.from('impostazioni').select('chiave, valore').in('chiave', ['ora_chiusura', 'materiale_cartella', 'obiettivo_media']),
      client.from('impostazioni').select('valore').eq('chiave', R.CHIAVE_R_EVOLUTION).maybeSingle(),
      client.from('esercizi_dieci_minuti').select('id', { count: 'exact', head: true }),
      client.from('frasi').select('id', { count: 'exact', head: true }).eq('di_famiglia', true),
    ]);
    const m = Object.fromEntries((im.data ?? []).map((r) => [r.chiave, r.valore]));
    setV({
      chiusura: m.ora_chiusura ?? {},
      materiale: m.materiale_cartella ?? {},
      obiettivo: Number(m.obiettivo_media ?? 7.35),
      // in errore niente interruttore, sennò si riscrive la data vera
      rEvolutionDa: re.error ? 'errore' : typeof re.data?.valore === 'string' ? re.data.valore : null,
      esercizi: es.count ?? 0,
      frasi: fr.count ?? 0,
    });
  }
  useEffect(() => {
    carica();
  }, []);
  const fatto = (s: string, torna = true) => (avvisa(s), torna && setPagina(undefined), carica());

  async function rEvolution(accesa: boolean) {
    setChiede(undefined);
    const { error } = accesa
      ? await client.from('impostazioni').upsert({ chiave: R.CHIAVE_R_EVOLUTION, valore: R.iso(R.giornoRoma(new Date())) })
      : await client.from('impostazioni').delete().eq('chiave', R.CHIAVE_R_EVOLUTION);
    fatto(error ? `R-Evolution non ${accesa ? 'accesa' : 'spenta'}. Riprova.` : accesa ? 'R-Evolution accesa: Lani la trova alla prossima apertura.' : 'R-Evolution spenta. I passi già presi restano.');
  }

  if (!v) return <Attesa />;
  if (pagina)
    return (
      <>
        <button type="button" className="ga-indietro" onClick={() => setPagina(undefined)}>
          ‹ Impostazioni
        </button>
        <h2>{TITOLI[pagina]}</h2>
        {pagina === 'sera' && <Sera client={client} v={v} fatto={fatto} />}
        {pagina === 'obiettivo' && <Obiettivo client={client} v={v} fatto={fatto} />}
        {pagina === 'dieci' && <MenuDieciMinuti client={client} fatto={(s) => fatto(s, false)} />}
        {pagina === 'frasi' && <FrasiDiFamiglia client={client} fatto={(s) => fatto(s, false)} />}
        {pagina === 'pin' && <Pin client={client} fatto={fatto} />}
        {pagina === 'stato' && <Stato client={client} />}
        {pagina === 'vetrina' && <Vetrina />}
        {pagina === 'regole' && <ComePassi completa />}
      </>
    );

  const giorniChiusura = SETTIMANA.filter((g) => v.chiusura[g]);
  const re = v.rEvolutionDa;
  const reG = re && re !== 'errore' ? R.giorno(re) : null;
  return (
    <>
      <Elenco etichetta="Impostazioni">
        <Riga titolo="Sera e cartella" sotto={giorniChiusura.length ? `Chiusura: ${giorniChiusura.map((g) => `${GIORNI[g].slice(0, 3)} ${v.chiusura[g]}`).join(', ')}` : 'Nessuna chiusura'} vai={() => setPagina('sera')} />
        <Riga titolo="Obiettivo media" sotto={`${String(v.obiettivo).replace('.', ',')} per il liceo`} vai={() => setPagina('obiettivo')} />
        <li>
          <Interruttore
            titolo="R-Evolution"
            testo={re === 'errore' ? 'Non riesco a leggere se è accesa. Riprova tra poco.' : reG ? `Accesa dal ${reG.getDate()} ${MESI[reG.getMonth()]}` : 'Spenta'}
            acceso={!!reG}
            disabled={re === 'errore'}
            onChange={(acceso) => setChiede(acceso ? 'accendi' : 'spegni')}
          />
        </li>
        <Riga titolo="Dieci minuti" sotto={`${v.esercizi} ${v.esercizi === 1 ? 'esercizio' : 'esercizi'} nel menu`} vai={() => setPagina('dieci')} />
        <Riga titolo="Frasi di famiglia" sotto={v.frasi ? `${v.frasi} ${v.frasi === 1 ? 'frase' : 'frasi'}` : 'Nessuna'} vai={() => setPagina('frasi')} />
        <Riga titolo="PIN dell’area" sotto="Sui dispositivi di Lani; resta aperta 10 minuti dall’ultima azione" vai={() => setPagina('pin')} />
      </Elenco>
      <section className="ga-sezione" aria-labelledby="controllare">
        <h2 id="controllare">Per controllare</h2>
        <Elenco>
          <Riga titolo="Stato di ACE" sotto="Sincronizzazioni, chiavi, errori" vai={() => setPagina('stato')} />
          <Riga titolo="Vetrina" sotto="Popup, animazioni e notifiche, come li vede Lani" vai={() => setPagina('vetrina')} />
          <Riga titolo="Regole del gioco" sotto="Passi, chiavi e forzieri" vai={() => setPagina('regole')} />
        </Elenco>
      </section>
      {esci && (
        <button type="button" className="ga-btn tenue largo" onClick={() => setChiede('esci')}>
          Esci dall’account
        </button>
      )}
      {chiede === 'accendi' && (
        <Foglio titolo="Accendere R-Evolution?" azione="Accendi da oggi" conferma={() => rEvolution(true)} chiudi={() => setChiede(undefined)}>
          <p className="ga-nota">Da oggi Lani vede la sezione R-Evolution e i dieci minuti al mattino, e le partite danno passi.</p>
        </Foglio>
      )}
      {chiede === 'spegni' && (
        <Foglio titolo="Spegnere R-Evolution?" azione="Spegni" conferma={() => rEvolution(false)} chiudi={() => setChiede(undefined)}>
          <p className="ga-nota">Lani non vede più la sezione e le partite non danno passi. I passi già presi restano.</p>
        </Foglio>
      )}
      {chiede === 'esci' && esci && (
        <Foglio titolo="Uscire dall’account?" azione="Esci" conferma={esci} chiudi={() => setChiede(undefined)}>
          <p className="ga-nota">Su questo telefono per rientrare servirà di nuovo il vostro accesso.</p>
        </Foglio>
      )}
    </>
  );
}

type Sotto = { client: Props['client']; v: Valori; fatto: (s: string) => void };

function Sera({ client, v, fatto }: Sotto) {
  async function salva(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const chiusura: Record<string, string> = {};
    const materiale: Record<string, string[]> = {};
    for (let g = 0; g < 7; g++) {
      const ora = String(f.get(`chiusura${g}`) ?? '');
      if (ora) chiusura[g] = ora;
      const righe = String(f.get(`materiale${g}`) ?? '').split('\n').map((s) => s.trim()).filter(Boolean);
      if (righe.length) materiale[g] = righe;
    }
    const { error } = await client.from('impostazioni').upsert([
      { chiave: 'ora_chiusura', valore: chiusura },
      { chiave: 'materiale_cartella', valore: materiale },
    ]);
    fatto(error ? 'Non salvato. Riprova.' : 'Sera e cartella salvate.');
  }
  return (
    <form className="ga-sezione" onSubmit={salva}>
      <p className="ga-nota">Ora della chiusura (vuota: niente chiusura). Con allenamento o partita dopo le 17 l’app chiude mezz’ora prima.</p>
      {SETTIMANA.map((g) => (
        <fieldset key={g} className="ga-modulo ga-giorno">
          <legend className="ga-etichetta">{GIORNI[g].replace(/^./, (x) => x.toUpperCase())}</legend>
          <CampoData etichetta={`Chiusura di ${GIORNI[g]}`} type="time" name={`chiusura${g}`} defaultValue={v.chiusura[g] ?? ''} vuoto="Nessuna" />
          <AreaTesto etichetta={`Materiale per ${GIORNI[(g + 1) % 7]}`} aiuto="Uno per riga" name={`materiale${(g + 1) % 7}`} rows={2} defaultValue={(v.materiale[(g + 1) % 7] ?? []).join('\n')} />
        </fieldset>
      ))}
      <button className="ga-btn pieno largo">Salva</button>
    </form>
  );
}

function Obiettivo({ client, v, fatto }: Sotto) {
  const [errore, setErrore] = useState<string>();
  async function salva(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const n = Number(String(new FormData(e.currentTarget).get('obiettivo')).replace(',', '.'));
    if (!(n >= 6 && n <= 10)) return setErrore('Un numero tra 6 e 10, per esempio 7,35.');
    const { error } = await client.from('impostazioni').upsert({ chiave: 'obiettivo_media', valore: n });
    fatto(error ? 'Non salvato. Riprova.' : 'Obiettivo salvato.');
  }
  return (
    <form className="ga-modulo" onSubmit={salva}>
      <CampoTesto etichetta="Media da raggiungere" aiuto="Quella che serve per il liceo; Lani la vede vicino alla sua." name="obiettivo" inputMode="decimal" defaultValue={String(v.obiettivo).replace('.', ',')} errore={errore} required />
      <button className="ga-btn pieno largo">Salva</button>
    </form>
  );
}

function Pin({ client, fatto }: { client: Props['client']; fatto: (s: string) => void }) {
  const [errore, setErrore] = useState<string>();
  async function salva(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const pin = String(new FormData(e.currentTarget).get('pin'));
    if (!/^\d{4,8}$/.test(pin)) return setErrore('Da 4 a 8 cifre.');
    const { error } = await client.rpc('imposta_pin', { p_pin: pin });
    if (error) return setErrore('PIN non salvato. Riprova.');
    fatto('PIN salvato.');
  }
  return (
    <form className="ga-modulo" onSubmit={salva}>
      <p className="ga-nota">Serve sui dispositivi di Lani. L’area resta aperta 10 minuti dall’ultima cosa fatta, anche spegnendo lo schermo; “Chiudi l’area” la blocca subito.</p>
      <CampoTesto etichetta="Nuovo PIN" name="pin" type="password" inputMode="numeric" autoComplete="new-password" errore={errore} required />
      <button className="ga-btn pieno largo">Salva il PIN</button>
    </form>
  );
}

const TIPI_DIECI_MINUTI = [
  ['forza_riflessi', 'Forza e riflessi (giorni senza pallavolo)'],
  ['recupero', 'Recupero (giorni di pallavolo)'],
] as const;

/** Menu dei dieci minuti (docs/01): lo cambiano i genitori. Almeno un esercizio per tipo resta. */
function MenuDieciMinuti({ client, fatto }: { client: Props['client']; fatto: (s: string) => void }) {
  const [menu, setMenu] = useState<R.EsercizioDieciMinuti[]>([]);
  const carica = () =>
    client
      .from('esercizi_dieci_minuti')
      .select('id, nome, tipo')
      .order('creato_il')
      .then(({ data }) => setMenu(data ?? []));
  useEffect(() => {
    carica();
  }, []);

  async function aggiungi(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const { error } = await client.from('esercizi_dieci_minuti').insert({ nome: String(f.get('nome')).trim(), tipo: String(f.get('tipo')) });
    fatto(error ? 'Esercizio non salvato: forse c’è già.' : 'Esercizio aggiunto al menu.');
    if (!error) {
      form.reset();
      carica();
    }
  }
  async function togli(id: string) {
    const { error } = await client.from('esercizi_dieci_minuti').delete().eq('id', id);
    fatto(error ? 'Esercizio non tolto.' : 'Esercizio tolto dal menu.');
    carica();
  }

  return (
    <>
      <p className="ga-nota">Al mattino l’app propone un esercizio del tipo giusto per la giornata; Lani può sceglierne un altro.</p>
      {TIPI_DIECI_MINUTI.map(([tipo, titolo]) => {
        const delTipo = menu.filter((x) => x.tipo === tipo);
        return (
          <Sezione key={tipo} titolo={titolo}>
            <Elenco>
              {delTipo.map((x) => (
                <Riga
                  key={x.id}
                  titolo={x.nome}
                  azione={
                    <button type="button" className="ga-btn tenue" disabled={delTipo.length < 2} onClick={() => togli(x.id)} aria-label={`Togli: ${x.nome}`}>
                      Togli
                    </button>
                  }
                />
              ))}
            </Elenco>
          </Sezione>
        );
      })}
      <form className="ga-modulo" onSubmit={aggiungi} aria-label="Aggiungi un esercizio">
        <CampoTesto etichetta="Esercizio nuovo" name="nome" maxLength={60} required autoComplete="off" placeholder="Corda, addominali…" />
        <Scelta etichetta="Tipo" name="tipo" defaultValue="forza_riflessi" opzioni={TIPI_DIECI_MINUTI} />
        <button className="ga-btn pieno largo">Aggiungi al menu</button>
      </form>
    </>
  );
}

/** Frasi di famiglia (docs/05): le aggiungono i genitori e passano davanti alle altre, in qualsiasi momento. */
function FrasiDiFamiglia({ client, fatto }: { client: Props['client']; fatto: (s: string) => void }) {
  const [frasi, setFrasi] = useState<{ id: string; testo: string; autore: string | null }[]>([]);
  const carica = () =>
    client
      .from('frasi')
      .select('id, testo, autore')
      .eq('di_famiglia', true)
      .order('testo')
      .then(({ data }) => setFrasi(data ?? []));
  useEffect(() => {
    carica();
  }, []);

  async function aggiungi(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const testo = String(f.get('testo')).trim();
    const autore = String(f.get('autore')).trim() || null;
    const { error } = await client.from('frasi').insert({ testo, autore, di_famiglia: true });
    fatto(error ? 'Frase non salvata: forse c’è già.' : 'Frase salvata: Lani la vedrà in uno dei prossimi giorni.');
    if (!error) {
      form.reset();
      carica();
    }
  }
  async function togli(id: string) {
    const { error } = await client.from('frasi').delete().eq('id', id);
    fatto(error ? 'Frase non tolta.' : 'Frase tolta.');
    carica();
  }

  return (
    <>
      <p className="ga-nota">Una frase al giorno al massimo, mai nei rimproveri. Le vostre passano davanti alle altre.</p>
      {frasi.length > 0 && (
        <Elenco etichetta="Frasi di famiglia">
          {frasi.map((x) => (
            <Riga
              key={x.id}
              titolo={`«${x.testo}»`}
              sotto={x.autore ?? undefined}
              azione={
                <button type="button" className="ga-btn tenue" onClick={() => togli(x.id)} aria-label={`Togli: ${x.testo}`}>
                  Togli
                </button>
              }
            />
          ))}
        </Elenco>
      )}
      <form className="ga-modulo" onSubmit={aggiungi} aria-label="Aggiungi una frase">
        <AreaTesto etichetta="Frase" name="testo" rows={2} maxLength={140} required />
        <CampoTesto etichetta="Di chi (facoltativo)" name="autore" maxLength={40} placeholder="papà, nonna, un proverbio…" />
        <button className="ga-btn pieno largo">Aggiungi la frase</button>
      </form>
    </>
  );
}

function Sezione({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <section className="ga-sezione">
      <h3>{titolo}</h3>
      {children}
    </section>
  );
}
