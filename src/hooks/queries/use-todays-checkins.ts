import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface TodayCheckIn {
  id: string;
  profile_id: string | null;
  student_id: string;
  checked_in_at: string;
  student: {
    id: string;
    first_name: string;
    last_name: string;
    grade: string | null;
    phone_number: string | null;
  };
}

async function fetchTodaysCheckIns(organizationId: string): Promise<TodayCheckIn[]> {
  const supabase = createClient();

  // Get start of today in local time
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Try to fetch with profiles first (new schema)
  const { data: checkIns, error } = await supabase
    .from("check_ins")
    .select(`
      id,
      profile_id,
      student_id,
      checked_in_at
    `)
    .eq("organization_id", organizationId)
    .gte("checked_in_at", today.toISOString())
    .order("checked_in_at", { ascending: false });

  if (error) throw error;

  if (!checkIns || checkIns.length === 0) {
    return [];
  }

  // Get unique profile/student IDs
  const profileIds = Array.from(new Set(checkIns.map(ci => ci.profile_id).filter(Boolean))) as string[];
  const studentIds = Array.from(new Set(checkIns.map(ci => ci.student_id).filter(Boolean))) as string[];

  // Fetch profiles data
  const profilesMap = new Map<string, { first_name: string; last_name: string; phone_number: string | null }>();
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, phone_number")
      .in("id", profileIds);

    if (profiles) {
      profiles.forEach(p => profilesMap.set(p.id, p));
    }
  }

  // Fetch student_profiles for grade info
  const studentProfilesMap = new Map<string, { grade: string | null }>();
  if (profileIds.length > 0) {
    const { data: studentProfiles } = await supabase
      .from("student_profiles")
      .select("profile_id, grade")
      .in("profile_id", profileIds);

    if (studentProfiles) {
      studentProfiles.forEach(sp => studentProfilesMap.set(sp.profile_id, { grade: sp.grade }));
    }
  }

  // Fallback: fetch from students table for any missing
  const studentsMap = new Map<string, { id: string; first_name: string; last_name: string; grade: string | null; phone_number: string | null }>();
  const missingStudentIds = studentIds.filter(id => !profilesMap.has(id));
  if (missingStudentIds.length > 0) {
    const { data: students } = await supabase
      .from("students")
      .select("id, first_name, last_name, grade, phone_number")
      .in("id", missingStudentIds);

    if (students) {
      students.forEach(s => studentsMap.set(s.id, s));
    }
  }

  return checkIns.map((row) => {
    const profileId = row.profile_id;
    const studentId = row.student_id;

    // Try profile first, then fallback to student
    const profile = profileId ? profilesMap.get(profileId) : null;
    const studentProfile = profileId ? studentProfilesMap.get(profileId) : null;
    const student = studentId ? studentsMap.get(studentId) : null;

    const personData = profile || student;

    return {
      id: row.id,
      profile_id: profileId,
      student_id: studentId,
      checked_in_at: row.checked_in_at,
      student: {
        id: profileId || studentId,
        first_name: personData?.first_name || "Unknown",
        last_name: personData?.last_name || "",
        grade: studentProfile?.grade || student?.grade || null,
        phone_number: personData?.phone_number || null,
      },
    };
  });
}

export function useTodaysCheckIns(organizationId: string | null) {
  return useQuery({
    queryKey: ["todays-checkins", organizationId],
    queryFn: () => fetchTodaysCheckIns(organizationId!),
    enabled: !!organizationId,
    // Refetch every minute to keep it fresh
    refetchInterval: 60000,
  });
}
