import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface SavedQuery {
  id: string;
  queryText: string;
  isStarred: boolean;
  createdAt: string;
  lastUsedAt: string;
  useCount: number;
}

interface RpcSavedQueryRow {
  id: string;
  query_text: string;
  is_starred: boolean;
  created_at: string;
  last_used_at: string;
  use_count: number;
}

// Fetch saved queries for an organization
async function fetchSavedQueries(orgId: string): Promise<SavedQuery[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_insights_saved_queries", {
    p_org_id: orgId,
    p_limit: 20,
  });

  if (error) throw error;

  return (data as RpcSavedQueryRow[] || []).map((row) => ({
    id: row.id,
    queryText: row.query_text,
    isStarred: row.is_starred,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    useCount: row.use_count,
  }));
}

export function useSavedQueries(orgId: string | null) {
  return useQuery({
    queryKey: ["insights-saved-queries", orgId],
    queryFn: () => fetchSavedQueries(orgId!),
    enabled: !!orgId,
  });
}

// Save a query (or update usage if exists)
export function useSaveQuery() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      orgId,
      queryText,
      isStarred,
    }: {
      orgId: string;
      queryText: string;
      isStarred?: boolean;
    }) => {
      const { data, error } = await supabase.rpc("save_insights_query", {
        p_org_id: orgId,
        p_query_text: queryText,
        p_is_starred: isStarred ?? null,
      });

      if (error) throw error;
      return { queryId: data, orgId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["insights-saved-queries", result.orgId] });
    },
  });
}

// Toggle star status on a query
export function useToggleQueryStar() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      queryId,
      orgId,
    }: {
      queryId: string;
      orgId: string;
    }) => {
      const { data, error } = await supabase.rpc("toggle_insights_query_star", {
        p_query_id: queryId,
      });

      if (error) throw error;
      return { newStarred: data, orgId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["insights-saved-queries", result.orgId] });
    },
  });
}

// Delete a saved query
export function useDeleteQuery() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      queryId,
      orgId,
    }: {
      queryId: string;
      orgId: string;
    }) => {
      const { error } = await supabase.rpc("delete_insights_query", {
        p_query_id: queryId,
      });

      if (error) throw error;
      return { orgId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["insights-saved-queries", result.orgId] });
    },
  });
}
