import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface Student {
  id: string;
  profile_id?: string; // New: unified profile ID
  first_name: string;
  last_name: string;
  phone_number: string | null;
  email: string | null;
  grade: string | null;
  high_school: string | null;
  user_type: string | null;
  total_points: number;
  current_rank: string;
  last_check_in: string | null;
  days_since_last_check_in: number | null;
  total_check_ins: number;
  groups: Array<{ id: string; name: string; color: string | null }>;
}

interface RpcStudentRow {
  profile_id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  grade: string | null;
  high_school: string | null;
  user_type: string;
  total_points: number;
  current_rank: string;
  last_check_in: string | null;
  total_check_ins: number;
}

async function fetchStudents(organizationId: string): Promise<Student[]> {
  const supabase = createClient();

  // Use the new profile-based RPC function
  const { data, error } = await supabase.rpc("get_organization_students", {
    p_org_id: organizationId,
  });

  if (error) throw error;

  const students = data as RpcStudentRow[] || [];
  const today = new Date();

  // Get group memberships for all profiles
  const profileIds = students.map((s) => s.profile_id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let groupMemberships: Array<{ profile_id: string; group_id: string; groups: any }> = [];

  if (profileIds.length > 0) {
    // Try new group_memberships table first
    const { data: newGroupData } = await supabase
      .from("group_memberships")
      .select(`
        profile_id,
        group_id,
        groups(id, name, color)
      `)
      .in("profile_id", profileIds);

    if (newGroupData && newGroupData.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      groupMemberships = newGroupData as any;
    } else {
      // Fallback to old group_members table
      const { data: oldGroupData } = await supabase
        .from("group_members")
        .select(`
          student_id,
          group_id,
          groups(id, name, color)
        `)
        .in("student_id", profileIds);

      if (oldGroupData) {
        groupMemberships = oldGroupData.map((gm) => ({
          profile_id: gm.student_id,
          group_id: gm.group_id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          groups: gm.groups as any,
        }));
      }
    }
  }

  // Build groups map by profile_id
  const groupsMap = new Map<string, Array<{ id: string; name: string; color: string | null }>>();
  groupMemberships.forEach((gm) => {
    if (gm.groups) {
      const existing = groupsMap.get(gm.profile_id) || [];
      existing.push(gm.groups);
      groupsMap.set(gm.profile_id, existing);
    }
  });

  return students.map((student) => {
    const lastCheckIn = student.last_check_in;
    const daysSince = lastCheckIn
      ? Math.floor((today.getTime() - new Date(lastCheckIn).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      id: student.profile_id, // Use profile_id as the main ID
      profile_id: student.profile_id,
      first_name: student.first_name,
      last_name: student.last_name,
      phone_number: student.phone_number,
      email: student.email,
      grade: student.grade,
      high_school: student.high_school,
      user_type: student.user_type,
      total_points: student.total_points || 0,
      current_rank: student.current_rank || "Newcomer",
      last_check_in: lastCheckIn,
      days_since_last_check_in: daysSince,
      total_check_ins: Number(student.total_check_ins) || 0,
      groups: groupsMap.get(student.profile_id) || [],
    };
  });
}

export function useStudents(organizationId: string | null) {
  return useQuery({
    queryKey: ["students", organizationId],
    queryFn: () => fetchStudents(organizationId!),
    enabled: !!organizationId,
  });
}

// Search students (for adding to groups) - uses profiles table
async function searchStudents(organizationId: string, query: string): Promise<Student[]> {
  const supabase = createClient();

  // Search profiles via organization_memberships
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      first_name,
      last_name,
      phone_number,
      email,
      organization_memberships!inner(organization_id, role, status),
      student_profiles(grade, high_school),
      student_game_stats(total_points, current_rank)
    `)
    .eq("organization_memberships.organization_id", organizationId)
    .eq("organization_memberships.role", "student")
    .eq("organization_memberships.status", "active")
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone_number.ilike.%${query}%`)
    .limit(10);

  if (error) throw error;

  return (data || []).map((profile) => {
    const studentProfile = (profile.student_profiles as Array<{ grade: string | null; high_school: string | null }>)?.[0];
    const gameStats = (profile.student_game_stats as Array<{ total_points: number; current_rank: string }>)?.[0];
    return {
      id: profile.id,
      profile_id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      phone_number: profile.phone_number,
      email: profile.email,
      grade: studentProfile?.grade || null,
      high_school: studentProfile?.high_school || null,
      user_type: "student",
      total_points: gameStats?.total_points || 0,
      current_rank: gameStats?.current_rank || "Newcomer",
      last_check_in: null,
      days_since_last_check_in: null,
      total_check_ins: 0,
      groups: [],
    };
  });
}

export function useSearchStudents(organizationId: string | null, query: string) {
  return useQuery({
    queryKey: ["search-students", organizationId, query],
    queryFn: () => searchStudents(organizationId!, query),
    enabled: !!organizationId && query.length >= 2,
  });
}

// Fetch all students with group membership info (for bulk assignment UI)
// Reuses the main fetchStudents function which now uses profiles
async function fetchAllStudentsForAssignment(organizationId: string): Promise<Student[]> {
  // Use the same profile-based fetch function
  return fetchStudents(organizationId);
}

export function useAllStudentsForAssignment(organizationId: string | null) {
  return useQuery({
    queryKey: ["students-for-assignment", organizationId],
    queryFn: () => fetchAllStudentsForAssignment(organizationId!),
    enabled: !!organizationId,
  });
}
