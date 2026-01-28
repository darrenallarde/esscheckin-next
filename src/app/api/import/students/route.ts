import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface StudentData {
  first_name: string;
  last_name: string;
  phone_number?: string;
  email?: string;
  grade?: string;
  high_school?: string;
  date_of_birth?: string;
  parent_name?: string;
  parent_phone?: string;
  mother_first_name?: string;
  mother_last_name?: string;
  mother_phone?: string;
  father_first_name?: string;
  father_last_name?: string;
  father_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface ImportRequest {
  organizationId: string;
  students: StudentData[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body: ImportRequest = await request.json();
    const { organizationId, students } = body;

    if (!organizationId) {
      return NextResponse.json(
        { message: "Organization ID is required" },
        { status: 400 }
      );
    }

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { message: "Students array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Check if user has permission to import to this org
    const { data: membership, error: memberError } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (memberError || !membership) {
      // Check if super admin
      const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", {
        p_user_id: user.id,
      });

      if (!isSuperAdmin) {
        return NextResponse.json(
          { message: "You don't have permission to import to this organization" },
          { status: 403 }
        );
      }
    } else if (!["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { message: "Only admins and owners can import students" },
        { status: 403 }
      );
    }

    // Clean and validate student data
    const cleanedStudents = students.map((student) => {
      const cleaned: Record<string, unknown> = {
        organization_id: organizationId,
        first_name: student.first_name?.trim(),
        last_name: student.last_name?.trim(),
        user_type: "student", // Default user type
      };

      // Clean phone numbers (remove non-digits except +)
      const cleanPhone = (phone?: string) => {
        if (!phone) return null;
        const cleaned = phone.replace(/[^\d+]/g, "");
        return cleaned.length >= 10 ? cleaned : null;
      };

      if (student.phone_number) {
        cleaned.phone_number = cleanPhone(student.phone_number);
      }
      if (student.email?.includes("@")) {
        cleaned.email = student.email.trim().toLowerCase();
      }
      if (student.grade) {
        cleaned.grade = student.grade.trim();
      }
      if (student.high_school) {
        cleaned.high_school = student.high_school.trim();
      }
      if (student.date_of_birth) {
        // Try to parse date
        const date = new Date(student.date_of_birth);
        if (!isNaN(date.getTime())) {
          cleaned.date_of_birth = date.toISOString().split("T")[0];
        }
      }
      if (student.parent_name) {
        cleaned.parent_name = student.parent_name.trim();
      }
      if (student.parent_phone) {
        cleaned.parent_phone = cleanPhone(student.parent_phone);
      }
      if (student.mother_first_name) {
        cleaned.mother_first_name = student.mother_first_name.trim();
      }
      if (student.mother_last_name) {
        cleaned.mother_last_name = student.mother_last_name.trim();
      }
      if (student.mother_phone) {
        cleaned.mother_phone = cleanPhone(student.mother_phone);
      }
      if (student.father_first_name) {
        cleaned.father_first_name = student.father_first_name.trim();
      }
      if (student.father_last_name) {
        cleaned.father_last_name = student.father_last_name.trim();
      }
      if (student.father_phone) {
        cleaned.father_phone = cleanPhone(student.father_phone);
      }
      if (student.address) {
        cleaned.address = student.address.trim();
      }
      if (student.city) {
        cleaned.city = student.city.trim();
      }
      if (student.state) {
        cleaned.state = student.state.trim();
      }
      if (student.zip) {
        cleaned.zip = student.zip.trim();
      }

      return cleaned;
    }).filter(s => s.first_name && s.last_name);

    if (cleanedStudents.length === 0) {
      return NextResponse.json(
        { message: "No valid students to import (all students missing first or last name)" },
        { status: 400 }
      );
    }

    // Insert students in batches
    const batchSize = 50;
    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < cleanedStudents.length; i += batchSize) {
      const batch = cleanedStudents.slice(i, i + batchSize);

      const { data, error } = await supabase
        .from("students")
        .insert(batch)
        .select("id");

      if (error) {
        console.error("Batch insert error:", error);
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      } else {
        imported += data?.length || 0;

        // Create initial game stats for new students
        if (data && data.length > 0) {
          const gameStats = data.map((student) => ({
            student_id: student.id,
            organization_id: organizationId,
            total_points: 0,
            current_rank: "Newcomer",
          }));

          await supabase.from("student_game_stats").insert(gameStats);
        }
      }
    }

    if (errors.length > 0 && imported === 0) {
      return NextResponse.json(
        { message: `Import failed: ${errors.join("; ")}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imported,
      total: cleanedStudents.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}
