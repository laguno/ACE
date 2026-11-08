-- Copione (tappa 6).
-- Un popup per evento: la chiave (es. 'voto:<id>', 'tappa:5') rende idempotente l'accodamento.
alter table popup_coda add column chiave text unique;

-- Notifiche push inviate: una per tipo al giorno, così il cron ogni 15 minuti rispetta i limiti
-- del copione (3 al giorno + 1 sollecito). Solo il server scrive; i genitori leggono.
create table notifiche_inviate (
  giorno date not null,
  tipo text not null,                     -- 'mattina' | 'pomeriggio' | 'chiusura' | 'sollecito' | 'genitori_riepilogo'
  testo text not null,
  inviata_il timestamptz not null default now(),
  primary key (giorno, tipo)
);
alter table notifiche_inviate enable row level security;
create policy genitori_tutto on notifiche_inviate for all to authenticated using (e_genitore()) with check (e_genitore());
