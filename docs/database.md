# Database Schema

Supabase PostgreSQL database schema for Sheepdoggo.

## Overview

Multi-tenant PostgreSQL database with Row Level Security (RLS). All tables use UUID primary keys and timestamp tracking.

## Entity Relationship Diagram

```mermaid
erDiagram
    organizations ||--o{ organization_members : "has"
    organizations ||--o{ students : "has"
    organizations ||--o{ check_ins : "has"
    organizations ||--o{ groups : "has"
    organizations ||--o{ sms_messages : "has"

    students ||--o{ check_ins : "makes"
    students ||--o{ student_game_stats : "has"
    students ||--o{ student_achievements : "earns"
    students ||--o{ game_transactions : "has"
    students ||--o{ ai_recommendations : "receives"
    students ||--o{ interactions : "has"
    students ||--o{ student_notes : "has"
    students ||--o{ student_profiles_extended : "has"
    students ||--o{ sms_messages : "sends/receives"
    students }o--o{ groups : "belongs to"

    groups ||--o{ group_members : "has"
    groups ||--o{ group_leaders : "has"
    groups ||--o{ group_meeting_times : "has"

    curriculum_weeks ||--o{ ai_recommendations : "informs"

    auth_users ||--o{ organization_members : "belongs to"
    auth_users ||--o{ interactions : "logs"
    auth_users ||--o{ student_notes : "writes"
```

---

## Core Tables

### `organizations`

Multi-tenant organization (ministry) records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | text | Organization name |
| `slug` | text | URL slug (unique) |
| `display_name` | text | Display name |
| `short_code` | text | SMS routing code |
| `owner_email` | text | Primary contact |
| `timezone` | text | Timezone (default: America/Chicago) |
| `status` | text | 'active', 'suspended', etc. |
| `created_at` | timestamptz | Creation timestamp |

### `organization_members`

Organization membership and roles.

| Column | Type | Description |
|--------|------|-------------|
| `member_id` | uuid | Primary key |
| `organization_id` | uuid | FK to organizations |
| `user_id` | uuid | FK to auth.users |
| `email` | text | Member email |
| `role` | text | 'owner', 'admin', 'leader', 'viewer' |
| `status` | text | 'pending', 'active', 'suspended' |
| `invited_at` | timestamptz | Invitation timestamp |
| `accepted_at` | timestamptz | Acceptance timestamp |

### `students`

Student records with contact and profile data.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `organization_id` | uuid | FK to organizations |
| `first_name` | text | First name (required) |
| `last_name` | text | Last name |
| `phone_number` | text | Primary phone (searchable) |
| `email` | text | Email address |
| `grade` | text | Grade level ('6'-'12', 'Adult') |
| `high_school` | text | School name |
| `parent_name` | text | Parent/guardian name |
| `parent_phone` | text | Parent phone |
| `profile_pin` | text | 4-digit PIN for profile |
| `user_type` | text | 'student' or 'student_leader' |
| `date_of_birth` | date | Birth date |
| `created_at` | timestamptz | Creation timestamp |

**Indexes:**
- GIN trigram on `phone_number` for fuzzy search
- GIN trigram on `first_name`, `last_name` for name search

### `check_ins`

Daily check-in records (idempotent per day).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `student_id` | uuid | FK to students |
| `organization_id` | uuid | FK to organizations |
| `checked_in_at` | timestamptz | Check-in timestamp |
| `created_at` | timestamptz | Record creation |

**Constraints:**
- UNIQUE on `(student_id, DATE(checked_in_at))` — one check-in per day

---

## Gamification Tables

### `student_game_stats`

Cumulative gamification stats per student.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `student_id` | uuid | FK to students (unique) |
| `total_points` | integer | Lifetime points (default: 0) |
| `current_rank` | text | Current rank title |
| `last_points_update` | timestamptz | Last update |

**Rank Tiers:**
| Points | Rank |
|--------|------|
| 0-99 | Newcomer |
| 100-299 | Regular |
| 300-599 | Committed |
| 600-999 | Devoted |
| 1000-1999 | Champion |
| 2000+ | Legend |

### `student_achievements`

Earned achievements.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `student_id` | uuid | FK to students |
| `achievement_id` | text | Achievement identifier |
| `achievement_title` | text | Display name |
| `achievement_description` | text | Description |
| `achievement_emoji` | text | Icon/emoji |
| `points_awarded` | integer | Points given |
| `rarity` | text | 'common', 'rare', 'epic', 'legendary' |
| `unlocked_at` | timestamptz | When earned |

**Constraint:** UNIQUE on `(student_id, achievement_id)`

### `game_transactions`

Audit trail of point transactions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `student_id` | uuid | FK to students |
| `check_in_id` | uuid | FK to check_ins (nullable) |
| `points_earned` | integer | Points awarded |
| `transaction_type` | text | Type (see below) |
| `description` | text | Explanation |
| `metadata` | jsonb | Additional context |
| `created_at` | timestamptz | Transaction time |

**Transaction Types:**
- `base_checkin` — Standard check-in points
- `streak_bonus` — Consecutive week bonus
- `achievement` — Achievement unlock bonus
- `first_time` — First check-in bonus
- `early_bird_bonus` — Early arrival
- `dedication_bonus` — Multiple check-ins same week
- `weekend_warrior_bonus` — Sunday attendance
- `midweek_hero_bonus` — Wednesday attendance
- `student_leader_bonus` — Leader role bonus

---

## Pastoral Care Tables

### `curriculum_weeks`

Weekly teaching curriculum for AI context.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `week_date` | date | Week start date |
| `series_name` | text | Teaching series name |
| `topic_title` | text | This week's topic |
| `main_scripture` | text | Primary Bible passage |
| `big_idea` | text | One-sentence takeaway |
| `key_biblical_principle` | text | Core truth |
| `application_challenge` | text | Practical application |
| `core_truths` | text[] | Array of key truths |
| `faith_skills` | text[] | 'Hear', 'Pray', 'Talk', 'Live' |
| `target_phases` | text[] | Grade levels ('6'-'12') |
| `phase_relevance` | jsonb | Phase-specific relevance |
| `discussion_questions` | jsonb | Phase-specific questions |
| `is_current` | boolean | Active week flag (only one) |

### `ai_recommendations`

AI-generated pastoral recommendations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `student_id` | uuid | FK to students |
| `curriculum_week_id` | uuid | FK to curriculum_weeks |
| `key_insight` | text | One-sentence insight (max 120 chars) |
| `action_bullets` | text[] | 3 action items |
| `context_paragraph` | text | 2-4 sentence explanation |
| `engagement_status` | text | Belonging status at generation |
| `days_since_last_seen` | integer | Days since check-in |
| `status` | text | 'pending', 'accepted', 'completed', 'dismissed' |
| `assigned_to` | uuid | FK to auth.users |
| `is_dismissed` | boolean | Whether dismissed |
| `generated_at` | timestamptz | Generation timestamp |

**Constraint:** UNIQUE on `(student_id, curriculum_week_id)`

### `student_profiles_extended`

Extended profile for richer AI context.

| Column | Type | Description |
|--------|------|-------------|
| `student_id` | uuid | PK, FK to students |
| `current_phase` | text | Phase name |
| `spiritual_maturity` | text | 'Exploring', 'Growing', 'Strong Believer', 'Leadership Ready' |
| `faith_background` | text | 'New to faith', 'Churched', 'Unchurched', 'Unknown' |
| `interests` | text[] | Hobbies and interests |
| `learning_style` | text | 'Visual', 'Auditory', 'Kinesthetic', etc. |
| `current_challenges` | text[] | Current struggles |
| `family_context` | text | Family situation |
| `gender` | text | 'Male', 'Female', etc. |

### `interactions`

Pastoral outreach records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `student_id` | uuid | FK to students |
| `leader_id` | uuid | FK to auth.users |
| `leader_name` | text | Denormalized name |
| `interaction_type` | text | 'text', 'call', 'in_person', etc. |
| `status` | text | 'pending', 'completed', 'no_response' |
| `content` | text | What was communicated |
| `outcome` | text | Result |
| `recommendation_id` | uuid | FK to ai_recommendations |
| `follow_up_date` | date | Follow-up reminder |
| `created_at` | timestamptz | Timestamp |

### `student_notes`

Persistent context notes about students.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `student_id` | uuid | FK to students |
| `leader_id` | uuid | FK to auth.users |
| `leader_name` | text | Denormalized name |
| `content` | text | Note content |
| `is_pinned` | boolean | Show at top |
| `created_at` | timestamptz | Timestamp |

---

## Groups Tables

### `groups`

Student groups (MS Boys, HS Girls, etc.).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `organization_id` | uuid | FK to organizations |
| `name` | text | Group name |
| `short_code` | text | SMS routing code |
| `color` | text | Display color |
| `is_active` | boolean | Active flag |
| `created_at` | timestamptz | Timestamp |

### `group_members`

Students assigned to groups.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `group_id` | uuid | FK to groups |
| `student_id` | uuid | FK to students |
| `joined_at` | timestamptz | When joined |

### `group_leaders`

Leaders assigned to groups.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `group_id` | uuid | FK to groups |
| `user_id` | uuid | FK to auth.users |
| `is_primary` | boolean | Primary leader flag |

### `group_meeting_times`

Meeting schedule per group.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `group_id` | uuid | FK to groups |
| `day_of_week` | integer | 0-6 (Sunday-Saturday) |
| `start_time` | time | Meeting start |
| `end_time` | time | Meeting end |

---

## SMS Tables

### `sms_messages`

SMS message records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `organization_id` | uuid | FK to organizations |
| `student_id` | uuid | FK to students (nullable) |
| `direction` | text | 'inbound' or 'outbound' |
| `body` | text | Message content |
| `from_number` | text | Sender phone |
| `to_number` | text | Recipient phone |
| `twilio_sid` | text | Twilio message ID |
| `status` | text | 'sent', 'delivered', 'failed', 'received' |
| `sent_by` | uuid | FK to auth.users (for outbound) |
| `created_at` | timestamptz | Timestamp |

### `sms_sessions`

Active SMS conversation sessions for routing.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `phone_number` | text | Phone number |
| `organization_id` | uuid | FK to organizations |
| `group_id` | uuid | FK to groups (nullable) |
| `status` | text | 'pending_group', 'active' |
| `started_at` | timestamptz | Session start |

---

## RLS Security Model

All tables use Row Level Security with helper functions to prevent recursion.

### Helper Functions (SECURITY DEFINER)

```sql
-- Check super admin status
auth_is_super_admin(user_id UUID) → BOOLEAN

-- Get user's organization IDs
auth_user_org_ids(user_id UUID) → SETOF UUID

-- Check org role membership
auth_has_org_role(org_id UUID, roles TEXT[]) → BOOLEAN
```

### Policy Patterns

**Super admin access:**
```sql
CREATE POLICY "super_admin_all" ON table_name
USING (auth_is_super_admin(auth.uid()));
```

**Organization member access:**
```sql
CREATE POLICY "org_member_view" ON students FOR SELECT
USING (organization_id IN (SELECT auth_user_org_ids(auth.uid())));
```

---

## Key RPC Functions

### Check-in Functions

| Function | Purpose |
|----------|---------|
| `search_student_for_checkin(term)` | Fuzzy search by phone/name |
| `checkin_student(student_id)` | Idempotent daily check-in |
| `register_student_and_checkin(...)` | New student registration |

### Gamification Functions

| Function | Purpose |
|----------|---------|
| `get_student_game_profile(student_id)` | Complete game profile |
| `award_points(...)` | Award points with transaction |
| `unlock_achievement(...)` | Unlock achievement |
| `process_checkin_rewards(...)` | Calculate check-in rewards |

### Pastoral Functions

| Function | Purpose |
|----------|---------|
| `get_pastoral_analytics()` | Engagement analytics for all students |
| `get_student_context(student_id)` | Notes + interactions |
| `log_interaction(...)` | Record pastoral outreach |
| `accept_recommendation(id)` | Accept AI recommendation |
| `get_my_queue()` | Current leader's pending tasks |

### Organization Functions

| Function | Purpose |
|----------|---------|
| `get_user_organizations(user_id)` | User's org memberships |
| `get_all_organizations()` | Super admin: all orgs |
| `create_organization(...)` | Super admin: create org |
| `is_super_admin(user_id)` | Check admin status |

---

## Belonging Status Logic

The `get_pastoral_analytics()` function calculates engagement tiers:

```
Ultra-Core: 5+ check-ins in last 4 weeks
Core:       4+ check-ins in 8 weeks (~1x/week)
Connected:  2-3 check-ins in 8 weeks
On the Fringe: Seen recently but inconsistent, or 30-60 days absent
Missing:    60+ days absent OR never checked in
```

Returns attendance pattern as JSONB array:
```json
[
  { "week_start": "2024-09-01", "days_attended": 2 },
  { "week_start": "2024-09-08", "days_attended": 0 },
  ...
]
```

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Idempotent check-ins** | UNIQUE constraint prevents duplicates; simplifies app logic |
| **Denormalized names** | `leader_name` columns survive user deletions |
| **Soft delete recommendations** | History tracking for audit trail |
| **Separate stats table** | `student_game_stats` separates gamification from identity |
| **SECURITY DEFINER helpers** | Prevent RLS recursion issues |
| **JSONB for flexible data** | `metadata`, `phase_relevance`, `discussion_questions` |
