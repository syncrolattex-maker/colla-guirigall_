-- 1. Modify events and attendances
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS slots_dolcaina INT NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS slots_tabal INT NULL;

ALTER TABLE public.attendances ADD COLUMN IF NOT EXISTS attended BOOLEAN NULL;

-- 2. Create rotation_state
CREATE TABLE IF NOT EXISTS public.rotation_state (
  user_id TEXT REFERENCES public.users(uid) ON DELETE CASCADE,
  instrument TEXT,
  peso_acumulado NUMERIC DEFAULT 0,
  last_selected_at TIMESTAMPTZ,
  PRIMARY KEY(user_id, instrument)
);

ALTER TABLE public.rotation_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read for authenticated users" ON public.rotation_state FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can write" ON public.rotation_state FOR ALL TO authenticated USING (public.is_admin(auth.uid()::text)) WITH CHECK (public.is_admin(auth.uid()::text));

-- 3. Create attendance_weights
CREATE TABLE IF NOT EXISTS public.attendance_weights (
  id INT PRIMARY KEY DEFAULT 1,
  peso_actuacions NUMERIC DEFAULT 0.5,
  peso_assajos NUMERIC DEFAULT 0.5
);
INSERT INTO public.attendance_weights (id, peso_actuacions, peso_assajos) VALUES (1, 0.5, 0.5) ON CONFLICT DO NOTHING;

ALTER TABLE public.attendance_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read for authenticated users" ON public.attendance_weights FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can write" ON public.attendance_weights FOR ALL TO authenticated USING (public.is_admin(auth.uid()::text)) WITH CHECK (public.is_admin(auth.uid()::text));

-- 4. Create member_attendance_score function
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
  WHERE type = 'Actuació' AND date < now();

  SELECT count(*) INTO v_attended_actuacions
  FROM public.attendances a
  JOIN public.events e ON a.eventid = e.id
  WHERE e.type = 'Actuació' AND e.date < now() AND a.userid = p_user_id AND a.attended = true;

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

-- 5. Create view for edge function to consume easily
CREATE OR REPLACE VIEW public.member_rotation_stats AS
SELECT 
  u.uid as user_id, 
  u.name, 
  u.instrument, 
  public.member_attendance_score(u.uid) as score,
  COALESCE(rs.peso_acumulado, 0) as peso_acumulado
FROM public.users u
LEFT JOIN public.rotation_state rs ON u.uid = rs.user_id AND u.instrument = rs.instrument;

