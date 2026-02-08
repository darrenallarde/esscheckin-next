"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  grade?: string;
  highSchool?: string;
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("update_my_profile", {
        p_first_name: input.firstName || null,
        p_last_name: input.lastName || null,
        p_email: input.email || null,
        p_phone_number: input.phoneNumber || null,
        p_grade: input.grade || null,
        p_high_school: input.highSchool || null,
      });
      if (error) throw error;
      const result = data as unknown as { success: boolean; error?: string };
      if (!result.success)
        throw new Error(result.error || "Failed to update profile");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-student-profile"] });
    },
  });
}
