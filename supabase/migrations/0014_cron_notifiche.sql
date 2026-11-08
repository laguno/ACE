-- Notifiche push: la funzione "notifiche" ogni 15 minuti decide cosa mandare (limiti del copione
-- in notifiche_inviate, una per tipo al giorno).
create or replace function public.lancia_notifiche() returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url := 'https://qonullxzhqvbfpiibqye.supabase.co/functions/v1/notifiche',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-segreto', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_segreto')
    ),
    timeout_milliseconds := 60000
  );
end $$;

revoke execute on function public.lancia_notifiche() from public, anon, authenticated;

select cron.schedule('notifiche', '*/15 * * * *', 'select public.lancia_notifiche()');
