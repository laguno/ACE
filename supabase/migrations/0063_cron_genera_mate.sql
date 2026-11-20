-- Blocco F: ogni giorno la funzione "genera-mate" prepara la serie di esercizi per le verifiche di
-- matematica dei prossimi 14 giorni che non l'hanno ancora (al massimo 2 per giro). Dopo il giro
-- di sync-nuvola delle 14:30, che porta le verifiche nuove. Stesso segreto delle altre funzioni.
create or replace function public.lancia_genera_mate() returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url := 'https://qonullxzhqvbfpiibqye.supabase.co/functions/v1/genera-mate',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-segreto', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_segreto')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
end $$;

revoke execute on function public.lancia_genera_mate() from public, anon, authenticated;

-- il cron gira in UTC: 14:05 UTC = 15:05 d'inverno, 16:05 d'estate
select cron.schedule('genera-mate', '5 14 * * *', 'select public.lancia_genera_mate()');
