/**
 * AI Insights - Client-Side Filter Application
 *
 * Applies parsed filters to people data fetched from get_organization_people RPC.
 * This keeps student data local - only the filters come from Claude.
 */

import type {
  SegmentFilters,
  Segment,
  PersonResult,
  BelongingLevel,
} from "./types";

/**
 * Person data structure from get_organization_people RPC
 */
export interface PersonData {
  profile_id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  email: string | null;
  grade: number | null;
  gender: string | null;
  role: string;
  status: string;
  belonging_status?: string | null;
  last_check_in?: string | null;
  check_in_count?: number | null;
  groups?: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

/**
 * Map belonging_status from DB to our BelongingLevel type
 */
function mapBelongingStatus(status: string | null | undefined): BelongingLevel | undefined {
  if (!status) return undefined;

  const mapping: Record<string, BelongingLevel> = {
    ultra_core: "ultra_core",
    core: "core",
    connected: "connected",
    fringe: "fringe",
    missing: "missing",
    new: "new",
    // Handle potential variants
    "ultra-core": "ultra_core",
  };

  return mapping[status.toLowerCase()] || undefined;
}

/**
 * Calculate days since a date
 */
function daysSince(dateStr: string | null | undefined): number | undefined {
  if (!dateStr) return undefined;

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if a person matches a single segment's filters
 */
export function matchesFilters(
  person: PersonData,
  filters: SegmentFilters
): boolean {
  // Gender filter
  if (filters.gender && filters.gender !== "all") {
    const personGender = person.gender?.toLowerCase();
    if (filters.gender === "male" && personGender !== "male" && personGender !== "m") {
      return false;
    }
    if (filters.gender === "female" && personGender !== "female" && personGender !== "f") {
      return false;
    }
  }

  // Grade filter
  if (filters.grades?.grades && filters.grades.grades.length > 0) {
    if (person.grade === null || !filters.grades.grades.includes(person.grade)) {
      return false;
    }
  }

  // Group filter
  if (filters.groups?.groupNames && filters.groups.groupNames.length > 0) {
    if (!person.groups || person.groups.length === 0) {
      return false;
    }

    const personGroupNames = person.groups.map((g) => g.name.toLowerCase());
    const filterGroupNames = filters.groups.groupNames.map((n) => n.toLowerCase());

    const matchesAnyGroup = filterGroupNames.some((filterName) =>
      personGroupNames.some(
        (personName) =>
          personName.includes(filterName) || filterName.includes(personName)
      )
    );

    if (!matchesAnyGroup) {
      return false;
    }

    // Role within group
    if (filters.groups.role && filters.groups.role !== "all") {
      const hasCorrectRole = person.groups.some(
        (g) =>
          filterGroupNames.some(
            (fn) => g.name.toLowerCase().includes(fn) || fn.includes(g.name.toLowerCase())
          ) && g.role === filters.groups!.role
      );
      if (!hasCorrectRole) {
        return false;
      }
    }
  }

  // Activity filter
  if (filters.activity) {
    const daysSinceCheckIn = daysSince(person.last_check_in);

    switch (filters.activity.type) {
      case "active": {
        const days = filters.activity.days || 30;
        // Only exclude if we HAVE check-in data and it's outside the range
        // If no check-in data (daysSinceCheckIn === undefined), don't filter out
        // We just can't confirm activity, so include them
        if (daysSinceCheckIn !== undefined && daysSinceCheckIn > days) {
          return false;
        }
        break;
      }
      case "inactive": {
        const days = filters.activity.days || 21;
        if (daysSinceCheckIn !== undefined && daysSinceCheckIn <= days) {
          return false;
        }
        break;
      }
      case "never": {
        if (person.last_check_in !== null && person.check_in_count !== 0) {
          return false;
        }
        break;
      }
    }
  }

  // Engagement filter
  if (filters.engagement) {
    // Belonging level filter
    if (
      filters.engagement.belongingLevels &&
      filters.engagement.belongingLevels.length > 0
    ) {
      const personBelonging = mapBelongingStatus(person.belonging_status);
      if (!personBelonging || !filters.engagement.belongingLevels.includes(personBelonging)) {
        return false;
      }
    }

    // Min check-ins
    if (filters.engagement.minCheckins !== undefined) {
      const count = person.check_in_count || 0;
      if (count < filters.engagement.minCheckins) {
        return false;
      }
    }

    // Max check-ins
    if (filters.engagement.maxCheckins !== undefined && filters.engagement.maxCheckins !== null) {
      const count = person.check_in_count || 0;
      if (count > filters.engagement.maxCheckins) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Filter people data by a segment
 */
export function filterBySegment(
  people: PersonData[],
  segment: Segment
): PersonResult[] {
  return people
    .filter((person) => matchesFilters(person, segment.filters))
    .map((person) => ({
      profileId: person.profile_id,
      firstName: person.first_name || "",
      lastName: person.last_name || "",
      phone: person.phone_number || undefined,
      email: person.email || undefined,
      grade: person.grade || undefined,
      gender: person.gender || undefined,
      belongingLevel: mapBelongingStatus(person.belonging_status),
      lastCheckIn: person.last_check_in || undefined,
      checkInCount: person.check_in_count || undefined,
      groups: person.groups?.map((g) => ({
        id: g.id,
        name: g.name,
        role: g.role as "leader" | "member" | "all",
      })),
    }));
}

/**
 * Get profile IDs matching all segments (for chart data queries)
 */
export function getSegmentProfileIds(
  people: PersonData[],
  segments: Segment[]
): Map<string, string[]> {
  const result = new Map<string, string[]>();

  for (const segment of segments) {
    const matching = people.filter((person) =>
      matchesFilters(person, segment.filters)
    );
    result.set(
      segment.label,
      matching.map((p) => p.profile_id)
    );
  }

  return result;
}

/**
 * Check if a person matches filter criteria for "not in any group"
 */
export function hasNoGroups(person: PersonData): boolean {
  return !person.groups || person.groups.length === 0;
}

/**
 * Check if a person is a group leader (any group)
 */
export function isGroupLeader(person: PersonData): boolean {
  return person.groups?.some((g) => g.role === "leader") || false;
}
