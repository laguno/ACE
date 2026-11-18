import { useEffect, useRef, useState } from 'react';
import { Camera, Images } from '@phosphor-icons/react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Elenco, Riga } from './kit';
import { caricaConAvanzamento, erroreDi, intervalli, MESSAGGI, misure, numeriPagine, pagineAttese, pagineMancanti, percentuale, scegli, type ErroreFoto, type Pronta } from './lib/foto';

// Da fotografare: pagine chieste da ACE (sincronizzazione di Nuvola). Le foto vanno nel bucket
// privato foto-pagine; con "Ho finito" la funzione "passi" chiude la richiesta e dà i passi a Lani se la foto è sua.
// Solo pagine del libro di carta: niente e-book degli editori.

export type RichiestaFoto = { id: string; motivo: string; materia_id: string | null; pagine: string; materie?: { nome: string } | null };
export const SELECT_RICHIESTE = 'id, motivo, materia_id, pagine, materie(nome)';

/** Foto rimpicciolita (JPEG, lato lungo 1600 px, dritta secondo l'EXIF); null se il browser non la apre. */
async function rimpicciolisci(file: File): Promise<Blob | null> {
  try {
    const img = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const m = misure(img.width, img.height);
    const tela = document.createElement('canvas');
    tela.width = m.larghezza;
    tela.height = m.altezza;
    const ctx = tela.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, tela.width, tela.height);
    img.close();
    return await new Promise<Blob | null>((ok) => tela.toBlob(ok, 'image/jpeg', 0.85));
  } catch {
    return null;
  }
}

class Rifiutata extends Error {
  constructor(public motivo: ErroreFoto) {
    super(motivo);
  }
}

type Scatto = { percorso: string; url: string; id?: string; viste?: string | null };

/**
 * Carica alcune foto di una richiesta (aperta). Prima le prepara tutte: se una non va, non si
 * carica niente. Le foto salvate restano anche se Lani esce a metà: la richiesta si chiude e i
 * passi arrivano solo con "Ho finito" (chiudi).
 */
async function caricaFoto(client: SupabaseClient, r: RichiestaFoto, file: File[], viste: (string | null)[], avanza: (percento: number) => void): Promise<Scatto[]> {
  const pronte: Pronta[] = [];
  for (const f of file) {
    const p = scegli(f, await rimpicciolisci(f));
    if (typeof p === 'string') throw new Rifiutata(p);
    pronte.push(p);
  }
  const fatti: Scatto[] = [];
  const totale = pronte.reduce((a, p) => a + p.blob.size, 0);
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const chiave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  const gettone = (await client.auth.getSession()).data.session?.access_token;
  if (!gettone) throw new Error('accesso richiesto');
  let finiti = 0;
  avanza(0);
  for (const [i, p] of pronte.entries()) {
    const percorso = `${r.id}/${Date.now()}-${i}.${p.estensione}`;
    await caricaConAvanzamento({ url, chiave, gettone, bucket: 'foto-pagine', percorso, blob: p.blob, tipo: p.tipo }, (byte) => avanza(percentuale(finiti + byte, totale)));
    finiti += p.blob.size;
    avanza(percentuale(finiti, totale));
    const { error } = await client.from('foto_pagine').insert({ richiesta_id: r.id, materia_id: r.materia_id, pagine: r.pagine, percorso_storage: percorso, pagine_viste: viste[i] ?? null });
    if (error) throw error;
    fatti.push({ percorso, url: URL.createObjectURL(p.blob), viste: viste[i] ?? null });
  }
  return fatti;
}

/** "Ho finito": la funzione "passi" chiude la richiesta e dà i passi (una volta per richiesta, 0 ai genitori). */
async function chiudi(client: SupabaseClient, r: RichiestaFoto): Promise<number> {
  const { data, error } = await client.functions.invoke('passi', { body: { tipo: 'foto', id: r.id } });
  if (error) throw error;
  return (data?.passi as number) ?? 0;
}

/** Foto già salvate per la richiesta (uscita a metà), con l'anteprima firmata. */
async function giaSalvate(client: SupabaseClient, r: RichiestaFoto): Promise<Scatto[]> {
  const { data } = await client.from('foto_pagine').select('id, percorso_storage, pagine_viste').eq('richiesta_id', r.id).order('caricata_il');
  const righe = data ?? [];
  const percorsi = righe.map((f) => f.percorso_storage as string);
  if (!percorsi.length) return [];
  const firmati = await client.storage.from('foto-pagine').createSignedUrls(percorsi, 3600);
  return percorsi.map((percorso, i) => ({ percorso, url: firmati.data?.[i]?.signedUrl ?? '', id: righe[i].id as string, viste: righe[i].pagine_viste as string | null }));
}

export const descrizione = (r: RichiestaFoto) => `${r.materie?.nome ?? (r.motivo === 'verifica' ? 'Verifica' : 'Compito')}: pagine ${r.pagine}`;

/** Fotocamera posteriore in una finestra: uno scatto, poi si chiude. Se non si apre, si ripiega sull'input. */
function FotocameraDal({ scatta, chiudi, ripiega }: { scatta: (f: File) => void; chiudi: () => void; ripiega: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const flusso = useRef<MediaStream | null>(null);
  const [pronta, setPronta] = useState(false);
  useEffect(() => {
    let vivo = true;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }).then(
      (s) => {
        if (!vivo) return s.getTracks().forEach((t) => t.stop());
        flusso.current = s;
        if (video.current) video.current.srcObject = s;
      },
      () => vivo && ripiega(),
    );
    return () => {
      vivo = false;
      flusso.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  function scatto() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const tela = document.createElement('canvas');
    tela.width = v.videoWidth;
    tela.height = v.videoHeight;
    tela.getContext('2d')?.drawImage(v, 0, 0);
    tela.toBlob((b) => b && scatta(new File([b], `scatto-${Date.now()}.jpg`, { type: 'image/jpeg' })), 'image/jpeg', 0.9);
  }
  return (
    <div className="carico-foto camera-foto" role="dialog" aria-modal="true" aria-label="Fotocamera">
      <video ref={video} autoPlay playsInline muted onLoadedData={() => setPronta(true)} />
      <div className="camera-foto-comandi">
        <button className="secondario compatto" onClick={chiudi}>
          Annulla
        </button>
        <button className="compatto" disabled={!pronta} onClick={scatto}>
          <Camera size={20} weight="bold" aria-hidden />
          Scatta
        </button>
      </div>
    </div>
  );
}

/**
 * Foto di una richiesta, una pagina alla volta: la fotocamera del telefono fa uno scatto per volta
 * (Samsung), quindi la richiesta resta aperta con contatore e miniature, "Un'altra pagina"
 * (fotocamera), "Dalla galleria" (più foto insieme) e "Ho finito", che chiude e dà i passi.
 */
export function Fotografa({ client, richiesta, etichetta = 'Fotografa', studio = false, genitore = false, chiusa = false, attese: attesePassate, fatto }: { client: SupabaseClient; richiesta: RichiestaFoto; etichetta?: string; studio?: boolean; genitore?: boolean; chiusa?: boolean; attese?: string; fatto: (passi: number) => void }) {
  // pagine da avere: quelle date dal genitore, o (Lani) quelle della prossima prova della materia
  const [attesePerProva, setAttesePerProva] = useState<string>();
  const [inAttesa, setInAttesa] = useState<File[] | null>(null);
  const [scelte_, setScelte] = useState<number[]>([]); // pagine scelte nella scheda "Che pagine sono?"
  const [esito, setEsito] = useState<{ titolo: string; testo: string } | null>(null);
  const passiDopo = useRef(0);
  useEffect(() => {
    if (attesePassate !== undefined || !richiesta.materia_id) return;
    let vivo = true;
    client
      .from('verifiche')
      .select('pagine_probabili')
      .eq('materia_id', richiesta.materia_id)
      .gte('data', new Date().toISOString().slice(0, 10))
      .order('data')
      .limit(1)
      .then(({ data }) => vivo && setAttesePerProva(pagineAttese(richiesta.pagine, (data?.[0]?.pagine_probabili as string | null) ?? null)), () => {});
    return () => {
      vivo = false;
    };
  }, [client, richiesta, attesePassate]);
  const attese = attesePassate ?? attesePerProva;
  const camera = useRef<HTMLInputElement>(null);
  const galleria = useRef<HTMLInputElement>(null);
  const [live, setLive] = useState(false);
  const [studiando, setStudiando] = useState<number | null>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [scatti, setScatti] = useState<Scatto[]>([]);
  const [stato, setStato] = useState<'pronto' | 'carico' | 'chiudo' | ErroreFoto>('pronto');
  useEffect(() => {
    let vivo = true;
    giaSalvate(client, richiesta).then(
      (s) => {
        if (vivo && s.length) setScatti(s);
      },
      () => {},
    );
    return () => {
      vivo = false;
    };
  }, [client, richiesta]);
  // dopo la scelta delle foto: se si sa quali pagine mancano, si propongono (in ordine) e si confermano
  function proponi(lista: File[]) {
    if (!mancano.length) return void elabora(lista, lista.map(() => null));
    setScelte(mancano.slice(0, lista.length));
    setInAttesa(lista);
  }
  function confermaPagine() {
    const lista = inAttesa;
    if (!lista) return;
    const numeri = [...scelte_].sort((a, b) => a - b);
    // una pagina per foto se i conti tornano; una sola foto prende tutte le pagine scelte; se no le legge l'IA
    const viste = lista.map((_, i) => (numeri.length === lista.length ? String(numeri[i]) : lista.length === 1 && numeri.length ? numeri.join(', ') : null));
    setInAttesa(null);
    void elabora(lista, viste);
  }
  async function elabora(lista: File[], viste: (string | null)[]) {
    setStato('carico');
    setProgresso(0);
    try {
      const nuovi = await caricaFoto(client, richiesta, lista, viste, setProgresso);
      setProgresso(100);
      setScatti((s) => [...s, ...nuovi]);
      setStato('pronto');
    } catch (e) {
      console.error('foto', e);
      setStato(e instanceof Rifiutata ? e.motivo : erroreDi(e, navigator.onLine));
      // interrotto a metà: le foto già salvate restano, il contatore le mostra
      giaSalvate(client, richiesta).then(setScatti, () => {});
    }
    setProgresso(null);
  }
  async function scelte(input: HTMLInputElement) {
    const lista = input.files;
    // fotocamera negata o scelta annullata: nessun file, non succede niente
    if (!lista?.length) return;
    const file = [...lista];
    input.value = '';
    proponi(file);
  }
  // la fotocamera si apre davvero: su alcuni telefoni "capture" non basta e si apriva la galleria
  function apriCamera() {
    if (typeof navigator.mediaDevices?.getUserMedia === 'function') setLive(true);
    else camera.current?.click();
  }
  // un genitore tocca una pagina mancante che in realtà c'è già: si segna sull'ultima foto e la chip sparisce
  async function segna(pagina: number) {
    const ultima = scatti.at(-1);
    if (!ultima?.id) return;
    const nuove = [ultima.viste, String(pagina)].filter(Boolean).join(', ');
    setScatti((s) => s.map((x) => (x.id === ultima.id ? { ...x, viste: nuove } : x)));
    const { error } = await client.from('foto_pagine').update({ pagine_viste: nuove }).eq('id', ultima.id);
    if (error) giaSalvate(client, richiesta).then(setScatti, () => {});
  }
  async function finito() {
    setStato('chiudo');
    try {
      // richiesta già chiusa (da Lani o scaduta): niente passi, solo le nuove foto nello studio
      const passi = chiusa ? 0 : await chiudi(client, richiesta);
      // le pagine entrano nelle carte e nel quiz della prossima prova; Lani riceve l'avviso (lo fa la funzione)
      if (studio) {
        // la funzione legge al massimo 8 foto per volta: si richiama finché restano foto da leggere
        setStudiando(0);
        let carte = 0;
        let domande = 0;
        let motivo = '';
        let fallito = false;
        try {
          const { count } = await client.from('foto_pagine').select('id', { count: 'exact', head: true }).eq('richiesta_id', richiesta.id).is('studio_il', null);
          const totale = Math.max(1, count ?? 1);
          for (let giro = 0; giro < 10; giro++) {
            const { data, error } = await client.functions.invoke('foto-studio', { body: { richiesta_id: richiesta.id } });
            if (error) throw error;
            const r = (data ?? {}) as { restano?: number; carte?: number; domande?: number; motivo?: string };
            carte += r.carte ?? 0;
            domande += r.domande ?? 0;
            motivo = r.motivo ?? motivo;
            const restano = r.restano ?? 0;
            setStudiando(Math.min(100, Math.round(((totale - restano) / totale) * 100)));
            if (!restano) break;
          }
        } catch (e) {
          console.error('foto-studio', e);
          fallito = true;
        }
        setStudiando(null);
        // l'IA ha scritto i numeri di pagina: il contatore li mostra subito
        await giaSalvate(client, richiesta).then(setScatti, () => {});
        // l'esito si vede sempre; "fatto" parte quando si tocca "Ok" (la richiesta può uscire dalla lista)
        passiDopo.current = passi;
        setEsito(
          fallito
            ? { titolo: 'Quiz non creati', testo: "Qualcosa non ha funzionato. Le foto sono salvate: tocca Ho finito per riprovare, o ci penso io entro un'ora." }
            : carte || domande
              ? { titolo: 'Quiz pronti', testo: `Ho aggiunto ${carte} carte e ${domande} domande dalle pagine fotografate.` }
              : /nessuna verifica/.test(motivo)
                ? { titolo: 'Niente di nuovo', testo: 'Per questa materia non c’è una prova in arrivo. Le foto restano salvate.' }
                : { titolo: 'Niente di nuovo', testo: 'Non ho trovato pagine leggibili. Prova con foto più nitide.' },
        );
        setStato('pronto');
        return;
      }
      setStato('pronto');
      fatto(passi);
    } catch (e) {
      console.error('foto', e);
      setStato(erroreDi(e, navigator.onLine));
    }
  }
  const occupato = stato === 'carico' || stato === 'chiudo';
  const n = scatti.length;
  const daAvere = attese ?? richiesta.pagine;
  const tutte = numeriPagine(daAvere);
  const mancano = pagineMancanti(daAvere, scatti.map((x) => x.viste ?? null));
  return (
    <span className="fotografa">
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => scelte(e.target)} aria-label={`Fotocamera: ${descrizione(richiesta)}`} />
      <input ref={galleria} type="file" accept="image/*" multiple hidden onChange={(e) => scelte(e.target)} aria-label={`Galleria: ${descrizione(richiesta)}`} />
      {n > 0 && (
        <span className="scatti">
          <small aria-live="polite">{n === 1 ? '1 pagina' : `${n} pagine`}</small>
          <span className="miniature">
            {scatti.map((s) => (
              <img key={s.percorso} src={s.url} alt="" width={40} height={40} />
            ))}
          </span>
        </span>
      )}
      {progresso !== null && (
        <div className="carico-foto" role="dialog" aria-modal="true" aria-labelledby="carico-foto-titolo">
          <div className="carico-foto-scheda">
            <h2 id="carico-foto-titolo">Carico le foto</h2>
            <progress max={100} value={progresso} aria-label="Avanzamento del caricamento" />
            <p aria-live="polite">{progresso}%</p>
          </div>
        </div>
      )}
      {studiando !== null && (
        <div className="carico-foto" role="dialog" aria-modal="true" aria-labelledby="studio-foto-titolo">
          <div className="carico-foto-scheda">
            <h2 id="studio-foto-titolo">Preparo i quiz</h2>
            <progress max={100} value={studiando} aria-label="Preparazione dei quiz" />
            <p aria-live="polite">{studiando}%</p>
            <small>Leggo le pagine e preparo carte e domande: può volerci qualche minuto.</small>
          </div>
        </div>
      )}
      {live && (
        <FotocameraDal
          scatta={(f) => {
            setLive(false);
            proponi([f]);
          }}
          chiudi={() => setLive(false)}
          ripiega={() => {
            setLive(false);
            camera.current?.click();
          }}
        />
      )}
      {inAttesa && (
        <div className="carico-foto" role="dialog" aria-modal="true" aria-labelledby="pagine-foto-titolo">
          <form
            className="carico-foto-scheda"
            onSubmit={(e) => {
              e.preventDefault();
              confermaPagine();
            }}
          >
            <h2 id="pagine-foto-titolo">Che pagine sono?</h2>
            <span className="pagine-chip-lista">
              {mancano.map((p) => (
                <button
                  type="button"
                  key={p}
                  className={`chip-pagina${scelte_.includes(p) ? ' scelta' : ''}`}
                  aria-pressed={scelte_.includes(p)}
                  onClick={() => setScelte((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]))}
                >
                  {p}
                </button>
              ))}
            </span>
            <small aria-live="polite">
              {inAttesa.length === 1 ? '1 foto' : `${inAttesa.length} foto`}, {scelte_.length === 1 ? '1 pagina scelta' : `${scelte_.length} pagine scelte`}. Tocca le pagine per cambiarle.
            </small>
            <button>Carica</button>
            <button type="button" className="secondario" onClick={() => setInAttesa(null)}>
              Annulla
            </button>
          </form>
        </div>
      )}
      {n > 0 && tutte.length > 0 && (
        <small className="pagine-stato" aria-live="polite">
          <b>
            {tutte.length - mancano.length}/{tutte.length}
          </b>{' '}
          pagine.{' '}
          {tutte.length <= 40 && (
            <span className="pagine-pallini" aria-hidden>
              {tutte.map((p) => (
                <i key={p} className={mancano.includes(p) ? 'manca' : 'c-e'} title={String(p)} />
              ))}
            </span>
          )}{' '}
          {mancano.length ? 'Mancano:' : 'Tutte le pagine chieste ci sono'}
        </small>
      )}
      {n > 0 && mancano.length > 0 && (
        <span className="pagine-chip-lista" role="group" aria-label="Pagine mancanti">
          {mancano.map((p) =>
            genitore ? (
              <button key={p} type="button" className="chip-pagina" aria-label={`Pagina ${p}: già caricata`} onClick={() => segna(p)}>
                {p}
              </button>
            ) : (
              <span key={p} className="chip-pagina">
                {p}
              </span>
            ),
          )}
        </span>
      )}
      {genitore && n > 0 && mancano.length > 0 && <small className="pagine-stato">Se una pagina c’è già, toccala: sparisce.</small>}
      {esito && (
        <div className="carico-foto" role="dialog" aria-modal="true" aria-labelledby="esito-foto-titolo">
          <div className="carico-foto-scheda">
            <h2 id="esito-foto-titolo">{esito.titolo}</h2>
            <small>{esito.testo}</small>
            <button
              onClick={() => {
                setEsito(null);
                fatto(passiDopo.current);
              }}
            >
              Ok
            </button>
          </div>
        </div>
      )}
      <button className="secondario compatto" disabled={occupato} onClick={apriCamera}>
        <Camera size={20} weight="bold" aria-hidden />
        {stato === 'carico' ? 'Carico…' : n > 0 ? "Un'altra pagina" : etichetta}
      </button>
      <button className="secondario compatto" disabled={occupato} onClick={() => galleria.current?.click()}>
        <Images size={20} weight="bold" aria-hidden />
        Dalla galleria
      </button>
      {n > 0 && (
        <button className="compatto" disabled={occupato} onClick={finito}>
          {stato === 'chiudo' ? 'Chiudo…' : 'Ho finito'}
        </button>
      )}
      {stato !== 'pronto' && !occupato && <small role="alert">{MESSAGGI[stato]}</small>}
    </span>
  );
}

type FotoSalvata = { id: string; pagine: string | null; percorso_storage: string; caricata_il: string; materie: { nome: string } | null };

/**
 * Genitori: le foto delle ultime due settimane, con "Cancella" per una foto sbagliata (riga e file;
 * le policy lo permettono solo ai genitori). La richiesta resta chiusa e i passi già presi restano:
 * riaprirla per rifare la foto chiede una migrazione (i genitori leggono soltanto richieste_foto).
 */
export function FotoSalvate({ client, avvisa, conferma }: { client: SupabaseClient; avvisa: (s: string) => void; conferma: (si: () => void) => void }) {
  const [foto, setFoto] = useState<(FotoSalvata & { url?: string })[]>();
  async function carica() {
    const { data } = await client
      .from('foto_pagine')
      .select('id, pagine, percorso_storage, caricata_il, materie(nome)')
      .gte('caricata_il', new Date(Date.now() - 14 * 864e5).toISOString())
      .order('caricata_il', { ascending: false });
    const righe = (data ?? []) as unknown as FotoSalvata[];
    const firmati = righe.length ? (await client.storage.from('foto-pagine').createSignedUrls(righe.map((f) => f.percorso_storage), 600)).data : [];
    setFoto(righe.map((f) => ({ ...f, url: firmati?.find((s) => s.path === f.percorso_storage)?.signedUrl ?? undefined })));
  }
  useEffect(() => {
    carica();
  }, []);

  async function cancella(f: FotoSalvata) {
    // prima la riga: se poi il file non si cancella resta un file orfano, mai una riga senza file
    const { error } = await client.from('foto_pagine').delete().eq('id', f.id);
    if (error) return avvisa('Foto non cancellata. Riprova.');
    await client.storage.from('foto-pagine').remove([f.percorso_storage]);
    avvisa('Foto cancellata. Lani la ritrova da fotografare.');
    carica();
  }

  if (!foto?.length) return null;
  return (
    // chiusa: si apre solo per cancellare una foto sbagliata
    <details className="ga-chiusa">
      <summary>Foto delle pagine ({foto.length})</summary>
      <p className="ga-nota">Le ultime due settimane. Se una foto è sbagliata, cancellatela.</p>
      <ul className="ga-elenco">
        {foto.map((f) => {
          const nome = `${f.materie?.nome ?? 'Pagine'}${f.pagine ? `: pagine ${f.pagine}` : ''}`;
          return (
            <li key={f.id}>
              <div className="ga-riga">
                {f.url && <img className="miniatura" src={f.url} alt={nome} width={44} height={44} loading="lazy" />}
                <span className="ga-riga-testo">
                  <b>{nome}</b>
                  <small>{new Date(f.caricata_il).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</small>
                </span>
                <button className="ga-btn tenue" aria-label={`Cancella la foto di ${nome}`} onClick={() => conferma(() => cancella(f))}>
                  Cancella
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

type RichiestaRecente = RichiestaFoto & { stato: string };

/**
 * Genitori: aggiungere foto a una richiesta di qualsiasi stato (anche chiusa da Lani o scaduta):
 * appunti, pagine mancanti. Le nuove foto entrano nelle carte e nel quiz della prossima prova.
 */
export function FotoRichieste({ client, avvisa }: { client: SupabaseClient; avvisa: (s: string) => void }) {
  const [lista, setLista] = useState<RichiestaRecente[]>();
  const [prove, setProve] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    const da = new Date(Date.now() - 21 * 864e5).toISOString();
    client
      .from('richieste_foto')
      .select(`${SELECT_RICHIESTE}, stato`)
      .gte('creato_il', da)
      .order('creato_il', { ascending: false })
      .then(({ data }) => setLista((data ?? []) as unknown as RichiestaRecente[]));
    // pagine della prossima prova di ogni materia: la richiesta ne ha spesso solo alcune
    client
      .from('verifiche')
      .select('materia_id, pagine_probabili, data')
      .gte('data', new Date().toISOString().slice(0, 10))
      .order('data', { ascending: false })
      .then(({ data }) => setProve(new Map((data ?? []).filter((v) => v.materia_id && v.pagine_probabili).map((v) => [v.materia_id as string, v.pagine_probabili as string]))));
  }, [client]);
  if (!lista?.length) return null;
  return (
    <Elenco etichetta="Aggiungi foto">
      {lista.map((r) => {
        const attese = pagineAttese(r.pagine, r.materia_id ? (prove.get(r.materia_id) ?? null) : null);
        // titolo: le pagine della prova (4–16), non solo quelle del compito (6)
        const titolo = r.materie?.nome && prove.has(r.materia_id ?? '') ? `${r.materie.nome}: pagine ${intervalli(numeriPagine(attese))}` : descrizione(r);
        return (
          <Riga
            key={r.id}
            icona={<Camera size={20} weight="bold" aria-hidden />}
            titolo={titolo}
            sotto={r.stato === 'aperta' ? 'Aperta' : r.stato === 'fatta' ? 'Chiusa da Lani: potete aggiungere pagine' : 'Scaduta: potete aggiungere pagine'}
            azione={<Fotografa client={client} richiesta={r} studio genitore chiusa={r.stato !== 'aperta'} attese={attese} etichetta="Aggiungi" fatto={() => avvisa(`Foto aggiunte: ${titolo}.`)} />}
          />
        );
      })}
    </Elenco>
  );
}
