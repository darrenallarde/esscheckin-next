import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { StudentPastoralData } from "@/types/pastoral";
import { AIRecommendation, CurriculumWeek } from "@/types/curriculum";

// Fetch a single student's pastoral data
async function fetchStudentPastoralData(studentId: string): Promise<StudentPastoralData | null> {
  const supabase = createClient();

  // First get the student's organization_id
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("organization_id")
    .eq("id", studentId)
    .single();

  if (studentError) throw studentError;
  if (!student) return null;

  // Call the RPC function that returns all pastoral data
  const { data, error } = await supabase
    .rpc("get_pastoral_analytics")
    .eq("organization_id", student.organization_id);

  if (error) throw error;

  // Find this specific student in the results
  const studentData = (data as StudentPastoralData[] | null)?.find(
    (s) => s.student_id === studentId
  );

  return studentData || null;
}

export function useStudentPastoralData(studentId: string | null) {
  return useQuery({
    queryKey: ["student-pastoral", studentId],
    queryFn: () => fetchStudentPastoralData(studentId!),
    enabled: !!studentId,
    staleTime: 1000 * 60, // 1 minute
  });
}

// Fetch existing AI recommendation for a student
async function fetchStudentRecommendation(studentId: string): Promise<AIRecommendation | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("ai_recommendations")
    .select("*")
    .eq("student_id", studentId)
    .eq("is_dismissed", false)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export function useStudentRecommendation(studentId: string | null) {
  return useQuery({
    queryKey: ["student-recommendation", studentId],
    queryFn: () => fetchStudentRecommendation(studentId!),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Fetch current curriculum
async function fetchCurrentCurriculum(): Promise<CurriculumWeek | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("curriculum_weeks")
    .select("*")
    .eq("is_current", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export function useCurrentCurriculum() {
  return useQuery({
    queryKey: ["current-curriculum"],
    queryFn: fetchCurrentCurriculum,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Generate recommendation mutation
interface GenerateRecommendationParams {
  studentId: string;
  pastoralData: StudentPastoralData;
  curriculum: CurriculumWeek;
}

async function generateRecommendation(params: GenerateRecommendationParams): Promise<AIRecommendation> {
  const response = await fetch("/api/recommendations/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate recommendation");
  }

  return response.json();
}

export function useGenerateRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateRecommendation,
    onSuccess: (data, variables) => {
      // Update the cached recommendation
      queryClient.setQueryData(["student-recommendation", variables.studentId], data);
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["ai-recommendations"] });
    },
  });
}
