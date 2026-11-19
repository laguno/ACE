-- Peso del voto e "calcolato nella media", come nella card del voto su Nuvola (voti/materia/{id}).
-- Il sync li riempie a ogni giro; finché non lo ha fatto un voto vale peso 100 e fa media.
-- "tipo" esisteva già (scritto, orale, pratico) ma non veniva scritta.
alter table voti
  add column peso numeric(5, 2) check (peso between 0 and 100),
  add column fa_media boolean not null default true;
