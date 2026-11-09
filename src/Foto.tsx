import { useEffect, useRef, useState } from 'react';
import { Camera } from '@phosphor-icons/react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { erroreDi, MESSAGGI, misure, scegli, type ErroreFoto, type Pronta } from './lib/foto';

// Da fotografare: pagine chieste da ACE (sincronizzazione di Nuvola). Le foto vanno nel bucket
// privato foto-pagine; la funzione "passi" chiude la richiesta e dà i passi a Lani se la foto è sua.
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

/**
 * Carica le foto di una richiesta e chiede i passi. Restituisce i passi presi (0 per i genitori).
 * Prima prepara tutte le foto: se una non va, non si carica niente. Se il caricamento si
 * interrompe a metà, le foto già salvate restano e la richiesta resta aperta: si riprova.
 */
async function caricaFoto(client: SupabaseClient, r: RichiestaFoto, file: File[]): Promise<number> {
  const pronte: Pronta[] = [];
  for (const f of file) {
    const p = scegli(f, await rimpicciolisci(f));
    if (typeof p === 'string') throw new Rifiutata(p);
    pronte.push(p);
  }
  for (const [i, p] of pronte.entries()) {
    const percorso = `${r.id}/${Date.now()}-${i}.${p.estensione}`;
    const su = await client.storage.from('foto-pagine').upload(percorso, p.blob, { contentType: p.tipo });
    if (su.error) throw su.error;
    const { error } = await client.from('foto_pagine').insert({ richiesta_id: r.id, materia_id: r.materia_id, pagine: r.pagine, percorso_storage: percorso });
    if (error) throw error;
  }
  const { data, error } = await client.functions.invoke('passi', { body: { tipo: 'foto', id: r.id } });
  if (error) throw error;
  return (data?.passi as number) ?? 0;
}

export const descrizione = (r: RichiestaFoto) => `${r.materie?.nome ?? (r.motivo === 'verifica' ? 'Verifica' : 'Compito')}: pagine ${r.pagine}`;

/** Pulsante "Fotografa": apre la fotocamera (una o più pagine) e carica. */
export function Fotografa({ client, richiesta, etichetta = 'Fotografa', fatto }: { client: SupabaseClient; richiesta: RichiestaFoto; etichetta?: string; fatto: (passi: number) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [stato, setStato] = useState<'pronto' | 'carico' | ErroreFoto>('pronto');
  async function scelte(lista: FileList | null) {
    // fotocamera negata o scelta annullata: nessun file, non succede niente
    if (!lista?.length) return;
    setStato('carico');
    try {
      fatto(await caricaFoto(client, richiesta, [...lista]));
      setStato('pronto');
    } catch (e) {
      console.error('foto', e);
      setStato(e instanceof Rifiutata ? e.motivo : erroreDi(e, navigator.onLine));
    }
    if (input.current) input.current.value = '';
  }
  return (
    <span className="fotografa">
      <input ref={input} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => scelte(e.target.files)} aria-label={`Foto: ${descrizione(richiesta)}`} />
      <button className="secondario compatto" disabled={stato === 'carico'} onClick={() => input.current?.click()}>
        <Camera size={20} weight="bold" aria-hidden />
        {stato === 'carico' ? 'Carico…' : etichetta}
      </button>
      {stato !== 'pronto' && stato !== 'carico' && <small role="alert">{MESSAGGI[stato]}</small>}
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
    avvisa('Foto cancellata.');
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
