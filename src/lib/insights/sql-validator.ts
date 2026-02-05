/**
 * Insights V2 — SQL Validator
 *
 * TypeScript-level validation of LLM-generated SQL before it reaches the database.
 * This is Layer 2 of 4 in the safety model. The database RPC (Layer 3+4) provides
 * additional validation, but catching issues here gives better error messages.
 */

export interface SqlValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Dangerous SQL keywords that should never appear in an insights query.
 */
const FORBIDDEN_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "ALTER",
  "CREATE",
  "TRUNCATE",
  "GRANT",
  "REVOKE",
  "COPY",
  "EXECUTE",
  "EXEC",
  "CALL",
  "\\bDO\\b",
  "SET\\s+",
  "LOCK",
  "VACUUM",
  "REINDEX",
  "CLUSTER",
  "COMMENT\\s+ON",
  "SECURITY",
  "OWNER",
];

/**
 * Direct table references that bypass the insights_people view.
 */
const BLOCKED_TABLES = [
  "auth\\.",
  "pg_",
  "information_schema",
  // Match "profiles" but not "insights_people" or "student_profiles" in the view
  "\\bprofiles\\b(?!_people)",
  "\\borganization_memberships\\b",
  "\\bstudent_profiles\\b",
  "\\bcheck_ins\\b",
  "\\bstudent_game_stats\\b",
  "\\bgroup_memberships\\b",
  "\\borganizations\\b",
  "\\bsms_",
  "\\bgame_transactions\\b",
  "\\bstudent_achievements\\b",
  "\\borganization_members\\b",
  "\\bstudents\\b",
  "\\bcampuses\\b",
  "\\borganization_invitations\\b",
];

/**
 * Validates a SQL query for safety before sending to the database RPC.
 *
 * @param sql - The SQL query to validate
 * @returns Validation result with error message if invalid
 */
export function validateInsightsSql(sql: string): SqlValidationResult {
  const trimmed = sql.trim();

  // Must not be empty
  if (!trimmed) {
    return { valid: false, error: "SQL query is empty" };
  }

  // Must start with SELECT
  if (!/^SELECT\b/i.test(trimmed)) {
    return { valid: false, error: "Query must be a SELECT statement" };
  }

  // No semicolons (prevents statement chaining)
  if (trimmed.includes(";")) {
    return {
      valid: false,
      error: "Multiple statements are not allowed",
    };
  }

  // No SQL comments
  if (trimmed.includes("--") || trimmed.includes("/*")) {
    return { valid: false, error: "SQL comments are not allowed" };
  }

  // Must reference insights_people
  if (!/insights_people/i.test(trimmed)) {
    return {
      valid: false,
      error: "Query must reference the insights_people view",
    };
  }

  // Check for forbidden keywords
  const upper = trimmed.toUpperCase();
  for (const keyword of FORBIDDEN_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(upper)) {
      return {
        valid: false,
        error: `Forbidden keyword detected: ${keyword.replace(/\\[bsS+]/g, "")}`,
      };
    }
  }

  // Check for blocked table references
  const lower = trimmed.toLowerCase();
  for (const table of BLOCKED_TABLES) {
    const regex = new RegExp(table, "i");
    if (regex.test(lower)) {
      return {
        valid: false,
        error: "Direct table access is not allowed — query must use insights_people view only",
      };
    }
  }

  return { valid: true };
}
