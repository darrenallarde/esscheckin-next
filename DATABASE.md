# Database Schema Documentation

This document explains the database structure, key functions, and design decisions for the ESS Check-in System.

## Overview

The system uses PostgreSQL (via Supabase) with Row Level Security (RLS) policies for data protection. All tables use UUID primary keys and timestamp tracking.

---

## Core Tables

### `students`

**Purpose:** Store student records with contact info and profile data

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `first_name` | text | Student's first name (required) |
| `last_name` | text | Student's last name (required) |
| `phone_number` | text | Primary contact phone (searchable) |
| `email` | text | Email address (optional) |
| `grade` | text | Current grade level (e.g., "7", "12") |
| `high_school` | text | School name (optional) |
| `parent_name` | text | Parent/guardian name (optional) |
| `parent_phone` | text | Parent/guardian phone (optional) |
| `profile_pin` | text | 4-digit PIN for profile access |
| `user_type` | text | Default 'student', historical field |
| `created_at` | timestamptz | Record creation timestamp |
| `address` | text | Student address (optional) |
| `city` | text | City (optional) |
| `state` | text | State (optional) |
| `zip_code` | text | ZIP code (optional) |

**Indexes:**
- `students_phone_number_idx` - GIN trigram index for fuzzy phone search
- `students_name_idx` - GIN trigram index for fuzzy name search

**RLS Policies:**
- Public read access (needed for check-in search)
- Admins can insert/update/delete
- Students can view own profile

---

### `check_ins`

**Purpose:** Record student check-in events (one per student per day)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `student_id` | uuid | Foreign key to students.id |
| `checked_in_at` | timestamptz | Check-in timestamp (defaults to now()) |
| `created_at` | timestamptz | Record creation timestamp |

**Constraints:**
- `unique_checkin_per_day` - UNIQUE (student_id, DATE(checked_in_at))
  - Ensures idempotent check-ins (max one per day per student)

**RLS Policies:**
- **No public read access** (security: check-ins are private)
- Admins can read/insert/update/delete
- Check-in function uses SECURITY DEFINER to bypass RLS

**Important:** This table is locked down for privacy. Check-in data is only accessible to admins or via secure RPC functions.

---

### `user_roles`

**Purpose:** Role-based access control for authentication

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key (auto-generated) |
| `user_id` | uuid | Foreign key to auth.users(id) - references the actual user |
| `role` | text | Role name: 'admin', 'super_admin', 'student_leader', 'student' |
| `created_at` | timestamptz | Role assignment timestamp |

**Important:** Users can have multiple roles. The application selects the highest permission level (super_admin > admin > student_leader > student).

**RLS Policies:**
- Admins can read all roles
- Users can read own role
- Super admins can insert/update/delete

---

## Gamification Tables

### `achievements`

**Purpose:** Define available achievements and their tiers

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | text | Achievement name (e.g., "Faithful Attendee") |
| `description` | text | What the achievement means |
| `category` | text | Type: 'attendance', 'milestone', 'special' |
| `tier` | text | Rarity: 'Bronze', 'Silver', 'Gold', 'Platinum' |
| `icon` | text | Emoji or icon identifier |
| `points_value` | integer | Points awarded when earned |
| `requirement_type` | text | How to earn: 'checkin_count', 'streak', 'first_checkin' |
| `requirement_value` | integer | Threshold (e.g., 5 check-ins, 3 week streak) |
| `created_at` | timestamptz | Achievement creation timestamp |

**Example Achievements:**
- "Welcome to the Family" (Bronze, 10 pts) - First check-in
- "3 Week Streak" (Silver, 30 pts) - 3 consecutive weeks
- "Faithful Attendee" (Gold, 100 pts) - 10 total check-ins

---

### `student_achievements`

**Purpose:** Track which students have earned which achievements

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `student_id` | uuid | Foreign key to students.id |
| `achievement_id` | uuid | Foreign key to achievements.id |
| `earned_at` | timestamptz | When the achievement was earned |
| `points_earned` | integer | Points awarded (cached from achievement) |
| `created_at` | timestamptz | Record creation timestamp |

**Constraints:**
- UNIQUE (student_id, achievement_id) - Can't earn same achievement twice

---

### `student_stats`

**Purpose:** Store cumulative gamification stats for each student

| Column | Type | Description |
|--------|------|-------------|
| `student_id` | uuid | Primary key, foreign key to students.id |
| `total_points` | integer | Lifetime points earned (default 0) |
| `total_checkins` | integer | Total check-ins (default 0) |
| `current_streak` | integer | Current weekly streak (default 0) |
| `longest_streak` | integer | Longest streak ever (default 0) |
| `rank` | text | Current rank title (e.g., "Adventurer") |
| `last_checkin` | timestamptz | Most recent check-in date |
| `updated_at` | timestamptz | Last stats update timestamp |

**Ranks by Points:**
- 0-49: "Newcomer"
- 50-149: "Adventurer"
- 150-299: "Warrior"
- 300-599: "Champion"
- 600+: "Legend"

---

## Pastoral Care Tables

### `curriculum_weeks`

**Purpose:** Store weekly teaching curriculum for context-aware recommendations

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `series_name` | text | Teaching series name (e.g., "Identity in Christ") |
| `week_number` | integer | Week number in series |
| `topic_title` | text | This week's topic |
| `main_scripture` | text | Primary Bible passage |
| `big_idea` | text | One-sentence takeaway |
| `key_biblical_principle` | text | Core truth being taught |
| `application_challenge` | text | Practical application |
| `core_truths` | text[] | Array of key truths |
| `faith_skills` | text[] | Array of skills being developed |
| `discussion_questions` | text[] | Small group questions (optional) |
| `is_current` | boolean | TRUE if this is the active week |
| `teaching_date` | date | When this was taught |
| `created_at` | timestamptz | Record creation timestamp |

**Usage:** Only one curriculum week should have `is_current = true` at a time. AI recommendations use this to provide context-aware pastoral guidance.

---

### `ai_recommendations`

**Purpose:** Store AI-generated pastoral recommendations with history tracking

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `student_id` | uuid | Foreign key to students.id |
| `curriculum_week_id` | uuid | Foreign key to curriculum_weeks.id (optional) |
| `key_insight` | text | One-sentence key insight about this student (max 120 chars) |
| `action_bullets` | text[] | 3 specific action items (max 80 chars each) |
| `context_paragraph` | text | 2-4 sentence explanation of WHY these actions matter |
| `engagement_status` | text | Belonging status at time of generation |
| `days_since_last_seen` | integer | Days since last check-in (cached) |
| `generated_at` | timestamptz | When recommendation was created |
| `dismissed_at` | timestamptz | When user dismissed this recommendation (null if active) |
| `created_at` | timestamptz | Record creation timestamp |

**History Tracking:** Old recommendations are kept (not deleted) so you can see progression over time. Only the most recent non-dismissed recommendation is shown on pastoral cards.

---

### `student_profiles_extended`

**Purpose:** Extended profile information for richer AI context

| Column | Type | Description |
|--------|------|-------------|
| `student_id` | uuid | Primary key, foreign key to students.id |
| `interests` | text[] | Array of interests/hobbies |
| `prayer_requests` | text | Current prayer requests |
| `notes` | text | Admin notes about student |
| `gender` | text | 'Male', 'Female', or null |
| `date_of_birth` | date | Birth date (optional) |
| `updated_at` | timestamptz | Last update timestamp |

**Privacy:** This table is admin-only. Gender and grade inform age-appropriate AI recommendations.

---

## Key Database Functions

### Check-in Functions

#### `search_student_for_checkin(search_term TEXT)`

**Purpose:** Flexible search by phone, name, or email with fuzzy matching

**Returns:** Array of matching students

**Logic:**
1. Cleans phone input (removes formatting: dashes, spaces, parentheses, dots)
2. Uses PostgreSQL trigram similarity for fuzzy matching
3. Searches across phone_number, first_name, last_name, email
4. Orders by similarity score (best matches first)
5. Limits to top 10 results

**Usage:**
```sql
SELECT * FROM search_student_for_checkin('(555) 123-4567');
SELECT * FROM search_student_for_checkin('john');
SELECT * FROM search_student_for_checkin('john@example.com');
```

---

#### `checkin_student(p_student_id UUID)`

**Purpose:** Idempotent check-in with automatic PIN generation

**Returns:** Object with:
- `checkin_id` (uuid) - ID of check-in record
- `profile_pin` (text) - 4-digit PIN for profile access
- `is_new_checkin` (boolean) - TRUE if new, FALSE if duplicate today

**Logic:**
1. Checks if student already checked in today
2. If yes: returns existing check-in ID and PIN
3. If no: creates new check-in record
4. Ensures student has profile_pin (generates 4-digit PIN if missing)
5. Returns check-in details

**Security:** Uses `SECURITY DEFINER` to bypass RLS policies (needed for public check-in kiosk)

**Usage:**
```sql
SELECT * FROM checkin_student('student-uuid-here');
```

---

#### `import_historical_checkin(p_phone TEXT, p_checked_in_at TIMESTAMPTZ, p_found_name TEXT)`

**Purpose:** Import historical check-ins from CSV (for data migration)

**Returns:** Object with status and details

**Logic:**
1. Searches for student by phone number
2. If found: creates historical check-in with provided timestamp
3. Handles idempotency (won't create duplicates for same day)
4. Returns success/failure status

**Usage:**
```sql
SELECT * FROM import_historical_checkin('555-123-4567', '2024-01-15 19:00:00', 'John Doe');
```

---

### Gamification Functions

#### `process_checkin_rewards(p_student_id UUID, p_checkin_id UUID)`

**Purpose:** Calculate and award achievements/points for a check-in

**Returns:** JSONB with:
- `points_earned` - Total points from this check-in
- `new_achievements` - Array of newly earned achievements
- `new_rank` - Updated rank (if changed)

**Logic:**
1. Calls `get_or_create_student_stats()` to ensure stats exist
2. Updates total check-ins counter
3. Calculates current streak (consecutive weeks)
4. Checks all achievement requirements
5. Awards new achievements (prevents duplicates)
6. Updates total points
7. Recalculates rank based on new point total
8. Returns summary of rewards

**Called automatically after every check-in by frontend**

---

#### `get_or_create_student_stats(p_student_id UUID)`

**Purpose:** Ensure student_stats record exists (idempotent initialization)

**Returns:** UUID of stats record

**Logic:**
1. Checks if record exists in student_stats
2. If not: creates one with default values (0 points, 0 check-ins, "Newcomer" rank)
3. Returns student_id (which is also the primary key)

**Usage:** Called internally by `process_checkin_rewards`, but can be called manually

---

### Pastoral Analytics Function

#### `get_pastoral_analytics()`

**Purpose:** Calculate comprehensive engagement analytics for ALL students

**Returns:** Table with one row per student containing:
- Basic info (name, contact, grade, school)
- Belonging status (Ultra-Core, Core, Connected, On the Fringe, Missing)
- Check-in counts (8 weeks, last 4 weeks, Wed/Sun breakdown)
- Days since last seen
- Attendance pattern (JSONB array of 8 weekly boxes)
- Recommended pastoral action (e.g., "REACH OUT NOW", "DEVELOP")
- Action message template (copyable outreach message)
- Priority score (higher = more urgent)

**Belonging Status Logic:**
```
Missing: Not seen in 60+ days OR never checked in
On the Fringe: Not seen in 30-60 days
Ultra-Core: 5+ check-ins in last 4 weeks
Core: 4+ check-ins in 8 weeks (~1x/week)
Connected: 2-3 check-ins in 8 weeks
Otherwise: On the Fringe (seen recently but inconsistent)
```

**Attendance Pattern Format:**
```json
[
  { "week_start": "2024-09-01", "days_attended": 2 },
  { "week_start": "2024-09-08", "days_attended": 1 },
  { "week_start": "2024-09-15", "days_attended": 0 },
  ...
]
```
- `days_attended = 0`: Grey box with X (no attendance)
- `days_attended = 1`: Grey box with green check (attended once)
- `days_attended >= 2`: Full green box with white check (multiple attendance)

**Performance:** Uses LATERAL joins to prevent cartesian product. Optimized for ~100-500 students. For larger datasets, consider materializing results.

**Security:** Uses `SECURITY DEFINER` to access check_ins table (which is locked down via RLS)

**Source:** See `/sql-fixes/update-ultra-core-threshold.sql` for full implementation

---

### Profile Functions

#### `verify_profile_pin(p_student_id UUID, p_pin TEXT)`

**Purpose:** Verify a student's 4-digit PIN for profile access

**Returns:** BOOLEAN (true if correct, false if wrong)

**Usage:**
```sql
SELECT verify_profile_pin('student-uuid', '1234');
```

---

#### `generate_profile_pin()`

**Purpose:** Generate a random 4-digit PIN

**Returns:** TEXT (4-digit string like '7392')

**Logic:** Uses random() to generate number between 1000-9999

**Note:** Automatically called by `checkin_student()` if student doesn't have PIN

---

## Database Design Decisions

### Why Idempotent Check-ins?

**Problem:** Multiple check-ins per day created:
- Inflated attendance counts
- Incorrect gamification rewards
- Confusing analytics

**Solution:** UNIQUE constraint on (student_id, DATE(checked_in_at))
- Database prevents duplicates at the data layer
- Application code simplified (no need to check before insert)
- `checkin_student()` function handles gracefully (returns existing check-in)

---

### Why Lock Down check_ins Table?

**Privacy Concern:** Check-in timestamps reveal:
- Who attends together
- When specific students are/aren't present
- Patterns that could be sensitive

**Solution:**
- Remove public RLS policy on check_ins
- Only admins can query directly
- Public check-in uses SECURITY DEFINER function
- Analytics aggregated and anonymized where possible

---

### Why Store Attendance Pattern as JSONB?

**Alternative:** Client could query check_ins directly and calculate weekly boxes

**Benefits of JSONB:**
- Single query returns everything (no N+1 problem)
- Consistent calculation logic (all clients see same pattern)
- Easier to optimize (calculated once in PostgreSQL)
- Supports complex aggregations (days per week, not just presence/absence)

**Trade-off:** Slightly more complex SQL, but much simpler client code

---

### Why Separate student_stats from students?

**Design Choice:** Could have put points/rank/streak directly in students table

**Benefits of Separation:**
- Students table stays focused on identity
- Stats can be reset without affecting core data
- Easier to add new gamification fields
- Clear separation of concerns

---

### Why Track dismissed_at Instead of Deleting?

**Alternative:** Delete old AI recommendations when new ones are generated

**Benefits of History:**
- See how student engagement changes over time
- Audit trail of pastoral care
- Can "undo" dismissal if needed
- Helps improve AI prompts (compare old vs new recommendations)

---

## Common Queries

### Get all check-ins for a student
```sql
SELECT * FROM check_ins
WHERE student_id = 'uuid-here'
ORDER BY checked_in_at DESC;
```

### Get students who checked in today
```sql
SELECT s.*, ci.checked_in_at
FROM students s
JOIN check_ins ci ON s.id = ci.student_id
WHERE DATE(ci.checked_in_at) = CURRENT_DATE;
```

### Get top 10 students by points
```sql
SELECT s.first_name, s.last_name, ss.total_points, ss.rank
FROM students s
JOIN student_stats ss ON s.id = ss.student_id
ORDER BY ss.total_points DESC
LIMIT 10;
```

### Get students who earned an achievement
```sql
SELECT s.first_name, s.last_name, a.name, sa.earned_at
FROM student_achievements sa
JOIN students s ON sa.student_id = s.id
JOIN achievements a ON sa.achievement_id = a.id
WHERE a.name = 'Welcome to the Family'
ORDER BY sa.earned_at DESC;
```

### Get engagement distribution
```sql
SELECT
  belonging_status,
  COUNT(*) as student_count
FROM get_pastoral_analytics()
GROUP BY belonging_status
ORDER BY
  CASE belonging_status
    WHEN 'Ultra-Core' THEN 1
    WHEN 'Core' THEN 2
    WHEN 'Connected' THEN 3
    WHEN 'On the Fringe' THEN 4
    WHEN 'Missing' THEN 5
  END;
```

---

## Maintenance & Performance

### Indexes to Monitor

As your database grows, monitor these indexes:
- `students_phone_number_idx` - Used heavily by search
- `students_name_idx` - Used by name search
- Check-in queries might benefit from: `CREATE INDEX check_ins_date_idx ON check_ins (DATE(checked_in_at));`

### Vacuum and Analyze

PostgreSQL automatically vacuums, but you can manually optimize:
```sql
VACUUM ANALYZE check_ins;
VACUUM ANALYZE students;
```

### Materialized Views (Future Optimization)

If `get_pastoral_analytics()` becomes slow (1000+ students):
```sql
CREATE MATERIALIZED VIEW pastoral_analytics_cache AS
SELECT * FROM get_pastoral_analytics();

-- Refresh every hour via cron
REFRESH MATERIALIZED VIEW pastoral_analytics_cache;
```

---

## Backup Strategy

**Supabase handles automatic backups**, but you can export manually:

### Export All Data
```bash
# Using Supabase CLI
supabase db dump -f backup.sql

# Or using pg_dump
pg_dump postgres://[connection-string] > backup.sql
```

### Export Specific Tables
```bash
pg_dump -t students -t check_ins postgres://[connection-string] > core_data.sql
```

---

## Security Checklist

- ✅ RLS enabled on all tables
- ✅ check_ins table has no public read policy
- ✅ All admin operations require authenticated user with admin role
- ✅ Functions use SECURITY DEFINER only when necessary
- ✅ PINs are 4 digits (easy to remember, not high-security but reasonable for student profiles)
- ✅ No sensitive data in students table (addresses optional)
- ✅ user_roles properly restricts access

---

## Schema Diagram (Simplified)

```
students (id, name, phone, email, grade, profile_pin)
  ├─── check_ins (student_id, checked_in_at)
  ├─── student_stats (student_id, points, rank, streak)
  ├─── student_achievements (student_id, achievement_id, earned_at)
  ├─── ai_recommendations (student_id, curriculum_week_id, key_insight, action_bullets)
  └─── student_profiles_extended (student_id, interests, prayer_requests, gender)

achievements (id, name, tier, points_value)
  └─── student_achievements (achievement_id)

curriculum_weeks (id, series_name, topic_title, is_current)
  └─── ai_recommendations (curriculum_week_id)

user_roles (id, role)
  └─── auth.users (id) [Supabase managed]
```

---

## Further Reading

- **Migrations:** See `/supabase/migrations/` for complete schema evolution
- **SQL Patches:** See `/sql-fixes/README.md` for production patches
- **Code:** See `CLAUDE.md` for application architecture
- **Deployment:** See `DEPLOYMENT.md` for setup guide
