-- Lock down check_ins table to prevent public reading of attendance data
-- This protects student privacy by preventing tracking of when/where students attend

-- Remove public read access to check_ins
DROP POLICY IF EXISTS "Check-ins are publicly readable" ON public.check_ins;
DROP POLICY IF EXISTS "Public can view check-ins" ON public.check_ins;

-- Keep public insert policy (needed for kiosk to create check-ins)
-- This should already exist, but let's make sure it's explicit
DROP POLICY IF EXISTS "Check-ins can be created publicly" ON public.check_ins;
DROP POLICY IF EXISTS "Public can create check-ins" ON public.check_ins;

CREATE POLICY "Public can create check-ins" ON public.check_ins
  FOR INSERT
  WITH CHECK (true);

-- Create policy for authenticated users (admins) to read all check-ins
CREATE POLICY "Authenticated users can read all check-ins" ON public.check_ins
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Note: Student check-in history is accessed via SECURITY DEFINER functions
-- (get_student_game_profile, etc.) which bypass RLS, so students can still
-- see their own check-in counts and history via their profile page.
