import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface OrgContact {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: string;
}

async function fetchOrgContacts(orgId: string): Promise<OrgContact[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("organization_memberships")
    .select(`
      role,
      profiles!inner(id, first_name, last_name, phone_number)
    `)
    .eq("organization_id", orgId)
    .not("profiles.phone_number", "is", null)
    .neq("profiles.phone_number", "");

  if (error) throw error;

  return (data || [])
    .map((row: any) => ({
      id: row.profiles.id as string,
      firstName: (row.profiles.first_name || "") as string,
      lastName: (row.profiles.last_name || "") as string,
      phoneNumber: row.profiles.phone_number as string,
      role: row.role as string,
    }))
    .sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
    );
}

export function useOrgContacts(orgId: string | null) {
  return useQuery({
    queryKey: ["org-contacts", orgId],
    queryFn: () => fetchOrgContacts(orgId!),
    enabled: !!orgId,
  });
}
