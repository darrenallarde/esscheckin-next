/**
 * Types for the Families feature
 *
 * Parents are aggregated from the students table (no separate parents table).
 * Siblings are detected via shared parent phone numbers.
 */

export type ParentType = "mother" | "father" | "guardian";

export interface ParentChild {
  student_id: string;
  first_name: string;
  last_name: string;
  grade: string | null;
}

export interface Parent {
  parent_id: string;        // 'mother_PHONE' or 'father_PHONE' or 'guardian_PHONE'
  parent_type: ParentType;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  children: ParentChild[];
}

export interface Sibling {
  student_id: string;
  first_name: string;
  last_name: string;
  grade: string | null;
  relationship: string;  // 'sibling', 'sibling (mother\'s side)', 'sibling (father\'s side)'
}

// For the student profile - parent info from the student record
export interface StudentParentInfo {
  type: ParentType;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
}
