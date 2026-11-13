-- Sprint 2, dalla revisione del 13/11: due controlli sulle partite che stavano solo nell'app.
-- 1. Lani segna una partita solo a nome suo (dato_da = chi scrive): i passi di una partita approvata
--    senza utente (server, SQL) sono firmati con dato_da e non devono finire a nome di un genitore.
-- 2. Nella pallavolo non c'è pareggio: niente set uguali.

drop policy famiglia_inserisce on partite;
create policy famiglia_inserisce on partite for insert to authenticated with check (
  public.e_genitore()
  or (public.e_famiglia() and dato_da = (select auth.uid()) and approvata_il is null and approvata_da is null
      and data between oggi() - 14 and oggi())
);

alter table partite add constraint niente_pareggi check (set_nostri <> set_loro);
