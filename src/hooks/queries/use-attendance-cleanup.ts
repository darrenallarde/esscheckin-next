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

export interface CheckinWithDetails {
  id: string;
  profile_id: string;
  checked_in_at: string;
  first_name: string;
  last_name: string;
  grade: string | null;
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

// Fetch check-ins with full details for a specific date
async function fetchCheckinsWithDetails(
  organizationId: string,
  date: Date
): Promise<CheckinWithDetails[]> {
  const supabase = createClient();

  // Get start and end of the day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("check_ins")
    .select(`
      id,
      profile_id,
      checked_in_at,
      profiles!inner (
        first_name,
        last_name,
        student_profiles (
          grade
        )
      )
    `)
    .eq("organization_id", organizationId)
    .gte("checked_in_at", startOfDay.toISOString())
    .lte("checked_in_at", endOfDay.toISOString())
    .order("checked_in_at", { ascending: true });

  if (error) throw error;

  return (data || []).map((row) => {
    // Handle both single object and array result from Supabase join
    const profiles = row.profiles as unknown;
    const profileData = Array.isArray(profiles) ? profiles[0] : profiles;
    const typedProfile = profileData as {
      first_name: string;
      last_name: string;
      student_profiles: Array<{ grade: string | null }> | null;
    };

    return {
      id: row.id,
      profile_id: row.profile_id,
      checked_in_at: row.checked_in_at,
      first_name: typedProfile?.first_name ?? "",
      last_name: typedProfile?.last_name ?? "",
      grade: typedProfile?.student_profiles?.[0]?.grade || null,
    };
  });
}

export function useCheckinsWithDetails(organizationId: string | null, date: Date | null) {
  return useQuery({
    queryKey: ["checkins-with-details", organizationId, date?.toISOString()],
    queryFn: () => fetchCheckinsWithDetails(organizationId!, date!),
    enabled: !!organizationId && !!date,
  });
}

export interface RemoveCheckinResult {
  success: boolean;
  message: string;
  points_removed: number;
}

export function useRemoveCheckin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      checkinId: string;
      organizationId: string; // Used for cache invalidation in onSuccess
    }): Promise<RemoveCheckinResult> => {
      const supabase = createClient();

      const { data, error } = await supabase.rpc("remove_checkin", {
        p_checkin_id: params.checkinId,
      });

      if (error) throw error;

      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.message || "Failed to remove check-in");
      }

      return {
        success: result.success,
        message: result.message,
        points_removed: result.points_removed || 0,
      };
    },
    onSuccess: (_, variables) => {
      // Invalidate all related queries
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
      queryClient.invalidateQueries({
        queryKey: ["checkins-with-details", variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["profiles"],
      });
    },
  });
}
