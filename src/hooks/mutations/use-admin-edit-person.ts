import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface UpdatePersonInput {
  organizationId: string;
  profileId: string;
  // Profile fields
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  // Student profile fields
  grade?: string;
  highSchool?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export function useAdminEditPerson() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (input: UpdatePersonInput) => {
      const { data, error } = await supabase.rpc("update_person_profile", {
        p_org_id: input.organizationId,
        p_profile_id: input.profileId,
        p_first_name: input.firstName,
        p_last_name: input.lastName,
        p_email: input.email,
        p_phone_number: input.phoneNumber,
        p_grade: input.grade,
        p_high_school: input.highSchool,
        p_gender: input.gender,
        p_address: input.address,
        p_city: input.city,
        p_state: input.state,
        p_zip: input.zip,
      });

      if (error) throw error;
      if (!data || !data[0]?.success) {
        throw new Error(data?.[0]?.message || "Failed to update profile");
      }

      return data[0];
    },
    onSuccess: (_, variables) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["people"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["organization-people", variables.organizationId] });
    },
  });
}
