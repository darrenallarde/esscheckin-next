-- Migration: ChMS Integration Tables
-- Adds tables for connecting SheepDoggo to external Church Management Systems
-- (Rock RMS, Planning Center Online, CCB/Pushpay)

-- ============================================================================
-- chms_connections: One connection per organization to their ChMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chms_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('rock', 'planning_center', 'ccb')),
  display_name TEXT,

  -- Connection config (provider-specific)
  base_url TEXT,                    -- Rock: church URL, CCB: subdomain.ccbchurch.com, PCO: null (centralized)
  credentials JSONB NOT NULL DEFAULT '{}', -- Rock: {api_key}, PCO: {app_id, secret}, CCB: {username, password}

  -- Sync configuration
  is_active BOOLEAN NOT NULL DEFAULT true,
  sync_config JSONB NOT NULL DEFAULT '{}', -- Provider-specific: group type IDs, attribute keys, field slots, etc.
  auto_sync_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_sync_interval_hours INTEGER NOT NULL DEFAULT 6,

  -- Status tracking
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT CHECK (last_sync_status IN ('success', 'partial', 'error')),
  last_sync_error TEXT,
  last_sync_stats JSONB DEFAULT '{}', -- {created: N, updated: N, linked: N, skipped: N, failed: N}
  connection_verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One ChMS connection per organization
  CONSTRAINT chms_connections_org_unique UNIQUE (organization_id)
);

-- Index for lookups by org
CREATE INDEX IF NOT EXISTS idx_chms_connections_org ON public.chms_connections(organization_id);

-- ============================================================================
-- chms_profile_links: Maps SheepDoggo profiles to ChMS person records
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chms_profile_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- External system identifiers
  external_person_id TEXT NOT NULL,     -- Rock PersonId, PCO id, CCB individual_id
  external_alias_id TEXT,               -- Rock PersonAliasId (null for PCO/CCB)
  external_person_guid TEXT,            -- Rock Guid (null for others)
  external_family_id TEXT,              -- External family/household ID for family sync

  -- Link metadata
  link_status TEXT NOT NULL DEFAULT 'linked' CHECK (link_status IN ('linked', 'unlinked', 'conflict')),
  link_method TEXT CHECK (link_method IN ('email_match', 'phone_match', 'name_match', 'manual', 'auto_created')),
  last_synced_at TIMESTAMPTZ,
  last_write_back_at TIMESTAMPTZ,      -- When we last pushed activity to ChMS

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each profile linked once per org, each external ID linked once per org
  CONSTRAINT chms_profile_links_profile_org_unique UNIQUE (profile_id, organization_id),
  CONSTRAINT chms_profile_links_external_org_unique UNIQUE (external_person_id, organization_id)
);

-- Indexes for sync lookups
CREATE INDEX IF NOT EXISTS idx_chms_profile_links_org ON public.chms_profile_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_chms_profile_links_profile ON public.chms_profile_links(profile_id);
CREATE INDEX IF NOT EXISTS idx_chms_profile_links_external ON public.chms_profile_links(external_person_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_chms_profile_links_status ON public.chms_profile_links(link_status) WHERE link_status = 'linked';

-- ============================================================================
-- chms_sync_log: Audit trail for all sync operations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chms_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('import_people', 'import_families', 'write_back', 'incremental', 'test_connection')),
  provider TEXT NOT NULL CHECK (provider IN ('rock', 'planning_center', 'ccb')),

  -- Sync statistics
  records_processed INTEGER NOT NULL DEFAULT 0,
  records_created INTEGER NOT NULL DEFAULT 0,
  records_updated INTEGER NOT NULL DEFAULT 0,
  records_linked INTEGER NOT NULL DEFAULT 0,
  records_skipped INTEGER NOT NULL DEFAULT 0,
  records_failed INTEGER NOT NULL DEFAULT 0,
  error_details JSONB,               -- Array of {externalId, error} for failed records

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- Who triggered it
  triggered_by UUID REFERENCES auth.users(id), -- null for auto-sync
  trigger_method TEXT CHECK (trigger_method IN ('manual', 'auto', 'webhook'))
);

-- Index for viewing sync history
CREATE INDEX IF NOT EXISTS idx_chms_sync_log_org ON public.chms_sync_log(organization_id, started_at DESC);

-- ============================================================================
-- RPC: Get ChMS connection for an organization
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_chms_connection(p_org_id UUID)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  provider TEXT,
  display_name TEXT,
  base_url TEXT,
  is_active BOOLEAN,
  sync_config JSONB,
  auto_sync_enabled BOOLEAN,
  auto_sync_interval_hours INTEGER,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_error TEXT,
  last_sync_stats JSONB,
  connection_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller has admin access to this org
  IF NOT auth_has_org_role(p_org_id, ARRAY['owner', 'admin']) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.organization_id,
    c.provider,
    c.display_name,
    c.base_url,
    c.is_active,
    c.sync_config,
    c.auto_sync_enabled,
    c.auto_sync_interval_hours,
    c.last_sync_at,
    c.last_sync_status,
    c.last_sync_error,
    c.last_sync_stats,
    c.connection_verified_at,
    c.created_at,
    c.updated_at
  FROM chms_connections c
  WHERE c.organization_id = p_org_id;
END;
$$;

-- ============================================================================
-- RPC: Save/update ChMS connection (upsert)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.save_chms_connection(
  p_org_id UUID,
  p_provider TEXT,
  p_display_name TEXT,
  p_base_url TEXT,
  p_credentials JSONB,
  p_sync_config JSONB DEFAULT '{}'
)
RETURNS TABLE (success BOOLEAN, message TEXT, connection_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_connection_id UUID;
BEGIN
  -- Verify caller has admin access
  IF NOT auth_has_org_role(p_org_id, ARRAY['owner', 'admin']) THEN
    RETURN QUERY SELECT false, 'Unauthorized: admin access required'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Validate provider
  IF p_provider NOT IN ('rock', 'planning_center', 'ccb') THEN
    RETURN QUERY SELECT false, 'Invalid provider: must be rock, planning_center, or ccb'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Upsert connection
  INSERT INTO chms_connections (
    organization_id, provider, display_name, base_url, credentials, sync_config, updated_at
  )
  VALUES (
    p_org_id, p_provider, p_display_name, p_base_url, p_credentials, p_sync_config, now()
  )
  ON CONFLICT (organization_id)
  DO UPDATE SET
    provider = EXCLUDED.provider,
    display_name = EXCLUDED.display_name,
    base_url = EXCLUDED.base_url,
    credentials = EXCLUDED.credentials,
    sync_config = EXCLUDED.sync_config,
    updated_at = now()
  RETURNING id INTO v_connection_id;

  RETURN QUERY SELECT true, 'Connection saved'::TEXT, v_connection_id;
END;
$$;

-- ============================================================================
-- RPC: Delete ChMS connection
-- ============================================================================
CREATE OR REPLACE FUNCTION public.delete_chms_connection(p_org_id UUID)
RETURNS TABLE (success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller has admin access
  IF NOT auth_has_org_role(p_org_id, ARRAY['owner', 'admin']) THEN
    RETURN QUERY SELECT false, 'Unauthorized: admin access required'::TEXT;
    RETURN;
  END IF;

  DELETE FROM chms_connections WHERE organization_id = p_org_id;

  -- Also clean up profile links for this org
  UPDATE chms_profile_links
  SET link_status = 'unlinked'
  WHERE organization_id = p_org_id AND link_status = 'linked';

  RETURN QUERY SELECT true, 'Connection deleted'::TEXT;
END;
$$;

-- ============================================================================
-- RPC: Update connection status (called by edge functions with service role)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_chms_connection_status(
  p_org_id UUID,
  p_last_sync_status TEXT,
  p_last_sync_error TEXT DEFAULT NULL,
  p_last_sync_stats JSONB DEFAULT NULL,
  p_connection_verified BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE chms_connections
  SET
    last_sync_at = now(),
    last_sync_status = p_last_sync_status,
    last_sync_error = p_last_sync_error,
    last_sync_stats = COALESCE(p_last_sync_stats, last_sync_stats),
    connection_verified_at = CASE WHEN p_connection_verified THEN now() ELSE connection_verified_at END,
    updated_at = now()
  WHERE organization_id = p_org_id;
END;
$$;

-- ============================================================================
-- RPC: Get ChMS sync history
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_chms_sync_history(p_org_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  sync_type TEXT,
  provider TEXT,
  records_processed INTEGER,
  records_created INTEGER,
  records_updated INTEGER,
  records_linked INTEGER,
  records_skipped INTEGER,
  records_failed INTEGER,
  error_details JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  trigger_method TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller has admin access
  IF NOT auth_has_org_role(p_org_id, ARRAY['owner', 'admin']) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.sync_type,
    l.provider,
    l.records_processed,
    l.records_created,
    l.records_updated,
    l.records_linked,
    l.records_skipped,
    l.records_failed,
    l.error_details,
    l.started_at,
    l.completed_at,
    l.trigger_method
  FROM chms_sync_log l
  WHERE l.organization_id = p_org_id
  ORDER BY l.started_at DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================================
-- RPC: Get credentials (service role only — used by edge functions)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_chms_connection_with_credentials(p_org_id UUID)
RETURNS TABLE (
  id UUID,
  provider TEXT,
  base_url TEXT,
  credentials JSONB,
  sync_config JSONB,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function returns credentials and should only be called by edge functions
  -- using the service role key. The SECURITY DEFINER runs as the function owner,
  -- bypassing RLS. The edge function is responsible for auth.
  RETURN QUERY
  SELECT
    c.id,
    c.provider,
    c.base_url,
    c.credentials,
    c.sync_config,
    c.is_active
  FROM chms_connections c
  WHERE c.organization_id = p_org_id
    AND c.is_active = true;
END;
$$;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.chms_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chms_profile_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chms_sync_log ENABLE ROW LEVEL SECURITY;

-- chms_connections: Only org admins/owners can see their connection
CREATE POLICY "chms_connections_select" ON public.chms_connections
  FOR SELECT
  USING (auth_has_org_role(organization_id, ARRAY['owner', 'admin']));

CREATE POLICY "chms_connections_insert" ON public.chms_connections
  FOR INSERT
  WITH CHECK (auth_has_org_role(organization_id, ARRAY['owner', 'admin']));

CREATE POLICY "chms_connections_update" ON public.chms_connections
  FOR UPDATE
  USING (auth_has_org_role(organization_id, ARRAY['owner', 'admin']));

CREATE POLICY "chms_connections_delete" ON public.chms_connections
  FOR DELETE
  USING (auth_has_org_role(organization_id, ARRAY['owner', 'admin']));

-- chms_profile_links: Admins can see links for their org
CREATE POLICY "chms_profile_links_select" ON public.chms_profile_links
  FOR SELECT
  USING (auth_has_org_role(organization_id, ARRAY['owner', 'admin']));

-- chms_sync_log: Admins can see sync history for their org
CREATE POLICY "chms_sync_log_select" ON public.chms_sync_log
  FOR SELECT
  USING (auth_has_org_role(organization_id, ARRAY['owner', 'admin']));

-- Grant service role full access (for edge functions)
-- Note: service_role bypasses RLS by default, so no explicit grants needed

-- ============================================================================
-- Grants for authenticated users (RPC functions handle auth)
-- ============================================================================
GRANT SELECT ON public.chms_connections TO authenticated;
GRANT INSERT ON public.chms_connections TO authenticated;
GRANT UPDATE ON public.chms_connections TO authenticated;
GRANT DELETE ON public.chms_connections TO authenticated;

GRANT SELECT ON public.chms_profile_links TO authenticated;
GRANT INSERT ON public.chms_profile_links TO authenticated;
GRANT UPDATE ON public.chms_profile_links TO authenticated;

GRANT SELECT ON public.chms_sync_log TO authenticated;
GRANT INSERT ON public.chms_sync_log TO authenticated;

-- Grant execute on RPC functions
GRANT EXECUTE ON FUNCTION public.get_chms_connection TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_chms_connection TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_chms_connection TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chms_sync_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_chms_connection_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chms_connection_with_credentials TO authenticated;
