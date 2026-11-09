-- Immagini dei premi (approvato dal signore il 9/11): premio-N.webp (vera) e premio-N-sagoma.webp nel
-- bucket privato "premi". Nessuna regola d'accesso per anon e authenticated: il bucket lo legge solo il
-- server (service role), e la funzione "premi" dà a Lani URL firmati: la sagoma da subito, l'immagine
-- vera solo con l'enigma risolto o il forziere aperto. Non stanno in public/ né nel repository.
insert into storage.buckets (id, name, public) values ('premi', 'premi', false)
  on conflict (id) do nothing;

-- Il testo del premio per cui è stata fatta l'immagine: se un genitore cambia il premio, l'immagine
-- non vale più (al suo posto il pacco regalo) finché il signore non ne carica una nuova.
alter table forzieri add column immagine_per text;
