-- Saved Queries for Insights: Allow users to save and star frequently used queries
-- Provides query history and quick access to favorite queries

-- ============================================
-- insights_saved_queries: Track user query history and starred queries
-- ============================================
CREATE TABLE IF NOT EXISTS insights_saved_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  is_starred BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  use_count INTEGER DEFAULT 1,

  -- Each user can only have one entry per query text per org
  UNIQUE(organization_id, user_id, query_text)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_insights_saved_queries_org ON insights_saved_queries(organization_id);
CREATE INDEX IF NOT EXISTS idx_insights_saved_queries_user ON insights_saved_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_saved_queries_starred ON insights_saved_queries(user_id, is_starred) WHERE is_starred = true;
CREATE INDEX IF NOT EXISTS idx_insights_saved_queries_recent ON insights_saved_queries(user_id, last_used_at DESC);

-- ============================================
-- RLS Policies for insights_saved_queries
-- ============================================
ALTER TABLE insights_saved_queries ENABLE ROW LEVEL SECURITY;

-- Select: Users can only see their own saved queries
CREATE POLICY "insights_saved_queries_select_policy"
ON insights_saved_queries FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Insert: Users can only create their own saved queries
CREATE POLICY "insights_saved_queries_insert_policy"
ON insights_saved_queries FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Update: Users can only update their own saved queries
CREATE POLICY "insights_saved_queries_update_policy"
ON insights_saved_queries FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Delete: Users can only delete their own saved queries
CREATE POLICY "insights_saved_queries_delete_policy"
ON insights_saved_queries FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- RPC: Save or update a query (upsert)
-- ============================================
CREATE OR REPLACE FUNCTION save_insights_query(
  p_org_id UUID,
  p_query_text TEXT,
  p_is_starred BOOLEAN DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_query_id UUID;
BEGIN
  -- Upsert the query
  INSERT INTO insights_saved_queries (
    organization_id,
    user_id,
    query_text,
    is_starred,
    last_used_at,
    use_count
  ) VALUES (
    p_org_id,
    auth.uid(),
    p_query_text,
    COALESCE(p_is_starred, false),
    NOW(),
    1
  )
  ON CONFLICT (organization_id, user_id, query_text)
  DO UPDATE SET
    last_used_at = NOW(),
    use_count = insights_saved_queries.use_count + 1,
    is_starred = COALESCE(p_is_starred, insights_saved_queries.is_starred)
  RETURNING id INTO v_query_id;

  RETURN v_query_id;
END;
$$;

-- ============================================
-- RPC: Toggle star status on a query
-- ============================================
CREATE OR REPLACE FUNCTION toggle_insights_query_star(
  p_query_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_starred BOOLEAN;
BEGIN
  UPDATE insights_saved_queries
  SET is_starred = NOT is_starred
  WHERE id = p_query_id AND user_id = auth.uid()
  RETURNING is_starred INTO v_new_starred;

  RETURN v_new_starred;
END;
$$;

-- ============================================
-- RPC: Get saved queries for the current user
-- ============================================
CREATE OR REPLACE FUNCTION get_insights_saved_queries(
  p_org_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  query_text TEXT,
  is_starred BOOLEAN,
  created_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  use_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sq.id,
    sq.query_text,
    sq.is_starred,
    sq.created_at,
    sq.last_used_at,
    sq.use_count
  FROM insights_saved_queries sq
  WHERE sq.organization_id = p_org_id
    AND sq.user_id = auth.uid()
  ORDER BY sq.is_starred DESC, sq.last_used_at DESC
  LIMIT p_limit;
END;
$$;

-- ============================================
-- RPC: Delete a saved query
-- ============================================
CREATE OR REPLACE FUNCTION delete_insights_query(
  p_query_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM insights_saved_queries
  WHERE id = p_query_id AND user_id = auth.uid();
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION save_insights_query TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_insights_query_star TO authenticated;
GRANT EXECUTE ON FUNCTION get_insights_saved_queries TO authenticated;
GRANT EXECUTE ON FUNCTION delete_insights_query TO authenticated;
