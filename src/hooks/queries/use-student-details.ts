import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

interface ParentInfo {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
}

interface GuardianInfo {
  name: string | null;
  phone: string | null;
}

interface StudentParentInfo {
  mother: ParentInfo | null;
  father: ParentInfo | null;
  guardian: GuardianInfo | null;
}

/**
 * Fetch parent info - tries student_profiles first (new schema), falls back to students table
 */
async function fetchStudentParents(studentId: string): Promise<StudentParentInfo> {
  const supabase = createClient();

  // Try new student_profiles table first
  const { data: profileData } = await supabase
    .from("student_profiles")
    .select(`
      mother_first_name,
      mother_last_name,
      mother_phone,
      mother_email,
      father_first_name,
      father_last_name,
      father_phone,
      father_email,
      parent_name,
      parent_phone
    `)
    .eq("profile_id", studentId)
    .single();

  // Use profile data if found, otherwise fall back to students table
  let data = profileData;

  if (!data) {
    const { data: studentData, error } = await supabase
      .from("students")
      .select(`
        mother_first_name,
        mother_last_name,
        mother_phone,
        mother_email,
        father_first_name,
        father_last_name,
        father_phone,
        father_email,
        parent_name,
        parent_phone
      `)
      .eq("id", studentId)
      .single();

    if (error) throw error;
    data = studentData;
  }

  if (!data) {
    return { mother: null, father: null, guardian: null };
  }

  // Build parent info objects, only if there's data
  const mother: ParentInfo | null =
    (data.mother_first_name || data.mother_last_name || data.mother_phone || data.mother_email)
      ? {
          first_name: data.mother_first_name,
          last_name: data.mother_last_name,
          phone: data.mother_phone,
          email: data.mother_email,
        }
      : null;

  const father: ParentInfo | null =
    (data.father_first_name || data.father_last_name || data.father_phone || data.father_email)
      ? {
          first_name: data.father_first_name,
          last_name: data.father_last_name,
          phone: data.father_phone,
          email: data.father_email,
        }
      : null;

  // Only show guardian if not redundant with mother/father
  const guardianPhone = data.parent_phone;
  const isGuardianRedundant =
    (mother?.phone && mother.phone === guardianPhone) ||
    (father?.phone && father.phone === guardianPhone);

  const guardian: GuardianInfo | null =
    ((data.parent_name || data.parent_phone) && !isGuardianRedundant)
      ? {
          name: data.parent_name,
          phone: data.parent_phone,
        }
      : null;

  return { mother, father, guardian };
}

export function useStudentParents(studentId: string | null) {
  return useQuery({
    queryKey: ["student-parents", studentId],
    queryFn: () => fetchStudentParents(studentId!),
    enabled: !!studentId,
  });
}
