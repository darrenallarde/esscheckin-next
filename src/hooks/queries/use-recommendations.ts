import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { PastoralRecommendation } from "@/components/pastoral/PastoralQueue";

async function fetchPastoralRecommendations(organizationId: string, limit?: number): Promise<PastoralRecommendation[]> {
  const supabase = createClient();

  // Get all students with their last check-in for this organization
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select(`
      id,
      first_name,
      last_name,
      created_at
    `)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (studentsError) throw studentsError;

  if (!students || students.length === 0) {
    return [];
  }

  // Get last check-in for each student
  const { data: checkIns, error: checkInsError } = await supabase
    .from("check_ins")
    .select("student_id, checked_in_at")
    .eq("organization_id", organizationId)
    .order("checked_in_at", { ascending: false });

  if (checkInsError) throw checkInsError;

  // Build a map of student_id -> last check-in date
  const lastCheckInMap = new Map<string, string>();
  (checkIns || []).forEach((ci) => {
    if (!lastCheckInMap.has(ci.student_id)) {
      lastCheckInMap.set(ci.student_id, ci.checked_in_at);
    }
  });

  const today = new Date();
  const recommendations: PastoralRecommendation[] = [];

  (students || []).forEach((student) => {
    const lastCheckIn = lastCheckInMap.get(student.id);
    const lastDate = lastCheckIn ? new Date(lastCheckIn) : null;
    const daysAbsent = lastDate
      ? Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      : Math.floor((today.getTime() - new Date(student.created_at).getTime()) / (1000 * 60 * 60 * 24));

    // Only include students who need attention (7+ days)
    if (daysAbsent < 7) return;

    let priority: "high" | "medium" | "low";
    let reason: string;

    if (daysAbsent >= 30) {
      priority = "high";
      reason = `Haven't seen ${student.first_name} in over a month. Consider reaching out.`;
    } else if (daysAbsent >= 14) {
      priority = "medium";
      reason = `${student.first_name} has been absent for ${daysAbsent} days.`;
    } else {
      priority = "low";
      reason = `It's been a week since we saw ${student.first_name}.`;
    }

    recommendations.push({
      id: student.id,
      student_id: student.id,
      student_name: `${student.first_name} ${student.last_name}`,
      reason,
      priority,
      last_seen: lastCheckIn || null,
      days_absent: daysAbsent,
      created_at: student.created_at,
    });
  });

  // Sort by priority (high first) and then by days absent
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => {
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return b.days_absent - a.days_absent;
  });

  return limit ? recommendations.slice(0, limit) : recommendations;
}

export function usePastoralRecommendations(organizationId: string | null, limit?: number) {
  return useQuery({
    queryKey: ["pastoral-recommendations", organizationId, limit],
    queryFn: () => fetchPastoralRecommendations(organizationId!, limit),
    enabled: !!organizationId,
  });
}
