import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("smoke", () => {
  it("vitest runs", () => {
    expect(true).toBe(true);
  });

  it("tsconfig paths resolve — cn returns a string", () => {
    const result = cn("px-4", "py-2");
    expect(typeof result).toBe("string");
    expect(result).toContain("px-4");
    expect(result).toContain("py-2");
  });
});
