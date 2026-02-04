import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface MyOrgProfile {
  member_id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  role: string;
}

async function fetchMyOrgProfile(organizationId: string): Promise<MyOrgProfile | null> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_my_org_profile", {
    p_organization_id: organizationId,
  });

  if (error) throw error;

  if (!data || data.length === 0) return null;

  return data[0] as MyOrgProfile;
}

export function useMyOrgProfile(organizationId: string | null) {
  return useQuery({
    queryKey: ["my-org-profile", organizationId],
    queryFn: () => fetchMyOrgProfile(organizationId!),
    enabled: !!organizationId,
  });
}
