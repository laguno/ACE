-- Cron delle partite FIPAV (0037, docs/08): ogni mezz'ora la funzione classifiche guarda se c'è una
-- partita da leggere (da inizio + 2 ore a mezzanotte) e legge il portale solo allora.

-- lancia_classifiche con un corpo: {} legge tutto (6:15), {"solo":"partite"} solo se c'è una partita da leggere
drop function if exists public.lancia_classifiche();
create function public.lancia_classifiche(p_corpo jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url := 'https://qonullxzhqvbfpiibqye.supabase.co/functions/v1/classifiche',
    body := p_corpo,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-segreto', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_segreto')
    ),
    timeout_milliseconds := 60000
  );
end $$;
revoke execute on function public.lancia_classifiche(jsonb) from public, anon, authenticated;

select cron.schedule('partite', '*/30 * * * *', $$select public.lancia_classifiche('{"solo":"partite"}'::jsonb)$$);
