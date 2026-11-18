-- Rete di sicurezza per le foto delle pagine: ogni ora la funzione "foto-studio" prepara carte e
-- quiz con le foto ferme da più di un'ora (nessuno ha premuto "Ho finito"). Stesso segreto del cron
-- di tutte le altre funzioni (vault: cron_segreto).
create or replace function public.lancia_foto_studio() returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url := 'https://qonullxzhqvbfpiibqye.supabase.co/functions/v1/foto-studio',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-segreto', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_segreto')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
end $$;

revoke execute on function public.lancia_foto_studio() from public, anon, authenticated;

select cron.schedule('foto-studio', '40 * * * *', 'select public.lancia_foto_studio()');
