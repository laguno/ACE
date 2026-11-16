-- Notifiche anche al guscio Android di ACE (docs/07): Firebase Cloud Messaging.
-- Un'iscrizione è "web" (Web Push, endpoint + chiavi del browser, come l'iPad) o "fcm" (endpoint =
-- gettone FCM del dispositivo, senza chiavi). Le regole di accesso restano quelle di 0026.
alter table push_iscrizioni add column tipo text not null default 'web' check (tipo in ('web', 'fcm'));
alter table push_iscrizioni alter column chiavi drop not null;
alter table push_iscrizioni add constraint push_iscrizioni_chiavi_web check (tipo = 'fcm' or chiavi is not null);
