/**
 * Amplitude Property Types
 *
 * All properties use snake_case convention.
 * See docs/AMPLITUDE.md for full documentation.
 */

// ============================================
// STANDARD PROPERTIES (Required on EVERY event)
// ============================================

export interface StandardProperties {
  /** Human-readable org identifier (e.g., "ess-ministry") */
  org_slug: string | null;
  /** Database organization UUID */
  org_id: string | null;
  /** App version (e.g., "1.2.3" or "dev") */
  app_version: string;
  /** Current URL path (e.g., "/ess-ministry/checkin") */
  page_path: string;
  /** Authenticated admin's user ID, null for public sessions */
  admin_user_id: string | null;
}

// ============================================
// USER PROPERTIES (Persistent across sessions)
// ============================================

export interface UserProperties {
  organization_id?: string;
  organization_slug?: string;
  role?: "admin" | "leader" | "viewer";
  is_public_session?: boolean;
  device_id?: string;
  device_name?: string;
  app_version?: string;
}

// ============================================
// EVENT-SPECIFIC PROPERTY TYPES
// ============================================

// Check-in Flow
export interface CheckInPageViewedProps {
  checkin_style: "gamified" | "standard";
  device_id?: string;
  device_name?: string;
}

export interface StudentSearchedProps {
  search_term_length: number;
  result_count?: number;
}

export interface StudentSelectedProps {
  student_id: string;
  selection_method: "single" | "from_list";
}

export interface CheckInConfirmedProps {
  student_id: string;
}

export interface CheckInCompletedProps {
  student_id: string;
  is_duplicate: boolean;
  points_earned?: number;
}

export interface RegistrationStartedProps {
  // No additional props beyond standard
}

export interface RegistrationCompletedProps {
  student_id: string;
  student_grade: string;
  has_email?: boolean;
  has_parent_info?: boolean;
}

export interface RegistrationAbandonedProps {
  last_section_completed?: "name" | "contact" | "optional";
}

// Dashboard
export interface LeaderboardViewedProps {
  period: "weekly" | "monthly" | "all_time";
}

export interface BelongingLevelDrilledProps {
  level: "ultra_core" | "core" | "connected" | "fringe" | "missing";
  student_count?: number;
}

export interface StatCardClickedProps {
  stat_type: "total_checkins" | "unique_students" | "new_students" | "avg_attendance";
}

// People & Profiles
export interface PeopleSearchedProps {
  search_term_length: number;
  result_count?: number;
  filters_applied?: string[];
}

export interface PeopleFilteredProps {
  filter_type: "grade" | "group" | "belonging";
  filter_value?: string;
}

export interface StudentProfileViewedProps {
  student_id: string;
  source: "search" | "leaderboard" | "group" | "recommendation" | "belonging_drilldown";
}

export interface ProfileTabChangedProps {
  student_id: string;
  tab_name: "overview" | "engagement" | "pastoral" | "messages" | "groups";
}

export interface StudentEditedProps {
  student_id: string;
  fields_changed?: string[];
}

// Groups
export interface GroupViewedProps {
  group_id: string;
  member_count?: number;
}

export interface GroupCreatedProps {
  group_id: string;
  group_type?: "small_group" | "ministry" | "class";
}

export interface GroupEditedProps {
  group_id: string;
  fields_changed?: string[];
}

export interface GroupDeletedProps {
  group_id: string;
  member_count?: number;
}

export interface MemberAddedProps {
  group_id: string;
  student_id: string;
  method?: "manual" | "bulk" | "import";
}

export interface MemberRemovedProps {
  group_id: string;
  student_id: string;
}

export interface MeetingTimeChangedProps {
  group_id: string;
}

// Pastoral
export interface SMSSentProps {
  student_id: string;
  template_used?: string;
  automated?: boolean;
}

export interface NoteCreatedProps {
  student_id: string;
  note_type?: "general" | "prayer_request" | "follow_up" | "milestone";
}

export interface RecommendationViewedProps {
  student_id: string;
  recommendation_type: "missing" | "fringe" | "new_student" | "celebration";
}

export interface RecommendationActionedProps {
  student_id: string;
  action_type: "sent_sms" | "marked_contacted" | "scheduled_followup";
}

export interface RecommendationDismissedProps {
  student_id: string;
  reason?: string;
}

// Admin Tools
export interface ImportStartedProps {
  row_count: number;
}

export interface ImportCompletedProps {
  students_imported: number;
  students_updated?: number;
  errors?: number;
}

export interface ImportFailedProps {
  error_type?: string;
}

export interface DuplicateDetectionRunProps {
  duplicates_found?: number;
}

export interface DuplicatePreviewedProps {
  student_a_id: string;
  student_b_id: string;
  confidence?: "high" | "medium" | "low";
}

export interface DuplicateMergedProps {
  kept_student_id: string;
  records_merged?: number;
  confidence?: "high" | "medium" | "low";
}

export interface AttendanceCleanupStartedProps {
  selected_date?: string;
}

export interface AttendanceCleanupCompletedProps {
  students_added: number;
  duplicates_skipped?: number;
}

export interface DeviceCreatedProps {
  device_name: string;
}

export interface DeviceRenamedProps {
  device_id: string;
  device_name: string;
}

// Settings
export interface SettingsViewedProps {
  section: "account" | "team" | "organization" | "org_tools";
}

export interface ThemeChangedProps {
  theme_id: string;
  previous_theme_id?: string;
}

export interface CheckinStyleChangedProps {
  checkin_style: "gamified" | "standard";
}

export interface TeamMemberInvitedProps {
  invited_role: "admin" | "leader" | "viewer";
}

// Org Lifecycle
export interface FirstDeviceCreatedProps {
  device_name: string;
}

export interface FirstImportCompletedProps {
  students_imported: number;
}

// Analytics
export interface ChartViewedProps {
  chart_type: "attendance_trend" | "engagement_funnel" | "belonging_spectrum" | "check_in_by_day";
  date_range?: string;
}

export interface ChartDrilledProps {
  chart_type: string;
  drill_dimension?: string;
}

export interface ReportExportedProps {
  report_type: string;
  format?: "csv" | "pdf";
}
