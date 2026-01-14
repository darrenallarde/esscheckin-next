-- Fix RLS policies for curriculum tables to include super_admin role

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage curriculum" ON public.curriculum_weeks;
DROP POLICY IF EXISTS "Admins can manage extended profiles" ON public.student_profiles_extended;
DROP POLICY IF EXISTS "Admins can manage recommendations" ON public.ai_recommendations;

-- Recreate policies with super_admin support
CREATE POLICY "Admins can manage curriculum"
  ON public.curriculum_weeks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can manage extended profiles"
  ON public.student_profiles_extended
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can manage recommendations"
  ON public.ai_recommendations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- Verify
SELECT tablename, policyname FROM pg_policies
WHERE tablename IN ('curriculum_weeks', 'student_profiles_extended', 'ai_recommendations');
