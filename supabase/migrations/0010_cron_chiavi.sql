-- Chiavi della domenica sera: la funzione "chiavi" alle 21:30 ora italiana. pg_cron è in UTC:
-- gira alle 19:30 e 20:30 UTC di domenica; la funzione salta se a Roma non sono ancora le 21 e
-- non conta due volte la stessa settimana.
create or replace function public.lancia_chiavi() returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url := 'https://qonullxzhqvbfpiibqye.supabase.co/functions/v1/chiavi',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-segreto', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_segreto')
    ),
    timeout_milliseconds := 60000
  );
end $$;

revoke execute on function public.lancia_chiavi() from public, anon, authenticated;

select cron.schedule('chiavi', '30 19,20 * * 0', 'select public.lancia_chiavi()');
