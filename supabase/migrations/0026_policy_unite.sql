-- Prestazioni delle regole (advisors di Supabase, filone H): stessi permessi di prima, meno regole
-- da valutare per ogni riga. Nessun permesso nuovo: lo prova la matrice di npm run prova:schema.
--
-- 1. Dove c'è già famiglia_legge (e_famiglia() comprende i genitori), genitori_leggono è un doppione.
-- 2. genitori_tutto (tutte le azioni) accanto a famiglia_legge e lani_aggiorna: diventa solo le
--    azioni che mancano (inserire, cancellare, e aggiornare dove Lani non può).
-- 3. foto_pagine e push_iscrizioni: una regola per azione, con le due condizioni in "or".
-- 4. auth.uid() dentro (select ...): calcolato una volta per richiesta, non per riga.

-- ------------------------------------------------------------------ 1

do $$
declare t text;
begin
  for t in
    select g.tablename from pg_policies g
    join pg_policies f on f.schemaname = g.schemaname and f.tablename = g.tablename and f.policyname = 'famiglia_legge'
    where g.schemaname = 'public' and g.policyname = 'genitori_leggono'
  loop
    execute format('drop policy genitori_leggono on public.%I', t);
  end loop;
end $$;

-- ------------------------------------------------------------------ 2

do $$
declare t text;
begin
  foreach t in array array['compiti', 'fogli_firma', 'gesti_casa', 'impostazioni', 'sgridate'] loop
    execute format('drop policy genitori_tutto on public.%I', t);
    execute format('create policy genitori_inseriscono on public.%I for insert to authenticated with check (public.e_genitore())', t);
    execute format('create policy genitori_cancellano on public.%I for delete to authenticated using (public.e_genitore())', t);
    -- dove Lani aggiorna già (lani_aggiorna con e_famiglia), quella regola vale anche per i genitori
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'lani_aggiorna') then
      execute format('create policy genitori_aggiornano on public.%I for update to authenticated using (public.e_genitore()) with check (public.e_genitore())', t);
    end if;
  end loop;
end $$;

-- ------------------------------------------------------------------ 3

drop policy genitori_tutto on foto_pagine;
drop policy lani_inserisce on foto_pagine;
-- i genitori registrano qualsiasi foto; Lani solo la sua, con il file vero, nella cartella della richiesta (0024)
create policy inserisce on foto_pagine for insert to authenticated with check (
  public.e_genitore()
  or (
    public.e_famiglia()
    and caricata_da = (select auth.uid())
    and percorso_storage like richiesta_id::text || '/%'
    and exists (
      select 1 from storage.objects o
      where o.bucket_id = 'foto-pagine' and o.name = percorso_storage and o.owner_id = (select auth.uid())::text
    )
  )
);
create policy genitori_aggiornano on foto_pagine for update to authenticated using (public.e_genitore()) with check (public.e_genitore());
create policy genitori_cancellano on foto_pagine for delete to authenticated using (public.e_genitore());

drop policy genitori_tutto on push_iscrizioni;
drop policy proprie on push_iscrizioni;
create policy proprie on push_iscrizioni for all to authenticated
  using (profilo_id = (select auth.uid()) or public.e_genitore())
  with check (profilo_id = (select auth.uid()) or public.e_genitore());

-- ------------------------------------------------------------------ 4

drop policy proprio on saldo_visto;
create policy proprio on saldo_visto for select to authenticated using (profilo_id = (select auth.uid()));

drop policy registra_propri on errori_client;
create policy registra_propri on errori_client for insert to authenticated
  with check (profilo_id = (select auth.uid()) and origine = 'app');
