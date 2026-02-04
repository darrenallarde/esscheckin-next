import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

interface UpdateProfileInput {
  organizationId: string;
  displayName: string;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ organizationId, displayName }: UpdateProfileInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("update_member_display_name", {
        p_organization_id: organizationId,
        p_user_id: user.id,
        p_display_name: displayName.trim(),
      });

      if (error) throw error;
      if (!data || !data[0]?.success) {
        throw new Error(data?.[0]?.message || "Failed to update profile");
      }

      return data[0];
    },
    onSuccess: (_, variables) => {
      // Invalidate team members list
      queryClient.invalidateQueries({ queryKey: ["team-members", variables.organizationId] });
      // Invalidate user profile
      queryClient.invalidateQueries({ queryKey: ["my-org-profile", variables.organizationId] });
    },
  });
}
