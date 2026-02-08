/**
 * Co-Pilot V2 Prompt Builder
 *
 * Builds the pastoral AI persona prompt, parses structured responses,
 * and provides a rule-based fallback when the API is unavailable.
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

export type UrgencyLevel = "critical" | "high" | "medium" | "low" | "celebrate";

export interface CopilotBriefingStudent {
  profile_id: string;
  rank: number;
  urgency: UrgencyLevel;
  why_insight: string;
  recommended_action: string;
  action_type: ActionType;
  draft_message: string | null;
  pastoral_note: string;
}

export interface CopilotBriefingResponse {
  briefing_summary: string;
  students: CopilotBriefingStudent[];
}

/** Raw candidate data from the V2 RPC */
export interface CopilotCandidate {
  profile_id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  email: string | null;
  grade: string | null;
  gender: string | null;
  belonging_status: string;
  days_since_last_seen: number;
  total_checkins_8weeks: number;
  checkins_last_4weeks: number;
  is_declining: boolean;
  is_new: boolean;
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

function formatCandidateBlock(c: CopilotCandidate, index: number): string {
  const daysSeen =
    c.days_since_last_seen > 99999
      ? "never"
      : `${c.days_since_last_seen} days ago`;

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

  return `--- STUDENT ${index + 1} [${c.profile_id}] ---
Name: ${c.first_name} ${c.last_name}
Grade: ${c.grade || "Unknown"}
Gender: ${c.gender || "Unknown"}
Belonging Status: ${c.belonging_status}
Last Seen: ${daysSeen}
Attendance (8 weeks): ${c.total_checkins_8weeks} total (last 4w: ${c.signals.checkins_last_4_weeks}, prev 4w: ${c.signals.checkins_previous_4_weeks})
Wed/Sun split: ${c.signals.wednesday_count}W / ${c.signals.sunday_count}S
Trend: ${c.is_declining ? "DECLINING" : "Stable"}
New Student: ${c.is_new ? `Yes (${Math.round(c.signals.membership_days || 0)} days ago)` : "No"}
Phone: ${c.phone_number ? "Yes" : "No phone on file"}
Prayer Request: ${c.signals.prayer_request_text ? `"${c.signals.prayer_request_text}" (${c.signals.prayer_request_date ? new Date(c.signals.prayer_request_date).toLocaleDateString() : "recent"})` : "None recent"}
Parent: ${c.primary_parent_name ? `${c.primary_parent_name} (${c.primary_parent_phone || "no phone"})` : "No parent on file"}
Groups: ${c.group_names.length > 0 ? c.group_names.join(", ") : "None"}
Last Leader Contact: ${lastContact}
Contact Gap: ${c.signals.no_leader_contact_days != null ? `${c.signals.no_leader_contact_days} days since last contact` : "Never contacted"}
Devotional Engagement: ${devoStr}
SMS History: ${smsStr}
Leader Notes:
${notesStr}
${c.recommendation_insight ? `AI Recommendation: ${c.recommendation_insight}` : ""}`;
}

export function buildCopilotBriefingPrompt(
  candidates: CopilotCandidate[],
  orgContext: OrgContext,
  curriculum: CurriculumContext | null,
): string {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Build pastoral knowledge sections
  const phaseKnowledge = Object.entries(PHASE_DESCRIPTIONS)
    .map(([grade, desc]) => desc)
    .join("\n\n");

  const engagementKnowledge = Object.entries(ENGAGEMENT_GUIDANCE)
    .map(([status, desc]) => desc)
    .join("\n\n");

  const genderKnowledge = Object.values(GENDER_GUIDANCE).join("\n\n");
  const ageKnowledge = Object.values(AGE_STRATEGIES).join("\n\n");

  // Format all candidates
  const candidateBlocks = candidates
    .map((c, i) => formatCandidateBlock(c, i))
    .join("\n\n");

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

  return `You are the Senior Director of Pastoral Care for a youth ministry — someone with both a seminary degree and an MBA. You combine deep pastoral wisdom with high executive function. You see patterns humans miss. You think in terms of both spiritual care and organizational effectiveness.

Your job: Look at ALL the students below and decide which 5 need the pastor's attention most urgently TODAY. For each one, explain WHY with real pastoral insight, WHAT the leader should do, and if a text message is appropriate, DRAFT it.

## ORGANIZATION CONTEXT
Ministry: ${orgContext.orgName}
Total Active Students: ${orgContext.totalStudents}
Today: ${today}

${curriculumSection}

## PASTORAL KNOWLEDGE BASE

### Developmental Phases (by grade)
${phaseKnowledge}

### Engagement Level Guidance
${engagementKnowledge}

### Gender-Specific Approaches
${genderKnowledge}

### Age-Appropriate Strategies
${ageKnowledge}

## ALL CANDIDATES (${candidates.length} students)
Review ALL of them, then select the 5 most important for today.

${candidateBlocks}

## DECISION FRAMEWORK — 5 URGENCY TIERS
- **critical**: Immediate risk — missing 30+ days, declining fast, prayer request signaling crisis, no response to outreach
- **high**: Needs attention this week — declining attendance, unanswered prayer request, new student not yet connected
- **medium**: Worth a touch this week — could use encouragement, celebrate a win, deepen connection
- **low**: Keep on radar — generally okay but something worth noting for next week
- **celebrate**: Doing great! — acknowledge their faithfulness, develop their leadership, invest in their growth

## PASTORAL RULES (HARD RULES — DO NOT VIOLATE)
1. NEVER suggest texting first for a Missing student (60+ days absent). Start with parent contact.
2. If a student has not responded to the LAST outreach, escalate — don't repeat the same channel.
3. If a student submitted a prayer request, you MUST acknowledge it in your recommendation.
4. Reference SPECIFIC data in your insights — actual days, actual check-in counts, actual dates. Never be vague.
5. If a student has no phone on file, do NOT recommend send_text. Recommend in_person or call_parent instead.
6. For new students (< 30 days), prioritize connection and welcome over correction.
7. Maximum 2 students can be "critical" urgency. The pastor can't have everything be urgent.
8. At least 1 student should be "celebrate" or "low" if ANY students are doing well — the pastor needs encouragement too.

## ACTION TYPES
- send_text: Draft an SMS for the leader to send (include draft_message)
- call_student: Recommend calling the student directly
- call_parent: Recommend calling the parent (for Missing students or crisis situations)
- in_person: Recommend face-to-face conversation at next gathering
- give_space: Student needs room — check back next week
- celebrate: Student is thriving — acknowledge and develop
- pray_only: Situation is beyond direct action right now — commit to prayer

## OUTPUT FORMAT
Return ONLY valid JSON (no markdown, no code fences, no explanation outside the JSON):

{
  "briefing_summary": "1-2 sentence executive summary for the pastor. Example: 'Two students need urgent attention this week — Sarah hasn't been seen in 45 days and Jake's prayer request signals real pain. But Emma's consistency is worth celebrating.'",
  "students": [
    {
      "profile_id": "exact UUID from the student data above",
      "rank": 1,
      "urgency": "critical|high|medium|low|celebrate",
      "why_insight": "2-3 sentences of REAL pastoral reasoning. Reference specific data. Example: 'Sarah came 5 times in her first month but hasn't been seen in 45 days. Her prayer request about her parents fighting suggests a home situation that's keeping her away. This isn't apathy — this is a kid in pain who needs someone to notice.'",
      "recommended_action": "Specific instruction. Example: 'Call her mom Lisa tonight. Ask how things are at home. Don't mention attendance — just check in as someone who cares about their family.'",
      "action_type": "call_parent",
      "draft_message": null,
      "pastoral_note": "Internal context for the leader's reference. Example: 'Sarah's decline coincides with her prayer about parents. This may be a separation/divorce situation. Tread carefully — she may feel caught in the middle.'"
    }
  ]
}

IMPORTANT: The "students" array must contain exactly 5 students, ranked 1 through 5. Each profile_id must be an exact UUID from the candidate list above.`;
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

const VALID_URGENCY_LEVELS: UrgencyLevel[] = [
  "critical",
  "high",
  "medium",
  "low",
  "celebrate",
];

export function parseCopilotBriefingResponse(
  text: string,
  validProfileIds: Set<string>,
): CopilotBriefingResponse {
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
  const students: CopilotBriefingStudent[] = parsed.students
    .filter((s: Record<string, unknown>) =>
      validProfileIds.has(s.profile_id as string),
    )
    .slice(0, 5)
    .map((s: Record<string, unknown>, i: number) => ({
      profile_id: s.profile_id as string,
      rank: Math.min(Math.max(i + 1, 1), 5),
      urgency: VALID_URGENCY_LEVELS.includes(s.urgency as UrgencyLevel)
        ? (s.urgency as UrgencyLevel)
        : "medium",
      why_insight:
        typeof s.why_insight === "string" ? s.why_insight : "Needs attention.",
      recommended_action:
        typeof s.recommended_action === "string"
          ? s.recommended_action
          : "Follow up this week.",
      action_type: VALID_ACTION_TYPES.includes(s.action_type as ActionType)
        ? (s.action_type as ActionType)
        : "send_text",
      draft_message:
        typeof s.draft_message === "string" ? s.draft_message : null,
      pastoral_note: typeof s.pastoral_note === "string" ? s.pastoral_note : "",
    }));

  return {
    briefing_summary: String(parsed.briefing_summary),
    students,
  };
}

// ─── Fallback Generator ──────────────────────────────────────────────────────

function getFallbackUrgency(status: string, declining: boolean): UrgencyLevel {
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

function getFallbackWhyInsight(c: CopilotCandidate): string {
  const parts: string[] = [];

  if (c.signals.prayer_request_text) {
    const truncated =
      c.signals.prayer_request_text.length > 60
        ? c.signals.prayer_request_text.slice(0, 57) + "..."
        : c.signals.prayer_request_text;
    parts.push(`asked for prayer: "${truncated}"`);
  }

  if (c.is_declining && c.days_since_last_seen > 0) {
    parts.push(
      `attendance is declining (${c.signals.checkins_last_4_weeks} check-ins last 4 weeks vs ${c.signals.checkins_previous_4_weeks} previous)`,
    );
  } else if (c.days_since_last_seen > 30 && c.days_since_last_seen < 99999) {
    parts.push(`hasn't been seen in ${c.days_since_last_seen} days`);
  }

  if (
    c.signals.no_leader_contact_days != null &&
    c.signals.no_leader_contact_days > 14
  ) {
    parts.push(`no leader contact in ${c.signals.no_leader_contact_days} days`);
  }

  if (c.signals.no_response_to_outreach) {
    parts.push("didn't respond to the last outreach");
  }

  if (c.is_new) {
    parts.push("is a new student who needs connection");
  }

  if (parts.length === 0) {
    if (c.belonging_status === "Ultra-Core") {
      parts.push(
        "is consistently showing up and ready for more responsibility",
      );
    } else {
      parts.push("could use some encouragement this week");
    }
  }

  return `${c.first_name} ${parts.join(" and ")}.`;
}

export function generateFallbackBriefing(
  candidates: CopilotCandidate[],
): CopilotBriefingResponse {
  // Sort by a simple priority: Missing > Fringe > declining Connected > new > rest
  const sorted = [...candidates].sort((a, b) => {
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

  const top5 = sorted.slice(0, 5);

  const students: CopilotBriefingStudent[] = top5.map((c, i) => {
    const actionType = getFallbackActionType(
      c.belonging_status,
      !!c.phone_number,
      !!c.primary_parent_phone,
    );

    let draftMessage: string | null = null;
    if (actionType === "send_text" && c.phone_number) {
      if (c.signals.prayer_request_text) {
        draftMessage = `Hey ${c.first_name}! Been praying about what you shared. How are you doing?`;
      } else if (c.is_new) {
        draftMessage = `Hey ${c.first_name}! So glad you've been coming. How's your week going?`;
      } else if (c.is_declining) {
        draftMessage = `Hey ${c.first_name}! We've missed seeing you. Everything okay?`;
      } else {
        draftMessage = `Hey ${c.first_name}! Just wanted to check in and see how your week is going.`;
      }
    }

    return {
      profile_id: c.profile_id,
      rank: i + 1,
      urgency: getFallbackUrgency(c.belonging_status, c.is_declining),
      why_insight: getFallbackWhyInsight(c),
      recommended_action:
        actionType === "call_parent"
          ? `Call ${c.primary_parent_name || "their parent"} to check in`
          : actionType === "send_text"
            ? `Send ${c.first_name} a personal text`
            : actionType === "celebrate"
              ? `Celebrate ${c.first_name}'s faithfulness`
              : `Connect with ${c.first_name} this week`,
      action_type: actionType,
      draft_message: draftMessage,
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
  };
}
