import { useEffect, useRef, useState } from 'react';
import { Camera, Images } from '@phosphor-icons/react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { erroreDi, MESSAGGI, misure, scegli, type ErroreFoto, type Pronta } from './lib/foto';

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

type Scatto = { percorso: string; url: string };

/**
 * Carica alcune foto di una richiesta (aperta). Prima le prepara tutte: se una non va, non si
 * carica niente. Le foto salvate restano anche se Lani esce a metà: la richiesta si chiude e i
 * passi arrivano solo con "Ho finito" (chiudi).
 */
async function caricaFoto(client: SupabaseClient, r: RichiestaFoto, file: File[]): Promise<Scatto[]> {
  const pronte: Pronta[] = [];
  for (const f of file) {
    const p = scegli(f, await rimpicciolisci(f));
    if (typeof p === 'string') throw new Rifiutata(p);
    pronte.push(p);
  }
  const fatti: Scatto[] = [];
  for (const [i, p] of pronte.entries()) {
    const percorso = `${r.id}/${Date.now()}-${i}.${p.estensione}`;
    const su = await client.storage.from('foto-pagine').upload(percorso, p.blob, { contentType: p.tipo });
    if (su.error) throw su.error;
    const { error } = await client.from('foto_pagine').insert({ richiesta_id: r.id, materia_id: r.materia_id, pagine: r.pagine, percorso_storage: percorso });
    if (error) throw error;
    fatti.push({ percorso, url: URL.createObjectURL(p.blob) });
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
  const { data } = await client.from('foto_pagine').select('percorso_storage').eq('richiesta_id', r.id).order('caricata_il');
  const percorsi = (data ?? []).map((f) => f.percorso_storage as string);
  if (!percorsi.length) return [];
  const firmati = await client.storage.from('foto-pagine').createSignedUrls(percorsi, 3600);
  return percorsi.map((percorso, i) => ({ percorso, url: firmati.data?.[i]?.signedUrl ?? '' }));
}

export const descrizione = (r: RichiestaFoto) => `${r.materie?.nome ?? (r.motivo === 'verifica' ? 'Verifica' : 'Compito')}: pagine ${r.pagine}`;

/**
 * Foto di una richiesta, una pagina alla volta: la fotocamera del telefono fa uno scatto per volta
 * (Samsung), quindi la richiesta resta aperta con contatore e miniature, "Un'altra pagina"
 * (fotocamera), "Dalla galleria" (più foto insieme) e "Ho finito", che chiude e dà i passi.
 */
export function Fotografa({ client, richiesta, etichetta = 'Fotografa', fatto }: { client: SupabaseClient; richiesta: RichiestaFoto; etichetta?: string; fatto: (passi: number) => void }) {
  const camera = useRef<HTMLInputElement>(null);
  const galleria = useRef<HTMLInputElement>(null);
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
  async function scelte(input: HTMLInputElement) {
    const lista = input.files;
    // fotocamera negata o scelta annullata: nessun file, non succede niente
    if (!lista?.length) return;
    setStato('carico');
    try {
      const nuovi = await caricaFoto(client, richiesta, [...lista]);
      setScatti((s) => [...s, ...nuovi]);
      setStato('pronto');
    } catch (e) {
      console.error('foto', e);
      setStato(e instanceof Rifiutata ? e.motivo : erroreDi(e, navigator.onLine));
      // interrotto a metà: le foto già salvate restano, il contatore le mostra
      giaSalvate(client, richiesta).then(setScatti, () => {});
    }
    input.value = '';
  }
  async function finito() {
    setStato('chiudo');
    try {
      fatto(await chiudi(client, richiesta));
    } catch (e) {
      console.error('foto', e);
      setStato(erroreDi(e, navigator.onLine));
    }
  }
  const occupato = stato === 'carico' || stato === 'chiudo';
  const n = scatti.length;
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
      <button className="secondario compatto" disabled={occupato} onClick={() => camera.current?.click()}>
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
    <div className="carta">
      <h2>Foto delle pagine</h2>
      <p className="nota">Le ultime due settimane. Se una foto è sbagliata, cancellala.</p>
      <ul className="lista-foto">
        {foto.map((f) => {
          const nome = `${f.materie?.nome ?? 'Pagine'}${f.pagine ? `: pagine ${f.pagine}` : ''}`;
          return (
            <li key={f.id}>
              {f.url && <img className="miniatura" src={f.url} alt={nome} width={56} height={56} loading="lazy" />}
              <span>
                {nome}
                <small>{new Date(f.caricata_il).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</small>
              </span>
              <button className="secondario stretto" aria-label={`Cancella la foto di ${nome}`} onClick={() => conferma(() => cancella(f))}>
                Cancella
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
