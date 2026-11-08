-- Sincronizzazione con Nuvola alle 14:30 e alle 19:30 (ora italiana).
-- pg_cron ragiona in UTC: il job gira alle :30 delle ore che possono essere 14 e 19 a Roma
-- (12, 13, 17 e 18 UTC tra ora legale e solare) e la funzione parte solo se a Roma è l'ora giusta.
-- Il segreto per chiamare sync-nuvola sta nel Vault ('cron_segreto'), uguale a CRON_SEGRETO
-- dei segreti delle Edge Functions; si inserisce a mano, mai nel repository.
-- (Non gira su PGlite: scripts/prova-schema.mjs salta le migrazioni del cron.)
create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.lancia_sync_nuvola() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if extract(hour from now() at time zone 'Europe/Rome') not in (14, 19) then return; end if;
  perform net.http_post(
    url := 'https://qonullxzhqvbfpiibqye.supabase.co/functions/v1/sync-nuvola',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-segreto', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_segreto')
    ),
    timeout_milliseconds := 120000
  );
end $$;

revoke execute on function public.lancia_sync_nuvola() from public, anon, authenticated;

select cron.schedule('sync-nuvola', '30 12,13,17,18 * * *', 'select public.lancia_sync_nuvola()');
