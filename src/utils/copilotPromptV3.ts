/**
 * Co-Pilot V3 Prompt Builder
 *
 * Full pastoral intelligence briefing: signal + healthy students,
 * dual texts (student + parent), ministry insights, and proactive outreach.
 */

import {
  PHASE_DESCRIPTIONS,
  ENGAGEMENT_GUIDANCE,
  GENDER_GUIDANCE,
  AGE_STRATEGIES,
} from "@/utils/aiRecommendations";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ActionType =
  | "send_text"
  | "call_student"
  | "call_parent"
  | "in_person"
  | "give_space"
  | "celebrate"
  | "pray_only";

export type UrgencyLevelV3 =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "celebrate"
  | "proactive";

export interface CopilotStudentV3 {
  profile_id: string;
  rank: number;
  urgency: UrgencyLevelV3;
  situation_summary: string;
  recommended_action: string;
  action_type: ActionType;
  student_text: string | null;
  parent_text: string | null;
  pastoral_note: string;
}

export interface MinistryInsights {
  teaching_recommendation: string;
  growth_opportunities: Array<{
    profile_id: string;
    name: string;
    opportunity: string;
  }>;
  strategic_assessment: string;
}

export interface CopilotBriefingResponseV3 {
  briefing_summary: string;
  students: CopilotStudentV3[];
  ministry_insights: MinistryInsights;
}

/** Raw candidate data from the V3 RPC */
export interface CopilotCandidateV3 {
  profile_id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  email: string | null;
  grade: string | null;
  gender: string | null;
  belonging_status: string;
  days_since_last_seen: number;
  last_seen_at: string | null;
  total_checkins_8weeks: number;
  checkins_last_4weeks: number;
  is_declining: boolean;
  is_new: boolean;
  is_signal_candidate: boolean;
  signals: {
    attendance_drop: boolean;
    checkins_last_4_weeks: number;
    checkins_previous_4_weeks: number;
    wednesday_count: number;
    sunday_count: number;
    prayer_request_recent: boolean;
    prayer_request_text: string | null;
    prayer_request_date: string | null;
    no_leader_contact_days: number | null;
    no_response_to_outreach: boolean;
    new_student: boolean;
    membership_days: number | null;
  };
  recommendation_insight: string | null;
  primary_parent_name: string | null;
  primary_parent_phone: string | null;
  last_interaction_at: string | null;
  last_interaction_by: string | null;
  last_interaction_status: string | null;
  pinned_notes: Array<{ content: string; leader_name: string }>;
  group_names: string[];
  recent_prayer_text: string | null;
  devotional_engagement: {
    opened_count: number;
    reflected_count: number;
    prayed_count: number;
    journaled_count: number;
    last_opened: string | null;
  };
  sms_activity: {
    total_messages: number;
    outbound_count: number;
    inbound_count: number;
    last_outbound: string | null;
    last_inbound: string | null;
  };
  recent_sms_bodies: Array<{
    direction: string;
    body: string;
    date: string;
  }>;
  parent_last_outbound: string | null;
  signals_hash: string;
}

interface OrgContext {
  orgName: string;
  totalStudents: number;
}

interface CurriculumContext {
  topic_title: string;
  main_scripture?: string;
  application_challenge?: string;
  big_idea?: string;
}

// ─── Prompt Builder ──────────────────────────────────────────────────────────

function formatDate(isoDate: string | null): string {
  if (!isoDate) return "unknown";
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatSignalCandidateBlock(
  c: CopilotCandidateV3,
  index: number,
): string {
  const daysSeen =
    c.days_since_last_seen > 99999
      ? "never"
      : `${c.days_since_last_seen} days ago`;

  const lastVisited = c.last_seen_at ? formatDate(c.last_seen_at) : "never";

  const lastContact = c.last_interaction_at
    ? `${c.last_interaction_by || "a leader"} on ${new Date(c.last_interaction_at).toLocaleDateString()}${c.last_interaction_status === "no_response" ? " (NO RESPONSE)" : ""}`
    : "No leader contact logged";

  const notesStr =
    c.pinned_notes.length > 0
      ? c.pinned_notes
          .map((n) => `  - "${n.content}" (${n.leader_name})`)
          .join("\n")
      : "  None";

  const devo = c.devotional_engagement;
  const devoStr =
    devo.opened_count > 0
      ? `Opened ${devo.opened_count}x, Reflected ${devo.reflected_count}x, Prayed ${devo.prayed_count}x, Journaled ${devo.journaled_count}x (30d)`
      : "No devotional engagement in 30 days";

  const sms = c.sms_activity;
  const smsStr =
    sms.total_messages > 0
      ? `${sms.outbound_count} sent to them, ${sms.inbound_count} replies from them. Last outbound: ${sms.last_outbound ? new Date(sms.last_outbound).toLocaleDateString() : "never"}. Last inbound: ${sms.last_inbound ? new Date(sms.last_inbound).toLocaleDateString() : "never"}`
      : "No SMS history";

  // Recent SMS bodies
  const recentTexts =
    c.recent_sms_bodies.length > 0
      ? c.recent_sms_bodies
          .map(
            (m) =>
              `  [${m.direction === "outbound" ? "SENT" : "RECEIVED"} ${formatDate(m.date)}] "${m.body}"`,
          )
          .join("\n")
      : "  No recent texts";

  const parentOutbound = c.parent_last_outbound
    ? `Last texted parent: ${formatDate(c.parent_last_outbound)}`
    : "Never texted parent";

  return `--- STUDENT ${index + 1} [${c.profile_id}] ---
Name: ${c.first_name} ${c.last_name}
Grade: ${c.grade || "Unknown"}
Gender: ${c.gender || "Unknown"}
Belonging Status: ${c.belonging_status}
Last Visited: ${lastVisited} (${daysSeen})
Attendance (8 weeks): ${c.total_checkins_8weeks} total (last 4w: ${c.signals.checkins_last_4_weeks}, prev 4w: ${c.signals.checkins_previous_4_weeks})
Wed/Sun split: ${c.signals.wednesday_count}W / ${c.signals.sunday_count}S
Trend: ${c.is_declining ? "DECLINING" : "Stable"}
New Student: ${c.is_new ? `Yes (${Math.round(c.signals.membership_days || 0)} days ago)` : "No"}
Phone: ${c.phone_number ? "Yes" : "No phone on file"}
Prayer Request: ${c.signals.prayer_request_text ? `"${c.signals.prayer_request_text}" (${c.signals.prayer_request_date ? new Date(c.signals.prayer_request_date).toLocaleDateString() : "recent"})` : "None recent"}
Parent: ${c.primary_parent_name ? `${c.primary_parent_name} (${c.primary_parent_phone || "no phone"})` : "No parent on file"}
${parentOutbound}
Groups: ${c.group_names.length > 0 ? c.group_names.join(", ") : "None"}
Last Leader Contact: ${lastContact}
Contact Gap: ${c.signals.no_leader_contact_days != null ? `${c.signals.no_leader_contact_days} days since last contact` : "Never contacted"}
Devotional Engagement: ${devoStr}
SMS History: ${smsStr}
Recent Texts:
${recentTexts}
Leader Notes:
${notesStr}
${c.recommendation_insight ? `AI Recommendation: ${c.recommendation_insight}` : ""}`;
}

function formatHealthyRosterLine(c: CopilotCandidateV3): string {
  const lastSeen = c.last_seen_at ? formatDate(c.last_seen_at) : "never";
  const lastTexted = c.sms_activity.last_outbound
    ? formatDate(c.sms_activity.last_outbound)
    : "never";
  const groups = c.group_names.length > 0 ? c.group_names.join(", ") : "none";

  return `- ${c.first_name} ${c.last_name?.charAt(0)}. [${c.profile_id}] (${c.grade || "?"}th, ${c.belonging_status}, last seen ${lastSeen}, last texted ${lastTexted}, groups: ${groups})`;
}

export function buildCopilotBriefingPromptV3(
  candidates: CopilotCandidateV3[],
  orgContext: OrgContext,
  curriculum: CurriculumContext | null,
  ministryPriorities: string | null,
): string {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Split candidates into signal and healthy
  const signalCandidates = candidates.filter((c) => c.is_signal_candidate);
  const healthyRoster = candidates.filter((c) => !c.is_signal_candidate);

  // Build pastoral knowledge sections
  const phaseKnowledge = Object.values(PHASE_DESCRIPTIONS).join("\n\n");
  const engagementKnowledge = Object.values(ENGAGEMENT_GUIDANCE).join("\n\n");
  const genderKnowledge = Object.values(GENDER_GUIDANCE).join("\n\n");
  const ageKnowledge = Object.values(AGE_STRATEGIES).join("\n\n");

  // Format signal candidates with full detail
  const signalBlocks = signalCandidates
    .map((c, i) => formatSignalCandidateBlock(c, i))
    .join("\n\n");

  // Format healthy roster compactly
  const healthyLines = healthyRoster
    .map((c) => formatHealthyRosterLine(c))
    .join("\n");

  // Curriculum section
  const curriculumSection = curriculum
    ? `## CURRENT TEACHING CONTEXT
Topic: ${curriculum.topic_title}
${curriculum.main_scripture ? `Scripture: ${curriculum.main_scripture}` : ""}
${curriculum.application_challenge ? `Application Challenge: ${curriculum.application_challenge}` : ""}
${curriculum.big_idea ? `Big Idea: ${curriculum.big_idea}` : ""}

Use this week's teaching to make your insights more relevant. If a student is struggling,
connect the teaching to their specific situation. If a student is thriving, suggest how the
teaching could deepen their growth.`
    : "No current teaching context available. Focus on engagement patterns and pastoral signals.";

  // Ministry priorities section
  const prioritiesSection = ministryPriorities
    ? `## MINISTRY PRIORITIES THIS WEEK
${ministryPriorities}

Factor these priorities into your recommendations. If there's a camp, event, or initiative coming up,
suggest proactive outreach to students who would benefit from a personal invitation.`
    : "";

  return `You are the Senior Director of Pastoral Care for a youth ministry — someone with a seminary degree AND an MBA. A visionary leader and executive partner. You combine deep pastoral wisdom with high executive function. You see patterns humans miss. You think in terms of both spiritual care and organizational effectiveness.

Your job: Look at ALL the students below — both the signal candidates who have potential issues AND the healthy roster — and decide which 7 need the pastor's attention most urgently TODAY. For each one, provide a situation summary, WHAT the leader should do, and draft a text for the student AND the parent when appropriate.

## ORGANIZATION CONTEXT
Ministry: ${orgContext.orgName}
Total Active Students: ${orgContext.totalStudents}
Today: ${today}

${curriculumSection}

${prioritiesSection}

## PASTORAL KNOWLEDGE BASE

### Developmental Phases (by grade)
${phaseKnowledge}

### Engagement Level Guidance
${engagementKnowledge}

### Gender-Specific Approaches
${genderKnowledge}

### Age-Appropriate Strategies
${ageKnowledge}

## SIGNAL CANDIDATES (${signalCandidates.length} students with signals)
These students have at least one pastoral signal worth evaluating.

${signalBlocks}

## HEALTHY ROSTER (${healthyRoster.length} students, no signals)
These students are doing fine. Consider them for PROACTIVE outreach — camp invitations, leadership development, celebration, or ministry involvement.

${healthyLines}

## DECISION FRAMEWORK — 6 URGENCY TIERS
- **critical**: Immediate risk — missing 30+ days, declining fast, prayer request signaling crisis, no response to outreach
- **high**: Needs attention this week — declining attendance, unanswered prayer request, new student not yet connected
- **medium**: Worth a touch this week — could use encouragement, celebrate a win, deepen connection
- **low**: Keep on radar — generally okay but something worth noting for next week
- **celebrate**: Doing great! — acknowledge their faithfulness, develop their leadership, invest in their growth
- **proactive**: Healthy student who would benefit from intentional outreach — camp invite, leadership opportunity, or just a "thinking of you" text

## PASTORAL RULES (HARD RULES — DO NOT VIOLATE)
1. NEVER suggest texting first for a Missing student (60+ days absent). Start with parent contact.
2. If a student has not responded to the LAST outreach, escalate — don't repeat the same channel.
3. If a student submitted a prayer request, you MUST acknowledge it in your recommendation.
4. Reference SPECIFIC data in your insights — actual days, actual check-in counts, actual dates. Never be vague.
5. If a student has no phone on file, do NOT recommend send_text. Recommend in_person or call_parent instead.
6. For new students (< 30 days), prioritize connection and welcome over correction.
7. Maximum 2 students can be "critical" urgency. The pastor can't have everything be urgent.
8. At least 1 student should be "celebrate" or "low" if ANY students are doing well.
9. At least 2 students should be proactive outreach for healthy students (from the healthy roster or doing-well signal candidates).
10. When drafting parent_text, be warm but professional. Never share the student's private prayer requests with parents.

## ACTION TYPES
- send_text: Draft SMS messages for the leader to send (include student_text and optionally parent_text)
- call_student: Recommend calling the student directly
- call_parent: Recommend calling the parent (for Missing students or crisis situations)
- in_person: Recommend face-to-face conversation at next gathering
- give_space: Student needs room — check back next week
- celebrate: Student is thriving — acknowledge and develop
- pray_only: Situation is beyond direct action right now — commit to prayer

## OUTPUT FORMAT
Return ONLY valid JSON (no markdown, no code fences, no explanation outside the JSON):

{
  "briefing_summary": "1-2 sentence executive summary for the pastor.",
  "students": [
    {
      "profile_id": "exact UUID from the student data above",
      "rank": 1,
      "urgency": "critical|high|medium|low|celebrate|proactive",
      "situation_summary": "3-5 sentences of pastoral reasoning. Reference specific data — days, counts, dates, text history. Paint the full picture of this student's situation. Example: 'Sarah came 5 times in her first month but hasn't been seen in 45 days. Her prayer request about her parents fighting suggests a home situation that's keeping her away. Your last text 3 weeks ago got no response. This isn't apathy — this is a kid in pain who needs someone to notice.'",
      "recommended_action": "Specific instruction for the leader.",
      "action_type": "send_text",
      "student_text": "Draft SMS to the student. Natural, warm, personal. Reference something specific about them. null if not applicable.",
      "parent_text": "Draft SMS to the parent. Warm but professional. Focus on how you care about their child. null if not applicable or no parent on file.",
      "pastoral_note": "Internal context for the leader's reference."
    }
  ],
  "ministry_insights": {
    "teaching_recommendation": "1-2 sentences connecting the teaching context to student patterns you've observed. What should the pastor emphasize or adjust?",
    "growth_opportunities": [
      {
        "profile_id": "UUID of student with leadership/growth potential",
        "name": "Student Name",
        "opportunity": "Specific development opportunity"
      }
    ],
    "strategic_assessment": "2-3 sentences on the overall health of the ministry. What patterns do you see? What should the pastor celebrate? What should they watch for?"
  }
}

IMPORTANT:
- The "students" array must contain exactly 7 students, ranked 1 through 7.
- Each profile_id must be an exact UUID from the candidate lists above.
- At least 2 of the 7 students should be "proactive" or "celebrate" urgency.
- Include student_text when the action involves texting the student.
- Include parent_text when it would be helpful to reach out to the parent too.
- ministry_insights is required — provide genuine strategic analysis.`;
}

// ─── Response Parser ─────────────────────────────────────────────────────────

const VALID_ACTION_TYPES: ActionType[] = [
  "send_text",
  "call_student",
  "call_parent",
  "in_person",
  "give_space",
  "celebrate",
  "pray_only",
];

const VALID_URGENCY_LEVELS: UrgencyLevelV3[] = [
  "critical",
  "high",
  "medium",
  "low",
  "celebrate",
  "proactive",
];

const DEFAULT_MINISTRY_INSIGHTS: MinistryInsights = {
  teaching_recommendation: "",
  growth_opportunities: [],
  strategic_assessment: "",
};

export function parseCopilotBriefingResponseV3(
  text: string,
  validProfileIds: Set<string>,
): CopilotBriefingResponseV3 {
  // Strip markdown code fences if present
  let clean = text.trim();
  if (clean.startsWith("```json")) {
    clean = clean.replace(/```json\n?/, "").replace(/\n?```$/, "");
  } else if (clean.startsWith("```")) {
    clean = clean.replace(/```\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(clean);

  if (!parsed.briefing_summary || !Array.isArray(parsed.students)) {
    throw new Error("Invalid briefing response structure");
  }

  // Validate and sanitize each student entry
  const students: CopilotStudentV3[] = parsed.students
    .filter((s: Record<string, unknown>) =>
      validProfileIds.has(s.profile_id as string),
    )
    .slice(0, 7)
    .map((s: Record<string, unknown>, i: number) => ({
      profile_id: s.profile_id as string,
      rank: Math.min(Math.max(i + 1, 1), 7),
      urgency: VALID_URGENCY_LEVELS.includes(s.urgency as UrgencyLevelV3)
        ? (s.urgency as UrgencyLevelV3)
        : "medium",
      situation_summary:
        typeof s.situation_summary === "string"
          ? s.situation_summary
          : "Needs attention.",
      recommended_action:
        typeof s.recommended_action === "string"
          ? s.recommended_action
          : "Follow up this week.",
      action_type: VALID_ACTION_TYPES.includes(s.action_type as ActionType)
        ? (s.action_type as ActionType)
        : "send_text",
      student_text: typeof s.student_text === "string" ? s.student_text : null,
      parent_text: typeof s.parent_text === "string" ? s.parent_text : null,
      pastoral_note: typeof s.pastoral_note === "string" ? s.pastoral_note : "",
    }));

  // Parse ministry insights (graceful fallback if missing)
  let ministryInsights: MinistryInsights = { ...DEFAULT_MINISTRY_INSIGHTS };
  if (
    parsed.ministry_insights &&
    typeof parsed.ministry_insights === "object"
  ) {
    const mi = parsed.ministry_insights;
    ministryInsights = {
      teaching_recommendation:
        typeof mi.teaching_recommendation === "string"
          ? mi.teaching_recommendation
          : "",
      growth_opportunities: Array.isArray(mi.growth_opportunities)
        ? mi.growth_opportunities.map((g: Record<string, unknown>) => ({
            profile_id: String(g.profile_id || ""),
            name: String(g.name || ""),
            opportunity: String(g.opportunity || ""),
          }))
        : [],
      strategic_assessment:
        typeof mi.strategic_assessment === "string"
          ? mi.strategic_assessment
          : "",
    };
  }

  return {
    briefing_summary: String(parsed.briefing_summary),
    students,
    ministry_insights: ministryInsights,
  };
}

// ─── Fallback Generator ──────────────────────────────────────────────────────

function getFallbackUrgency(
  status: string,
  declining: boolean,
  isSignal: boolean,
): UrgencyLevelV3 {
  if (!isSignal) return "proactive";
  if (status === "Missing") return "critical";
  if (status === "On the Fringe") return "high";
  if (status === "Connected" && declining) return "high";
  if (status === "Connected") return "medium";
  if (status === "Core" && declining) return "medium";
  if (status === "Ultra-Core") return "celebrate";
  return "low";
}

function getFallbackActionType(
  status: string,
  hasPhone: boolean,
  hasParent: boolean,
): ActionType {
  if (status === "Missing") return hasParent ? "call_parent" : "pray_only";
  if (status === "On the Fringe") return hasPhone ? "send_text" : "call_parent";
  if (status === "Ultra-Core") return "celebrate";
  return hasPhone ? "send_text" : "in_person";
}

function getFallbackSituationSummary(c: CopilotCandidateV3): string {
  const parts: string[] = [];

  if (c.signals.prayer_request_text) {
    const truncated =
      c.signals.prayer_request_text.length > 60
        ? c.signals.prayer_request_text.slice(0, 57) + "..."
        : c.signals.prayer_request_text;
    parts.push(`${c.first_name} asked for prayer: "${truncated}".`);
  }

  if (c.is_declining && c.days_since_last_seen > 0) {
    parts.push(
      `Attendance is declining — ${c.signals.checkins_last_4_weeks} check-ins last 4 weeks vs ${c.signals.checkins_previous_4_weeks} previous.`,
    );
  } else if (c.days_since_last_seen > 30 && c.days_since_last_seen < 99999) {
    parts.push(
      `${c.first_name} hasn't been seen in ${c.days_since_last_seen} days.`,
    );
  }

  if (
    c.signals.no_leader_contact_days != null &&
    c.signals.no_leader_contact_days > 14
  ) {
    parts.push(
      `No leader contact in ${c.signals.no_leader_contact_days} days.`,
    );
  }

  if (c.signals.no_response_to_outreach) {
    parts.push("Didn't respond to the last outreach attempt.");
  }

  if (c.is_new) {
    parts.push(
      `${c.first_name} is a new student who needs connection and welcome.`,
    );
  }

  if (parts.length === 0) {
    if (c.belonging_status === "Ultra-Core") {
      parts.push(
        `${c.first_name} is consistently showing up and ready for more responsibility.`,
      );
    } else if (!c.is_signal_candidate) {
      parts.push(
        `${c.first_name} is doing well. A proactive check-in or invitation could strengthen their connection.`,
      );
    } else {
      parts.push(`${c.first_name} could use some encouragement this week.`);
    }
  }

  return parts.join(" ");
}

export function generateFallbackBriefingV3(
  candidates: CopilotCandidateV3[],
): CopilotBriefingResponseV3 {
  // Sort: Missing > Fringe > declining Connected > new > rest, then healthy at end
  const sorted = [...candidates].sort((a, b) => {
    // Signal candidates first, then healthy
    if (a.is_signal_candidate !== b.is_signal_candidate) {
      return a.is_signal_candidate ? -1 : 1;
    }

    const statusOrder: Record<string, number> = {
      Missing: 0,
      "On the Fringe": 1,
      Connected: 2,
      Core: 3,
      "Ultra-Core": 4,
    };
    const aScore =
      (statusOrder[a.belonging_status] ?? 5) - (a.is_declining ? 1 : 0);
    const bScore =
      (statusOrder[b.belonging_status] ?? 5) - (b.is_declining ? 1 : 0);
    return aScore - bScore;
  });

  // Take up to 5 signal candidates + at least 2 healthy
  const signalStudents = sorted
    .filter((c) => c.is_signal_candidate)
    .slice(0, 5);
  const healthyStudents = sorted
    .filter((c) => !c.is_signal_candidate)
    .slice(0, Math.max(2, 7 - signalStudents.length));
  const top7 = [...signalStudents, ...healthyStudents].slice(0, 7);

  const students: CopilotStudentV3[] = top7.map((c, i) => {
    const actionType = getFallbackActionType(
      c.belonging_status,
      !!c.phone_number,
      !!c.primary_parent_phone,
    );

    let studentText: string | null = null;
    if (
      (actionType === "send_text" || actionType === "celebrate") &&
      c.phone_number
    ) {
      if (c.signals.prayer_request_text) {
        studentText = `Hey ${c.first_name}! Been praying about what you shared. How are you doing?`;
      } else if (c.is_new) {
        studentText = `Hey ${c.first_name}! So glad you've been coming. How's your week going?`;
      } else if (c.is_declining) {
        studentText = `Hey ${c.first_name}! We've missed seeing you. Everything okay?`;
      } else if (!c.is_signal_candidate) {
        studentText = `Hey ${c.first_name}! Just thinking about you and wanted to check in. How's everything going?`;
      } else {
        studentText = `Hey ${c.first_name}! Just wanted to check in and see how your week is going.`;
      }
    }

    // Parent text for Missing/Fringe students with parent contact
    let parentText: string | null = null;
    if (
      c.primary_parent_phone &&
      (c.belonging_status === "Missing" ||
        c.belonging_status === "On the Fringe")
    ) {
      parentText = `Hi ${c.primary_parent_name?.split(" ")[0] || "there"}, this is from ${c.first_name}'s youth group. We've been thinking about ${c.first_name} and just wanted to check in. How's everything going?`;
    }

    return {
      profile_id: c.profile_id,
      rank: i + 1,
      urgency: getFallbackUrgency(
        c.belonging_status,
        c.is_declining,
        c.is_signal_candidate,
      ),
      situation_summary: getFallbackSituationSummary(c),
      recommended_action:
        actionType === "call_parent"
          ? `Call ${c.primary_parent_name || "their parent"} to check in`
          : actionType === "send_text"
            ? `Send ${c.first_name} a personal text`
            : actionType === "celebrate"
              ? `Celebrate ${c.first_name}'s faithfulness`
              : `Connect with ${c.first_name} this week`,
      action_type: actionType,
      student_text: studentText,
      parent_text: parentText,
      pastoral_note: "",
    };
  });

  const criticalCount = students.filter(
    (s) => s.urgency === "critical" || s.urgency === "high",
  ).length;

  return {
    briefing_summary:
      criticalCount > 0
        ? `${criticalCount} student${criticalCount > 1 ? "s" : ""} need${criticalCount === 1 ? "s" : ""} urgent attention this week.`
        : "Your flock is doing well. A few students could use encouragement.",
    students,
    ministry_insights: { ...DEFAULT_MINISTRY_INSIGHTS },
  };
}
