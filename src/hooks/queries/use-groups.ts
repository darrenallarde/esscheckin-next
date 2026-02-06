import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type MeetingFrequency = "weekly" | "bi-weekly" | "monthly";

export interface MeetingTime {
  id: string;
  group_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  frequency: MeetingFrequency;
}

export const FREQUENCY_OPTIONS: { value: MeetingFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
];

export interface GroupLeader {
  id: string;
  user_id: string;
  role: "leader" | "co-leader";
  user_email?: string;
}

export interface Group {
  id: string;
  organization_id: string;
  campus_id: string | null;
  name: string;
  description: string | null;
  color: string | null;
  created_by: string | null;
  created_at: string;
  meeting_times: MeetingTime[];
  leaders: GroupLeader[];
  member_count: number;
  needs_attention_count: number;
  // Default group settings
  is_default: boolean;
  default_grades: string[] | null;
  default_gender: string | null;
}

export interface GroupMember {
  id: string;
  student_id: string;
  profile_id?: string; // New: unified profile ID
  first_name: string;
  last_name: string;
  grade: string | null;
  current_rank: string;
  total_points: number;
  last_check_in: string | null;
  current_streak: number;
  best_streak: number;
}

async function fetchGroups(organizationId: string): Promise<Group[]> {
  const supabase = createClient();

  // Get groups with meeting times for this organization
  const { data: groups, error } = await supabase
    .from("groups")
    .select(`
      *,
      group_meeting_times(*),
      group_leaders(id, user_id, role),
      group_members(student_id),
      group_memberships(profile_id)
    `)
    .eq("organization_id", organizationId)
    .order("name");

  if (error) throw error;

  // Get people who need attention (30+ days absent) - check both profile_id and student_id
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentCheckIns } = await supabase
    .from("check_ins")
    .select("profile_id, student_id")
    .eq("organization_id", organizationId)
    .gte("checked_in_at", thirtyDaysAgo.toISOString());

  // Build a set of active IDs (could be profile_id or student_id)
  const activeIds = new Set<string>();
  (recentCheckIns || []).forEach((c) => {
    if (c.profile_id) activeIds.add(c.profile_id);
    if (c.student_id) activeIds.add(c.student_id);
  });

  return (groups || []).map((group) => {
    // Try group_memberships first (new table), fallback to group_members
    const memberships = group.group_memberships as Array<{ profile_id: string }> | null;
    const oldMembers = group.group_members as Array<{ student_id: string }> | null;

    let memberIds: string[];
    if (memberships && memberships.length > 0) {
      memberIds = memberships.map((m) => m.profile_id);
    } else {
      memberIds = (oldMembers || []).map((m) => m.student_id);
    }

    const needsAttention = memberIds.filter((id) => !activeIds.has(id)).length;

    return {
      id: group.id,
      organization_id: group.organization_id,
      campus_id: group.campus_id,
      name: group.name,
      description: group.description,
      color: group.color,
      created_by: group.created_by,
      created_at: group.created_at,
      meeting_times: group.group_meeting_times || [],
      leaders: group.group_leaders || [],
      member_count: memberIds.length,
      needs_attention_count: needsAttention,
      is_default: group.is_default || false,
      default_grades: group.default_grades || null,
      default_gender: group.default_gender || null,
    };
  });
}

export function useGroups(organizationId: string | null) {
  return useQuery({
    queryKey: ["groups", organizationId],
    queryFn: () => fetchGroups(organizationId!),
    enabled: !!organizationId,
  });
}

async function fetchGroupMembers(groupId: string): Promise<GroupMember[]> {
  const supabase = createClient();

  // Try new group_memberships table first
  const { data: memberships } = await supabase
    .from("group_memberships")
    .select(`
      id,
      profile_id,
      profiles(
        id,
        first_name,
        last_name,
        student_profiles(grade),
        student_game_stats(total_points, current_rank)
      )
    `)
    .eq("group_id", groupId)
    .eq("role", "member");

  let memberData: GroupMember[] = [];

  if (memberships && memberships.length > 0) {
    // Use profiles data
    const profileIds = memberships.map((m) => m.profile_id).filter(Boolean);

    // Get last check-in for each profile (check both profile_id and student_id)
    const { data: checkIns } = await supabase
      .from("check_ins")
      .select("profile_id, student_id, checked_in_at")
      .or(`profile_id.in.(${profileIds.join(",")}),student_id.in.(${profileIds.join(",")})`)
      .order("checked_in_at", { ascending: false });

    const lastCheckInMap = new Map<string, string>();
    (checkIns || []).forEach((ci) => {
      const id = ci.profile_id || ci.student_id;
      if (id && !lastCheckInMap.has(id)) {
        lastCheckInMap.set(id, ci.checked_in_at);
      }
    });

    // Get streaks for each profile in this group
    const streakPromises = profileIds.map((profileId) =>
      supabase.rpc("get_student_group_streak", {
        p_student_id: profileId,
        p_group_id: groupId,
      })
    );

    const streakResults = await Promise.all(streakPromises);
    const streakMap = new Map<string, { current_streak: number; best_streak: number }>();
    profileIds.forEach((profileId, index) => {
      const result = streakResults[index];
      if (result.data && result.data[0]) {
        streakMap.set(profileId, {
          current_streak: result.data[0].current_streak || 0,
          best_streak: result.data[0].best_streak || 0,
        });
      }
    });

    memberData = memberships.map((m) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profile = m.profiles as any;
      const studentProfile = profile?.student_profiles?.[0];
      const gameStats = profile?.student_game_stats?.[0];
      const streak = streakMap.get(m.profile_id) || { current_streak: 0, best_streak: 0 };

      return {
        id: m.id,
        student_id: m.profile_id,
        profile_id: m.profile_id,
        first_name: profile?.first_name || "",
        last_name: profile?.last_name || "",
        grade: studentProfile?.grade || null,
        current_rank: gameStats?.current_rank || "Newcomer",
        total_points: gameStats?.total_points || 0,
        last_check_in: lastCheckInMap.get(m.profile_id) || null,
        current_streak: streak.current_streak,
        best_streak: streak.best_streak,
      };
    }).filter((m) => m.profile_id);
  } else {
    // Fallback: get student_ids from old group_members, then look up profiles
    const { data: members, error } = await supabase
      .from("group_members")
      .select("id, student_id")
      .eq("group_id", groupId);

    if (error) throw error;

    const studentIds = members?.map((m) => m.student_id).filter(Boolean) || [];

    if (studentIds.length === 0) {
      return [];
    }

    // Look up profiles for these student IDs (may be profile IDs or legacy student IDs)
    const { data: profiles } = await supabase
      .from("profiles")
      .select(`
        id,
        first_name,
        last_name,
        student_profiles(grade),
        student_game_stats(total_points, current_rank)
      `)
      .in("id", studentIds);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileMap = new Map<string, any>();
    (profiles || []).forEach((p) => profileMap.set(p.id, p));

    const { data: checkIns } = await supabase
      .from("check_ins")
      .select("profile_id, student_id, checked_in_at")
      .or(`profile_id.in.(${studentIds.join(",")}),student_id.in.(${studentIds.join(",")})`)
      .order("checked_in_at", { ascending: false });

    const lastCheckInMap = new Map<string, string>();
    (checkIns || []).forEach((ci) => {
      const id = ci.profile_id || ci.student_id;
      if (id && !lastCheckInMap.has(id)) {
        lastCheckInMap.set(id, ci.checked_in_at);
      }
    });

    const streakPromises = studentIds.map((studentId) =>
      supabase.rpc("get_student_group_streak", {
        p_student_id: studentId,
        p_group_id: groupId,
      })
    );

    const streakResults = await Promise.all(streakPromises);
    const streakMap = new Map<string, { current_streak: number; best_streak: number }>();
    studentIds.forEach((studentId, index) => {
      const result = streakResults[index];
      if (result.data && result.data[0]) {
        streakMap.set(studentId, {
          current_streak: result.data[0].current_streak || 0,
          best_streak: result.data[0].best_streak || 0,
        });
      }
    });

    memberData = (members || []).map((member) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profile = profileMap.get(member.student_id) as any;
      const studentProfile = profile?.student_profiles?.[0];
      const gameStats = profile?.student_game_stats?.[0];
      const streak = streakMap.get(member.student_id) || { current_streak: 0, best_streak: 0 };

      return {
        id: member.id,
        student_id: member.student_id,
        first_name: profile?.first_name || "",
        last_name: profile?.last_name || "",
        grade: studentProfile?.grade || null,
        current_rank: gameStats?.current_rank || "Newcomer",
        total_points: gameStats?.total_points || 0,
        last_check_in: lastCheckInMap.get(member.student_id) || null,
        current_streak: streak.current_streak,
        best_streak: streak.best_streak,
      };
    }).filter((m) => m.student_id);
  }

  return memberData;
}

export function useGroupMembers(groupId: string | null) {
  return useQuery({
    queryKey: ["group-members", groupId],
    queryFn: () => fetchGroupMembers(groupId!),
    enabled: !!groupId,
  });
}

// Mutations
export function useCreateGroup() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      color?: string;
      organization_id: string;
      meeting_times: Array<{ day_of_week: number; start_time: string; end_time: string; frequency?: MeetingFrequency }>;
      is_default?: boolean;
      default_grades?: string[];
      default_gender?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Create group with default settings
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert({
          name: data.name,
          description: data.description,
          color: data.color,
          organization_id: data.organization_id,
          created_by: user?.id,
          is_default: data.is_default || false,
          default_grades: data.default_grades || null,
          default_gender: data.default_gender || null,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Create meeting times
      if (data.meeting_times.length > 0) {
        const { error: meetingError } = await supabase
          .from("group_meeting_times")
          .insert(
            data.meeting_times.map((mt) => ({
              group_id: group.id,
              day_of_week: mt.day_of_week,
              start_time: mt.start_time,
              end_time: mt.end_time,
              frequency: mt.frequency || "weekly",
            }))
          );

        if (meetingError) throw meetingError;
      }

      return group;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["groups", variables.organization_id] });
    },
  });
}

export function useAddStudentToGroup() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ groupId, studentId, organizationId }: { groupId: string; studentId: string; organizationId: string }) => {
      // Write to new group_memberships table (profile_id = studentId since we use same IDs)
      const { error: newError } = await supabase
        .from("group_memberships")
        .insert({
          group_id: groupId,
          profile_id: studentId,
          role: "member",
        });

      // If new table insert failed (maybe table doesn't exist), try old table
      if (newError) {
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
          .from("group_members")
          .insert({
            group_id: groupId,
            student_id: studentId,
            added_by: user?.id,
          });

        if (error) throw error;
      }

      return { organizationId };
    },
    onSuccess: (result, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ["groups", result.organizationId] });
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
    },
  });
}

export function useRemoveStudentFromGroup() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ groupId, studentId, organizationId }: { groupId: string; studentId: string; organizationId: string }) => {
      // Delete from new group_memberships table
      await supabase
        .from("group_memberships")
        .delete()
        .eq("group_id", groupId)
        .eq("profile_id", studentId);

      // Also delete from old group_members table (for backward compat)
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("student_id", studentId);

      if (error) throw error;
      return { organizationId };
    },
    onSuccess: (result, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ["groups", result.organizationId] });
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
    },
  });
}

export function useBulkAddStudentsToGroup() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ groupId, studentIds, organizationId }: { groupId: string; studentIds: string[]; organizationId: string }) => {
      // Write to new group_memberships table
      const { error: newError } = await supabase
        .from("group_memberships")
        .insert(studentIds.map(studentId => ({
          group_id: groupId,
          profile_id: studentId,
          role: "member",
        })));

      // If new table failed, try old table
      if (newError) {
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
          .from("group_members")
          .insert(studentIds.map(studentId => ({
            group_id: groupId,
            student_id: studentId,
            added_by: user?.id,
          })));

        if (error) throw error;
      }

      return { organizationId };
    },
    onSuccess: (result, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ["groups", result.organizationId] });
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      queryClient.invalidateQueries({ queryKey: ["students", result.organizationId] });
    },
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      description?: string;
      color?: string;
      organization_id: string;
      meeting_times: Array<{ id?: string; day_of_week: number; start_time: string; end_time: string; frequency?: MeetingFrequency }>;
      is_default?: boolean;
      default_grades?: string[];
      default_gender?: string;
    }) => {
      // Update group
      const { error: groupError } = await supabase
        .from("groups")
        .update({
          name: data.name,
          description: data.description || null,
          color: data.color,
          is_default: data.is_default || false,
          default_grades: data.default_grades || null,
          default_gender: data.default_gender || null,
        })
        .eq("id", data.id);

      if (groupError) throw groupError;

      // Replace meeting times: delete old, insert new
      await supabase
        .from("group_meeting_times")
        .delete()
        .eq("group_id", data.id);

      if (data.meeting_times.length > 0) {
        const { error: meetingError } = await supabase
          .from("group_meeting_times")
          .insert(
            data.meeting_times.map((mt) => ({
              group_id: data.id,
              day_of_week: mt.day_of_week,
              start_time: mt.start_time,
              end_time: mt.end_time,
              frequency: mt.frequency || "weekly",
            }))
          );

        if (meetingError) throw meetingError;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["groups", variables.organization_id] });
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ groupId, organizationId }: { groupId: string; organizationId: string }) => {
      // Delete meeting times first
      await supabase.from("group_meeting_times").delete().eq("group_id", groupId);
      // Delete memberships
      await supabase.from("group_memberships").delete().eq("group_id", groupId);
      await supabase.from("group_members").delete().eq("group_id", groupId);
      await supabase.from("group_leaders").delete().eq("group_id", groupId);
      // Delete group
      const { error } = await supabase.from("groups").delete().eq("id", groupId);
      if (error) throw error;
      return { organizationId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["groups", result.organizationId] });
    },
  });
}

// Day names helper
export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function formatMeetingTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export function getNextMeetingText(meetingTimes: MeetingTime[]): string {
  if (!meetingTimes || meetingTimes.length === 0) return "No meetings scheduled";

  const activeTimes = meetingTimes.filter((mt) => mt.is_active);
  if (activeTimes.length === 0) return "No active meetings";

  const today = new Date().getDay();

  // Sort meeting times by day, starting from today
  const sortedTimes = [...activeTimes].sort((a, b) => {
    const aDaysUntil = (a.day_of_week - today + 7) % 7 || 7;
    const bDaysUntil = (b.day_of_week - today + 7) % 7 || 7;
    return aDaysUntil - bDaysUntil;
  });

  const nextMeeting = sortedTimes[0];
  const daysUntil = (nextMeeting.day_of_week - today + 7) % 7;

  if (daysUntil === 0) {
    return `Today at ${formatMeetingTime(nextMeeting.start_time)}`;
  } else if (daysUntil === 1) {
    return `Tomorrow at ${formatMeetingTime(nextMeeting.start_time)}`;
  } else {
    return `${DAY_NAMES[nextMeeting.day_of_week]} at ${formatMeetingTime(nextMeeting.start_time)}`;
  }
}
