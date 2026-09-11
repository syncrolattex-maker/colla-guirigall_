-- Count every non-rehearsal event as an actuació (Concert, Cercavila, Processó, Balls, etc.)
-- so attendance stats and SWRR score are coherent with what members see in the profile.
CREATE OR REPLACE FUNCTION public.member_attendance_score(p_user_id text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_peso_actuacions numeric;
  v_peso_assajos numeric;
  v_total_actuacions int;
  v_attended_actuacions int;
  v_total_assajos int;
  v_attended_assajos int;
  v_score_actuacions numeric := 0;
  v_score_assajos numeric := 0;
BEGIN
  SELECT peso_actuacions, peso_assajos INTO v_peso_actuacions, v_peso_assajos
  FROM public.attendance_weights WHERE id = 1;

  SELECT count(*) INTO v_total_actuacions
  FROM public.events
  WHERE type NOT LIKE 'Assaig%' AND date < now();

  SELECT count(*) INTO v_attended_actuacions
  FROM public.attendances a
  JOIN public.events e ON a.eventid = e.id
  WHERE e.type NOT LIKE 'Assaig%' AND e.date < now() AND a.userid = p_user_id AND a.attended = true;

  SELECT count(*) INTO v_total_assajos
  FROM public.events
  WHERE type LIKE 'Assaig%' AND date < now();

  SELECT count(*) INTO v_attended_assajos
  FROM public.attendances a
  JOIN public.events e ON a.eventid = e.id
  WHERE e.type LIKE 'Assaig%' AND e.date < now() AND a.userid = p_user_id AND a.attended = true;

  IF v_total_actuacions > 0 THEN
    v_score_actuacions := (v_attended_actuacions::numeric / v_total_actuacions::numeric) * v_peso_actuacions;
  END IF;

  IF v_total_assajos > 0 THEN
    v_score_assajos := (v_attended_assajos::numeric / v_total_assajos::numeric) * v_peso_assajos;
  END IF;

  RETURN v_score_actuacions + v_score_assajos;
END;
$$;