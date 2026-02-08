import { describe, it, expect, vi, afterEach } from "vitest";
import {
  deriveBelongingStatus,
  matchesFilters,
  hasNoGroups,
  isGroupLeader,
  PersonData,
} from "@/lib/insights/filters";
import type { SegmentFilters } from "@/lib/insights/types";

// ─── Test Helpers ────────────────────────────────────────────────────────────

/** Create a date string N days ago from the faked "now" */
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

function makePerson(overrides: Partial<PersonData> = {}): PersonData {
  return {
    profile_id: "test-id",
    first_name: "Sarah",
    last_name: "Johnson",
    phone_number: "+15551234567",
    email: "sarah@test.com",
    grade: 9,
    gender: "Female",
    role: "student",
    status: "active",
    belonging_status: "connected",
    last_check_in: daysAgo(5),
    check_in_count: 3,
    groups: [{ id: "g1", name: "Youth Group", role: "member" }],
    ...overrides,
  };
}

// ─── deriveBelongingStatus ───────────────────────────────────────────────────

describe("deriveBelongingStatus", () => {
  // Use fake timers so Date.now() is deterministic
  const FIXED_NOW = new Date("2026-02-07T12:00:00Z").getTime();

  function daysAgoFromFixed(n: number): string {
    return new Date(FIXED_NOW - n * 86_400_000).toISOString();
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  function callWith(
    totalCheckIns: number,
    daysAgoVal: number | null,
  ): string | null {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    const lastCheckIn =
      daysAgoVal !== null ? daysAgoFromFixed(daysAgoVal) : null;
    return deriveBelongingStatus(totalCheckIns, lastCheckIn);
  }

  // ── New student cases ──

  it("returns 'new' when totalCheckIns is 0", () => {
    expect(callWith(0, 5)).toBe("new");
  });

  it("returns 'new' when lastCheckIn is null", () => {
    expect(callWith(5, null)).toBe("new");
  });

  it("returns 'new' when both are zero/null", () => {
    expect(callWith(0, null)).toBe("new");
  });

  // ── Ultra-Core ──

  it("returns 'ultra_core' for 10+ checkins within 7 days", () => {
    expect(callWith(10, 3)).toBe("ultra_core");
  });

  it("returns 'ultra_core' at exact boundary: 10 checkins, 7 days", () => {
    expect(callWith(10, 7)).toBe("ultra_core");
  });

  it("does NOT return 'ultra_core' with 9 checkins even if 7 days", () => {
    // 9 checkins, 7 days → falls through to core (>=5, <=14)
    expect(callWith(9, 7)).toBe("core");
  });

  it("does NOT return 'ultra_core' at 10 checkins if 8 days ago", () => {
    // 10 checkins, 8 days → falls through to core (>=5, <=14)
    expect(callWith(10, 8)).toBe("core");
  });

  // ── Core ──

  it("returns 'core' for 5+ checkins within 14 days", () => {
    expect(callWith(5, 10)).toBe("core");
  });

  it("returns 'core' at exact boundary: 5 checkins, 14 days", () => {
    expect(callWith(5, 14)).toBe("core");
  });

  it("does NOT return 'core' with 4 checkins even if 14 days", () => {
    // 4 checkins, 14 days → falls through to connected (<=21)
    expect(callWith(4, 14)).toBe("connected");
  });

  it("does NOT return 'core' at 5 checkins if 15 days ago", () => {
    // 5 checkins, 15 days → falls through to connected (<=21)
    expect(callWith(5, 15)).toBe("connected");
  });

  // ── Connected ──

  it("returns 'connected' at 21 days", () => {
    expect(callWith(2, 21)).toBe("connected");
  });

  it("returns 'connected' at boundary: low checkins, recent", () => {
    expect(callWith(1, 1)).toBe("connected");
  });

  // ── Fringe ──

  it("returns 'fringe' at 22 days", () => {
    expect(callWith(2, 22)).toBe("fringe");
  });

  it("returns 'fringe' at exact boundary: 45 days", () => {
    expect(callWith(2, 45)).toBe("fringe");
  });

  // ── Missing ──

  it("returns 'missing' at 46 days", () => {
    expect(callWith(2, 46)).toBe("missing");
  });

  it("returns 'missing' at 90 days", () => {
    expect(callWith(10, 90)).toBe("missing");
  });

  // ── High checkins but very old ──

  it("returns 'missing' even with many checkins if very old", () => {
    expect(callWith(100, 100)).toBe("missing");
  });
});

// ─── matchesFilters ──────────────────────────────────────────────────────────

describe("matchesFilters", () => {
  it("returns true with empty filters", () => {
    expect(matchesFilters(makePerson(), {})).toBe(true);
  });

  // ── Gender ──

  it("filters by gender: male (matches 'Male')", () => {
    const filters: SegmentFilters = { gender: "male" };
    expect(matchesFilters(makePerson({ gender: "Male" }), filters)).toBe(true);
    expect(matchesFilters(makePerson({ gender: "m" }), filters)).toBe(true);
    expect(matchesFilters(makePerson({ gender: "Female" }), filters)).toBe(
      false,
    );
  });

  it("filters by gender: female (matches 'Female' and 'f')", () => {
    const filters: SegmentFilters = { gender: "female" };
    expect(matchesFilters(makePerson({ gender: "Female" }), filters)).toBe(
      true,
    );
    expect(matchesFilters(makePerson({ gender: "f" }), filters)).toBe(true);
    expect(matchesFilters(makePerson({ gender: "Male" }), filters)).toBe(false);
  });

  it("passes all genders when gender is 'all'", () => {
    const filters: SegmentFilters = { gender: "all" };
    expect(matchesFilters(makePerson({ gender: "Male" }), filters)).toBe(true);
    expect(matchesFilters(makePerson({ gender: "Female" }), filters)).toBe(
      true,
    );
  });

  // ── Grades ──

  it("filters by grades: includes matching grade", () => {
    const filters: SegmentFilters = { grades: { grades: [9, 10] } };
    expect(matchesFilters(makePerson({ grade: 9 }), filters)).toBe(true);
    expect(matchesFilters(makePerson({ grade: 11 }), filters)).toBe(false);
  });

  it("rejects when grade is null and grades filter is present", () => {
    const filters: SegmentFilters = { grades: { grades: [9] } };
    expect(matchesFilters(makePerson({ grade: null }), filters)).toBe(false);
  });

  it("passes all when grades array is empty", () => {
    const filters: SegmentFilters = { grades: { grades: [] } };
    expect(matchesFilters(makePerson({ grade: 9 }), filters)).toBe(true);
  });

  // ── Groups ──

  it("filters by group names (case-insensitive partial match)", () => {
    const filters: SegmentFilters = {
      groups: { groupNames: ["youth"] },
    };
    expect(
      matchesFilters(
        makePerson({
          groups: [{ id: "g1", name: "Youth Group", role: "member" }],
        }),
        filters,
      ),
    ).toBe(true);
    expect(
      matchesFilters(
        makePerson({ groups: [{ id: "g2", name: "Adults", role: "member" }] }),
        filters,
      ),
    ).toBe(false);
  });

  it("rejects when person has no groups and group filter is present", () => {
    const filters: SegmentFilters = {
      groups: { groupNames: ["Youth Group"] },
    };
    expect(matchesFilters(makePerson({ groups: [] }), filters)).toBe(false);
    expect(matchesFilters(makePerson({ groups: undefined }), filters)).toBe(
      false,
    );
  });

  it("filters by group role", () => {
    const filters: SegmentFilters = {
      groups: { groupNames: ["youth"], role: "leader" },
    };
    expect(
      matchesFilters(
        makePerson({
          groups: [{ id: "g1", name: "Youth Group", role: "leader" }],
        }),
        filters,
      ),
    ).toBe(true);
    expect(
      matchesFilters(
        makePerson({
          groups: [{ id: "g1", name: "Youth Group", role: "member" }],
        }),
        filters,
      ),
    ).toBe(false);
  });

  // ── Activity ──

  it("activity filter: active within N days", () => {
    const filters: SegmentFilters = {
      activity: { type: "active", days: 30 },
    };
    expect(
      matchesFilters(makePerson({ last_check_in: daysAgo(10) }), filters),
    ).toBe(true);
    expect(
      matchesFilters(makePerson({ last_check_in: daysAgo(40) }), filters),
    ).toBe(false);
  });

  it("activity filter: inactive beyond N days", () => {
    const filters: SegmentFilters = {
      activity: { type: "inactive", days: 21 },
    };
    // Person who checked in 5 days ago is NOT inactive
    expect(
      matchesFilters(makePerson({ last_check_in: daysAgo(5) }), filters),
    ).toBe(false);
    // Person who checked in 30 days ago IS inactive
    expect(
      matchesFilters(makePerson({ last_check_in: daysAgo(30) }), filters),
    ).toBe(true);
  });

  it("activity filter: never checked in", () => {
    const filters: SegmentFilters = {
      activity: { type: "never" },
    };
    expect(
      matchesFilters(
        makePerson({ last_check_in: null, check_in_count: 0 }),
        filters,
      ),
    ).toBe(true);
    expect(
      matchesFilters(
        makePerson({ last_check_in: daysAgo(5), check_in_count: 3 }),
        filters,
      ),
    ).toBe(false);
  });

  // ── Engagement ──

  it("engagement filter: belonging levels", () => {
    const filters: SegmentFilters = {
      engagement: { belongingLevels: ["core", "ultra_core"] },
    };
    expect(
      matchesFilters(makePerson({ belonging_status: "core" }), filters),
    ).toBe(true);
    expect(
      matchesFilters(makePerson({ belonging_status: "fringe" }), filters),
    ).toBe(false);
  });

  it("engagement filter: min check-ins", () => {
    const filters: SegmentFilters = {
      engagement: { minCheckins: 5 },
    };
    expect(matchesFilters(makePerson({ check_in_count: 10 }), filters)).toBe(
      true,
    );
    expect(matchesFilters(makePerson({ check_in_count: 3 }), filters)).toBe(
      false,
    );
  });

  it("engagement filter: max check-ins", () => {
    const filters: SegmentFilters = {
      engagement: { maxCheckins: 5 },
    };
    expect(matchesFilters(makePerson({ check_in_count: 3 }), filters)).toBe(
      true,
    );
    expect(matchesFilters(makePerson({ check_in_count: 10 }), filters)).toBe(
      false,
    );
  });

  // ── Names ──

  it("filters by firstName (case-insensitive partial match)", () => {
    const filters: SegmentFilters = { firstName: "sar" };
    expect(matchesFilters(makePerson({ first_name: "Sarah" }), filters)).toBe(
      true,
    );
    expect(matchesFilters(makePerson({ first_name: "Mike" }), filters)).toBe(
      false,
    );
  });

  it("filters by lastName (case-insensitive partial match)", () => {
    const filters: SegmentFilters = { lastName: "john" };
    expect(matchesFilters(makePerson({ last_name: "Johnson" }), filters)).toBe(
      true,
    );
    expect(matchesFilters(makePerson({ last_name: "Smith" }), filters)).toBe(
      false,
    );
  });

  it("handles null first_name gracefully", () => {
    const filters: SegmentFilters = { firstName: "test" };
    expect(matchesFilters(makePerson({ first_name: null }), filters)).toBe(
      false,
    );
  });

  // ── Combined ──

  it("applies multiple filters together (AND logic)", () => {
    const filters: SegmentFilters = {
      gender: "female",
      grades: { grades: [9, 10] },
      firstName: "sar",
    };
    // Matches all three
    expect(
      matchesFilters(
        makePerson({ gender: "Female", grade: 9, first_name: "Sarah" }),
        filters,
      ),
    ).toBe(true);
    // Fails gender
    expect(
      matchesFilters(
        makePerson({ gender: "Male", grade: 9, first_name: "Sarah" }),
        filters,
      ),
    ).toBe(false);
    // Fails grade
    expect(
      matchesFilters(
        makePerson({ gender: "Female", grade: 11, first_name: "Sarah" }),
        filters,
      ),
    ).toBe(false);
  });
});

// ─── hasNoGroups ─────────────────────────────────────────────────────────────

describe("hasNoGroups", () => {
  it("returns true when groups is undefined", () => {
    expect(hasNoGroups(makePerson({ groups: undefined }))).toBe(true);
  });

  it("returns true when groups is empty array", () => {
    expect(hasNoGroups(makePerson({ groups: [] }))).toBe(true);
  });

  it("returns false when person has groups", () => {
    expect(
      hasNoGroups(
        makePerson({ groups: [{ id: "g1", name: "Youth", role: "member" }] }),
      ),
    ).toBe(false);
  });
});

// ─── isGroupLeader ───────────────────────────────────────────────────────────

describe("isGroupLeader", () => {
  it("returns true when person is a leader in any group", () => {
    expect(
      isGroupLeader(
        makePerson({
          groups: [{ id: "g1", name: "Youth", role: "leader" }],
        }),
      ),
    ).toBe(true);
  });

  it("returns false when person is only a member", () => {
    expect(
      isGroupLeader(
        makePerson({
          groups: [{ id: "g1", name: "Youth", role: "member" }],
        }),
      ),
    ).toBe(false);
  });

  it("returns false when person has no groups", () => {
    expect(isGroupLeader(makePerson({ groups: [] }))).toBe(false);
    expect(isGroupLeader(makePerson({ groups: undefined }))).toBe(false);
  });
});
