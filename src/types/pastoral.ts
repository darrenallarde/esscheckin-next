// Types for Pastoral Dashboard

export type BelongingStatus = 'Ultra-Core' | 'Core' | 'Connected' | 'On the Fringe' | 'Missing';

export interface AttendanceWeek {
  week_start: string;
  attended: boolean;
}

export interface StudentPastoralData {
  student_id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  email: string | null;
  grade: string | null;
  high_school: string | null;
  parent_name: string | null;
  parent_phone: string | null;

  belonging_status: BelongingStatus;

  total_checkins_8weeks: number;
  total_checkins_30days: number;
  total_checkins_60days: number;
  days_since_last_seen: number;
  last_checkin_date: string | null;

  attendance_pattern: AttendanceWeek[];

  wednesday_count: number;
  sunday_count: number;

  is_declining: boolean;
  previous_status: BelongingStatus;

  recommended_action: string;
  action_priority: number;
  action_message: string;
}

export interface BelongingDistribution {
  'Ultra-Core': number;
  'Core': number;
  'Connected': number;
  'On the Fringe': number;
  'Missing': number;
}

export interface PastoralPriorities {
  urgent: StudentPastoralData[];      // Missing + Fringe
  monitor: StudentPastoralData[];     // Declining Connected
  celebrate: StudentPastoralData[];   // Moving up
  leadership: StudentPastoralData[];  // Ultra-Core
}
