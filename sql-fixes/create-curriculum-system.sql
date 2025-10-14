-- Create curriculum management system for AI-powered pastoral recommendations

-- Table: curriculum_weeks
CREATE TABLE IF NOT EXISTS public.curriculum_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_date DATE NOT NULL,
  series_name TEXT NOT NULL,
  topic_title TEXT NOT NULL,
  main_scripture TEXT NOT NULL,

  -- Theological Anchoring
  core_truths TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of selected core truths
  faith_skills TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array: 'Hear', 'Pray', 'Talk', 'Live'
  key_biblical_principle TEXT NOT NULL,

  -- Phase Content
  target_phases TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array: '6', '7', '8', '9', '10', '11', '12'
  big_idea TEXT NOT NULL,
  phase_relevance JSONB DEFAULT '{}'::JSONB, -- { "6": "why it matters...", "7": "..." }

  -- Teaching Content
  discussion_questions JSONB DEFAULT '{}'::JSONB, -- { "6": ["q1", "q2"], "7": [...] }
  application_challenge TEXT NOT NULL,
  memory_verse TEXT,

  -- Parent Partnership
  parent_communication TEXT,
  home_conversation_starter TEXT,
  prayer_focus TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_current BOOLEAN DEFAULT false, -- Only one can be true

  CONSTRAINT unique_current_curriculum UNIQUE NULLS NOT DISTINCT (is_current)
    DEFERRABLE INITIALLY DEFERRED
);

-- Create index for current curriculum lookup
CREATE INDEX IF NOT EXISTS idx_curriculum_current ON public.curriculum_weeks(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_curriculum_date ON public.curriculum_weeks(week_date DESC);

-- Function to set current curriculum (ensures only one is current)
CREATE OR REPLACE FUNCTION public.set_current_curriculum(p_curriculum_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Unset all current flags
  UPDATE public.curriculum_weeks
  SET is_current = false
  WHERE is_current = true;

  -- Set the new current curriculum
  UPDATE public.curriculum_weeks
  SET is_current = true
  WHERE id = p_curriculum_id;

  RETURN true;
END;
$function$;

-- Table: student_profiles_extended
CREATE TABLE IF NOT EXISTS public.student_profiles_extended (
  student_id UUID PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,

  -- Phase Information
  current_phase TEXT, -- e.g., "6th Grade - Who Cares"
  phase_description TEXT,

  -- Spiritual Journey
  spiritual_maturity TEXT CHECK (spiritual_maturity IN ('Exploring', 'Growing', 'Strong Believer', 'Leadership Ready')),
  faith_background TEXT CHECK (faith_background IN ('New to faith', 'Churched background', 'Unchurched', 'Unknown')),
  recent_spiritual_notes TEXT,

  -- Personal Context
  interests TEXT[] DEFAULT ARRAY[]::TEXT[],
  learning_style TEXT CHECK (learning_style IN ('Visual', 'Auditory', 'Kinesthetic', 'Reading/Writing', 'Mixed', 'Unknown')),
  current_challenges TEXT[] DEFAULT ARRAY[]::TEXT[],
  family_context TEXT,

  -- Gender (for phase-specific recommendations)
  gender TEXT CHECK (gender IN ('Male', 'Female', 'Prefer not to say', 'Unknown')),

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Function to get or create extended profile
CREATE OR REPLACE FUNCTION public.get_or_create_extended_profile(p_student_id UUID)
RETURNS public.student_profiles_extended
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile public.student_profiles_extended;
BEGIN
  SELECT * INTO v_profile
  FROM public.student_profiles_extended
  WHERE student_id = p_student_id;

  IF NOT FOUND THEN
    INSERT INTO public.student_profiles_extended (student_id)
    VALUES (p_student_id)
    RETURNING * INTO v_profile;
  END IF;

  RETURN v_profile;
END;
$function$;

-- Table: ai_recommendations
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  curriculum_week_id UUID REFERENCES public.curriculum_weeks(id) ON DELETE CASCADE,

  -- Recommendation Content
  key_insight TEXT NOT NULL,
  action_bullets TEXT[] NOT NULL CHECK (array_length(action_bullets, 1) = 3),
  context_paragraph TEXT NOT NULL,

  -- Metadata
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  engagement_status TEXT NOT NULL,
  days_since_last_seen INTEGER,

  is_dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  dismissed_by UUID REFERENCES auth.users(id),

  CONSTRAINT unique_student_curriculum UNIQUE (student_id, curriculum_week_id)
);

CREATE INDEX IF NOT EXISTS idx_recommendations_student ON public.ai_recommendations(student_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_curriculum ON public.ai_recommendations(curriculum_week_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_active ON public.ai_recommendations(student_id, is_dismissed) WHERE is_dismissed = false;

-- Enable Row Level Security
ALTER TABLE public.curriculum_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles_extended ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for curriculum_weeks
CREATE POLICY "Admins can manage curriculum"
  ON public.curriculum_weeks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can view curriculum"
  ON public.curriculum_weeks
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for student_profiles_extended
CREATE POLICY "Admins can manage extended profiles"
  ON public.student_profiles_extended
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for ai_recommendations
CREATE POLICY "Admins can manage recommendations"
  ON public.ai_recommendations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.curriculum_weeks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_profiles_extended TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_recommendations TO authenticated;

GRANT EXECUTE ON FUNCTION public.set_current_curriculum(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_extended_profile(UUID) TO authenticated;

-- Comments
COMMENT ON TABLE public.curriculum_weeks IS 'Weekly curriculum and teaching content for AI-powered recommendations';
COMMENT ON TABLE public.student_profiles_extended IS 'Extended student profiles with phase and spiritual journey data';
COMMENT ON TABLE public.ai_recommendations IS 'AI-generated pastoral recommendations based on curriculum and engagement';
COMMENT ON FUNCTION public.set_current_curriculum IS 'Sets a curriculum week as current and unsets all others';
COMMENT ON FUNCTION public.get_or_create_extended_profile IS 'Gets or creates an extended profile for a student';
