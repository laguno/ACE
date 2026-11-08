-- Avviso di Supabase "extension in public": pg_net va nello schema extensions (revisione di Jarvis).
-- pg_net non si sposta con ALTER EXTENSION: si ricrea. Le sue funzioni restano nello schema net,
-- quindi le lancia_* dei cron (che chiamano net.http_post) non cambiano.
-- ("cron" nel nome: PGlite non ha pg_net e salta questa migrazione.)
drop extension if exists pg_net;
create extension pg_net with schema extensions;
