-- I genitori aggiungono foto a una richiesta in qualsiasi momento, anche chiusa da Lani o scaduta
-- (appunti, pagine mancanti). Lani resta limitata alle richieste aperte (0024).
create policy foto_genitori_caricano on storage.objects for insert to authenticated
  with check (
    bucket_id = 'foto-pagine' and public.e_genitore()
    and exists (select 1 from public.richieste_foto r where r.id::text = (storage.foldername(name))[1])
  );

-- Foto già passate a foto-studio (carte e quiz): così si può rilanciare solo sulle nuove.
alter table foto_pagine add column studio_il timestamptz;
