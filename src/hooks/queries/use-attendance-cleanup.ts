import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

// Fetch student IDs who have check-ins on a specific date
async function fetchCheckinsForDate(
  organizationId: string,
  date: Date
): Promise<Set<string>> {
  const supabase = createClient();

  // Get start and end of the day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("check_ins")
    .select("student_id")
    .eq("organization_id", organizationId)
    .gte("checked_in_at", startOfDay.toISOString())
    .lte("checked_in_at", endOfDay.toISOString());

  if (error) throw error;

  return new Set((data || []).map((row) => row.student_id));
}

export function useCheckinsForDate(organizationId: string | null, date: Date | null) {
  return useQuery({
    queryKey: ["checkins-for-date", organizationId, date?.toISOString()],
    queryFn: () => fetchCheckinsForDate(organizationId!, date!),
    enabled: !!organizationId && !!date,
  });
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
      queryClient.invalidateQueries({
        queryKey: ["checkins-for-date", variables.organizationId],
      });
    },
  });
}
