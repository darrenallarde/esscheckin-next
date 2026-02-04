import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface CheckInRecord {
  id: string;
  checked_in_at: string;
  group_name: string | null;
}

export interface InteractionRecord {
  id: string;
  created_at: string;
  interaction_type: string;
  notes: string | null;
  created_by_name: string | null;
}

interface PersonHistory {
  recentCheckIns: CheckInRecord[];
  recentInteractions: InteractionRecord[];
}

async function fetchPersonHistory(profileId: string): Promise<PersonHistory> {
  const supabase = createClient();

  // Fetch last 5 check-ins
  const { data: checkIns } = await supabase
    .from("check_ins")
    .select(`
      id,
      checked_in_at,
      group_id
    `)
    .eq("profile_id", profileId)
    .order("checked_in_at", { ascending: false })
    .limit(5);

  // Get group names for check-ins
  const groupIds = Array.from(new Set((checkIns || []).map(c => c.group_id).filter(Boolean)));
  let groupNames: Record<string, string> = {};

  if (groupIds.length > 0) {
    const { data: groups } = await supabase
      .from("groups")
      .select("id, name")
      .in("id", groupIds);

    groupNames = (groups || []).reduce((acc, g) => {
      acc[g.id] = g.name;
      return acc;
    }, {} as Record<string, string>);
  }

  // Fetch last 5 interactions
  const { data: interactions } = await supabase
    .from("interactions")
    .select(`
      id,
      created_at,
      interaction_type,
      notes,
      created_by
    `)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(5);

  // Get creator names
  const creatorIds = Array.from(new Set((interactions || []).map(i => i.created_by).filter(Boolean)));
  let creatorNames: Record<string, string> = {};

  if (creatorIds.length > 0) {
    const { data: creators } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", creatorIds);

    creatorNames = (creators || []).reduce((acc, p) => {
      acc[p.id] = `${p.first_name} ${p.last_name}`;
      return acc;
    }, {} as Record<string, string>);
  }

  return {
    recentCheckIns: (checkIns || []).map(c => ({
      id: c.id,
      checked_in_at: c.checked_in_at,
      group_name: c.group_id ? groupNames[c.group_id] || null : null,
    })),
    recentInteractions: (interactions || []).map(i => ({
      id: i.id,
      created_at: i.created_at,
      interaction_type: i.interaction_type,
      notes: i.notes,
      created_by_name: i.created_by ? creatorNames[i.created_by] || null : null,
    })),
  };
}

export function usePersonHistory(profileId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ["person-history", profileId],
    queryFn: () => fetchPersonHistory(profileId!),
    enabled: !!profileId && enabled,
  });
}
