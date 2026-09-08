-- Fix polls RLS policies to use is_admin() and ensure deletes work
DROP POLICY IF EXISTS "Admins can insert polls" ON public.polls;
DROP POLICY IF EXISTS "Admins can update polls" ON public.polls;
DROP POLICY IF EXISTS "Admins can delete polls" ON public.polls;
DROP POLICY IF EXISTS "Anyone can view polls" ON public.polls;

CREATE POLICY "Enable read for authenticated on polls" ON public.polls FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert polls" ON public.polls FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()::text));
CREATE POLICY "Admins can update polls" ON public.polls FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()::text));
CREATE POLICY "Admins can delete polls" ON public.polls FOR DELETE TO authenticated USING (public.is_admin(auth.uid()::text));

-- Fix poll_options
DROP POLICY IF EXISTS "Admins can insert options" ON public.poll_options;
DROP POLICY IF EXISTS "Admins can update options" ON public.poll_options;
DROP POLICY IF EXISTS "Admins can delete options" ON public.poll_options;
DROP POLICY IF EXISTS "Anyone can view options" ON public.poll_options;

CREATE POLICY "Enable read for authenticated on poll_options" ON public.poll_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert options" ON public.poll_options FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()::text));
CREATE POLICY "Admins can update options" ON public.poll_options FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()::text));
CREATE POLICY "Admins can delete options" ON public.poll_options FOR DELETE TO authenticated USING (public.is_admin(auth.uid()::text));

-- Fix poll_votes (add DELETE policy!)
DROP POLICY IF EXISTS "Users can delete their vote" ON public.poll_votes;
DROP POLICY IF EXISTS "Admins can delete votes" ON public.poll_votes;

CREATE POLICY "Users and admins can delete votes" ON public.poll_votes FOR DELETE TO authenticated USING (user_id = auth.uid()::text OR public.is_admin(auth.uid()::text));
CREATE POLICY "Admins can update all votes" ON public.poll_votes FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()::text));
