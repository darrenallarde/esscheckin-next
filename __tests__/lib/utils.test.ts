import { describe, it, expect } from "vitest";

// ─── SMS Segments ────────────────────────────────────────────────────────────

import {
  countSmsSegments,
  smsCounterText,
  SMS_MAX_LENGTH,
  SMS_SINGLE_SEGMENT,
} from "@/lib/sms-segments";

describe("countSmsSegments", () => {
  it("returns 0 for empty string", () => {
    expect(countSmsSegments("")).toBe(0);
  });

  it("returns 1 for short GSM message", () => {
    expect(countSmsSegments("Hello!")).toBe(1);
  });

  it("returns 1 for exactly 160 GSM characters", () => {
    expect(countSmsSegments("a".repeat(160))).toBe(1);
  });

  it("returns 2 for 161 GSM characters (153 per segment)", () => {
    expect(countSmsSegments("a".repeat(161))).toBe(2);
  });

  it("returns correct count for 306 GSM characters (2 full segments)", () => {
    expect(countSmsSegments("a".repeat(306))).toBe(2);
  });

  it("returns 3 for 307 GSM characters", () => {
    expect(countSmsSegments("a".repeat(307))).toBe(3);
  });

  it("returns 1 for short Unicode message (under 70)", () => {
    expect(countSmsSegments("Hello! 🎉")).toBe(1);
  });

  it("returns 1 for exactly 70 Unicode characters", () => {
    // Emoji "🎉" is 2 chars in JS .length, so 68 + 2 = 70
    expect(countSmsSegments("a".repeat(68) + "🎉")).toBe(1);
  });

  it("returns 2 for Unicode message over 70 chars (67 per segment)", () => {
    // 70 ASCII + 1 emoji = 71 chars with unicode → 2 segments (67 per)
    expect(countSmsSegments("a".repeat(70) + "🎉")).toBe(2);
  });

  it("returns correct count for long Unicode message", () => {
    // 132 ASCII + 2 (emoji) = 134 chars → ceil(134/67) = 2 segments
    expect(countSmsSegments("a".repeat(132) + "🎉")).toBe(2);
    // 133 ASCII + 2 (emoji) = 135 chars → ceil(135/67) = 3 segments
    expect(countSmsSegments("a".repeat(133) + "🎉")).toBe(3);
  });
});

describe("smsCounterText", () => {
  it("shows 'X / 160' for short messages", () => {
    const result = smsCounterText("Hello");
    expect(result.text).toBe("5 / 160");
    expect(result.isOverLimit).toBe(false);
    expect(result.isMultiSegment).toBe(false);
  });

  it("shows 'X / 160' for exactly 160 chars", () => {
    const result = smsCounterText("a".repeat(160));
    expect(result.text).toBe("160 / 160");
    expect(result.isOverLimit).toBe(false);
    expect(result.isMultiSegment).toBe(false);
  });

  it("shows segment count for multi-segment messages", () => {
    const result = smsCounterText("a".repeat(200));
    expect(result.text).toContain("200");
    expect(result.text).toContain("segments");
    expect(result.isOverLimit).toBe(false);
    expect(result.isMultiSegment).toBe(true);
  });

  it("shows over-limit message for messages over 1600 chars", () => {
    const result = smsCounterText("a".repeat(1601));
    expect(result.text).toContain("message too long");
    expect(result.isOverLimit).toBe(true);
    expect(result.isMultiSegment).toBe(true);
  });

  it("shows empty counter for empty string", () => {
    const result = smsCounterText("");
    expect(result.text).toBe("0 / 160");
    expect(result.isOverLimit).toBe(false);
    expect(result.isMultiSegment).toBe(false);
  });
});

// ─── Navigation ──────────────────────────────────────────────────────────────

import {
  orgPath,
  isProtectedOrgRoute,
  extractOrgSlugFromPath,
  extractRouteFromPath,
} from "@/lib/navigation";

describe("orgPath", () => {
  it("generates path with org slug", () => {
    expect(orgPath("echo-students", "/home")).toBe("/echo-students/home");
  });

  it("normalizes path without leading slash", () => {
    expect(orgPath("echo-students", "home")).toBe("/echo-students/home");
  });

  it("returns bare path when slug is null", () => {
    expect(orgPath(null, "/home")).toBe("/home");
  });

  it("returns bare path when slug is undefined", () => {
    expect(orgPath(undefined, "/home")).toBe("/home");
  });

  it("handles nested paths", () => {
    expect(orgPath("my-org", "/settings/team")).toBe("/my-org/settings/team");
  });
});

describe("isProtectedOrgRoute", () => {
  it("returns true for /dashboard", () => {
    expect(isProtectedOrgRoute("/dashboard")).toBe(true);
  });

  it("returns true for /settings/team", () => {
    expect(isProtectedOrgRoute("/settings/team")).toBe(true);
  });

  it("returns true for /students", () => {
    expect(isProtectedOrgRoute("/students")).toBe(true);
  });

  it("returns false for /auth", () => {
    expect(isProtectedOrgRoute("/auth")).toBe(false);
  });

  it("returns false for root /", () => {
    expect(isProtectedOrgRoute("/")).toBe(false);
  });

  it("returns false for /admin", () => {
    expect(isProtectedOrgRoute("/admin")).toBe(false);
  });
});

describe("extractOrgSlugFromPath", () => {
  it("extracts slug from org-prefixed path", () => {
    expect(extractOrgSlugFromPath("/echo-students/dashboard")).toBe(
      "echo-students",
    );
  });

  it("returns null for public routes", () => {
    expect(extractOrgSlugFromPath("/auth")).toBeNull();
    expect(extractOrgSlugFromPath("/setup")).toBeNull();
    expect(extractOrgSlugFromPath("/admin")).toBeNull();
    expect(extractOrgSlugFromPath("/api/something")).toBeNull();
  });

  it("returns null for empty path", () => {
    expect(extractOrgSlugFromPath("/")).toBeNull();
  });

  it("handles _next paths", () => {
    expect(extractOrgSlugFromPath("/_next/static/chunk.js")).toBeNull();
  });
});

describe("extractRouteFromPath", () => {
  it("extracts route from org-prefixed path", () => {
    expect(extractRouteFromPath("/echo-students/dashboard")).toBe("/dashboard");
  });

  it("returns / for single-segment path", () => {
    expect(extractRouteFromPath("/echo-students")).toBe("/");
  });

  it("extracts nested route", () => {
    expect(extractRouteFromPath("/my-org/settings/team")).toBe(
      "/settings/team",
    );
  });
});

// ─── Themes ──────────────────────────────────────────────────────────────────

import { hexToHSL, getTheme, getJRPGColors, THEMES } from "@/lib/themes";

describe("hexToHSL", () => {
  it("converts pure red (#FF0000)", () => {
    const hsl = hexToHSL("#FF0000");
    expect(hsl).toBe("0 100% 50%");
  });

  it("converts pure green (#00FF00)", () => {
    const hsl = hexToHSL("#00FF00");
    expect(hsl).toBe("120 100% 50%");
  });

  it("converts pure blue (#0000FF)", () => {
    const hsl = hexToHSL("#0000FF");
    expect(hsl).toBe("240 100% 50%");
  });

  it("converts white (#FFFFFF)", () => {
    const hsl = hexToHSL("#FFFFFF");
    expect(hsl).toBe("0 0% 100%");
  });

  it("converts black (#000000)", () => {
    const hsl = hexToHSL("#000000");
    expect(hsl).toBe("0 0% 0%");
  });

  it("converts gray (#808080) — achromatic", () => {
    const hsl = hexToHSL("#808080");
    expect(hsl).toBe("0 0% 50%");
  });

  it("handles hex without # prefix", () => {
    const hsl = hexToHSL("FF0000");
    expect(hsl).toBe("0 100% 50%");
  });
});

describe("getTheme", () => {
  it("returns default theme for null", () => {
    const theme = getTheme(null);
    expect(theme.id).toBe("default");
    expect(theme.name).toBe("Seedling");
  });

  it("returns default theme for undefined", () => {
    const theme = getTheme(undefined);
    expect(theme.id).toBe("default");
  });

  it("returns default theme for unknown ID", () => {
    const theme = getTheme("nonexistent");
    expect(theme.id).toBe("default");
  });

  it("returns ocean theme", () => {
    const theme = getTheme("ocean");
    expect(theme.id).toBe("ocean");
    expect(theme.name).toBe("Ocean");
  });

  it("returns berry theme", () => {
    const theme = getTheme("berry");
    expect(theme.id).toBe("berry");
    expect(theme.primary).toBe("#EC4899");
  });

  it("all themes have required fields", () => {
    for (const theme of Object.values(THEMES)) {
      expect(theme.id).toBeTruthy();
      expect(theme.name).toBeTruthy();
      expect(theme.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.sidebarBackground).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.background).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe("getJRPGColors", () => {
  it("returns default JRPG colors for null", () => {
    const colors = getJRPGColors(null);
    expect(colors.bgGradient).toHaveLength(3);
    expect(colors.buttonBg).toHaveLength(2);
  });

  it("returns default JRPG colors for undefined", () => {
    const colors = getJRPGColors(undefined);
    expect(colors.bgGradient[0]).toBe("#87CEEB");
  });

  it("returns ocean JRPG colors", () => {
    const colors = getJRPGColors("ocean");
    expect(colors.bgGradient[0]).toBe("#4FC3F7");
  });

  it("returns default for unknown theme", () => {
    const colors = getJRPGColors("nonexistent");
    expect(colors.bgGradient[0]).toBe("#87CEEB");
  });
});
