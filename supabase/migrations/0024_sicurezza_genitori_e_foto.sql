-- Filone A del piano (sicurezza, 10/11): quattro buchi trovati con la prova di attacco.
--
-- 1. I genitori potevano scrivere a mano nelle tabelle del server (movimenti_passi, voti, note,
--    settimane, figurine...): passi e chiavi arbitrari fuori dalle funzioni previste. Ora le
--    leggono soltanto; scrivono il server (service role) e le funzioni (registra_passi,
--    storna_spunta, imposta_pin). Restano le scritture che l'area genitori usa davvero: compiti
--    (correzioni), fogli, forzieri (premio e consegna), frasi, gesti, impostazioni, sgridate, foto.
-- 2. Sui forzieri un genitore poteva aprire un forziere o azzerare i tentativi dell'enigma. Ora
--    cambia solo il premio (premio_fermo resta) e segna "consegnato" un forziere aperto.
-- 3. Lani poteva inserire la riga di una foto senza caricare il file e prendere i passi della
--    richiesta. Ora la riga vale solo se il file c'è, l'ha caricato lei, nella cartella della sua
--    richiesta; e nello storage si carica solo nella cartella di una richiesta aperta, solo
--    immagini, al massimo 10 MB.
-- 4. Lani leggeva le frasi di famiglia non ancora uscite.

-- ------------------------------------------------------------------ 1. genitori: solo lettura

do $$
declare t text;
begin
  foreach t in array array[
    'movimenti_passi', 'voti', 'note', 'settimane', 'figurine', 'notifiche_inviate', 'sync_log',
    'richieste_foto', 'quiz', 'quiz_tentativi', 'flashcard', 'flashcard_giri', 'video', 'video_visti',
    'materie', 'lezioni', 'verifiche', 'sessioni_ripasso', 'impegni_famiglia', 'umore', 'profili',
    'popup_coda', 'serate'
  ] loop
    execute format('drop policy genitori_tutto on public.%I', t);
    execute format('create policy genitori_leggono on public.%I for select to authenticated using (public.e_genitore())', t);
  end loop;
end $$;

-- il PIN passa solo dalle funzioni (imposta_pin, controlla_pin, verifica_pin): nessuno lo legge
drop policy genitori_tutto on pin_genitori;

-- ------------------------------------------------------------------ 2. forzieri: premio e consegna

create or replace function genitore_solo_premio() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null then
    return new; -- server
  end if;
  if (to_jsonb(new) - array['premio', 'stato', 'consegnato_il']) is distinct from (to_jsonb(old) - array['premio', 'stato', 'consegnato_il'])
     or (new.stato is distinct from old.stato and not (old.stato = 'aperto' and new.stato = 'consegnato')) then
    raise exception 'Un genitore cambia solo il premio e segna il forziere consegnato';
  end if;
  return new;
end $$;

create trigger genitore_solo_premio before update on forzieri
  for each row execute function genitore_solo_premio();

-- ------------------------------------------------------------------ 3. foto delle pagine

drop policy lani_inserisce on foto_pagine;
create policy lani_inserisce on foto_pagine for insert to authenticated with check (
  public.e_famiglia()
  and caricata_da = auth.uid()
  and percorso_storage like richiesta_id::text || '/%'
  and exists (
    select 1 from storage.objects o
    where o.bucket_id = 'foto-pagine' and o.name = percorso_storage and o.owner_id = auth.uid()::text
  )
);

drop policy foto_famiglia_carica on storage.objects;
create policy foto_famiglia_carica on storage.objects for insert to authenticated with check (
  bucket_id = 'foto-pagine'
  and public.e_famiglia()
  and exists (
    select 1 from public.richieste_foto r
    where r.id::text = (storage.foldername(name))[1] and r.stato = 'aperta'
  )
);

update storage.buckets
set file_size_limit = 10 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id = 'foto-pagine';

-- ------------------------------------------------------------------ 4. frasi di famiglia

-- Lani leggeva tutte le frasi, anche quelle di famiglia non ancora uscite. La sua app le prende
-- solo da frase_del_giorno() (una al giorno); la tabella la leggono i genitori.
drop policy famiglia_legge on frasi;
