-- Seed dell'ambiente di prova LOCALE: nessun dato vero.
-- Spegne tutti i cron, così in locale non parte nulla da solo.
select cron.unschedule(jobid) from cron.job;
