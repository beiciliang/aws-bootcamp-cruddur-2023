-- this file was manually created
INSERT INTO public.users (display_name, email, handle, cognito_user_id)
VALUES
  ('Beici Liang', 'liangbeici@gmail.com', 'beiciliang' ,'MOCK'),
  ('Alt Liang', 'beici.liang@foxmail.com', 'altliang' ,'MOCK'),
  ('Andrew Bayko','bayko@exampro.co' , 'bayko' ,'MOCK'),
  ('Londo Mollari','lmollari@centari.com' ,'londo' ,'MOCK');

INSERT INTO public.activities (user_uuid, message, expires_at)
VALUES
  (
    (SELECT uuid from public.users WHERE users.handle = 'beiciliang' LIMIT 1),
    'This was imported as seed data!',
    current_timestamp + interval '10 day'
  ),
  (
    (SELECT uuid from public.users WHERE users.handle = 'altliang' LIMIT 1),
    'I am the other seed data!',
    current_timestamp + interval '10 day'
  );