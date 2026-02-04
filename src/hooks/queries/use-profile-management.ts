import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function useArchiveStudent() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      profileId,
      organizationId,
    }: {
      profileId: string;
      organizationId: string;
    }) => {
      const { data, error } = await supabase.rpc("archive_student", {
        p_profile_id: profileId,
        p_org_id: organizationId,
      });

      if (error) throw error;
      if (data && !data[0]?.success) {
        throw new Error(data[0]?.message || "Failed to archive student");
      }
      return { organizationId };
    },
    onSuccess: (result) => {
      // Invalidate all student-related queries
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["group-members"] });
    },
  });
}

export function useRestoreStudent() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      profileId,
      organizationId,
    }: {
      profileId: string;
      organizationId: string;
    }) => {
      const { data, error } = await supabase.rpc("restore_student", {
        p_profile_id: profileId,
        p_org_id: organizationId,
      });

      if (error) throw error;
      if (data && !data[0]?.success) {
        throw new Error(data[0]?.message || "Failed to restore student");
      }
      return { organizationId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["group-members"] });
    },
  });
}

export function useDeleteStudentPermanently() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      profileId,
      organizationId,
    }: {
      profileId: string;
      organizationId: string;
    }) => {
      const { data, error } = await supabase.rpc("delete_student_permanently", {
        p_profile_id: profileId,
        p_org_id: organizationId,
      });

      if (error) throw error;
      if (data && !data[0]?.success) {
        throw new Error(data[0]?.message || "Failed to delete student");
      }
      return { organizationId, message: data[0]?.message };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["group-members"] });
    },
  });
}
