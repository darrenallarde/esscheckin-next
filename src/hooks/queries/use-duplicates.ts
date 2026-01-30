import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface DuplicatePair {
  student_a_id: string;
  student_a_name: string;
  student_a_phone: string | null;
  student_a_email: string | null;
  student_a_grade: string | null;
  student_a_checkin_count: number;
  student_b_id: string;
  student_b_name: string;
  student_b_phone: string | null;
  student_b_email: string | null;
  student_b_grade: string | null;
  student_b_checkin_count: number;
  confidence_score: number;
  match_reasons: string[];
}

export interface MergeResult {
  success: boolean;
  message: string;
  merged_checkins: number;
  merged_groups: number;
}

// Fetch potential duplicate students
async function fetchDuplicates(organizationId: string): Promise<DuplicatePair[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("find_duplicate_students", {
    p_organization_id: organizationId,
  });

  if (error) throw error;

  return (data || []).map((row: Record<string, unknown>) => ({
    student_a_id: row.student_a_id as string,
    student_a_name: row.student_a_name as string,
    student_a_phone: row.student_a_phone as string | null,
    student_a_email: row.student_a_email as string | null,
    student_a_grade: row.student_a_grade as string | null,
    student_a_checkin_count: Number(row.student_a_checkin_count) || 0,
    student_b_id: row.student_b_id as string,
    student_b_name: row.student_b_name as string,
    student_b_phone: row.student_b_phone as string | null,
    student_b_email: row.student_b_email as string | null,
    student_b_grade: row.student_b_grade as string | null,
    student_b_checkin_count: Number(row.student_b_checkin_count) || 0,
    confidence_score: Number(row.confidence_score) || 0,
    match_reasons: row.match_reasons as string[] || [],
  }));
}

export function useDuplicates(organizationId: string | null) {
  return useQuery({
    queryKey: ["duplicates", organizationId],
    queryFn: () => fetchDuplicates(organizationId!),
    enabled: !!organizationId,
  });
}

// Merge two students
interface MergeParams {
  keepStudentId: string;
  mergeStudentId: string;
  primaryPhone?: string | null;
  secondaryPhone?: string | null;
  organizationId: string;
}

export function useMergeStudents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: MergeParams): Promise<MergeResult> => {
      const supabase = createClient();

      const { data, error } = await supabase.rpc("merge_students", {
        p_keep_student_id: params.keepStudentId,
        p_merge_student_id: params.mergeStudentId,
        p_primary_phone: params.primaryPhone || null,
        p_secondary_phone: params.secondaryPhone || null,
      });

      if (error) throw error;

      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.message || "Merge failed");
      }

      return {
        success: result.success,
        message: result.message,
        merged_checkins: result.merged_checkins || 0,
        merged_groups: result.merged_groups || 0,
      };
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ["duplicates", variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["students", variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["groups", variables.organizationId],
      });
    },
  });
}
