import { useRef, useState } from 'react';
import { Camera } from '@phosphor-icons/react';
import type { SupabaseClient } from '@supabase/supabase-js';

// Da fotografare: pagine chieste da ACE (sincronizzazione di Nuvola). Le foto vanno nel bucket
// privato foto-pagine; la funzione "passi" chiude la richiesta e dà i passi a Lani se la foto è sua.
// Solo pagine del libro di carta: niente e-book degli editori.

export type RichiestaFoto = { id: string; motivo: string; materia_id: string | null; pagine: string; materie?: { nome: string } | null };
export const SELECT_RICHIESTE = 'id, motivo, materia_id, pagine, materie(nome)';

const LATO_MAX = 1600;

/** Rimpicciolisce la foto (JPEG, lato lungo 1600 px): meno attesa e meno spazio. Se non si può, l'originale. */
async function rimpicciolisci(file: File): Promise<Blob> {
  try {
    const img = await createImageBitmap(file);
    const k = Math.min(1, LATO_MAX / Math.max(img.width, img.height));
    const tela = document.createElement('canvas');
    tela.width = Math.round(img.width * k);
    tela.height = Math.round(img.height * k);
    tela.getContext('2d')!.drawImage(img, 0, 0, tela.width, tela.height);
    const blob = await new Promise<Blob | null>((ok) => tela.toBlob(ok, 'image/jpeg', 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

/** Carica le foto di una richiesta e chiede i passi. Restituisce i passi presi (0 per i genitori). */
export async function caricaFoto(client: SupabaseClient, r: RichiestaFoto, file: File[]): Promise<number> {
  for (const [i, f] of file.entries()) {
    const blob = await rimpicciolisci(f);
    const percorso = `${r.id}/${Date.now()}-${i}.jpg`;
    const su = await client.storage.from('foto-pagine').upload(percorso, blob, { contentType: blob.type || 'image/jpeg' });
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
  const [stato, setStato] = useState<'pronto' | 'carico' | 'errore'>('pronto');
  async function scelte(lista: FileList | null) {
    if (!lista?.length) return;
    setStato('carico');
    try {
      fatto(await caricaFoto(client, richiesta, [...lista]));
      setStato('pronto');
    } catch (e) {
      console.error('foto', e);
      setStato('errore');
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
      {stato === 'errore' && <small role="alert">Foto non caricata. Riprova.</small>}
    </span>
  );
}
