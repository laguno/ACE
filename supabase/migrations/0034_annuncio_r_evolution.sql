-- Sprint 2: quando un genitore accende R-Evolution (impostazione r_evolution_da), Lani trova
-- l'annuncio alla prossima apertura. I genitori non scrivono popup_coda, quindi lo accoda il server
-- con questo trigger. Testo uguale a r_evolution_accesa in src/lib/copione (lo controlla il test).
-- Una sola volta per giorno di accensione (chiave unica): spegnere e riaccendere lo stesso giorno non lo ripete.

create or replace function annuncia_r_evolution() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.chiave = 'r_evolution_da' then
    insert into public.popup_coda (chiave, priorita, situazione, posa, titolo, testo)
    values ('r_evolution:' || (new.valore #>> '{}'), 4, 'r_evolution_accesa', 'lani-divisa', 'Arriva R-Evolution',
            'Da oggi anche la pallavolo fa camminare Astra: dieci minuti al mattino, le tue partite e le classifiche del campionato.')
    on conflict (chiave) do nothing;
  end if;
  return new;
end $$;
revoke execute on function annuncia_r_evolution() from public, anon, authenticated;

create trigger annuncio_r_evolution after insert or update on impostazioni
  for each row execute function annuncia_r_evolution();
