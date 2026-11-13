-- Sprint 2: classifiche dei campionati di Lani (config classifiche.campionati), copiate dal portale
-- FIPAV dalla funzione "classifiche" (cron in 0033, ogni mattina alle 6:15 di Roma, o un genitore).
-- La famiglia le legge; le scrive solo il server.

create table classifiche (
  cid integer primary key,                  -- codice del girone sul portale
  campionato text not null,                 -- "Under 13"
  girone text not null,
  squadra text not null,                    -- nome della squadra di Lani sul portale
  righe jsonb not null default '[]',        -- [{pos, squadra, punti, giocate, vinte, perse, set_fatti, set_subiti}]
  aggiornata_il timestamptz not null default now()
);

alter table classifiche enable row level security;
create policy famiglia_legge on classifiche for select to authenticated using (public.e_famiglia());
