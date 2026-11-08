-- Materia delle note (Nuvola la dà): serve al popup "Nota disciplinare in {materia}".
alter table note add column materia_id text references materie (id);
