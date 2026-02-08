"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface MyStudentProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  grade: string | null;
  high_school: string | null;
}

export function useMyStudentProfile() {
  return useQuery({
    queryKey: ["my-student-profile"],
    queryFn: async () => {
      const supabase = createClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, phone_number")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;

      // Get student_profiles extension
      const { data: studentProfile } = await supabase
        .from("student_profiles")
        .select("grade, high_school")
        .eq("profile_id", profile.id)
        .single();

      return {
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone_number: profile.phone_number,
        grade: studentProfile?.grade || null,
        high_school: studentProfile?.high_school || null,
      } as MyStudentProfile;
    },
    staleTime: 5 * 60 * 1000,
  });
}
