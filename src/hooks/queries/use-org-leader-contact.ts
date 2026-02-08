import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

interface OrgLeaderContact {
  first_name: string;
  phone_number: string | null;
}

export function useOrgLeaderContact(orgId: string) {
  return useQuery({
    queryKey: ["org-leader-contact", orgId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_org_leader_contact", {
        p_org_id: orgId,
      });
      if (error) throw error;
      return data as OrgLeaderContact | null;
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 30, // 30 min — rarely changes
  });
}
