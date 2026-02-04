-- Quest System: Track daily habits and priorities for ministry leaders
-- Gamified task completion with streaks

-- ============================================
-- quest_completions: Track individual quest completions
-- ============================================
CREATE TABLE IF NOT EXISTS quest_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_type TEXT NOT NULL, -- 'daily_messages', 'daily_new_students', 'daily_pastoral', 'priority_mia', etc.
  quest_key TEXT, -- Unique identifier for specific quest (e.g., student_id for MIA)
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Each user can only complete a quest once per day (or once for priority quests with specific keys)
  UNIQUE(organization_id, user_id, quest_type, quest_key, completed_date)
);

-- ============================================
-- user_streaks: Track daily completion streaks
-- ============================================
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_completed_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, organization_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quest_completions_org ON quest_completions(organization_id);
CREATE INDEX IF NOT EXISTS idx_quest_completions_user ON quest_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_quest_completions_date ON quest_completions(user_id, completed_date);
CREATE INDEX IF NOT EXISTS idx_quest_completions_type ON quest_completions(quest_type);
CREATE INDEX IF NOT EXISTS idx_user_streaks_user_org ON user_streaks(user_id, organization_id);

-- ============================================
-- RLS Policies for quest_completions
-- ============================================
ALTER TABLE quest_completions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own quest completions
CREATE POLICY "quest_completions_select_policy"
ON quest_completions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can only create their own quest completions
CREATE POLICY "quest_completions_insert_policy"
ON quest_completions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- ============================================
-- RLS Policies for user_streaks
-- ============================================
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own streaks
CREATE POLICY "user_streaks_select_policy"
ON user_streaks FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can only create/update their own streaks
CREATE POLICY "user_streaks_insert_policy"
ON user_streaks FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_streaks_update_policy"
ON user_streaks FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- RPC: Complete a quest
-- ============================================
CREATE OR REPLACE FUNCTION complete_quest(
  p_org_id UUID,
  p_quest_type TEXT,
  p_quest_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - 1;
  v_streak_record user_streaks%ROWTYPE;
  v_all_daily_complete BOOLEAN;
  v_new_streak INTEGER;
  v_result JSONB;
BEGIN
  -- Insert quest completion (will fail silently if already completed)
  INSERT INTO quest_completions (
    organization_id,
    user_id,
    quest_type,
    quest_key,
    completed_date
  ) VALUES (
    p_org_id,
    auth.uid(),
    p_quest_type,
    p_quest_key,
    v_today
  )
  ON CONFLICT (organization_id, user_id, quest_type, quest_key, completed_date)
  DO NOTHING;

  -- Check if all daily quests are complete for streak update
  -- Daily quests: daily_messages, daily_new_students, daily_pastoral
  SELECT NOT EXISTS (
    SELECT 1
    FROM unnest(ARRAY['daily_messages', 'daily_new_students', 'daily_pastoral']) AS qt(quest_type)
    WHERE NOT EXISTS (
      SELECT 1 FROM quest_completions qc
      WHERE qc.user_id = auth.uid()
        AND qc.organization_id = p_org_id
        AND qc.quest_type = qt.quest_type
        AND qc.completed_date = v_today
    )
  ) INTO v_all_daily_complete;

  -- Get or create streak record
  SELECT * INTO v_streak_record
  FROM user_streaks
  WHERE user_id = auth.uid() AND organization_id = p_org_id;

  IF NOT FOUND THEN
    INSERT INTO user_streaks (user_id, organization_id, current_streak, longest_streak, last_completed_date)
    VALUES (auth.uid(), p_org_id, 0, 0, NULL)
    RETURNING * INTO v_streak_record;
  END IF;

  -- Update streak if all daily quests are complete
  IF v_all_daily_complete THEN
    IF v_streak_record.last_completed_date = v_yesterday THEN
      -- Consecutive day - increment streak
      v_new_streak := v_streak_record.current_streak + 1;
    ELSIF v_streak_record.last_completed_date = v_today THEN
      -- Already counted today
      v_new_streak := v_streak_record.current_streak;
    ELSE
      -- Streak broken - start fresh
      v_new_streak := 1;
    END IF;

    UPDATE user_streaks
    SET
      current_streak = v_new_streak,
      longest_streak = GREATEST(longest_streak, v_new_streak),
      last_completed_date = v_today,
      updated_at = NOW()
    WHERE user_id = auth.uid() AND organization_id = p_org_id;
  END IF;

  -- Return result
  SELECT jsonb_build_object(
    'completed', true,
    'quest_type', p_quest_type,
    'all_daily_complete', v_all_daily_complete,
    'streak', COALESCE(v_new_streak, v_streak_record.current_streak)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================
-- RPC: Get quest board data for today
-- ============================================
CREATE OR REPLACE FUNCTION get_quest_board(
  p_org_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_daily_completions JSONB;
  v_streak_record user_streaks%ROWTYPE;
  v_unread_count INTEGER;
  v_new_students_count INTEGER;
  v_urgent_pastoral_count INTEGER;
  v_result JSONB;
BEGIN
  -- Get today's completions
  SELECT jsonb_object_agg(quest_type, true)
  INTO v_daily_completions
  FROM quest_completions
  WHERE user_id = auth.uid()
    AND organization_id = p_org_id
    AND completed_date = v_today
    AND quest_type LIKE 'daily_%';

  v_daily_completions := COALESCE(v_daily_completions, '{}'::jsonb);

  -- Get streak info
  SELECT * INTO v_streak_record
  FROM user_streaks
  WHERE user_id = auth.uid() AND organization_id = p_org_id;

  -- Get context counts for daily quests
  -- Unread messages count (simplified - just check for any inbound messages in last 24h)
  SELECT COUNT(DISTINCT sender_phone)
  INTO v_unread_count
  FROM sms_messages
  WHERE organization_id = p_org_id
    AND direction = 'inbound'
    AND created_at > NOW() - INTERVAL '24 hours';

  -- New students count (students without groups)
  SELECT COUNT(*)
  INTO v_new_students_count
  FROM profiles p
  INNER JOIN organization_memberships om ON om.profile_id = p.id
  WHERE om.organization_id = p_org_id
    AND om.role = 'student'
    AND NOT EXISTS (
      SELECT 1 FROM group_memberships gm
      INNER JOIN groups g ON g.id = gm.group_id
      WHERE gm.profile_id = p.id AND g.organization_id = p_org_id
    );

  -- Urgent pastoral count (students MIA 30+ days)
  SELECT COUNT(*)
  INTO v_urgent_pastoral_count
  FROM profiles p
  INNER JOIN organization_memberships om ON om.profile_id = p.id
  LEFT JOIN LATERAL (
    SELECT MAX(created_at) as last_checkin
    FROM check_ins ci
    WHERE ci.profile_id = p.id AND ci.organization_id = p_org_id
  ) lc ON true
  WHERE om.organization_id = p_org_id
    AND om.role = 'student'
    AND (lc.last_checkin IS NULL OR lc.last_checkin < NOW() - INTERVAL '30 days');

  -- Build result
  v_result := jsonb_build_object(
    'completions', v_daily_completions,
    'streak', jsonb_build_object(
      'current', COALESCE(v_streak_record.current_streak, 0),
      'longest', COALESCE(v_streak_record.longest_streak, 0),
      'lastCompleted', v_streak_record.last_completed_date
    ),
    'context', jsonb_build_object(
      'unreadMessages', v_unread_count,
      'newStudents', v_new_students_count,
      'urgentPastoral', v_urgent_pastoral_count
    )
  );

  RETURN v_result;
END;
$$;

-- ============================================
-- RPC: Get MIA students for priority quests
-- ============================================
CREATE OR REPLACE FUNCTION get_mia_students_for_quests(
  p_org_id UUID,
  p_days_threshold INTEGER DEFAULT 14,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  profile_id UUID,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  days_since_checkin INTEGER,
  last_checkin_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS profile_id,
    p.first_name,
    p.last_name,
    p.phone_number,
    EXTRACT(DAY FROM NOW() - lc.last_checkin)::INTEGER AS days_since_checkin,
    lc.last_checkin::DATE AS last_checkin_date
  FROM profiles p
  INNER JOIN organization_memberships om ON om.profile_id = p.id
  LEFT JOIN LATERAL (
    SELECT MAX(ci.created_at) as last_checkin
    FROM check_ins ci
    WHERE ci.profile_id = p.id AND ci.organization_id = p_org_id
  ) lc ON true
  WHERE om.organization_id = p_org_id
    AND om.role = 'student'
    AND p.phone_number IS NOT NULL
    AND p.phone_number != ''
    AND (
      lc.last_checkin IS NULL
      OR lc.last_checkin < NOW() - (p_days_threshold || ' days')::INTERVAL
    )
  ORDER BY
    CASE WHEN lc.last_checkin IS NULL THEN 0 ELSE 1 END,
    lc.last_checkin ASC NULLS FIRST
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION complete_quest TO authenticated;
GRANT EXECUTE ON FUNCTION get_quest_board TO authenticated;
GRANT EXECUTE ON FUNCTION get_mia_students_for_quests TO authenticated;
