-- Studio (tappa 4).
-- Flash card legate alla verifica da cui nascono; una carta uguale (stessa materia, stesso fronte)
-- non si duplica quando l'IA rigenera o un quiz sbagliato la ripropone.
alter table flashcard add column verifica_id uuid references verifiche (id) on delete set null;
create unique index flashcard_unica on flashcard (materia_id, fronte);

-- Le domande sbagliate di un tentativo (indici in quiz.domande): il server ne fa flash card.
alter table quiz_tentativi add column sbagliate int[] not null default '{}';

-- Un quiz per verifica; il quiz breve della sera prima ripropone le domande sbagliate.
create unique index quiz_per_verifica on quiz (verifica_id) where verifica_id is not null;
