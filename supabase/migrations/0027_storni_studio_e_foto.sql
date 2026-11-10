-- Decisioni del signore del 10/11 (rapporto di venerdì, Da decidere 4 e 7).
--
-- 1. Storno di un compito: tolti anche i passi di studio facoltativo (flash card, quiz, video) di
--    quel giorno. Una spunta falsa sbloccava lo studio e quei passi restavano.
-- 2. Foto cancellata: la richiesta si riapre da sola e il +2 di Lani si storna; rifacendo la foto
--    il +2 torna (la funzione "passi" usa come riferimento richiesta, poi richiesta:1, :2... dopo
--    ogni storno). Come per le spunte, niente storno a chiavi della settimana già date.

-- ------------------------------------------------------------------ 1. storno di un compito

create or replace function storna_spunta(p_motivo text, p_riferimento text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  m public.movimenti_passi;
  s public.movimenti_passi;
begin
  if not public.e_genitore() then
    raise exception 'Solo un genitore può correggere una spunta';
  end if;
  select * into m from public.movimenti_passi where motivo = p_motivo and riferimento = p_riferimento;
  if not found or m.passi = 0 then
    return false;
  end if;
  if exists (
    select 1 from public.settimane
    where inizio = m.giorno - (extract(isodow from m.giorno)::int - 1) and chiavi is not null
  ) then
    return false;
  end if;
  if p_motivo = 'compito' then
    for s in select * from public.movimenti_passi
             where motivo in ('flashcard', 'quiz', 'video') and giorno = m.giorno and passi > 0 loop
      perform public.registra_passi('storno', s.motivo || ':' || s.riferimento, -s.passi,
                                    s.moltiplicatore, public.oggi(), auth.uid());
    end loop;
  end if;
  return public.registra_passi('storno', p_motivo || ':' || p_riferimento, -m.passi,
                               m.moltiplicatore, public.oggi(), auth.uid()) is not null;
end $$;

-- ------------------------------------------------------------------ 2. foto cancellata

create or replace function foto_cancellata() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  m public.movimenti_passi;
begin
  if old.richiesta_id is null then
    return old;
  end if;
  update public.richieste_foto set stato = 'aperta' where id = old.richiesta_id;
  for m in select * from public.movimenti_passi x
           where x.motivo = 'foto' and x.passi > 0
             and (x.riferimento = old.richiesta_id::text or x.riferimento like old.richiesta_id::text || ':%')
             and not exists (select 1 from public.movimenti_passi y where y.motivo = 'storno' and y.riferimento = 'foto:' || x.riferimento)
             and not exists (select 1 from public.settimane
                             where inizio = x.giorno - (extract(isodow from x.giorno)::int - 1) and chiavi is not null) loop
    perform public.registra_passi('storno', 'foto:' || m.riferimento, -m.passi, m.moltiplicatore, public.oggi(), auth.uid());
  end loop;
  return old;
end $$;
revoke execute on function foto_cancellata() from public, anon, authenticated;

create trigger foto_cancellata after delete on foto_pagine
  for each row execute function foto_cancellata();
