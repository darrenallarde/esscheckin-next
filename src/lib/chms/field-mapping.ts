/**
 * ChMS Field Mapping
 *
 * Maps NormalizedPerson fields to SheepDoggo profile/student_profile fields.
 * Also handles grade calculation from graduation year.
 */

import type { NormalizedPerson, NormalizedFamilyMember } from "./types";

// =============================================================================
// GRADE CALCULATION
// =============================================================================

/**
 * Calculate school grade from graduation year.
 * Assumes US school system: 12th graders graduate in spring.
 * If current date is after June, assume next school year.
 *
 * @param graduationYear - Expected graduation year (e.g., 2028)
 * @returns Grade as string (e.g., "9") or null if can't calculate
 */
export function gradeFromGraduationYear(
  graduationYear: number | undefined
): string | null {
  if (!graduationYear) return null;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // If past June, use next year's graduation class as reference
  const referenceYear = currentMonth >= 6 ? currentYear + 1 : currentYear;
  const yearsUntilGrad = graduationYear - referenceYear;
  const grade = 12 - yearsUntilGrad;

  if (grade < 1 || grade > 12) return null;
  return String(grade);
}

// =============================================================================
// PROFILE FIELD MAPPING
// =============================================================================

/**
 * Map a NormalizedPerson to SheepDoggo profile insert/update fields.
 * Returns fields for both `profiles` and `student_profiles` tables.
 */
export function mapPersonToProfile(person: NormalizedPerson): {
  profile: {
    first_name: string;
    last_name: string;
    email: string | null;
    phone_number: string | null;
    date_of_birth: string | null;
  };
  studentProfile: {
    grade: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    gender: string | null;
    high_school: string | null;
  };
} {
  const primaryAddress = person.addresses?.[0];

  // Resolve grade: prefer explicit grade, fallback to calculation from graduation year
  const grade = person.grade || gradeFromGraduationYear(person.graduationYear);

  return {
    profile: {
      first_name: person.firstName.trim(),
      last_name: person.lastName.trim(),
      email: person.email?.trim() || null,
      phone_number: person.phone || null,
      date_of_birth: person.birthDate || null,
    },
    studentProfile: {
      grade,
      address: primaryAddress?.street1 || null,
      city: primaryAddress?.city || null,
      state: primaryAddress?.state || null,
      zip: primaryAddress?.postalCode || null,
      gender: person.gender || null,
      high_school: null, // Not available from ChMS
    },
  };
}

// =============================================================================
// FAMILY ROLE MAPPING
// =============================================================================

/**
 * Determine SheepDoggo org membership role from family position.
 *
 * ChMS family roles → SheepDoggo roles:
 * - head, spouse → guardian
 * - child → student
 * - other → depends on context (default: student if young, guardian if adult)
 */
export function mapFamilyRoleToOrgRole(
  role: NormalizedFamilyMember["role"],
  birthDate?: string
): "student" | "guardian" {
  if (role === "child") return "student";
  if (role === "head" || role === "spouse") return "guardian";

  // For 'other', try to determine from age
  if (birthDate) {
    const age = calculateAge(birthDate);
    if (age !== null && age < 20) return "student";
  }

  return "guardian";
}

/**
 * Determine SheepDoggo org membership role from the NormalizedPerson.familyRole field.
 */
export function mapNormalizedRoleToOrgRole(
  familyRole: NormalizedPerson["familyRole"],
  birthDate?: string
): "student" | "guardian" {
  if (familyRole === "child") return "student";
  if (familyRole === "adult") return "guardian";

  // Unknown — try age-based determination
  if (birthDate) {
    const age = calculateAge(birthDate);
    if (age !== null) {
      return age < 20 ? "student" : "guardian";
    }
  }

  // Default to student (safer for youth ministry context)
  return "student";
}

// =============================================================================
// MATCHING
// =============================================================================

/**
 * Normalize an email for comparison (lowercase, trim whitespace).
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Normalize a phone number to digits-only for comparison.
 * Strips +, -, (), spaces, and country code prefix.
 */
export function normalizePhoneForMatch(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  // Strip leading 1 (US country code) if 11 digits
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.substring(1);
  }
  return digits;
}

// =============================================================================
// HELPERS
// =============================================================================

function calculateAge(birthDate: string): number | null {
  try {
    const birth = new Date(birthDate);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  } catch {
    return null;
  }
}
