import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface NewStudent {
  profile_id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  email: string | null;
  grade: string | null;
  gender: string | null;
  high_school: string | null;
  created_at: string;
  group_names: string[];
}

async function fetchNewStudents(organizationId: string): Promise<NewStudent[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_new_students", {
    p_org_id: organizationId,
  });

  if (error) throw error;
  return data || [];
}

export function useNewStudents(organizationId: string | null) {
  return useQuery({
    queryKey: ["new-students", organizationId],
    queryFn: () => fetchNewStudents(organizationId!),
    enabled: !!organizationId,
  });
}

export function useMarkStudentTriaged() {
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
      const { data, error } = await supabase.rpc("mark_student_triaged", {
        p_profile_id: profileId,
        p_org_id: organizationId,
      });

      if (error) throw error;
      if (data && !data[0]?.success) {
        throw new Error(data[0]?.message || "Failed to mark as triaged");
      }
      return { organizationId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ["new-students", result.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard-stats", result.organizationId],
      });
    },
  });
}
