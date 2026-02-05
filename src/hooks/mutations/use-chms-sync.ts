import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

// =============================================================================
// Save Connection
// =============================================================================

export interface SaveConnectionInput {
  organizationId: string;
  provider: "rock" | "planning_center" | "ccb";
  displayName: string;
  baseUrl: string | null;
  credentials: Record<string, string>;
  syncConfig?: Record<string, unknown>;
}

export function useSaveChmsConnection() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (input: SaveConnectionInput) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await supabase.functions.invoke("chms-sync", {
        body: {
          organization_id: input.organizationId,
          action: "save_connection",
          provider: input.provider,
          display_name: input.displayName,
          base_url: input.baseUrl,
          credentials: input.credentials,
          sync_config: input.syncConfig || {},
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (res.error) throw new Error(res.error.message);
      const result = res.data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error || "Failed to save connection");
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["chms-connection", variables.organizationId],
      });
    },
  });
}

// =============================================================================
// Delete Connection
// =============================================================================

export function useDeleteChmsConnection() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await supabase.functions.invoke("chms-sync", {
        body: {
          organization_id: organizationId,
          action: "delete_connection",
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: (_, organizationId) => {
      queryClient.invalidateQueries({
        queryKey: ["chms-connection", organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["chms-sync-history", organizationId],
      });
    },
  });
}

// =============================================================================
// Test Connection
// =============================================================================

export function useTestChmsConnection() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await supabase.functions.invoke("chms-sync", {
        body: {
          organization_id: organizationId,
          action: "test_connection",
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (res.error) throw new Error(res.error.message);
      const result = res.data as { success: boolean; error?: string };
      if (!result.success)
        throw new Error(result.error || "Connection test failed");
      return result;
    },
    onSuccess: (_, organizationId) => {
      queryClient.invalidateQueries({
        queryKey: ["chms-connection", organizationId],
      });
    },
  });
}

// =============================================================================
// Import (Full Import: People + Families)
// =============================================================================

export function useChmsImport() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await supabase.functions.invoke("chms-sync", {
        body: {
          organization_id: organizationId,
          action: "full_import",
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (res.error) throw new Error(res.error.message);
      const result = res.data as {
        success: boolean;
        error?: string;
        people?: { stats: Record<string, number> };
        families?: { stats: Record<string, number> };
      };
      if (!result.success) throw new Error(result.error || "Import failed");
      return result;
    },
    onSuccess: (_, organizationId) => {
      queryClient.invalidateQueries({
        queryKey: ["chms-connection", organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["chms-sync-history", organizationId],
      });
      // Invalidate people list since new profiles were created
      queryClient.invalidateQueries({ queryKey: ["people"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
  });
}

// =============================================================================
// Incremental Sync
// =============================================================================

export function useChmsIncrementalSync() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await supabase.functions.invoke("chms-sync", {
        body: {
          organization_id: organizationId,
          action: "incremental",
          trigger_method: "manual",
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (res.error) throw new Error(res.error.message);
      const result = res.data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error || "Sync failed");
      return result;
    },
    onSuccess: (_, organizationId) => {
      queryClient.invalidateQueries({
        queryKey: ["chms-connection", organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["chms-sync-history", organizationId],
      });
      queryClient.invalidateQueries({ queryKey: ["people"] });
    },
  });
}
