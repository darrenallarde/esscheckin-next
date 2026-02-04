/**
 * Amplitude Event Names
 *
 * Convention: [Object] [Past-Tense Verb] in Title Case
 *
 * Examples:
 * - Check In Completed (not: checkin_complete)
 * - Student Searched (not: Search)
 * - Device Created (not: device_setup_modal_submit)
 *
 * See docs/AMPLITUDE.md for full taxonomy documentation.
 */

export const EVENTS = {
  // ============================================
  // LANDING PAGE & MARKETING
  // ============================================
  LANDING_PAGE_VIEWED: "Landing Page Viewed",
  WAITLIST_FORM_SUBMITTED: "Waitlist Form Submitted",

  // ============================================
  // AUTHENTICATION
  // ============================================
  AUTH_PAGE_VIEWED: "Auth Page Viewed",
  OTP_REQUESTED: "OTP Requested",
  OTP_VERIFIED: "OTP Verified",

  // ============================================
  // CHECK-IN FLOW (Public, Unauthenticated)
  // ============================================
  CHECK_IN_PAGE_VIEWED: "Check In Page Viewed",
  STUDENT_SEARCHED: "Student Searched",
  STUDENT_SELECTED: "Student Selected",
  CHECK_IN_CONFIRMED: "Check In Confirmed",
  CHECK_IN_COMPLETED: "Check In Completed",
  REGISTRATION_STARTED: "Registration Started",
  REGISTRATION_COMPLETED: "Registration Completed",
  REGISTRATION_ABANDONED: "Registration Abandoned",

  // ============================================
  // ADMIN DASHBOARD
  // ============================================
  DASHBOARD_VIEWED: "Dashboard Viewed",
  LEADERBOARD_VIEWED: "Leaderboard Viewed",
  BELONGING_SPECTRUM_VIEWED: "Belonging Spectrum Viewed",
  BELONGING_LEVEL_DRILLED: "Belonging Level Drilled",
  STAT_CARD_CLICKED: "Stat Card Clicked",

  // ============================================
  // PEOPLE & PROFILES
  // ============================================
  PEOPLE_PAGE_VIEWED: "People Page Viewed",
  PEOPLE_SEARCHED: "People Searched",
  PEOPLE_FILTERED: "People Filtered",
  STUDENT_PROFILE_VIEWED: "Student Profile Viewed",
  PROFILE_TAB_CHANGED: "Profile Tab Changed",
  STUDENT_EDITED: "Student Edited",

  // ============================================
  // GROUPS
  // ============================================
  GROUPS_PAGE_VIEWED: "Groups Page Viewed",
  GROUP_VIEWED: "Group Viewed",
  GROUP_CREATED: "Group Created",
  GROUP_EDITED: "Group Edited",
  GROUP_DELETED: "Group Deleted",
  MEMBER_ADDED: "Member Added",
  MEMBER_REMOVED: "Member Removed",
  MEETING_TIME_CHANGED: "Meeting Time Changed",

  // ============================================
  // FAMILIES
  // ============================================
  FAMILIES_PAGE_VIEWED: "Families Page Viewed",
  PARENT_SEARCHED: "Parent Searched",
  PARENT_CARD_CLICKED: "Parent Card Clicked",
  PARENT_CALLED: "Parent Called",
  PARENT_TEXTED: "Parent Texted",
  SIBLING_CLICKED: "Sibling Clicked",
  FAMILY_SECTION_EXPANDED: "Family Section Expanded",

  // ============================================
  // PASTORAL CARE & OUTREACH
  // ============================================
  // Outbound SMS (admin sends)
  SMS_SENT: "SMS Sent",

  // ============================================
  // SMS INBOX (Dashboard)
  // ============================================
  MESSAGES_PAGE_VIEWED: "Messages Page Viewed",
  CONVERSATION_OPENED: "Conversation Opened",
  MESSAGE_REPLIED: "Message Replied",

  // ============================================
  // SMS & NPC ROUTER (Inbound via Edge Function)
  // These events are logged by the Edge Function, not the frontend
  // ============================================
  SMS_RECEIVED: "SMS Received",
  SMS_SESSION_STARTED: "SMS Session Started",
  SMS_ORG_CONNECTED: "SMS Org Connected",
  SMS_MESSAGE_ROUTED: "SMS Message Routed",
  NOTE_CREATED: "Note Created",
  RECOMMENDATION_VIEWED: "Recommendation Viewed",
  RECOMMENDATION_ACTIONED: "Recommendation Actioned",
  RECOMMENDATION_DISMISSED: "Recommendation Dismissed",
  PRAYER_PROMPT_VIEWED: "Prayer Prompt Viewed",

  // ============================================
  // ADMIN TOOLS (ORG TOOLS)
  // ============================================
  IMPORT_STARTED: "Import Started",
  IMPORT_COMPLETED: "Import Completed",
  IMPORT_FAILED: "Import Failed",
  DUPLICATE_DETECTION_RUN: "Duplicate Detection Run",
  DUPLICATE_PREVIEWED: "Duplicate Previewed",
  DUPLICATE_MERGED: "Duplicate Merged",
  ATTENDANCE_CLEANUP_STARTED: "Attendance Cleanup Started",
  ATTENDANCE_CLEANUP_COMPLETED: "Attendance Cleanup Completed",
  DEVICE_CREATED: "Device Created",
  DEVICE_RENAMED: "Device Renamed",

  // ============================================
  // ORGANIZATION & SETTINGS
  // ============================================
  SETTINGS_VIEWED: "Settings Viewed",
  THEME_CHANGED: "Theme Changed",
  CHECKIN_STYLE_CHANGED: "Checkin Style Changed",
  DISPLAY_NAME_CHANGED: "Display Name Changed",
  TEAM_MEMBER_INVITED: "Team Member Invited",
  TEAM_MEMBER_REMOVED: "Team Member Removed",

  // ============================================
  // ORGANIZATION LIFECYCLE (First-Time Events)
  // These fire ONCE per organization
  // ============================================
  FIRST_DEVICE_CREATED: "First Device Created",
  FIRST_IMPORT_COMPLETED: "First Import Completed",
  FIRST_CHECK_IN_COMPLETED: "First Check In Completed",
  FIRST_SMS_SENT: "First SMS Sent",
  FIRST_GROUP_CREATED: "First Group Created",

  // ============================================
  // ANALYTICS INTERACTIONS
  // ============================================
  ANALYTICS_PAGE_VIEWED: "Analytics Page Viewed",
  CHART_VIEWED: "Chart Viewed",
  CHART_DRILLED: "Chart Drilled",
  REPORT_EXPORTED: "Report Exported",

  // ============================================
  // CURRICULUM & DEVOTIONALS
  // ============================================
  CURRICULUM_PAGE_VIEWED: "Curriculum Page Viewed",
  SERMON_UPLOADED: "Sermon Uploaded",
  DEVOTIONAL_SERIES_CONFIGURED: "Devotional Series Configured",
  DEVOTIONAL_GENERATION_STARTED: "Devotional Generation Started",
  DEVOTIONAL_GENERATION_COMPLETED: "Devotional Generation Completed",
  DEVOTIONAL_SERIES_ACTIVATED: "Devotional Series Activated",
  DEVOTIONAL_VIEWED: "Devotional Viewed",
  DEVOTIONAL_EDITED: "Devotional Edited",

  // ============================================
  // FUTURE: AI & NATURAL LANGUAGE
  // Uncomment when features ship
  // ============================================
  // AI_QUERY_SUBMITTED: "AI Query Submitted",
  // AI_RESULTS_VIEWED: "AI Results Viewed",
  // AI_RECOMMENDATION_FOLLOWED: "AI Recommendation Followed",
  // DRAFT_MESSAGE_APPROVED: "Draft Message Approved",
  // AUTO_MESSAGE_SENT: "Auto Message Sent",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
