import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

interface ParentInfo {
  profile_id?: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  is_claimed?: boolean;
}

interface GuardianInfo {
  profile_id?: string;
  name: string | null;
  phone: string | null;
  is_claimed?: boolean;
}

interface StudentParentInfo {
  mother: ParentInfo | null;
  father: ParentInfo | null;
  guardian: GuardianInfo | null;
}

/**
 * Fetch parent info - checks parent_student_links first (linked profiles),
 * then falls back to student_profiles/students table data
 */
async function fetchStudentParents(studentId: string, orgId: string | null): Promise<StudentParentInfo> {
  const supabase = createClient();

  // First, try to get linked parent profiles via RPC
  if (orgId) {
    const { data: linkedParents } = await supabase.rpc("get_student_parents", {
      p_student_profile_id: studentId,
      p_org_id: orgId,
    });

    if (linkedParents && linkedParents.length > 0) {
      let mother: ParentInfo | null = null;
      let father: ParentInfo | null = null;
      let guardian: GuardianInfo | null = null;

      linkedParents.forEach((parent: {
        parent_profile_id: string;
        first_name: string;
        last_name: string;
        email: string | null;
        phone_number: string | null;
        relationship: string;
        is_claimed: boolean;
      }) => {
        const parentInfo: ParentInfo = {
          profile_id: parent.parent_profile_id,
          first_name: parent.first_name,
          last_name: parent.last_name,
          phone: parent.phone_number,
          email: parent.email,
          is_claimed: parent.is_claimed,
        };

        if (parent.relationship === "mother" && !mother) {
          mother = parentInfo;
        } else if (parent.relationship === "father" && !father) {
          father = parentInfo;
        } else if (!guardian) {
          guardian = {
            profile_id: parent.parent_profile_id,
            name: `${parent.first_name} ${parent.last_name}`.trim(),
            phone: parent.phone_number,
            is_claimed: parent.is_claimed,
          };
        }
      });

      // If we found linked parents, return them
      if (mother || father || guardian) {
        return { mother, father, guardian };
      }
    }
  }

  // Fall back to student_profiles table data (embedded parent info)
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
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id || null;

  return useQuery({
    queryKey: ["student-parents", studentId, orgId],
    queryFn: () => fetchStudentParents(studentId!, orgId),
    enabled: !!studentId,
  });
}
