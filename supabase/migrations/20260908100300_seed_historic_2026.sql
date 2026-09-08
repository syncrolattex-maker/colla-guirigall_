-- Migració de dades: Sembra de l'històric 2026 i dels 28 membres de la Colla Guirigall
-- Data: 2026-09-08

DO $$
DECLARE
  -- Variables per als UIDs dels 28 membres
  uid_jacint TEXT := '231fef34-e60a-4527-924b-839ed668e43f';
  uid_dur TEXT := 'd37c7f9c-83dc-46fc-9432-fe1d3a1daaed';
  uid_miguel TEXT := '212ae4be-0252-47e9-ba4e-ac2377c0a946';
  uid_charly TEXT := 'dd7ee80b-23f5-495d-9353-c405ae814a2a';
  uid_marti TEXT := 'f14ab58e-5652-4d96-a508-3b542703115c';
  uid_javi TEXT := 'f365ab83-ead0-4927-ac98-de6027abbcb3';
  uid_manyo TEXT := 'feb87c65-3d98-4ad1-ac5d-5587e934a7e9';
  uid_guillem TEXT := 'f8b23759-54f6-4eb0-a267-b7661b4f65fe';
  uid_manu TEXT := 'ad8dcc8b-76c7-4f7f-b707-2e7f05744b9f';
  uid_marivi TEXT := '1eb71d1b-3108-4d9c-a6b5-516039e24fca';
  uid_melina TEXT := '544cac21-376c-4fc5-9c3f-248d2ba808e3';
  uid_ceci TEXT := 'man-ceci-dolcaina';
  uid_pauet TEXT := '8959801c-6bac-4317-93c8-cb23640d60ec';
  uid_rafelo TEXT := 'f64b8517-6877-4c37-be02-5dc67b6e03de';
  uid_toni TEXT := '16cbcce3-f681-43d4-a61b-03fdd1f701fc';
  uid_vllacer2 TEXT := 'a1351fd2-d7df-4ac3-ada1-b23a14c861d8';
  uid_joan TEXT := 'man-joan-dolcaina';
  uid_tobal TEXT := '95f03868-6653-41bf-8382-e566fc630daa';

  -- Tabals
  uid_aron TEXT := '84977ba0-0ab8-4415-86f4-32773d87ac81';
  uid_pere TEXT := 'a4415efd-9c99-40fa-acec-84df734caf9c';
  uid_amparo TEXT := 'man-amparo-tatay';
  uid_reillo TEXT := 'man-reillo-tabal';
  uid_paco TEXT := 'bbf79962-f13b-473c-a4ec-1ee380426208';
  uid_vsoriano TEXT := 'man-vicent-soriano';
  uid_mtaberner TEXT := 'man-marti-taberner';
  uid_ximo TEXT := 'man-ximo-reillo';
  uid_oscar TEXT := 'man-oscar-lujan';
  uid_marc TEXT := 'man-marc-tabal';

  v_eid BIGINT;
BEGIN
  -- 1. ACTUALITZACIÓ / INSERCIÓ DELS 28 MEMBRES
  -- Dolçaines
  INSERT INTO public.users (uid, name, email, instrument, role)
  VALUES 
    (uid_jacint, 'Jacint Hernández i Escorihuela', 'socjacint@gmail.com', 'Dolçaina', 'member'),
    (uid_dur, 'Alex Llàcer Rico', 'alllri@hotmail.com', 'Dolçaina', 'member'),
    (uid_miguel, 'Miguel Llàcer San Fernando', 'maikel6.9@gmail.com', 'Dolçaina', 'member'),
    (uid_charly, 'Carlos Avinyó Navarro', 'carlosavinonavarro@gmail.com', 'Dolçaina', 'member'),
    (uid_marti, 'Martí Pastor', 'marpasga@gmail.com', 'Dolçaina', 'member'),
    (uid_javi, 'Javi Julve', 'j.julve105@gmail.com', 'Dolçaina', 'member'),
    (uid_manyo, 'Vicent Martínez Sánchez', 'vimarsan1414@gmail.com', 'Dolçaina', 'member'),
    (uid_guillem, 'Guillem Taberner', 'gtaberners@enricvalor.es', 'Dolçaina', 'member'),
    (uid_manu, 'Manuel Hernández Fernández', 'manu.dolcaina@gmail.com', 'Dolçaina', 'member'),
    (uid_marivi, 'Marivi Blasco', 'mariviblasco@gmail.com', 'Dolçaina', 'member'),
    (uid_melina, 'Melina Carra', 'socmelina@gmail.com', 'Dolçaina', 'admin'),
    (uid_ceci, 'Cecília', 'cecilia@colla.guirigall', 'Dolçaina', 'member'),
    (uid_pauet, 'Pau Blanco', 'paublancobenavent@gmail.com', 'Dolçaina', 'member'),
    (uid_rafelo, 'Rafel López', 'raf3lo@gmail.com', 'Dolçaina', 'member'),
    (uid_toni, 'Toni Soto', 'tonisotocodina@gmail.com', 'Dolçaina', 'member'),
    (uid_vllacer2, 'Vicent Llàcer Gil', 'llazz79@gmail.com', 'Dolçaina', 'member'),
    (uid_joan, 'Joan', 'joan@colla.guirigall', 'Dolçaina', 'member'),
    (uid_tobal, 'Cristóbal Rentero Cordero', 'crentero@gmail.com', 'Dolçaina', 'admin')
  ON CONFLICT (uid) DO UPDATE SET
    name = EXCLUDED.name,
    instrument = EXCLUDED.instrument;

  -- Tabals
  INSERT INTO public.users (uid, name, email, instrument, role)
  VALUES 
    (uid_aron, 'Aron Primo', 'prologmac@gmail.com', 'Tabal', 'member'),
    (uid_pere, 'Pere Bernal Torres', 'perebernaltorres@gmail.com', 'Tabal', 'member'),
    (uid_amparo, 'Amparo Tatay', 'amparo.tatay@colla.guirigall', 'Tabal', 'member'),
    (uid_reillo, 'Jose Maria Reillo Hernández', 'josemaria.reillo@colla.guirigall', 'Tabal', 'member'),
    (uid_paco, 'Paco Luján', 'pacolujan18@gmail.com', 'Tabal', 'member'),
    (uid_vsoriano, 'Vicent Soriano', 'vicent.soriano@colla.guirigall', 'Tabal', 'member'),
    (uid_mtaberner, 'Martí Taberner', 'marti.taberner@colla.guirigall', 'Tabal', 'member'),
    (uid_ximo, 'Ximo Reillo Carra', 'ximo.reillo@colla.guirigall', 'Tabal', 'member'),
    (uid_oscar, 'Oscar Luján', 'oscar.lujan@colla.guirigall', 'Tabal', 'member'),
    (uid_marc, 'Marc (fill de Rafa)', 'marc.rafa@colla.guirigall', 'Tabal', 'member')
  ON CONFLICT (uid) DO UPDATE SET
    name = EXCLUDED.name,
    instrument = EXCLUDED.instrument;

  -- 2. INSERCIÓ DELS 22 ACTES DE 2026 I ASSISTÈNCIES

  -- Acte 1: 2026-05-30 Concert Algemesí Intercanvi matí (Tots, 12 assistents)
  INSERT INTO public.events (title, type, date, location, notes, ispublished, slots_dolcaina, slots_tabal)
  VALUES ('Intercanvi matí', 'Concert', '2026-05-30 11:00:00+02', 'Algemesí', 'Concert Intercanvi matí', true, NULL, NULL)
  RETURNING id INTO v_eid;
  INSERT INTO public.attendances (eventid, userid, status, convocat, attended) VALUES
    (v_eid, uid_jacint, 'Vull anar-hi', true, true),
    (v_eid, uid_dur, 'Vull anar-hi', true, true),
    (v_eid, uid_miguel, 'Vull anar-hi', true, true),
    (v_eid, uid_charly, 'Vull anar-hi', true, true),
    (v_eid, uid_marti, 'Vull anar-hi', true, true),
    (v_eid, uid_javi, 'Vull anar-hi', true, true),
    (v_eid, uid_manyo, 'Vull anar-hi', true, true),
    (v_eid, uid_guillem, 'Vull anar-hi', true, true),
    (v_eid, uid_marivi, 'Vull anar-hi', true, true),
    (v_eid, uid_ceci, 'Vull anar-hi', true, true),
    (v_eid, uid_aron, 'Vull anar-hi', true, true),
    (v_eid, uid_pere, 'Vull anar-hi', true, true)
  ON CONFLICT (eventid, userid) DO UPDATE SET attended = true, convocat = true;

  -- Acte 2: 2026-05-30 Concert Alcàsser Intercanvi vesprada (Tots, 9 assistents)
  INSERT INTO public.events (title, type, date, location, notes, ispublished, slots_dolcaina, slots_tabal)
  VALUES ('Intercanvi vesprada', 'Concert', '2026-05-30 18:00:00+02', 'Alcàsser', 'Concert Intercanvi vesprada', true, NULL, NULL)
  RETURNING id INTO v_eid;
  INSERT INTO public.attendances (eventid, userid, status, convocat, attended) VALUES
    (v_eid, uid_dur, 'Vull anar-hi', true, true),
    (v_eid, uid_miguel, 'Vull anar-hi', true, true),
    (v_eid, uid_charly, 'Vull anar-hi', true, true),
    (v_eid, uid_marti, 'Vull anar-hi', true, true),
    (v_eid, uid_javi, 'Vull anar-hi', true, true),
    (v_eid, uid_marivi, 'Vull anar-hi', true, true),
    (v_eid, uid_ceci, 'Vull anar-hi', true, true),
    (v_eid, uid_aron, 'Vull anar-hi', true, true),
    (v_eid, uid_pere, 'Vull anar-hi', true, true)
  ON CONFLICT (eventid, userid) DO UPDATE SET attended = true, convocat = true;

  -- Acte 3: 2026-06-07 Balls Alcàsser Corpus (Tots, 11 assistents)
  INSERT INTO public.events (title, type, date, location, notes, ispublished, slots_dolcaina, slots_tabal)
  VALUES ('Corpus', 'Balls', '2026-06-07 18:00:00+02', 'Alcàsser', 'Balls de Corpus', true, NULL, NULL)
  RETURNING id INTO v_eid;
  INSERT INTO public.attendances (eventid, userid, status, convocat, attended) VALUES
    (v_eid, uid_dur, 'Vull anar-hi', true, true),
    (v_eid, uid_miguel, 'Vull anar-hi', true, true),
    (v_eid, uid_charly, 'Vull anar-hi', true, true),
    (v_eid, uid_marti, 'Vull anar-hi', true, true),
    (v_eid, uid_javi, 'Vull anar-hi', true, true),
    (v_eid, uid_guillem, 'Vull anar-hi', true, true),
    (v_eid, uid_melina, 'Vull anar-hi', true, true),
    (v_eid, uid_ceci, 'Vull anar-hi', true, true),
    (v_eid, uid_pauet, 'Vull anar-hi', true, true),
    (v_eid, uid_rafelo, 'Vull anar-hi', true, true),
    (v_eid, uid_toni, 'Vull anar-hi', true, true)
  ON CONFLICT (eventid, userid) DO UPDATE SET attended = true, convocat = true;

  -- Acte 4: 2026-06-14 Concert Alcàsser Audició - Fi de Curs (Tots, 14 assistents)
  INSERT INTO public.events (title, type, date, location, notes, ispublished, slots_dolcaina, slots_tabal)
  VALUES ('Audició - Fi de Curs', 'Concert', '2026-06-14 12:00:00+02', 'Alcàsser', 'Concert Audició - Fi de Curs', true, NULL, NULL)
  RETURNING id INTO v_eid;
  INSERT INTO public.attendances (eventid, userid, status, convocat, attended) VALUES
    (v_eid, uid_dur, 'Vull anar-hi', true, true),
    (v_eid, uid_miguel, 'Vull anar-hi', true, true),
    (v_eid, uid_charly, 'Vull anar-hi', true, true),
    (v_eid, uid_marti, 'Vull anar-hi', true, true),
    (v_eid, uid_javi, 'Vull anar-hi', true, true),
    (v_eid, uid_guillem, 'Vull anar-hi', true, true),
    (v_eid, uid_ceci, 'Vull anar-hi', true, true),
    (v_eid, uid_pauet, 'Vull anar-hi', true, true),
    (v_eid, uid_rafelo, 'Vull anar-hi', true, true),
    (v_eid, uid_toni, 'Vull anar-hi', true, true),
    (v_eid, uid_aron, 'Vull anar-hi', true, true),
    (v_eid, uid_pere, 'Vull anar-hi', true, true),
    (v_eid, uid_amparo, 'Vull anar-hi', true, true),
    (v_eid, uid_reillo, 'Vull anar-hi', true, true)
  ON CONFLICT (eventid, userid) DO UPDATE SET attended = true, convocat = true;

  -- Acte 5: 2026-06-28 Processó Alcàsser Clav. Cor Jesus (1+1, 2 assistents)
  INSERT INTO public.events (title, type, date, location, notes, ispublished, slots_dolcaina, slots_tabal)
  VALUES ('Clav. Cor Jesus', 'Processó', '2026-06-28 20:00:00+02', 'Alcàsser', 'Processó Clavaris Cor de Jesús (1+1)', true, 1, 1)
  RETURNING id INTO v_eid;
  INSERT INTO public.attendances (eventid, userid, status, convocat, attended) VALUES
    (v_eid, uid_jacint, 'Vull anar-hi', true, true),
    (v_eid, uid_pere, 'Vull anar-hi', true, true)
  ON CONFLICT (eventid, userid) DO UPDATE SET attended = true, convocat = true;

  -- Acte 6: 2026-07-11 Moros i Cristians Aldaia Capitania (1 dolçaina, 1 assistent)
  INSERT INTO public.events (title, type, date, location, notes, ispublished, slots_dolcaina, slots_tabal)
  VALUES ('Capitania Moros i Cristians', 'Moros i Cristians', '2026-07-11 19:00:00+02', 'Aldaia', 'Capitania (1 dolçaina)', true, 1, 0)
  RETURNING id INTO v_eid;
  INSERT INTO public.attendances (eventid, userid, status, convocat, attended) VALUES
    (v_eid, uid_dur, 'Vull anar-hi', true, true)
  ON CONFLICT (eventid, userid) DO UPDATE SET attended = true, convocat = true;

  -- Acte 7: 2026-07-15 Cercavila Alcàsser Clav. Carme (2+1, 3 assistents)
  INSERT INTO public.events (title, type, date, location, notes, ispublished, slots_dolcaina, slots_tabal)
  VALUES ('Clav. Carme - Cercavila', 'Cercavila', '2026-07-15 19:30:00+02', 'Alcàsser', 'Cercavila Clavarieses del Carme (2+1)', true, 2, 1)
  RETURNING id INTO v_eid;
  INSERT INTO public.attendances (eventid, userid, status, convocat, attended) VALUES
    (v_eid, uid_dur, 'Vull anar-hi', true, true),
    (v_eid, uid_miguel, 'Vull anar-hi', true, true),
    (v_eid, uid_aron, 'Vull anar-hi', true, true)
  ON CONFLICT (eventid, userid) DO UPDATE SET attended = true, convocat = true;

  -- Acte 8: 2026-07-16 Processó Alcàsser Clav. Carme (2+1, 3 assistents)
  INSERT INTO public.events (title, type, date, location, notes, ispublished, slots_dolcaina, slots_tabal)
  VALUES ('Clav. Carme - Processó', 'Processó', '2026-07-16 20:30:00+02', 'Alcàsser', 'Processó Clavarieses del Carme (2+1)', true, 2, 1)
  RETURNING id INTO v_eid;
  INSERT INTO public.attendances (eventid, userid, status, convocat, attended) VALUES
    (v_eid, uid_dur, 'Vull anar-hi', true, true),
    (v_eid, uid_marivi, 'Vull anar-hi', true, true),
    (v_eid, uid_amparo, 'Vull anar-hi', true, true)
  ON CONFLICT (eventid, userid) DO UPDATE SET attended = true, convocat = true;

  -- Acte 9: 2026-07-18 Cercavila Alcàsser Clav. Sant Jaume (1+1, 2 assistents)
  INSERT INTO public.events (title, type, date, location, notes, ispublished, slots_dolcaina, slots_tabal)
  VALUES ('Clav. Sant Jaume - Baixada', 'Cercavila', '2026-07-18 20:00:00+02', 'Alcàsser', 'Cercavila Clavaris Sant Jaume (1+1)', true, 1, 1)
  RETURNING id INTO v_eid;
  INSERT INTO public.attendances (eventid, userid, status, convocat, attended) VALUES
    (v_eid, uid_dur, 'Vull anar-hi', true, true),
    (v_eid, uid_pere, 'Vull anar-hi', true, true)
  ON CONFLICT (eventid, userid) DO UPDATE SET attended = true, convocat = true;

  -- Acte 10: 2026-07-26 Cercavila Alcàsser Clav. Sant Jaume (1+1, 2 assistents)
  INSERT INTO public.events (title, type, date, location, notes, ispublished, slots_dolcaina, slots_tabal)
  VALUES ('Clav. Sant Jaume - Processó/Cercavila', 'Cercavila', '2026-07-26 20:00:00+02', 'Alcàsser', 'Cercavila Sant Jaume (1+1)', true, 1, 1)
  RETURNING id INTO v_eid;
  INSERT INTO public.attendances (eventid, userid, status, convocat, attended) VALUES
    (v_eid, uid_charly, 'Vull anar-hi', true, true),
    (v_eid, uid_reillo, 'Vull anar-hi', true, true)
  ON CONFLICT (eventid, userid) DO UPDATE SET attended = true, convocat = true;

  -- Acte 11: 2026-08-09 Cercavila Alcàsser Pregó (Tots, 10 assistents)
  INSERT INTO public.events (title, type, date, location, notes, ispublished, slots_dolcaina, slots_tabal)
  VALUES ('Pregó de Festes', 'Cercavila', '2026-08-09 20:00:00+02', 'Alcàsser', 'Cercavila Pregó (Tots)', true, NULL, NULL)
  RETURNING id INTO v_eid;
  INSERT INTO public.attendances (eventid, userid, status, convocat, attended) VALUES
    (v_eid, uid_dur, 'Vull anar-hi', true, true),
    (v_eid, uid_miguel, 'Vull anar-hi', true, true),
    (v_eid, uid_charly, 'Vull anar-hi', true, true),
    (v_eid, uid_javi, 'Vull anar-hi', true, true),
    (v_eid, uid_manyo, 'Vull anar-hi', true, true),
    (v_eid, uid_guillem, 'Vull anar-hi', true, true),
    (v_eid, uid_marivi, 'Vull anar-hi', true, true),
    (v_eid, uid_pere, 'Vull anar-hi', true, true),
    (v_eid, uid_amparo, 'Vull anar-hi', true, true),
    (v_eid, uid_reillo, 'Vull anar-hi', true, true)
  ON CONFLICT (eventid, userid) DO UPDATE SET attended = true, convocat = true;

  -- Acte 12: 2026-08-12 Cercavila Alcàsser Sopar Popular (2+1, 3 assistents)
  INSERT INTO public.events (title, type, date, location, notes, ispublished, slots_dolcaina, slots_tabal)
  VALUES ('Sopar Popular', 'Cercavila', '2026-08-12 21:00:00+02', 'Alcàsser', 'Cercavila Sopar Popular (2+1)', true, 2, 1)
  RETURNING id INTO v_eid;
  INSERT INTO public.attendances (eventid, userid, status, convocat, attended) VALUES
    (v_eid, uid_charly, 'Vull anar-hi', true, true),
    (v_eid, uid_guillem, 'Vull anar-hi', true, true),
    (v_eid, uid_reillo, 'Vull anar-hi', true, true)
  ON CONFLICT (eventid, userid) DO UPDATE SET attended = true, convocat = true;

  -- Acte 13: 2026-08-13 Cercavila Alcàsser Albaes (12 places, 13 assistents)
  INSERT INTO public.events (title, type, date, location, notes, ispublished, slots_dolcaina, slots_tabal)
  VALUES ('Nit d''Albaes', 'Cercavila', '2026-08-13 23:00:00+02', 'Alcàsser', 'Cercavila Albaes', true, 10, 2)
  RETURNING id INTO v_eid;
  INSERT INTO public.attendances (eventid, userid, status, convocat, attended) VALUES
    (v_eid, uid_dur, 'Vull anar-hi', true, true),
    (v_eid, uid_miguel, 'Vull anar-hi', true, true),
    (v_eid, uid_charly, 'Vull anar-hi', true, true),
    (v_eid, uid_marti, 'Vull anar-hi', true, true),
    (v_eid, uid_javi, 'Vull anar-hi', true, true),
    (v_eid, uid_manyo, 'Vull anar-hi', true, true),
    (v_eid, uid_guillem, 'Vull anar-hi', true, true),
    (v_eid, uid_ceci, 'Vull anar-hi', true, true),
    (v_eid, uid_pauet, 'Vull anar-hi', true, true),
    (v_eid, uid_rafelo, 'Vull anar-hi', true, true),
    (v_eid, uid_toni, 'Vull anar-hi', true, true),
    (v_eid, uid_amparo, 'Vull anar-hi', true, true),
    (v_eid, uid_reillo, 'Vull anar-hi', true, true)
  ON CONFLICT (eventid, userid) DO UPDATE SET attended = true, convocat = true;

  -- Acte 14: 2026-08-14 Cercavila Alcàsser Paelles (2+1, 3 assistents)
  INSERT INTO public.events (title, type, date, location, notes, ispublished, slots_dolcaina, slots_tabal)
  VALUES ('Nit de Paelles', 'Cercavila', '2026-08-14 21:00:00+02', 'Alcàsser', 'Cercavila Paelles (2+1)', true, 2, 1)
  RETURNING id INTO v_eid;
  INSERT INTO public.attendances (eventid, userid, status, convocat, attended) VALUES
    (v_eid, uid_dur, 'Vull anar-hi', true, true),
    (v_eid, uid_guillem, 'Vull anar-hi', true, true),
    (v_eid, uid_aron, 'Vull anar-hi', true, true)
  ON CONFLICT (eventid, userid) DO UPDATE SET attended = true, convocat = true;

  -- Acte 15: 2026-08-13 Cercavila Alcàsser Clav. d'Agost (1+1, 2 assistents)
  INSERT INTO public.events (title, type, date, location, notes, ispublished, slots_dolcaina, slots_tabal)
  VALUES ('Clav. d''Agost - Cercavila', 'Cercavila', '2026-08-13 12:00:00+02', 'Alcàsser', 'Cercavila Clavaris d''Agost (1+1)', true, 1, 1)
  RETURNING id INTO v_eid;
  INSERT INTO public.attendances (eventid, userid, status, convocat, attended) VALUES
    (v_eid, uid_miguel, 'Vull anar-hi', true, true),
    (v_eid, uid_reillo, 'Vull anar-hi', true, true)
  ON CONFLICT (eventid, userid) DO UPDATE SET attended = true, convocat = true;

  -- Acte 16: 2026-08-15 Processó Alcàsser Clav. d'Agost (1+1, 2 assistents)
  INSERT INTO public.events (title, type, date, location, notes, ispublished, slots_dolcaina, slots_tabal)
  VALUES ('Clav. d''Agost - Processó', 'Processó', '2026-08-15 20:30:00+02', 'Alcàsser', 'Processó Assumpció Clavaris d''Agost (1+1)', true, 1, 1)
  RETURNING id INTO v_eid;
  INSERT INTO public.attendances (eventid, userid, status, convocat, attended) VALUES
    (v_eid, uid_charly, 'Vull anar-hi', true, true),
    (v_eid, uid_amparo, 'Vull anar-hi', true, true)
  ON CONFLICT (eventid, userid) DO UPDATE SET attended = true, convocat = true;

  -- Acte 17: 2026-08-16 Cercavila Alcàsser Cavalcada (Tots, 15 assistents)
  INSERT INTO public.events (title, type, date, location, notes, ispublished, slots_dolcaina, slots_tabal)
  VALUES ('Cavalcada', 'Cercavila', '2026-08-16 19:30:00+02', 'Alcàsser', 'Cercavila Cavalcada (Tots)', true, NULL, NULL)
  RETURNING id INTO v_eid;
  INSERT INTO public.attendances (eventid, userid, status, convocat, attended) VALUES
    (v_eid, uid_jacint, 'Vull anar-hi', true, true),
    (v_eid, uid_dur, 'Vull anar-hi', true, true),
    (v_eid, uid_miguel, 'Vull anar-hi', true, true),
    (v_eid, uid_charly, 'Vull anar-hi', true, true),
    (v_eid, uid_marti, 'Vull anar-hi', true, true),
    (v_eid, uid_javi, 'Vull anar-hi', true, true),
    (v_eid, uid_manyo, 'Vull anar-hi', true, true),
    (v_eid, uid_manu, 'Vull anar-hi', true, true),
    (v_eid, uid_marivi, 'Vull anar-hi', true, true),
    (v_eid, uid_melina, 'Vull anar-hi', true, true),
    (v_eid, uid_vllacer2, 'Vull anar-hi', true, true),
    (v_eid, uid_joan, 'Vull anar-hi', true, true),
    (v_eid, uid_pere, 'Vull anar-hi', true, true),
    (v_eid, uid_amparo, 'Vull anar-hi', true, true),
    (v_eid, uid_marc, 'Vull anar-hi', true, true)
  ON CONFLICT (eventid, userid) DO UPDATE SET attended = true, convocat = true;

  -- Acte 18: 2026-08-17 Processó Alcàsser Crist (2+1, 2 assistents)
  INSERT INTO public.events (title, type, date, location, notes, ispublished, slots_dolcaina, slots_tabal)
  VALUES ('Processó del Crist', 'Processó', '2026-08-17 21:00:00+02', 'Alcàsser', 'Processó del Santíssim Crist de la Fe (2+1)', true, 2, 1)
  RETURNING id INTO v_eid;
  INSERT INTO public.attendances (eventid, userid, status, convocat, attended) VALUES
    (v_eid, uid_charly, 'Vull anar-hi', true, true),
    (v_eid, uid_paco, 'Vull anar-hi', true, true)
  ON CONFLICT (eventid, userid) DO UPDATE SET attended = true, convocat = true;

  -- Acte 19: 2026-08-17 Balls Alcàsser Magrana (1+1, 2 assistents)
  INSERT INTO public.events (title, type, date, location, notes, ispublished, slots_dolcaina, slots_tabal)
  VALUES ('Ball de la Magrana', 'Balls', '2026-08-17 19:00:00+02', 'Alcàsser', 'Ball de la Magrana (1+1)', true, 1, 1)
  RETURNING id INTO v_eid;
  INSERT INTO public.attendances (eventid, userid, status, convocat, attended) VALUES
    (v_eid, uid_marivi, 'Vull anar-hi', true, true),
    (v_eid, uid_paco, 'Vull anar-hi', true, true)
  ON CONFLICT (eventid, userid) DO UPDATE SET attended = true, convocat = true;

  -- Acte 20: 2026-08-17 Balls Alcàsser Nans (1+1, 2 assistents)
  INSERT INTO public.events (title, type, date, location, notes, ispublished, slots_dolcaina, slots_tabal)
  VALUES ('Ball dels Nans', 'Balls', '2026-08-17 19:30:00+02', 'Alcàsser', 'Ball dels Nans (1+1)', true, 1, 1)
  RETURNING id INTO v_eid;
  INSERT INTO public.attendances (eventid, userid, status, convocat, attended) VALUES
    (v_eid, uid_melina, 'Vull anar-hi', true, true),
    (v_eid, uid_paco, 'Vull anar-hi', true, true)
  ON CONFLICT (eventid, userid) DO UPDATE SET attended = true, convocat = true;

  -- Acte 21: 2026-08-17 Balls Alcàsser Moma (1+1, 2 assistents)
  INSERT INTO public.events (title, type, date, location, notes, ispublished, slots_dolcaina, slots_tabal)
  VALUES ('Ball de la Moma', 'Balls', '2026-08-17 20:00:00+02', 'Alcàsser', 'Ball de la Moma (1+1)', true, 1, 1)
  RETURNING id INTO v_eid;
  INSERT INTO public.attendances (eventid, userid, status, convocat, attended) VALUES
    (v_eid, uid_dur, 'Vull anar-hi', true, true),
    (v_eid, uid_ximo, 'Vull anar-hi', true, true)
  ON CONFLICT (eventid, userid) DO UPDATE SET attended = true, convocat = true;

  -- Acte 22: 2026-08-26 Cercavila Alcàsser Clav. Sants Pedra (1+1, 2 assistents)
  INSERT INTO public.events (title, type, date, location, notes, ispublished, slots_dolcaina, slots_tabal)
  VALUES ('Clav. Sants Pedra', 'Cercavila', '2026-08-26 20:00:00+02', 'Alcàsser', 'Cercavila Sants de la Pedra (1+1)', true, 1, 1)
  RETURNING id INTO v_eid;
  INSERT INTO public.attendances (eventid, userid, status, convocat, attended) VALUES
    (v_eid, uid_tobal, 'Vull anar-hi', true, true),
    (v_eid, uid_aron, 'Vull anar-hi', true, true)
  ON CONFLICT (eventid, userid) DO UPDATE SET attended = true, convocat = true;

  -- 3. INICIALITZACIÓ DELS PESOS DE ROTACIÓ (rotation_state)
  -- Inicialitzem el pes proporcionalment: qui més ha participat té menys pes inicial acumulat
  -- per afavorir els que menys han eixit en les noves convocatòries
  INSERT INTO public.rotation_state (user_id, instrument, peso_acumulado, last_selected_at)
  VALUES
    -- Dolçaines
    (uid_jacint, 'Dolçaina', -30, '2026-08-16 19:30:00+02'),
    (uid_dur, 'Dolçaina', -110, '2026-08-17 20:00:00+02'),
    (uid_miguel, 'Dolçaina', -90, '2026-08-16 19:30:00+02'),
    (uid_charly, 'Dolçaina', -100, '2026-08-17 21:00:00+02'),
    (uid_marti, 'Dolçaina', -60, '2026-08-16 19:30:00+02'),
    (uid_javi, 'Dolçaina', -70, '2026-08-16 19:30:00+02'),
    (uid_manyo, 'Dolçaina', -50, '2026-08-16 19:30:00+02'),
    (uid_guillem, 'Dolçaina', -70, '2026-08-14 21:00:00+02'),
    (uid_manu, 'Dolçaina', -10, '2026-08-16 19:30:00+02'),
    (uid_marivi, 'Dolçaina', -60, '2026-08-17 19:00:00+02'),
    (uid_melina, 'Dolçaina', -30, '2026-08-17 19:30:00+02'),
    (uid_ceci, 'Dolçaina', -60, '2026-08-13 23:00:00+02'),
    (uid_pauet, 'Dolçaina', -30, '2026-08-13 23:00:00+02'),
    (uid_rafelo, 'Dolçaina', -30, '2026-08-13 23:00:00+02'),
    (uid_toni, 'Dolçaina', -30, '2026-08-13 23:00:00+02'),
    (uid_vllacer2, 'Dolçaina', -10, '2026-08-16 19:30:00+02'),
    (uid_joan, 'Dolçaina', -10, '2026-08-16 19:30:00+02'),
    (uid_tobal, 'Dolçaina', -10, '2026-08-26 20:00:00+02'),

    -- Tabals
    (uid_aron, 'Tabal', -50, '2026-08-26 20:00:00+02'),
    (uid_pere, 'Tabal', -70, '2026-08-16 19:30:00+02'),
    (uid_amparo, 'Tabal', -60, '2026-08-16 19:30:00+02'),
    (uid_reillo, 'Tabal', -60, '2026-08-13 23:00:00+02'),
    (uid_paco, 'Tabal', -30, '2026-08-17 21:00:00+02'),
    (uid_vsoriano, 'Tabal', 0, NULL),
    (uid_mtaberner, 'Tabal', 0, NULL),
    (uid_ximo, 'Tabal', -10, '2026-08-17 20:00:00+02'),
    (uid_oscar, 'Tabal', 0, NULL),
    (uid_marc, 'Tabal', -10, '2026-08-16 19:30:00+02')
  ON CONFLICT (user_id, instrument) DO UPDATE SET
    peso_acumulado = EXCLUDED.peso_acumulado,
    last_selected_at = EXCLUDED.last_selected_at;

END $$;
