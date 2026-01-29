import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface CheckinResult {
  studentId: string;
  studentName: string;
  success: boolean;
  message: string;
  skipped: boolean;
  checkInId: string | null;
}

interface BulkCheckinParams {
  students: Array<{ id: string; first_name: string; last_name: string }>;
  checkinTimestamp: string; // ISO string
  organizationId: string;
}

export function useBulkHistoricalCheckin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: BulkCheckinParams): Promise<CheckinResult[]> => {
      const supabase = createClient();
      const results: CheckinResult[] = [];

      // Process each student
      for (const student of params.students) {
        try {
          const { data, error } = await supabase.rpc("import_historical_checkin", {
            p_student_id: student.id,
            p_checkin_timestamp: params.checkinTimestamp,
            p_organization_id: params.organizationId,
          });

          if (error) {
            results.push({
              studentId: student.id,
              studentName: `${student.first_name} ${student.last_name}`,
              success: false,
              message: error.message,
              skipped: false,
              checkInId: null,
            });
          } else {
            const result = data?.[0];
            const isSkipped = result?.message === "Already checked in on this date";
            results.push({
              studentId: student.id,
              studentName: `${student.first_name} ${student.last_name}`,
              success: result?.success ?? false,
              message: result?.message ?? "Unknown",
              skipped: isSkipped,
              checkInId: result?.check_in_id ?? null,
            });
          }
        } catch (err) {
          results.push({
            studentId: student.id,
            studentName: `${student.first_name} ${student.last_name}`,
            success: false,
            message: err instanceof Error ? err.message : "Unknown error",
            skipped: false,
            checkInId: null,
          });
        }
      }

      return results;
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({
        queryKey: ["students", variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard-stats", variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["attendance-data", variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["groups", variables.organizationId],
      });
    },
  });
}
