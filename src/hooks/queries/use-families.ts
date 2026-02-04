import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Parent, Sibling, ParentChild } from "@/types/families";

/**
 * Fetch all parents for an organization
 * Uses the get_organization_parents RPC function
 */
async function fetchOrganizationParents(organizationId: string): Promise<Parent[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_organization_parents", {
    p_organization_id: organizationId,
  });

  if (error) throw error;

  // Transform the data to match our types
  return (data || []).map((row: {
    parent_id: string;
    parent_type: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
    children: ParentChild[];
  }) => ({
    parent_id: row.parent_id,
    parent_type: row.parent_type as "mother" | "father" | "guardian",
    first_name: row.first_name,
    last_name: row.last_name,
    phone: row.phone,
    email: row.email,
    children: row.children || [],
  }));
}

export function useOrganizationParents(organizationId: string | null) {
  return useQuery({
    queryKey: ["organization-parents", organizationId],
    queryFn: () => fetchOrganizationParents(organizationId!),
    enabled: !!organizationId,
  });
}

/**
 * Fetch siblings for a student
 * Uses the get_student_siblings RPC function
 */
async function fetchStudentSiblings(studentId: string): Promise<Sibling[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_student_siblings", {
    p_student_id: studentId,
  });

  if (error) throw error;

  return (data || []).map((row: {
    student_id: string;
    first_name: string;
    last_name: string;
    grade: string | null;
    relationship: string;
  }) => ({
    student_id: row.student_id,
    first_name: row.first_name,
    last_name: row.last_name,
    grade: row.grade,
    relationship: row.relationship,
  }));
}

export function useStudentSiblings(studentId: string | null) {
  return useQuery({
    queryKey: ["student-siblings", studentId],
    queryFn: () => fetchStudentSiblings(studentId!),
    enabled: !!studentId,
  });
}
