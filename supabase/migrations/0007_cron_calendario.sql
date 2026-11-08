-- Calendario di famiglia: sync-calendario ogni ora, ai 5 minuti (stesso segreto del Vault di 0003).
create or replace function public.lancia_sync_calendario() returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url := 'https://qonullxzhqvbfpiibqye.supabase.co/functions/v1/sync-calendario',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-segreto', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_segreto')
    ),
    timeout_milliseconds := 60000
  );
end $$;

revoke execute on function public.lancia_sync_calendario() from public, anon, authenticated;

select cron.schedule('sync-calendario', '5 * * * *', 'select public.lancia_sync_calendario()');
