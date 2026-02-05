import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface ChmsConnectionData {
  id: string;
  organization_id: string;
  provider: "rock" | "planning_center" | "ccb";
  display_name: string | null;
  base_url: string | null;
  is_active: boolean;
  sync_config: Record<string, unknown>;
  auto_sync_enabled: boolean;
  auto_sync_interval_hours: number;
  last_sync_at: string | null;
  last_sync_status: "success" | "partial" | "error" | null;
  last_sync_error: string | null;
  last_sync_stats: {
    created?: number;
    updated?: number;
    linked?: number;
    skipped?: number;
    failed?: number;
  } | null;
  connection_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChmsSyncLogEntry {
  id: string;
  sync_type: string;
  provider: string;
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_linked: number;
  records_skipped: number;
  records_failed: number;
  error_details: Array<{ externalId: string; error: string }> | null;
  started_at: string;
  completed_at: string | null;
  trigger_method: string | null;
}

async function fetchChmsConnection(
  organizationId: string
): Promise<ChmsConnectionData | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_chms_connection", {
    p_org_id: organizationId,
  });

  if (error) throw error;
  if (!data || data.length === 0) return null;
  return data[0] as ChmsConnectionData;
}

async function fetchChmsSyncHistory(
  organizationId: string
): Promise<ChmsSyncLogEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_chms_sync_history", {
    p_org_id: organizationId,
    p_limit: 20,
  });

  if (error) throw error;
  return (data || []) as ChmsSyncLogEntry[];
}

export function useChmsConnection(organizationId: string | null) {
  return useQuery({
    queryKey: ["chms-connection", organizationId],
    queryFn: () => fetchChmsConnection(organizationId!),
    enabled: !!organizationId,
  });
}

export function useChmsSyncHistory(organizationId: string | null) {
  return useQuery({
    queryKey: ["chms-sync-history", organizationId],
    queryFn: () => fetchChmsSyncHistory(organizationId!),
    enabled: !!organizationId,
  });
}
