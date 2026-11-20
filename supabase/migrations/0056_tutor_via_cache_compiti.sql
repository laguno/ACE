-- Tutor (blocco E): la vecchia risposta salvata in compiti.spiegazione conteneva i tre indizi, e Lani
-- legge la tabella compiti: li vedeva tutti senza aver provato. Da ora la funzione `spiega` usa
-- tutor_aiuti; la colonna resta (non si toglie per non rompere l'app già installata) ma si svuota.
update compiti set spiegazione = null where spiegazione is not null;
comment on column compiti.spiegazione is 'Non più usata dal 19/11/2026 (blocco E): vedi tutor_aiuti.';
