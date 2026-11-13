-- Classifiche FIPAV: funzione "classifiche" ogni mattina (tabella in 0032), stesso segreto del Vault di 0003.
create or replace function public.lancia_classifiche() returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url := 'https://qonullxzhqvbfpiibqye.supabase.co/functions/v1/classifiche',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-segreto', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_segreto')
    ),
    timeout_milliseconds := 60000
  );
end $$;

revoke execute on function public.lancia_classifiche() from public, anon, authenticated;

-- il cron gira in UTC: 5:15 UTC = 6:15 d'inverno, 7:15 d'estate
select cron.schedule('classifiche', '15 5 * * *', 'select public.lancia_classifiche()');
