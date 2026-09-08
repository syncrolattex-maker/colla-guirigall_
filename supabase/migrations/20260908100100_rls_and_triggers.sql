-- 1. Function is_admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uid text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = user_uid AND role = 'admin'
  );
$$;

-- 2. Trigger for UPDATE on users table
CREATE OR REPLACE FUNCTION public.protect_user_role()
RETURNS trigger AS $$
BEGIN
  -- If role is changing
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Only allow if the executing user is an admin
    IF NOT public.is_admin(auth.uid()::text) THEN
      RAISE EXCEPTION 'Not authorized to change role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_user_role ON public.users;
CREATE TRIGGER tr_protect_user_role
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_role();

-- 3. INSERT on users
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON public.users;
CREATE POLICY "Allow authenticated users to insert own profile" ON public.users 
FOR INSERT TO authenticated 
WITH CHECK (
  auth.uid()::text = uid 
  AND (
    role = 'member' 
    OR auth.jwt()->>'email' IN ('syncrolattex@gmail.com', 'crentero@gmail.com')
    OR public.is_admin(auth.uid()::text)
  )
);

-- Update on users
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users 
FOR UPDATE TO authenticated 
USING (auth.uid()::text = uid OR public.is_admin(auth.uid()::text))
WITH CHECK (auth.uid()::text = uid OR public.is_admin(auth.uid()::text));

-- 4. events and notifications
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.events;
CREATE POLICY "Enable read for authenticated users" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert events" ON public.events FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()::text));
CREATE POLICY "Admins can update events" ON public.events FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()::text));
CREATE POLICY "Admins can delete events" ON public.events FOR DELETE TO authenticated USING (public.is_admin(auth.uid()::text));

DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.notifications;
CREATE POLICY "Enable read for authenticated users" ON public.notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()::text));
CREATE POLICY "Admins can update notifications" ON public.notifications FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()::text));
CREATE POLICY "Admins can delete notifications" ON public.notifications FOR DELETE TO authenticated USING (public.is_admin(auth.uid()::text));

-- 5. attendances
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.attendances;
CREATE POLICY "Enable read for authenticated users" ON public.attendances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own attendance" ON public.attendances FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = userid OR public.is_admin(auth.uid()::text));
CREATE POLICY "Users can update own attendance" ON public.attendances FOR UPDATE TO authenticated USING (auth.uid()::text = userid OR public.is_admin(auth.uid()::text));
CREATE POLICY "Users can delete own attendance" ON public.attendances FOR DELETE TO authenticated USING (auth.uid()::text = userid OR public.is_admin(auth.uid()::text));
