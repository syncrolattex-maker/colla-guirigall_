-- Migration: Recuperació dels assajos passats de 2026 i actualització de la taxa d'assistència / puntuació ponderada
-- Data: 2026-09-08

-- 1. Actualització dels assajos existents (16 i 17)
UPDATE public.events 
SET type = 'Assaig General' 
WHERE id IN (16, 17);

UPDATE public.attendances 
SET attended = true 
WHERE eventid IN (16, 17) AND (status = 'Vull anar-hi' OR convocat = true);

-- 2. Inserció dels 11 assajos passats dels dijous de 2026 i assistències
DO $$
DECLARE
  v_eid BIGINT;
  v_dates TIMESTAMPTZ[] := ARRAY[
    '2026-06-04 18:30:00+02'::timestamptz,
    '2026-06-11 18:30:00+02'::timestamptz,
    '2026-06-18 18:30:00+02'::timestamptz,
    '2026-06-25 18:30:00+02'::timestamptz,
    '2026-07-02 18:30:00+02'::timestamptz,
    '2026-07-09 18:30:00+02'::timestamptz,
    '2026-07-23 18:30:00+02'::timestamptz,
    '2026-07-30 18:30:00+02'::timestamptz,
    '2026-08-06 18:30:00+02'::timestamptz,
    '2026-08-20 18:30:00+02'::timestamptz,
    '2026-08-27 18:30:00+02'::timestamptz
  ];
  d TIMESTAMPTZ;
  v_users_active TEXT[] := ARRAY[
    '231fef34-e60a-4527-924b-839ed668e43f', -- Jacint
    'd37c7f9c-83dc-46fc-9432-fe1d3a1daaed', -- Alex
    '212ae4be-0252-47e9-ba4e-ac2377c0a946', -- Miguel
    'dd7ee80b-23f5-495d-9353-c405ae814a2a', -- Carlos
    'f14ab58e-5652-4d96-a508-3b542703115c', -- Martí
    'f365ab83-ead0-4927-ac98-de6027abbcb3', -- Javi
    'feb87c65-3d98-4ad1-ac5d-5587e934a7e9', -- Manyo
    'f8b23759-54f6-4eb0-a267-b7661b4f65fe', -- Guillem
    'ad8dcc8b-76c7-4f7f-b707-2e7f05744b9f', -- Manu
    '1eb71d1b-3108-4d9c-a6b5-516039e24fca', -- Marivi
    '544cac21-376c-4fc5-9c3f-248d2ba808e3', -- Melina
    'man-ceci-dolcaina',                     -- Ceci
    '8959801c-6bac-4317-93c8-cb23640d60ec', -- Pauet
    'f64b8517-6877-4c37-be02-5dc67b6e03de', -- Rafelo
    '16cbcce3-f681-43d4-a61b-03fdd1f701fc', -- Toni
    'a1351fd2-d7df-4ac3-ada1-b23a14c861d8', -- Vicent Llàcer
    'man-joan-dolcaina',                     -- Joan
    '95f03868-6653-41bf-8382-e566fc630daa', -- Tobal
    '84977ba0-0ab8-4415-86f4-32773d87ac81', -- Aron
    'a4415efd-9c99-40fa-acec-84df734caf9c', -- Pere
    'man-amparo-tatay',                     -- Amparo
    'man-reillo-tabal',                     -- Reillo
    'bbf79962-f13b-473c-a4ec-1ee380426208', -- Paco
    'man-ximo-reillo'                       -- Ximo
  ];
  v_uid TEXT;
BEGIN
  FOREACH d IN ARRAY v_dates
  LOOP
    INSERT INTO public.events (title, type, date, location, notes, ispublished, createdby)
    VALUES (
      'Assaig General',
      'Assaig General',
      d,
      'Plaça Numero 8, 7A, 46290, Valencia',
      'Assaig general de preparació del repertori de la temporada.',
      true,
      'Master'
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_eid;

    IF v_eid IS NULL THEN
      SELECT id INTO v_eid FROM public.events WHERE title = 'Assaig General' AND date = d;
    END IF;

    IF v_eid IS NOT NULL THEN
      FOREACH v_uid IN ARRAY v_users_active
      LOOP
        INSERT INTO public.attendances (eventid, userid, status, convocat, attended)
        VALUES (v_eid, v_uid, 'Vull anar-hi', true, true)
        ON CONFLICT (eventid, userid) DO UPDATE SET attended = true, convocat = true, status = 'Vull anar-hi';
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- 3. Funció de puntuació ponderada d'assistència (50% actuacions, 50% assajos)
CREATE OR REPLACE FUNCTION public.member_attendance_score(p_user_id text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_peso_actuacions numeric := 0.5;
  v_peso_assajos numeric := 0.5;
  v_total_actuacions int := 0;
  v_attended_actuacions int := 0;
  v_total_assajos int := 0;
  v_attended_assajos int := 0;
  v_score_actuacions numeric := 0;
  v_score_assajos numeric := 0;
BEGIN
  SELECT COALESCE(peso_actuacions, 0.5), COALESCE(peso_assajos, 0.5) 
  INTO v_peso_actuacions, v_peso_assajos
  FROM public.attendance_weights WHERE id = 1;

  -- Total past actuacions
  SELECT count(*) INTO v_total_actuacions
  FROM public.events
  WHERE date < now() 
    AND NOT (type ILIKE 'Assaig%' OR title ILIKE '%assaig%')
    AND NOT COALESCE(is_cancelled, false);

  -- Attended past actuacions
  SELECT count(*) INTO v_attended_actuacions
  FROM public.attendances a
  JOIN public.events e ON a.eventid = e.id
  WHERE e.date < now() 
    AND NOT (e.type ILIKE 'Assaig%' OR e.title ILIKE '%assaig%')
    AND NOT COALESCE(e.is_cancelled, false)
    AND a.userid = p_user_id 
    AND (a.attended = true OR a.convocat = true OR a.status = 'Vull anar-hi');

  -- Total past assajos
  SELECT count(*) INTO v_total_assajos
  FROM public.events
  WHERE date < now() 
    AND (type ILIKE 'Assaig%' OR title ILIKE '%assaig%')
    AND NOT COALESCE(is_cancelled, false);

  -- Attended past assajos
  SELECT count(*) INTO v_attended_assajos
  FROM public.attendances a
  JOIN public.events e ON a.eventid = e.id
  WHERE e.date < now() 
    AND (e.type ILIKE 'Assaig%' OR e.title ILIKE '%assaig%')
    AND NOT COALESCE(e.is_cancelled, false)
    AND a.userid = p_user_id 
    AND (a.attended = true OR a.convocat = true OR a.status = 'Vull anar-hi');

  IF v_total_actuacions > 0 THEN
    v_score_actuacions := (v_attended_actuacions::numeric / v_total_actuacions::numeric) * v_peso_actuacions;
  END IF;

  IF v_total_assajos > 0 THEN
    v_score_assajos := (v_attended_assajos::numeric / v_total_assajos::numeric) * v_peso_assajos;
  END IF;

  RETURN ROUND(v_score_actuacions + v_score_assajos, 4);
END;
$$;

-- 4. Vista member_rotation_stats
CREATE OR REPLACE VIEW public.member_rotation_stats AS
SELECT 
  u.uid AS user_id,
  u.name,
  u.instrument,
  public.member_attendance_score(u.uid) AS score,
  COALESCE(rs.peso_acumulado, 0::numeric) AS peso_acumulado,
  COALESCE(u.is_experienced, FALSE) AS is_experienced
FROM public.users u
LEFT JOIN public.rotation_state rs ON u.uid = rs.user_id AND u.instrument = rs.instrument;
