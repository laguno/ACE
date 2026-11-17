-- Seed dell'ambiente di prova LOCALE: nessun dato vero.
-- Spegne tutti i cron, così in locale non parte nulla da solo.
select cron.unschedule(jobid) from cron.job;

-- Due account FINTI per entrare nell'app in locale (password di prova, mai reali):
--   genitore@prova.test / prova-genitore-1   (ruolo genitore)
--   lani@prova.test     / prova-lani-1       (la "Lani" finta)
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated',
   'genitore@prova.test', extensions.crypt('prova-genitore-1', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000a2', 'authenticated', 'authenticated',
   'lani@prova.test', extensions.crypt('prova-lani-1', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', '', '', '', '');

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), now(), now(), now()
from auth.users u where u.email in ('genitore@prova.test', 'lani@prova.test');

insert into public.profili (id, ruolo, nome) values
  ('00000000-0000-4000-8000-0000000000a1', 'genitore', 'Genitore Prova'),
  ('00000000-0000-4000-8000-0000000000a2', 'lani', 'Lani Prova');
