import { describe, it, expect } from "vitest";
import {
  parseCopilotBriefingResponse,
  generateFallbackBriefing,
  CopilotCandidate,
} from "@/utils/copilotPrompt";

// ─── Test Helpers ────────────────────────────────────────────────────────────

function makeCandidate(
  overrides: Partial<CopilotCandidate> = {},
): CopilotCandidate {
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
    total_checkins_8weeks: 4,
    checkins_last_4weeks: 1,
    is_declining: true,
    is_new: false,
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
    signals_hash: "abc123",
    ...overrides,
  };
}

// ─── parseCopilotBriefingResponse ────────────────────────────────────────────

describe("parseCopilotBriefingResponse", () => {
  const validIds = new Set(["aaaa-1111", "bbbb-2222", "cccc-3333"]);

  it("parses valid JSON response", () => {
    const input = JSON.stringify({
      briefing_summary: "Two students need attention.",
      students: [
        {
          profile_id: "aaaa-1111",
          rank: 1,
          urgency: "high",
          why_insight: "Sarah is declining.",
          recommended_action: "Text her today.",
          action_type: "send_text",
          draft_message: "Hey Sarah!",
          pastoral_note: "Watch for more decline.",
        },
      ],
    });

    const result = parseCopilotBriefingResponse(input, validIds);

    expect(result.briefing_summary).toBe("Two students need attention.");
    expect(result.students).toHaveLength(1);
    expect(result.students[0].profile_id).toBe("aaaa-1111");
    expect(result.students[0].urgency).toBe("high");
    expect(result.students[0].action_type).toBe("send_text");
    expect(result.students[0].draft_message).toBe("Hey Sarah!");
  });

  it("strips markdown code fences", () => {
    const input =
      "```json\n" +
      JSON.stringify({
        briefing_summary: "Summary.",
        students: [
          {
            profile_id: "aaaa-1111",
            rank: 1,
            urgency: "medium",
            why_insight: "Insight.",
            recommended_action: "Action.",
            action_type: "in_person",
            draft_message: null,
            pastoral_note: "Note.",
          },
        ],
      }) +
      "\n```";

    const result = parseCopilotBriefingResponse(input, validIds);
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
          why_insight: "Valid.",
          recommended_action: "Action.",
          action_type: "send_text",
          draft_message: null,
          pastoral_note: "",
        },
        {
          profile_id: "invalid-id",
          rank: 2,
          urgency: "low",
          why_insight: "Invalid.",
          recommended_action: "Skip.",
          action_type: "send_text",
          draft_message: null,
          pastoral_note: "",
        },
      ],
    });

    const result = parseCopilotBriefingResponse(input, validIds);
    expect(result.students).toHaveLength(1);
    expect(result.students[0].profile_id).toBe("aaaa-1111");
  });

  it("caps at 5 students", () => {
    const students = Array.from({ length: 8 }, (_, i) => ({
      profile_id:
        i < 3 ? ["aaaa-1111", "bbbb-2222", "cccc-3333"][i] : `extra-${i}`,
      rank: i + 1,
      urgency: "medium",
      why_insight: "Insight.",
      recommended_action: "Action.",
      action_type: "send_text",
      draft_message: null,
      pastoral_note: "",
    }));

    // Only 3 valid IDs, so should get 3 (capped at 5 but filtered first)
    const bigValidIds = new Set([
      "aaaa-1111",
      "bbbb-2222",
      "cccc-3333",
      "extra-3",
      "extra-4",
      "extra-5",
      "extra-6",
      "extra-7",
    ]);
    const input = JSON.stringify({ briefing_summary: "Big.", students });
    const result = parseCopilotBriefingResponse(input, bigValidIds);
    expect(result.students.length).toBeLessThanOrEqual(5);
  });

  it("normalizes ranks to sequential 1-5", () => {
    const input = JSON.stringify({
      briefing_summary: "Summary.",
      students: [
        {
          profile_id: "aaaa-1111",
          rank: 10,
          urgency: "high",
          why_insight: "A.",
          recommended_action: "B.",
          action_type: "send_text",
          draft_message: null,
          pastoral_note: "",
        },
        {
          profile_id: "bbbb-2222",
          rank: 99,
          urgency: "low",
          why_insight: "A.",
          recommended_action: "B.",
          action_type: "call_parent",
          draft_message: null,
          pastoral_note: "",
        },
      ],
    });

    const result = parseCopilotBriefingResponse(input, validIds);
    expect(result.students[0].rank).toBe(1);
    expect(result.students[1].rank).toBe(2);
  });

  it("defaults invalid urgency to 'medium'", () => {
    const input = JSON.stringify({
      briefing_summary: "Summary.",
      students: [
        {
          profile_id: "aaaa-1111",
          rank: 1,
          urgency: "super_duper_urgent",
          why_insight: "Insight.",
          recommended_action: "Action.",
          action_type: "send_text",
          draft_message: null,
          pastoral_note: "",
        },
      ],
    });

    const result = parseCopilotBriefingResponse(input, validIds);
    expect(result.students[0].urgency).toBe("medium");
  });

  it("defaults invalid action_type to 'send_text'", () => {
    const input = JSON.stringify({
      briefing_summary: "Summary.",
      students: [
        {
          profile_id: "aaaa-1111",
          rank: 1,
          urgency: "high",
          why_insight: "Insight.",
          recommended_action: "Action.",
          action_type: "fly_to_moon",
          draft_message: null,
          pastoral_note: "",
        },
      ],
    });

    const result = parseCopilotBriefingResponse(input, validIds);
    expect(result.students[0].action_type).toBe("send_text");
  });

  it("handles null draft_message gracefully", () => {
    const input = JSON.stringify({
      briefing_summary: "Summary.",
      students: [
        {
          profile_id: "aaaa-1111",
          rank: 1,
          urgency: "high",
          why_insight: "Insight.",
          recommended_action: "Call parent.",
          action_type: "call_parent",
          draft_message: null,
          pastoral_note: "Note.",
        },
      ],
    });

    const result = parseCopilotBriefingResponse(input, validIds);
    expect(result.students[0].draft_message).toBeNull();
  });

  it("throws on invalid JSON", () => {
    expect(() => parseCopilotBriefingResponse("not json", validIds)).toThrow();
  });

  it("throws on missing briefing_summary", () => {
    const input = JSON.stringify({ students: [] });
    expect(() => parseCopilotBriefingResponse(input, validIds)).toThrow(
      "Invalid briefing response structure",
    );
  });

  it("throws on missing students array", () => {
    const input = JSON.stringify({ briefing_summary: "Hi" });
    expect(() => parseCopilotBriefingResponse(input, validIds)).toThrow(
      "Invalid briefing response structure",
    );
  });
});

// ─── generateFallbackBriefing ────────────────────────────────────────────────

describe("generateFallbackBriefing", () => {
  it("returns a briefing with up to 5 students", () => {
    const candidates = Array.from({ length: 10 }, (_, i) =>
      makeCandidate({
        profile_id: `id-${i}`,
        first_name: `Student${i}`,
        belonging_status: i < 3 ? "Missing" : "Connected",
      }),
    );

    const result = generateFallbackBriefing(candidates);
    expect(result.students).toHaveLength(5);
    expect(result.briefing_summary).toBeTruthy();
  });

  it("prioritizes Missing students first", () => {
    const candidates = [
      makeCandidate({
        profile_id: "core",
        first_name: "Core",
        belonging_status: "Core",
        is_declining: false,
      }),
      makeCandidate({
        profile_id: "missing",
        first_name: "Missing",
        belonging_status: "Missing",
        is_declining: false,
      }),
      makeCandidate({
        profile_id: "fringe",
        first_name: "Fringe",
        belonging_status: "On the Fringe",
        is_declining: false,
      }),
    ];

    const result = generateFallbackBriefing(candidates);
    expect(result.students[0].profile_id).toBe("missing");
    expect(result.students[1].profile_id).toBe("fringe");
  });

  it("assigns call_parent for Missing students with parent phone", () => {
    const candidates = [
      makeCandidate({
        profile_id: "missing-with-parent",
        belonging_status: "Missing",
        primary_parent_phone: "+15551234567",
      }),
    ];

    const result = generateFallbackBriefing(candidates);
    expect(result.students[0].action_type).toBe("call_parent");
    expect(result.students[0].draft_message).toBeNull();
  });

  it("assigns pray_only for Missing students without parent", () => {
    const candidates = [
      makeCandidate({
        profile_id: "missing-no-parent",
        belonging_status: "Missing",
        primary_parent_phone: null,
        primary_parent_name: null,
      }),
    ];

    const result = generateFallbackBriefing(candidates);
    expect(result.students[0].action_type).toBe("pray_only");
  });

  it("assigns send_text for Connected/Fringe students with phone", () => {
    const candidates = [
      makeCandidate({
        profile_id: "connected-phone",
        belonging_status: "Connected",
        phone_number: "+15551111111",
      }),
    ];

    const result = generateFallbackBriefing(candidates);
    expect(result.students[0].action_type).toBe("send_text");
    expect(result.students[0].draft_message).toBeTruthy();
  });

  it("assigns celebrate for Ultra-Core students", () => {
    const candidates = [
      makeCandidate({
        profile_id: "ultra",
        belonging_status: "Ultra-Core",
        is_declining: false,
      }),
    ];

    const result = generateFallbackBriefing(candidates);
    expect(result.students[0].urgency).toBe("celebrate");
    expect(result.students[0].action_type).toBe("celebrate");
  });

  it("generates draft messages that mention the student's name", () => {
    const candidates = [
      makeCandidate({
        profile_id: "named",
        first_name: "Emma",
        belonging_status: "On the Fringe",
        phone_number: "+15551111111",
      }),
    ];

    const result = generateFallbackBriefing(candidates);
    expect(result.students[0].draft_message).toContain("Emma");
  });

  it("includes prayer request in why_insight when present", () => {
    const candidates = [
      makeCandidate({
        profile_id: "prayer",
        first_name: "Jake",
        belonging_status: "Connected",
        signals: {
          ...makeCandidate().signals,
          prayer_request_text: "My parents are fighting",
          prayer_request_recent: true,
        },
      }),
    ];

    const result = generateFallbackBriefing(candidates);
    expect(result.students[0].why_insight).toContain("prayer");
    expect(result.students[0].why_insight).toContain("parents are fighting");
  });

  it("returns summary mentioning urgency count", () => {
    const candidates = [
      makeCandidate({ profile_id: "m1", belonging_status: "Missing" }),
      makeCandidate({ profile_id: "m2", belonging_status: "On the Fringe" }),
      makeCandidate({
        profile_id: "c1",
        belonging_status: "Core",
        is_declining: false,
      }),
    ];

    const result = generateFallbackBriefing(candidates);
    // Missing = critical, Fringe = high — both are urgent
    expect(result.briefing_summary).toContain("urgent attention");
  });

  it("returns encouraging summary when no urgent students", () => {
    const candidates = [
      makeCandidate({
        profile_id: "u1",
        belonging_status: "Ultra-Core",
        is_declining: false,
      }),
      makeCandidate({
        profile_id: "c1",
        belonging_status: "Core",
        is_declining: false,
      }),
    ];

    const result = generateFallbackBriefing(candidates);
    expect(result.briefing_summary).toContain("doing well");
  });

  it("handles empty candidate list", () => {
    const result = generateFallbackBriefing([]);
    expect(result.students).toHaveLength(0);
    expect(result.briefing_summary).toBeTruthy();
  });
});
