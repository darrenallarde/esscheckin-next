import { describe, it, expect } from "vitest";
import { validateInsightsSql } from "@/lib/insights/sql-validator";

// ─── Valid Queries ───────────────────────────────────────────────────────────

describe("validateInsightsSql — valid queries", () => {
  it("accepts a simple SELECT from insights_people", () => {
    const result = validateInsightsSql(
      "SELECT first_name, last_name FROM insights_people",
    );
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("accepts SELECT with WHERE clause", () => {
    const result = validateInsightsSql(
      "SELECT * FROM insights_people WHERE grade = 9 AND gender = 'Male'",
    );
    expect(result.valid).toBe(true);
  });

  it("accepts SELECT with aggregation", () => {
    const result = validateInsightsSql(
      "SELECT grade, COUNT(*) as count FROM insights_people GROUP BY grade ORDER BY count DESC",
    );
    expect(result.valid).toBe(true);
  });

  it("accepts SELECT with subquery referencing insights_people", () => {
    const result = validateInsightsSql(
      "SELECT * FROM insights_people WHERE check_in_count > (SELECT AVG(check_in_count) FROM insights_people)",
    );
    expect(result.valid).toBe(true);
  });

  it("accepts SELECT with CASE expression", () => {
    const result = validateInsightsSql(
      "SELECT CASE WHEN check_in_count > 10 THEN 'active' ELSE 'inactive' END as status FROM insights_people",
    );
    expect(result.valid).toBe(true);
  });

  it("accepts lowercase select", () => {
    const result = validateInsightsSql(
      "select first_name from insights_people",
    );
    expect(result.valid).toBe(true);
  });

  it("accepts query with leading whitespace", () => {
    const result = validateInsightsSql("  SELECT * FROM insights_people  ");
    expect(result.valid).toBe(true);
  });
});

// ─── Empty / Non-SELECT ─────────────────────────────────────────────────────

describe("validateInsightsSql — empty and non-SELECT", () => {
  it("rejects empty string", () => {
    const result = validateInsightsSql("");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("SQL query is empty");
  });

  it("rejects whitespace-only string", () => {
    const result = validateInsightsSql("   ");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("SQL query is empty");
  });

  it("rejects INSERT statement", () => {
    const result = validateInsightsSql(
      "INSERT INTO insights_people (first_name) VALUES ('hacked')",
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Query must be a SELECT statement");
  });

  it("rejects UPDATE statement", () => {
    const result = validateInsightsSql(
      "UPDATE insights_people SET first_name = 'hacked'",
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Query must be a SELECT statement");
  });

  it("rejects DELETE statement", () => {
    const result = validateInsightsSql("DELETE FROM insights_people WHERE 1=1");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Query must be a SELECT statement");
  });
});

// ─── Statement Chaining ─────────────────────────────────────────────────────

describe("validateInsightsSql — statement chaining", () => {
  it("rejects semicolons (multi-statement)", () => {
    const result = validateInsightsSql(
      "SELECT * FROM insights_people; DROP TABLE profiles",
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Multiple statements are not allowed");
  });

  it("rejects trailing semicolon", () => {
    const result = validateInsightsSql("SELECT * FROM insights_people;");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Multiple statements are not allowed");
  });
});

// ─── Comments ────────────────────────────────────────────────────────────────

describe("validateInsightsSql — comments", () => {
  it("rejects line comments (--)", () => {
    const result = validateInsightsSql(
      "SELECT * FROM insights_people -- this is a comment",
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe("SQL comments are not allowed");
  });

  it("rejects block comments (/*)", () => {
    const result = validateInsightsSql(
      "SELECT * FROM insights_people /* sneaky */ WHERE 1=1",
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe("SQL comments are not allowed");
  });
});

// ─── Missing insights_people ────────────────────────────────────────────────

describe("validateInsightsSql — insights_people reference", () => {
  it("rejects query not referencing insights_people", () => {
    const result = validateInsightsSql("SELECT * FROM some_other_table");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Query must reference the insights_people view");
  });
});

// ─── Forbidden Keywords ─────────────────────────────────────────────────────

describe("validateInsightsSql — forbidden keywords", () => {
  it("rejects DROP in a SELECT query", () => {
    const result = validateInsightsSql("SELECT DROP FROM insights_people");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Forbidden keyword");
  });

  it("rejects TRUNCATE", () => {
    const result = validateInsightsSql("SELECT TRUNCATE FROM insights_people");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Forbidden keyword");
  });

  it("rejects GRANT", () => {
    const result = validateInsightsSql("SELECT GRANT FROM insights_people");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Forbidden keyword");
  });

  it("rejects EXECUTE", () => {
    const result = validateInsightsSql("SELECT EXECUTE FROM insights_people");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Forbidden keyword");
  });

  it("rejects COPY", () => {
    const result = validateInsightsSql("SELECT COPY FROM insights_people");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Forbidden keyword");
  });
});

// ─── Blocked Tables ─────────────────────────────────────────────────────────

describe("validateInsightsSql — blocked table references", () => {
  it("rejects auth.users reference", () => {
    const result = validateInsightsSql(
      "SELECT * FROM insights_people JOIN auth.users ON true",
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Direct table access is not allowed");
  });

  it("rejects pg_ system tables", () => {
    const result = validateInsightsSql(
      "SELECT * FROM insights_people WHERE profile_id IN (SELECT usename FROM pg_user)",
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Direct table access is not allowed");
  });

  it("rejects information_schema", () => {
    const result = validateInsightsSql(
      "SELECT * FROM insights_people WHERE 1 IN (SELECT 1 FROM information_schema.tables)",
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Direct table access is not allowed");
  });

  it("rejects direct profiles table", () => {
    const result = validateInsightsSql(
      "SELECT * FROM insights_people JOIN profiles ON true",
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Direct table access is not allowed");
  });

  it("rejects check_ins table", () => {
    const result = validateInsightsSql(
      "SELECT * FROM insights_people JOIN check_ins ON true",
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Direct table access is not allowed");
  });

  it("rejects organization_memberships table", () => {
    const result = validateInsightsSql(
      "SELECT * FROM insights_people JOIN organization_memberships ON true",
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Direct table access is not allowed");
  });

  it("rejects sms_ prefixed tables", () => {
    const result = validateInsightsSql(
      "SELECT * FROM insights_people JOIN sms_messages ON true",
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Direct table access is not allowed");
  });

  it("rejects students table (legacy)", () => {
    const result = validateInsightsSql(
      "SELECT * FROM insights_people JOIN students ON true",
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Direct table access is not allowed");
  });

  it("allows insights_people despite 'profiles' in name", () => {
    // The regex uses negative lookahead (?!_people) so "insights_people" should pass
    const result = validateInsightsSql("SELECT * FROM insights_people");
    expect(result.valid).toBe(true);
  });
});

// ─── SQL Injection Patterns ─────────────────────────────────────────────────

describe("validateInsightsSql — injection patterns", () => {
  it("rejects UNION-based injection when targeting other tables", () => {
    const result = validateInsightsSql(
      "SELECT * FROM insights_people UNION SELECT * FROM profiles",
    );
    expect(result.valid).toBe(false);
    // Blocked by the profiles table check
    expect(result.error).toContain("Direct table access is not allowed");
  });

  it("rejects CREATE TABLE attempt embedded in SELECT", () => {
    const result = validateInsightsSql("SELECT CREATE FROM insights_people");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Forbidden keyword");
  });

  it("rejects ALTER attempt embedded in SELECT", () => {
    const result = validateInsightsSql("SELECT ALTER FROM insights_people");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Forbidden keyword");
  });
});
