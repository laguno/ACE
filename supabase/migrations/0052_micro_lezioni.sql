-- Micro-lezione della settimana su come si studia (blocco D, 19/11/2026). I testi stanno nel
-- copione (docs/05-copione.md, src/lib/copione/lezioni.ts); qui solo chi l'ha letta e quando,
-- per Studio (la carta sparisce) e per il riepilogo della domenica dei genitori. Nessun passo.

create table micro_lezioni_lette (
  settimana date primary key check (extract(isodow from settimana) = 1),   -- lunedì
  lezione text not null check (length(lezione) between 1 and 40),
  letta_il timestamptz not null default now()
);
alter table micro_lezioni_lette enable row level security;
create policy famiglia_legge on micro_lezioni_lette for select to authenticated using (public.e_famiglia());
-- solo la settimana in corso
create policy lani_inserisce on micro_lezioni_lette for insert to authenticated
  with check (public.e_famiglia() and settimana = date_trunc('week', public.oggi())::date);
create policy genitori_cancellano on micro_lezioni_lette for delete to authenticated using (public.e_genitore());

create trigger lani_timbra before insert on micro_lezioni_lette
  for each row execute function timbra_ora('letta_il');
