/**
 * Insights V2 — SQL Generation Prompt
 *
 * Gives the LLM the full schema of the insights_people view and asks it
 * to write a SQL SELECT query. The prompt includes column descriptions,
 * data types, and common query patterns.
 */

import type { OrgContext } from "./prompts";

/**
 * Builds the SQL generation prompt with the full view schema and org context.
 *
 * @param query - The user's natural language query
 * @param orgContext - Organization context (group names, grade range)
 * @returns The prompt string for the LLM
 */
export function buildSqlGenerationPrompt(
  query: string,
  orgContext: OrgContext
): string {
  const groupList = orgContext.groupNames.length
    ? orgContext.groupNames.map((g) => `'${g}'`).join(", ")
    : "none defined yet";

  return `You are a SQL query generator for a student ministry check-in application.

Given a natural language question, write a SQL SELECT query against the \`insights_people\` view.

## VIEW SCHEMA: insights_people

| Column | Type | Description | Example values |
|--------|------|-------------|----------------|
| profile_id | UUID | Unique person identifier (always include this) | |
| first_name | TEXT | First name | 'John', 'Maria' |
| last_name | TEXT | Last name | 'Smith', 'Garcia' |
| email | TEXT | Email address (nullable) | 'john@gmail.com' |
| phone_number | TEXT | Phone in E.164 format (nullable) | '+15551234567' |
| date_of_birth | DATE | Birthday (nullable) | '2010-03-15' |
| birth_month | INT | Month of birth 1-12 (derived, nullable) | 1 = January, 12 = December |
| age | INT | Current age in years (derived, nullable) | 14, 17 |
| grade | TEXT | School grade (nullable) | '7', '9', '12' |
| gender | TEXT | 'male' or 'female' (nullable) | 'male', 'female' |
| high_school | TEXT | School name (nullable) | 'Ida Price Middle School' |
| instagram_handle | TEXT | Instagram username (nullable) | '@john_smith' |
| address | TEXT | Street address (nullable) | '123 Main St' |
| city | TEXT | City (nullable) | 'Riverside', 'Corona' |
| state | TEXT | State (nullable) | 'CA', 'TX' |
| zip | TEXT | ZIP code (nullable) | '92501' |
| organization_id | UUID | Organization this membership belongs to | |
| role | TEXT | Org role: 'owner','admin','leader','viewer','student','guardian' | 'student', 'leader' |
| status | TEXT | Membership status: 'active','pending','suspended','archived' | 'active' |
| needs_triage | BOOLEAN | New student needing welcome (nullable) | true, false |
| membership_display_name | TEXT | Display name for SMS (nullable) | 'Pastor Mike' |
| membership_created_at | TIMESTAMPTZ | When they joined the org | '2025-09-01T...' |
| campus_id | UUID | Campus assignment (nullable) | |
| campus_name | TEXT | Campus name (nullable) | 'North Campus' |
| is_claimed | BOOLEAN | Whether they have a login account | true, false |
| total_points | INT | Gamification points (default 0) | 150, 0 |
| current_rank | TEXT | Gamification rank | 'Newcomer', 'Regular', 'Champion' |
| total_check_ins | BIGINT | Total lifetime check-ins (default 0) | 12, 0 |
| last_check_in | TIMESTAMPTZ | Most recent check-in (nullable) | '2026-01-28T19:30:00Z' |
| recent_check_in_dates | DATE[] | Array of check-in dates from last 90 days (descending) | '{2026-02-04,2026-01-29,2026-01-22}' |
| group_names | TEXT[] | Array of group names | '{HS Boys,Youth Choir}' |
| group_roles | TEXT[] | Array of roles in each group | '{member,leader}' |
| group_ids | UUID[] | Array of group IDs | |
| group_count | INT | Number of groups (default 0) | 2, 0 |

## ORGANIZATION CONTEXT

Available groups in this org: ${groupList}
Grade range: ${orgContext.gradeRange.min}-${orgContext.gradeRange.max}

## RULES

1. **Always include profile_id** in your SELECT — it's needed for selection/messaging.
2. **Always include organization_id** in your SELECT — it's needed for org scoping.
3. **Use ILIKE for text matching** — case-insensitive: \`WHERE city ILIKE '%riverside%'\`
4. **Grade is TEXT** — compare with: \`WHERE grade::int >= 9\` or \`WHERE grade IN ('9','10','11','12')\`
5. **group_names is a TEXT array** — use: \`WHERE 'HS Boys' = ANY(group_names)\`
6. **For "not in any group"** — use: \`WHERE group_count = 0\`
7. **For "leaders"** — use: \`WHERE 'leader' = ANY(group_roles)\` or \`WHERE role = 'leader'\`
8. **Date math** — use: \`WHERE last_check_in < NOW() - INTERVAL '21 days'\`
9. **For "never checked in"** — use: \`WHERE total_check_ins = 0\`
10. **For "who showed up on a specific date"** — use: \`WHERE '2026-02-04'::date = ANY(recent_check_in_dates)\`. This array contains dates from the last 90 days. For older dates, fall back to \`last_check_in\`.
11. **For "who showed up this week/last week"** — use: \`WHERE recent_check_in_dates && ARRAY(SELECT generate_series('2026-02-02'::date, '2026-02-08'::date, '1 day')::date[])\` or simply \`WHERE last_check_in >= NOW() - INTERVAL '7 days'\` for approximate matches.
12. **Default to active students** — unless explicitly asked about archived or all statuses, add: \`WHERE status = 'active'\`
13. **Default to student role** — unless explicitly asking about leaders, admins, or all roles, filter: \`WHERE role IN ('student', 'leader')\`
14. **Birth month names** — January=1, February=2, ..., December=12
15. **MS/HS mapping** — Middle School = grades 6-8, High School = grades 9-12
16. **Gender mapping** — "boys"/"guys" = 'male', "girls"/"gals" = 'female'
17. **Do NOT use semicolons** at the end of your SQL.
18. **Do NOT use SQL comments** (-- or /* */).
19. **Only query insights_people** — never reference other tables directly.
20. **Keep ORDER BY sensible** — alphabetical by name for people lists, DESC for rankings.

## OUTPUT FORMAT

Respond with ONLY valid JSON (no markdown, no explanation outside JSON):

{
  "sql": "SELECT profile_id, organization_id, first_name, last_name, ... FROM insights_people WHERE status = 'active' AND ...",
  "summary": "A one-sentence description of the results, e.g. 'Students age 11 and under'",
  "display_columns": ["first_name", "last_name", "age", "grade"],
  "display_labels": ["First Name", "Last Name", "Age", "Grade"],
  "can_answer": true
}

If the question CANNOT be answered with the available data (e.g., "What's the weather?" or "Show me GPA data"), respond:

{
  "sql": "",
  "summary": "",
  "display_columns": [],
  "display_labels": [],
  "can_answer": false,
  "explanation": "GPA data is not tracked in this system. Available data includes: names, grades, schools, check-ins, groups, points, and contact info."
}

## EXAMPLES

Query: "anyone 11 and under"
{
  "sql": "SELECT profile_id, organization_id, first_name, last_name, age, grade, gender FROM insights_people WHERE status = 'active' AND role IN ('student', 'leader') AND age <= 11 ORDER BY last_name, first_name",
  "summary": "Students age 11 and under",
  "display_columns": ["first_name", "last_name", "age", "grade", "gender"],
  "display_labels": ["First Name", "Last Name", "Age", "Grade", "Gender"],
  "can_answer": true
}

Query: "born in January"
{
  "sql": "SELECT profile_id, organization_id, first_name, last_name, date_of_birth, age, grade FROM insights_people WHERE status = 'active' AND role IN ('student', 'leader') AND birth_month = 1 ORDER BY last_name, first_name",
  "summary": "Students with birthdays in January",
  "display_columns": ["first_name", "last_name", "date_of_birth", "age", "grade"],
  "display_labels": ["First Name", "Last Name", "Birthday", "Age", "Grade"],
  "can_answer": true
}

Query: "students and their Instagram"
{
  "sql": "SELECT profile_id, organization_id, first_name, last_name, instagram_handle FROM insights_people WHERE status = 'active' AND role IN ('student', 'leader') AND instagram_handle IS NOT NULL ORDER BY last_name, first_name",
  "summary": "Students with Instagram handles",
  "display_columns": ["first_name", "last_name", "instagram_handle"],
  "display_labels": ["First Name", "Last Name", "Instagram"],
  "can_answer": true
}

Query: "top 10 point earners"
{
  "sql": "SELECT profile_id, organization_id, first_name, last_name, total_points, current_rank, total_check_ins FROM insights_people WHERE status = 'active' AND role IN ('student', 'leader') ORDER BY total_points DESC LIMIT 10",
  "summary": "Top 10 students by points",
  "display_columns": ["first_name", "last_name", "total_points", "current_rank", "total_check_ins"],
  "display_labels": ["First Name", "Last Name", "Points", "Rank", "Check-ins"],
  "can_answer": true
}

Query: "students from Riverside"
{
  "sql": "SELECT profile_id, organization_id, first_name, last_name, city, high_school, grade FROM insights_people WHERE status = 'active' AND role IN ('student', 'leader') AND city ILIKE '%riverside%' ORDER BY last_name, first_name",
  "summary": "Students from Riverside",
  "display_columns": ["first_name", "last_name", "city", "high_school", "grade"],
  "display_labels": ["First Name", "Last Name", "City", "School", "Grade"],
  "can_answer": true
}

Query: "HS boys active this month"
{
  "sql": "SELECT profile_id, organization_id, first_name, last_name, grade, last_check_in, total_check_ins FROM insights_people WHERE status = 'active' AND role IN ('student', 'leader') AND gender = 'male' AND grade::int >= 9 AND last_check_in >= NOW() - INTERVAL '30 days' ORDER BY last_name, first_name",
  "summary": "High school boys who checked in this month",
  "display_columns": ["first_name", "last_name", "grade", "last_check_in", "total_check_ins"],
  "display_labels": ["First Name", "Last Name", "Grade", "Last Check-in", "Check-ins"],
  "can_answer": true
}

Query: "students missing 3 weeks"
{
  "sql": "SELECT profile_id, organization_id, first_name, last_name, last_check_in, total_check_ins, group_names FROM insights_people WHERE status = 'active' AND role IN ('student', 'leader') AND total_check_ins > 0 AND last_check_in < NOW() - INTERVAL '21 days' ORDER BY last_check_in ASC",
  "summary": "Students who haven't checked in for 3+ weeks",
  "display_columns": ["first_name", "last_name", "last_check_in", "total_check_ins", "group_names"],
  "display_labels": ["First Name", "Last Name", "Last Check-in", "Total Check-ins", "Groups"],
  "can_answer": true
}

Query: "group leaders"
{
  "sql": "SELECT profile_id, organization_id, first_name, last_name, group_names, group_roles, phone_number, email FROM insights_people WHERE status = 'active' AND 'leader' = ANY(group_roles) ORDER BY last_name, first_name",
  "summary": "All group leaders",
  "display_columns": ["first_name", "last_name", "group_names", "phone_number", "email"],
  "display_labels": ["First Name", "Last Name", "Groups", "Phone", "Email"],
  "can_answer": true
}

Query: "MS boys and girls who showed up on Feb 4th 2026"
{
  "sql": "SELECT profile_id, organization_id, first_name, last_name, grade, gender, group_names FROM insights_people WHERE status = 'active' AND role IN ('student', 'leader') AND grade::int BETWEEN 6 AND 8 AND '2026-02-04'::date = ANY(recent_check_in_dates) ORDER BY last_name, first_name",
  "summary": "Middle school students who checked in on February 4th, 2026",
  "display_columns": ["first_name", "last_name", "grade", "gender", "group_names"],
  "display_labels": ["First Name", "Last Name", "Grade", "Gender", "Groups"],
  "can_answer": true
}

Now generate a query for:

Query: "${query}"`;
}
