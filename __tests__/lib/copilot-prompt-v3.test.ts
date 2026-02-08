import { describe, it, expect } from "vitest";
import {
  parseCopilotBriefingResponseV3,
  buildCopilotBriefingPromptV3,
  generateFallbackBriefingV3,
  CopilotCandidateV3,
} from "@/utils/copilotPromptV3";

// ─── Test Helpers ────────────────────────────────────────────────────────────

function makeCandidate(
  overrides: Partial<CopilotCandidateV3> = {},
): CopilotCandidateV3 {
  return {
    profile_id: "aaaa-1111",
    first_name: "Sarah",
    last_name: "Johnson",
    phone_number: "+15551234567",
    email: "sarah@test.com",
    grade: "9",
    gender: "Female",
    belonging_status: "Connected",
    days_since_last_seen: 14,
    last_seen_at: "2026-01-28T18:00:00Z",
    total_checkins_8weeks: 4,
    checkins_last_4weeks: 1,
    is_declining: true,
    is_new: false,
    is_signal_candidate: true,
    signals: {
      attendance_drop: true,
      checkins_last_4_weeks: 1,
      checkins_previous_4_weeks: 3,
      wednesday_count: 2,
      sunday_count: 2,
      prayer_request_recent: false,
      prayer_request_text: null,
      prayer_request_date: null,
      no_leader_contact_days: 20,
      no_response_to_outreach: false,
      new_student: false,
      membership_days: 180,
    },
    recommendation_insight: null,
    primary_parent_name: "Lisa Johnson",
    primary_parent_phone: "+15559876543",
    last_interaction_at: null,
    last_interaction_by: null,
    last_interaction_status: null,
    pinned_notes: [],
    group_names: ["Youth Group"],
    recent_prayer_text: null,
    devotional_engagement: {
      opened_count: 2,
      reflected_count: 1,
      prayed_count: 0,
      journaled_count: 0,
      last_opened: null,
    },
    sms_activity: {
      total_messages: 3,
      outbound_count: 2,
      inbound_count: 1,
      last_outbound: null,
      last_inbound: null,
    },
    recent_sms_bodies: [
      {
        direction: "outbound",
        body: "Hey Sarah, how are you doing?",
        date: "2026-01-20T10:00:00Z",
      },
      {
        direction: "inbound",
        body: "Good thanks!",
        date: "2026-01-20T10:30:00Z",
      },
    ],
    parent_last_outbound: null,
    signals_hash: "abc123",
    ...overrides,
  };
}

// ─── parseCopilotBriefingResponseV3 ──────────────────────────────────────────

describe("parseCopilotBriefingResponseV3", () => {
  const validIds = new Set([
    "aaaa-1111",
    "bbbb-2222",
    "cccc-3333",
    "dddd-4444",
    "eeee-5555",
    "ffff-6666",
    "gggg-7777",
  ]);

  it("parses valid V3 JSON with 7 students + ministry_insights", () => {
    const input = JSON.stringify({
      briefing_summary: "Seven students need pastoral attention.",
      students: Array.from({ length: 7 }, (_, i) => ({
        profile_id: [
          "aaaa-1111",
          "bbbb-2222",
          "cccc-3333",
          "dddd-4444",
          "eeee-5555",
          "ffff-6666",
          "gggg-7777",
        ][i],
        rank: i + 1,
        urgency: i === 0 ? "critical" : i < 3 ? "high" : "medium",
        situation_summary: `Student ${i + 1} situation details.`,
        recommended_action: `Action for student ${i + 1}.`,
        action_type: "send_text",
        student_text: `Hey Student${i + 1}!`,
        parent_text: i < 3 ? `Hi Parent${i + 1}` : null,
        pastoral_note: `Note for student ${i + 1}.`,
      })),
      ministry_insights: {
        teaching_recommendation: "Consider teaching on community this week.",
        growth_opportunities: [
          {
            profile_id: "aaaa-1111",
            name: "Sarah Johnson",
            opportunity: "Ready to lead small group",
          },
        ],
        strategic_assessment:
          "Ministry is growing but needs more small group leaders.",
      },
    });

    const result = parseCopilotBriefingResponseV3(input, validIds);

    expect(result.briefing_summary).toBe(
      "Seven students need pastoral attention.",
    );
    expect(result.students).toHaveLength(7);
    expect(result.ministry_insights).toBeDefined();
    expect(result.ministry_insights.teaching_recommendation).toContain(
      "community",
    );
    expect(result.ministry_insights.growth_opportunities).toHaveLength(1);
    expect(result.ministry_insights.strategic_assessment).toContain("growing");
  });

  it("validates proactive urgency level", () => {
    const input = JSON.stringify({
      briefing_summary: "Summary.",
      students: [
        {
          profile_id: "aaaa-1111",
          rank: 1,
          urgency: "proactive",
          situation_summary: "Jake is doing great.",
          recommended_action: "Tell him about camp.",
          action_type: "send_text",
          student_text: "Hey Jake!",
          parent_text: null,
          pastoral_note: "Proactive outreach.",
        },
      ],
      ministry_insights: {
        teaching_recommendation: "",
        growth_opportunities: [],
        strategic_assessment: "",
      },
    });

    const result = parseCopilotBriefingResponseV3(input, validIds);
    expect(result.students[0].urgency).toBe("proactive");
  });

  it("validates student_text and parent_text fields", () => {
    const input = JSON.stringify({
      briefing_summary: "Summary.",
      students: [
        {
          profile_id: "aaaa-1111",
          rank: 1,
          urgency: "high",
          situation_summary: "Needs attention.",
          recommended_action: "Text them.",
          action_type: "send_text",
          student_text: "Hey Sarah, checking in!",
          parent_text: "Hi Lisa, just wanted to touch base about Sarah.",
          pastoral_note: "Note.",
        },
      ],
      ministry_insights: {
        teaching_recommendation: "",
        growth_opportunities: [],
        strategic_assessment: "",
      },
    });

    const result = parseCopilotBriefingResponseV3(input, validIds);
    expect(result.students[0].student_text).toBe("Hey Sarah, checking in!");
    expect(result.students[0].parent_text).toBe(
      "Hi Lisa, just wanted to touch base about Sarah.",
    );
  });

  it("validates situation_summary replaces why_insight", () => {
    const input = JSON.stringify({
      briefing_summary: "Summary.",
      students: [
        {
          profile_id: "aaaa-1111",
          rank: 1,
          urgency: "medium",
          situation_summary:
            "Sarah has been declining in attendance over the past 3 weeks. She went from 3 check-ins to 1. Her prayer request about family issues suggests a deeper problem.",
          recommended_action: "Follow up.",
          action_type: "send_text",
          student_text: null,
          parent_text: null,
          pastoral_note: "Note.",
        },
      ],
      ministry_insights: {
        teaching_recommendation: "",
        growth_opportunities: [],
        strategic_assessment: "",
      },
    });

    const result = parseCopilotBriefingResponseV3(input, validIds);
    expect(result.students[0].situation_summary).toContain("declining");
    expect(result.students[0].situation_summary.length).toBeGreaterThan(50);
  });

  it("validates ministry_insights structure", () => {
    const input = JSON.stringify({
      briefing_summary: "Summary.",
      students: [
        {
          profile_id: "aaaa-1111",
          rank: 1,
          urgency: "medium",
          situation_summary: "Situation.",
          recommended_action: "Action.",
          action_type: "send_text",
          student_text: null,
          parent_text: null,
          pastoral_note: "",
        },
      ],
      ministry_insights: {
        teaching_recommendation:
          "Your series on identity would connect well with the 9th graders struggling with belonging.",
        growth_opportunities: [
          {
            profile_id: "bbbb-2222",
            name: "Jake Miller",
            opportunity: "Ready to lead worship team",
          },
          {
            profile_id: "cccc-3333",
            name: "Emma Davis",
            opportunity: "Could mentor new 6th graders",
          },
        ],
        strategic_assessment:
          "Your ministry has strong Core retention but the Connected tier is thinning. Consider adding a mid-week hangout.",
      },
    });

    const result = parseCopilotBriefingResponseV3(input, validIds);
    expect(result.ministry_insights.teaching_recommendation).toContain(
      "identity",
    );
    expect(result.ministry_insights.growth_opportunities).toHaveLength(2);
    expect(result.ministry_insights.growth_opportunities[0].profile_id).toBe(
      "bbbb-2222",
    );
    expect(result.ministry_insights.strategic_assessment).toContain(
      "Connected",
    );
  });

  it("handles missing ministry_insights gracefully", () => {
    const input = JSON.stringify({
      briefing_summary: "Summary.",
      students: [
        {
          profile_id: "aaaa-1111",
          rank: 1,
          urgency: "medium",
          situation_summary: "Situation.",
          recommended_action: "Action.",
          action_type: "send_text",
          student_text: null,
          parent_text: null,
          pastoral_note: "",
        },
      ],
    });

    const result = parseCopilotBriefingResponseV3(input, validIds);
    expect(result.ministry_insights).toBeDefined();
    expect(result.ministry_insights.teaching_recommendation).toBe("");
    expect(result.ministry_insights.growth_opportunities).toEqual([]);
    expect(result.ministry_insights.strategic_assessment).toBe("");
  });

  it("caps at 7 students and normalizes ranks 1-7", () => {
    const allIds = new Set([
      "id-0",
      "id-1",
      "id-2",
      "id-3",
      "id-4",
      "id-5",
      "id-6",
      "id-7",
      "id-8",
      "id-9",
    ]);
    const students = Array.from({ length: 10 }, (_, i) => ({
      profile_id: `id-${i}`,
      rank: (i + 1) * 3,
      urgency: "medium",
      situation_summary: "Situation.",
      recommended_action: "Action.",
      action_type: "send_text",
      student_text: null,
      parent_text: null,
      pastoral_note: "",
    }));

    const input = JSON.stringify({
      briefing_summary: "Big.",
      students,
      ministry_insights: {
        teaching_recommendation: "",
        growth_opportunities: [],
        strategic_assessment: "",
      },
    });

    const result = parseCopilotBriefingResponseV3(input, allIds);
    expect(result.students.length).toBeLessThanOrEqual(7);
    // Ranks should be sequential 1-N
    result.students.forEach((s, i) => {
      expect(s.rank).toBe(i + 1);
    });
  });

  it("strips markdown code fences", () => {
    const json = JSON.stringify({
      briefing_summary: "Summary.",
      students: [
        {
          profile_id: "aaaa-1111",
          rank: 1,
          urgency: "medium",
          situation_summary: "Situation.",
          recommended_action: "Action.",
          action_type: "in_person",
          student_text: null,
          parent_text: null,
          pastoral_note: "Note.",
        },
      ],
      ministry_insights: {
        teaching_recommendation: "",
        growth_opportunities: [],
        strategic_assessment: "",
      },
    });
    const input = "```json\n" + json + "\n```";

    const result = parseCopilotBriefingResponseV3(input, validIds);
    expect(result.students).toHaveLength(1);
    expect(result.briefing_summary).toBe("Summary.");
  });

  it("filters out students with invalid profile_ids", () => {
    const input = JSON.stringify({
      briefing_summary: "Summary.",
      students: [
        {
          profile_id: "aaaa-1111",
          rank: 1,
          urgency: "high",
          situation_summary: "Valid.",
          recommended_action: "Action.",
          action_type: "send_text",
          student_text: null,
          parent_text: null,
          pastoral_note: "",
        },
        {
          profile_id: "invalid-id",
          rank: 2,
          urgency: "low",
          situation_summary: "Invalid.",
          recommended_action: "Skip.",
          action_type: "send_text",
          student_text: null,
          parent_text: null,
          pastoral_note: "",
        },
      ],
      ministry_insights: {
        teaching_recommendation: "",
        growth_opportunities: [],
        strategic_assessment: "",
      },
    });

    const result = parseCopilotBriefingResponseV3(input, validIds);
    expect(result.students).toHaveLength(1);
    expect(result.students[0].profile_id).toBe("aaaa-1111");
  });

  it("defaults invalid urgency to medium", () => {
    const input = JSON.stringify({
      briefing_summary: "Summary.",
      students: [
        {
          profile_id: "aaaa-1111",
          rank: 1,
          urgency: "super_urgent",
          situation_summary: "Situation.",
          recommended_action: "Action.",
          action_type: "send_text",
          student_text: null,
          parent_text: null,
          pastoral_note: "",
        },
      ],
      ministry_insights: {
        teaching_recommendation: "",
        growth_opportunities: [],
        strategic_assessment: "",
      },
    });

    const result = parseCopilotBriefingResponseV3(input, validIds);
    expect(result.students[0].urgency).toBe("medium");
  });

  it("throws on invalid JSON", () => {
    expect(() =>
      parseCopilotBriefingResponseV3("not json", validIds),
    ).toThrow();
  });

  it("throws on missing briefing_summary", () => {
    const input = JSON.stringify({ students: [] });
    expect(() => parseCopilotBriefingResponseV3(input, validIds)).toThrow(
      "Invalid briefing response structure",
    );
  });

  it("throws on missing students array", () => {
    const input = JSON.stringify({ briefing_summary: "Hi" });
    expect(() => parseCopilotBriefingResponseV3(input, validIds)).toThrow(
      "Invalid briefing response structure",
    );
  });
});

// ─── buildCopilotBriefingPromptV3 ────────────────────────────────────────────

describe("buildCopilotBriefingPromptV3", () => {
  const signalCandidate = makeCandidate({
    profile_id: "aaaa-1111",
    is_signal_candidate: true,
  });
  const healthyStudent = makeCandidate({
    profile_id: "bbbb-2222",
    first_name: "Jake",
    last_name: "Miller",
    belonging_status: "Ultra-Core",
    is_declining: false,
    is_signal_candidate: false,
    days_since_last_seen: 3,
    last_seen_at: "2026-02-04T18:00:00Z",
    recent_sms_bodies: [],
  });

  it("includes ministry priorities when provided", () => {
    const prompt = buildCopilotBriefingPromptV3(
      [signalCandidate, healthyStudent],
      { orgName: "Test Ministry", totalStudents: 50 },
      null,
      "Winter camp registration closes Friday. Focus on connecting new 6th graders.",
    );

    expect(prompt).toContain("MINISTRY PRIORITIES THIS WEEK");
    expect(prompt).toContain("Winter camp registration closes Friday");
    expect(prompt).toContain("connecting new 6th graders");
  });

  it("omits ministry priorities section when null", () => {
    const prompt = buildCopilotBriefingPromptV3(
      [signalCandidate, healthyStudent],
      { orgName: "Test Ministry", totalStudents: 50 },
      null,
      null,
    );

    expect(prompt).not.toContain("MINISTRY PRIORITIES THIS WEEK");
  });

  it("formats signal candidates with full detail including SMS bodies", () => {
    const prompt = buildCopilotBriefingPromptV3(
      [signalCandidate],
      { orgName: "Test Ministry", totalStudents: 50 },
      null,
      null,
    );

    expect(prompt).toContain("SIGNAL CANDIDATES");
    expect(prompt).toContain("Sarah Johnson");
    expect(prompt).toContain("Recent Texts:");
    expect(prompt).toContain("Hey Sarah, how are you doing?");
  });

  it("formats healthy roster compactly", () => {
    const prompt = buildCopilotBriefingPromptV3(
      [signalCandidate, healthyStudent],
      { orgName: "Test Ministry", totalStudents: 50 },
      null,
      null,
    );

    expect(prompt).toContain("HEALTHY ROSTER");
    expect(prompt).toContain("Jake M.");
    // Healthy roster should be compact — one line per student
    const healthySection = prompt.split("HEALTHY ROSTER")[1];
    expect(healthySection).toContain("Ultra-Core");
  });

  it("includes last_seen_at as formatted date in candidate blocks", () => {
    const prompt = buildCopilotBriefingPromptV3(
      [signalCandidate],
      { orgName: "Test Ministry", totalStudents: 50 },
      null,
      null,
    );

    expect(prompt).toContain("Last Visited:");
    // Should contain a formatted date from last_seen_at
    expect(prompt).toContain("Jan 28");
  });

  it("requests 7 students in output format", () => {
    const prompt = buildCopilotBriefingPromptV3(
      [signalCandidate],
      { orgName: "Test Ministry", totalStudents: 50 },
      null,
      null,
    );

    expect(prompt).toContain("7 students");
    expect(prompt).toContain("student_text");
    expect(prompt).toContain("parent_text");
    expect(prompt).toContain("situation_summary");
    expect(prompt).toContain("ministry_insights");
  });

  it("includes proactive urgency level in framework", () => {
    const prompt = buildCopilotBriefingPromptV3(
      [signalCandidate],
      { orgName: "Test Ministry", totalStudents: 50 },
      null,
      null,
    );

    expect(prompt).toContain("proactive");
    expect(prompt).toContain("At least 2 students should be proactive");
  });
});

// ─── generateFallbackBriefingV3 ──────────────────────────────────────────────

describe("generateFallbackBriefingV3", () => {
  it("returns 7 students when enough candidates available", () => {
    const candidates = Array.from({ length: 15 }, (_, i) =>
      makeCandidate({
        profile_id: `id-${i}`,
        first_name: `Student${i}`,
        belonging_status:
          i < 3 ? "Missing" : i < 6 ? "Connected" : "Ultra-Core",
        is_declining: i < 3,
        is_signal_candidate: i < 6,
      }),
    );

    const result = generateFallbackBriefingV3(candidates);
    expect(result.students).toHaveLength(7);
    expect(result.briefing_summary).toBeTruthy();
  });

  it("includes at least 2 healthy/proactive students when available", () => {
    const candidates = Array.from({ length: 10 }, (_, i) =>
      makeCandidate({
        profile_id: `id-${i}`,
        first_name: `Student${i}`,
        belonging_status: i < 4 ? "Missing" : "Ultra-Core",
        is_declining: i < 4,
        is_signal_candidate: i < 4,
      }),
    );

    const result = generateFallbackBriefingV3(candidates);
    const proactiveOrCelebrate = result.students.filter(
      (s) => s.urgency === "celebrate" || s.urgency === "proactive",
    );
    expect(proactiveOrCelebrate.length).toBeGreaterThanOrEqual(2);
  });

  it("returns default ministry_insights structure", () => {
    const candidates = [makeCandidate()];
    const result = generateFallbackBriefingV3(candidates);

    expect(result.ministry_insights).toBeDefined();
    expect(result.ministry_insights.teaching_recommendation).toBe("");
    expect(result.ministry_insights.growth_opportunities).toEqual([]);
    expect(result.ministry_insights.strategic_assessment).toBe("");
  });

  it("uses student_text and parent_text instead of draft_message", () => {
    const candidates = [
      makeCandidate({
        profile_id: "connected",
        first_name: "Emma",
        belonging_status: "On the Fringe",
        phone_number: "+15551111111",
        is_signal_candidate: true,
      }),
    ];

    const result = generateFallbackBriefingV3(candidates);
    expect(result.students[0]).toHaveProperty("student_text");
    expect(result.students[0]).toHaveProperty("parent_text");
    expect(result.students[0]).not.toHaveProperty("draft_message");
    expect(result.students[0]).toHaveProperty("situation_summary");
    expect(result.students[0]).not.toHaveProperty("why_insight");
  });

  it("handles empty candidate list", () => {
    const result = generateFallbackBriefingV3([]);
    expect(result.students).toHaveLength(0);
    expect(result.briefing_summary).toBeTruthy();
    expect(result.ministry_insights).toBeDefined();
  });

  it("assigns proactive urgency for healthy students", () => {
    const candidates = [
      makeCandidate({
        profile_id: "ultra",
        first_name: "Jake",
        belonging_status: "Ultra-Core",
        is_declining: false,
        is_signal_candidate: false,
      }),
    ];

    const result = generateFallbackBriefingV3(candidates);
    const jake = result.students.find((s) => s.profile_id === "ultra");
    expect(jake?.urgency === "celebrate" || jake?.urgency === "proactive").toBe(
      true,
    );
  });
});
