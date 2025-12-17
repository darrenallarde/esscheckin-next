-- Pastoral Workflow System - Phase 1
-- Creates tables for tracking interactions, notes, and making recommendations actionable

-- ============================================
-- INTERACTIONS TABLE
-- Tracks every outreach attempt and its outcome
-- ============================================
CREATE TABLE IF NOT EXISTS public.interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  leader_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  leader_name text, -- Denormalized for display (in case leader leaves)

  -- What type of interaction
  interaction_type text NOT NULL CHECK (interaction_type IN (
    'text', 'call', 'instagram_dm', 'in_person', 'parent_contact', 'email', 'other'
  )),

  -- Status tracking
  status text NOT NULL DEFAULT 'completed' CHECK (status IN (
    'pending',      -- Outreach initiated, waiting for response
    'completed',    -- Interaction happened
    'no_response',  -- Tried but no response after follow-up period
    'scheduled'     -- Planned for future
  )),

  -- Content
  content text, -- What was said/done (the message sent, conversation notes, etc.)
  outcome text, -- What happened as a result (free text)

  -- Link to AI recommendation if this interaction came from one
  recommendation_id uuid REFERENCES public.ai_recommendations(id) ON DELETE SET NULL,

  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  follow_up_date date, -- When to follow up if no response

  -- Indexes for common queries
  CONSTRAINT valid_completion CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status != 'completed')
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_interactions_student_id ON public.interactions(student_id);
CREATE INDEX IF NOT EXISTS idx_interactions_leader_id ON public.interactions(leader_id);
CREATE INDEX IF NOT EXISTS idx_interactions_status ON public.interactions(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON public.interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_follow_up ON public.interactions(follow_up_date) WHERE follow_up_date IS NOT NULL AND status = 'pending';

-- ============================================
-- STUDENT NOTES TABLE
-- Persistent context about a student
-- ============================================
CREATE TABLE IF NOT EXISTS public.student_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  leader_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  leader_name text, -- Denormalized for display

  content text NOT NULL,

  -- Pinned notes show at top of student context
  is_pinned boolean DEFAULT false,

  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_notes_student_id ON public.student_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_student_notes_pinned ON public.student_notes(student_id, is_pinned) WHERE is_pinned = true;

-- ============================================
-- UPDATE AI_RECOMMENDATIONS TABLE
-- Add fields to make recommendations actionable tasks
-- ============================================
ALTER TABLE public.ai_recommendations
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN (
    'pending',      -- New recommendation, not acted on
    'accepted',     -- Leader accepted and is working on it
    'completed',    -- Action taken and logged
    'dismissed',    -- Dismissed without action
    'expired'       -- Auto-expired (new week started)
  )),
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to_name text,
  ADD COLUMN IF NOT EXISTS accepted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS completion_notes text;

-- Migrate existing dismissed recommendations
UPDATE public.ai_recommendations
SET status = 'dismissed'
WHERE is_dismissed = true AND status IS NULL;

UPDATE public.ai_recommendations
SET status = 'pending'
WHERE status IS NULL;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;

-- Interactions: Admins can do everything
CREATE POLICY "Admins can manage interactions" ON public.interactions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Student Notes: Admins can do everything
CREATE POLICY "Admins can manage student_notes" ON public.student_notes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get student context (pinned notes + recent interactions)
CREATE OR REPLACE FUNCTION public.get_student_context(p_student_id uuid)
RETURNS TABLE (
  pinned_notes jsonb,
  recent_interactions jsonb,
  pending_tasks jsonb,
  interaction_stats jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Pinned notes
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', n.id,
          'content', n.content,
          'leader_name', n.leader_name,
          'created_at', n.created_at
        ) ORDER BY n.created_at DESC
      )
      FROM student_notes n
      WHERE n.student_id = p_student_id AND n.is_pinned = true),
      '[]'::jsonb
    ) AS pinned_notes,

    -- Recent interactions (last 10)
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', i.id,
          'type', i.interaction_type,
          'status', i.status,
          'content', i.content,
          'outcome', i.outcome,
          'leader_name', i.leader_name,
          'created_at', i.created_at,
          'completed_at', i.completed_at
        ) ORDER BY i.created_at DESC
      )
      FROM (
        SELECT * FROM interactions
        WHERE student_id = p_student_id
        ORDER BY created_at DESC
        LIMIT 10
      ) i),
      '[]'::jsonb
    ) AS recent_interactions,

    -- Pending tasks (accepted recommendations not yet completed)
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'key_insight', r.key_insight,
          'action_bullets', r.action_bullets,
          'assigned_to_name', r.assigned_to_name,
          'accepted_at', r.accepted_at
        ) ORDER BY r.accepted_at DESC
      )
      FROM ai_recommendations r
      WHERE r.student_id = p_student_id
        AND r.status = 'accepted'),
      '[]'::jsonb
    ) AS pending_tasks,

    -- Interaction stats
    jsonb_build_object(
      'total_interactions', (SELECT COUNT(*) FROM interactions WHERE student_id = p_student_id),
      'pending_count', (SELECT COUNT(*) FROM interactions WHERE student_id = p_student_id AND status = 'pending'),
      'last_interaction_at', (SELECT MAX(created_at) FROM interactions WHERE student_id = p_student_id),
      'last_interaction_by', (SELECT leader_name FROM interactions WHERE student_id = p_student_id ORDER BY created_at DESC LIMIT 1)
    ) AS interaction_stats;
END;
$$;

-- Log a new interaction
CREATE OR REPLACE FUNCTION public.log_interaction(
  p_student_id uuid,
  p_interaction_type text,
  p_content text DEFAULT NULL,
  p_outcome text DEFAULT NULL,
  p_status text DEFAULT 'completed',
  p_recommendation_id uuid DEFAULT NULL,
  p_follow_up_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_leader_name text;
  v_interaction_id uuid;
BEGIN
  -- Get leader name from user metadata or email
  SELECT COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    email
  ) INTO v_leader_name
  FROM auth.users
  WHERE id = auth.uid();

  -- Insert interaction
  INSERT INTO interactions (
    student_id,
    leader_id,
    leader_name,
    interaction_type,
    status,
    content,
    outcome,
    recommendation_id,
    follow_up_date,
    completed_at
  ) VALUES (
    p_student_id,
    auth.uid(),
    v_leader_name,
    p_interaction_type,
    p_status,
    p_content,
    p_outcome,
    p_recommendation_id,
    p_follow_up_date,
    CASE WHEN p_status = 'completed' THEN now() ELSE NULL END
  )
  RETURNING id INTO v_interaction_id;

  -- If this interaction completes a recommendation, update it
  IF p_recommendation_id IS NOT NULL AND p_status = 'completed' THEN
    UPDATE ai_recommendations
    SET status = 'completed',
        completed_at = now(),
        completion_notes = p_outcome
    WHERE id = p_recommendation_id;
  END IF;

  RETURN v_interaction_id;
END;
$$;

-- Accept a recommendation (turn it into a task)
CREATE OR REPLACE FUNCTION public.accept_recommendation(p_recommendation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_leader_name text;
BEGIN
  -- Get leader name
  SELECT COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    email
  ) INTO v_leader_name
  FROM auth.users
  WHERE id = auth.uid();

  UPDATE ai_recommendations
  SET status = 'accepted',
      assigned_to = auth.uid(),
      assigned_to_name = v_leader_name,
      accepted_at = now()
  WHERE id = p_recommendation_id;
END;
$$;

-- Add a student note
CREATE OR REPLACE FUNCTION public.add_student_note(
  p_student_id uuid,
  p_content text,
  p_is_pinned boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_leader_name text;
  v_note_id uuid;
BEGIN
  -- Get leader name
  SELECT COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    email
  ) INTO v_leader_name
  FROM auth.users
  WHERE id = auth.uid();

  INSERT INTO student_notes (
    student_id,
    leader_id,
    leader_name,
    content,
    is_pinned
  ) VALUES (
    p_student_id,
    auth.uid(),
    v_leader_name,
    p_content,
    p_is_pinned
  )
  RETURNING id INTO v_note_id;

  RETURN v_note_id;
END;
$$;

-- Get pending tasks for current user (for "My Queue" view)
CREATE OR REPLACE FUNCTION public.get_my_queue()
RETURNS TABLE (
  task_type text,
  task_id uuid,
  student_id uuid,
  student_name text,
  student_status text,
  days_since_last_seen integer,
  task_description text,
  task_created_at timestamp with time zone,
  urgency integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY

  -- Pending interactions (follow-ups needed)
  SELECT
    'follow_up'::text AS task_type,
    i.id AS task_id,
    s.id AS student_id,
    (s.first_name || ' ' || s.last_name)::text AS student_name,
    pa.belonging_status::text AS student_status,
    pa.days_since_last_seen::integer,
    ('Follow up on ' || i.interaction_type || ' from ' ||
      to_char(i.created_at, 'Mon DD'))::text AS task_description,
    i.created_at AS task_created_at,
    CASE
      WHEN i.follow_up_date <= CURRENT_DATE THEN 1
      ELSE 2
    END AS urgency
  FROM interactions i
  JOIN students s ON s.id = i.student_id
  LEFT JOIN LATERAL (
    SELECT * FROM get_pastoral_analytics() WHERE student_id = s.id
  ) pa ON true
  WHERE i.status = 'pending'
    AND i.leader_id = auth.uid()
    AND (i.follow_up_date IS NULL OR i.follow_up_date <= CURRENT_DATE + INTERVAL '1 day')

  UNION ALL

  -- Accepted recommendations
  SELECT
    'recommendation'::text AS task_type,
    r.id AS task_id,
    s.id AS student_id,
    (s.first_name || ' ' || s.last_name)::text AS student_name,
    pa.belonging_status::text AS student_status,
    pa.days_since_last_seen::integer,
    r.key_insight::text AS task_description,
    r.accepted_at AS task_created_at,
    CASE
      WHEN pa.belonging_status = 'Missing' THEN 1
      WHEN pa.belonging_status = 'On the Fringe' THEN 2
      ELSE 3
    END AS urgency
  FROM ai_recommendations r
  JOIN students s ON s.id = r.student_id
  LEFT JOIN LATERAL (
    SELECT * FROM get_pastoral_analytics() WHERE student_id = s.id
  ) pa ON true
  WHERE r.status = 'accepted'
    AND r.assigned_to = auth.uid()

  ORDER BY urgency, task_created_at;
END;
$$;

COMMENT ON TABLE public.interactions IS 'Tracks all pastoral outreach attempts and outcomes';
COMMENT ON TABLE public.student_notes IS 'Persistent context notes about students';
COMMENT ON FUNCTION public.get_student_context IS 'Returns pinned notes, recent interactions, and pending tasks for a student';
COMMENT ON FUNCTION public.log_interaction IS 'Logs a new pastoral interaction with a student';
COMMENT ON FUNCTION public.get_my_queue IS 'Returns pending tasks for the current leader';
