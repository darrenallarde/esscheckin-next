# API Reference

RPC functions, API routes, and Edge Functions for Sheepdoggo.

---

## RPC Functions (Supabase)

Call via Supabase client:
```typescript
const { data, error } = await supabase.rpc('function_name', { param: value });
```

### Check-in Functions

#### `search_student_for_checkin`

Fuzzy search for students by phone, name, or email.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `search_term` | text | Phone, name, or email to search |

**Returns:** Array of matching students (top 10)

**Example:**
```typescript
const { data } = await supabase.rpc('search_student_for_checkin', {
  search_term: '555-123-4567'
});
// Returns: [{ id, first_name, last_name, phone_number, grade, ... }]
```

---

#### `checkin_student`

Idempotent daily check-in. Returns existing check-in if already checked in today.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `p_student_id` | uuid | Student ID |

**Returns:**
```typescript
{
  checkin_id: string;      // Check-in record ID
  profile_pin: string;     // 4-digit PIN
  is_new_checkin: boolean; // True if new, false if duplicate
}
```

**Security:** Uses `SECURITY DEFINER` to bypass RLS (for public kiosk).

---

#### `register_student_and_checkin`

Register a new student and check them in simultaneously.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `p_first_name` | text | First name |
| `p_last_name` | text | Last name (nullable) |
| `p_phone_number` | text | Phone number |
| `p_grade` | text | Grade level |
| `p_organization_id` | uuid | Organization ID (nullable) |

**Returns:** Same as `checkin_student`

---

### Gamification Functions

#### `get_student_game_profile`

Get complete gamification profile for a student.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `p_student_id` | uuid | Student ID |

**Returns:**
```typescript
{
  student_id: string;
  total_points: number;
  current_rank: string;
  total_check_ins: number;
  current_streak: number;
  longest_streak: number;
  achievements: Achievement[];
  recent_transactions: Transaction[];
}
```

---

#### `process_checkin_rewards`

Calculate and award achievements/points for a check-in.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `p_student_id` | uuid | Student ID |
| `p_check_in_id` | uuid | Check-in ID |

**Returns:**
```typescript
{
  points_earned: number;
  new_achievements: Achievement[];
  new_rank: string | null;
  streak_count: number;
}
```

**Called automatically** by frontend after each check-in.

---

#### `award_points`

Award points to a student with transaction logging.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `p_student_id` | uuid | Student ID |
| `p_points` | integer | Points to award |
| `p_transaction_type` | text | Transaction type |
| `p_check_in_id` | uuid | Related check-in (optional) |
| `p_description` | text | Description (optional) |

---

### Pastoral Functions

#### `get_pastoral_analytics`

Comprehensive engagement analytics for all students.

**Parameters:** None (uses organization from auth context)

**Returns:** Array of:
```typescript
{
  student_id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  grade: string;
  belonging_status: 'Ultra-Core' | 'Core' | 'Connected' | 'On the Fringe' | 'Missing';
  days_since_last_seen: number;
  total_checkins_8weeks: number;
  wednesday_count: number;
  sunday_count: number;
  is_declining: boolean;
  attendance_pattern: { week_start: string; days_attended: number }[];
  recommended_action: string;
  priority_score: number;
}
```

---

#### `get_student_context`

Get pinned notes and recent interactions for a student.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `p_student_id` | uuid | Student ID |

**Returns:**
```typescript
{
  pinned_notes: Note[];
  recent_interactions: Interaction[];
  total_interactions: number;
}
```

---

#### `log_interaction`

Record a pastoral outreach interaction.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `p_student_id` | uuid | Student ID |
| `p_interaction_type` | text | 'text', 'call', 'in_person', etc. |
| `p_content` | text | What was communicated |
| `p_outcome` | text | Result (optional) |
| `p_recommendation_id` | uuid | Related recommendation (optional) |
| `p_follow_up_date` | date | Follow-up reminder (optional) |

---

#### `accept_recommendation`

Accept an AI recommendation, creating a pending task.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `p_recommendation_id` | uuid | Recommendation ID |

**Returns:** Updated recommendation with `status: 'accepted'`

---

#### `get_my_queue`

Get pending pastoral tasks for the current user.

**Parameters:** None (uses auth context)

**Returns:** Array of accepted recommendations with student info.

---

### Curriculum Functions

#### `set_current_curriculum`

Set a curriculum week as the current active week.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `p_curriculum_id` | uuid | Curriculum week ID |

**Behavior:** Sets all other weeks to `is_current = false`.

---

#### `get_or_create_extended_profile`

Get or create extended profile for a student.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `p_student_id` | uuid | Student ID |

**Returns:** Extended profile record.

---

### Organization Functions

#### `get_user_organizations`

Get organizations the user belongs to.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `p_user_id` | uuid | User ID |

**Returns:**
```typescript
{
  organization_id: string;
  organization_name: string;
  display_name: string;
  slug: string;
  role: string;
}[]
```

---

#### `get_all_organizations`

**Super admin only.** List all organizations.

**Returns:** Array of all organizations with stats.

---

#### `create_organization`

**Super admin only.** Create a new organization.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `p_name` | text | Organization name |
| `p_owner_email` | text | Owner email |
| `p_slug` | text | URL slug |
| `p_timezone` | text | Timezone |

---

#### `is_super_admin`

Check if user is a super admin.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `p_user_id` | uuid | User ID |

**Returns:** `boolean`

---

### SMS Router Functions

Used by Edge Functions for SMS routing.

#### `phone_last_10`

Normalize phone number to last 10 digits.

```sql
phone_last_10('(555) 123-4567') → '5551234567'
```

---

#### `find_recent_conversation`

Find auto-route target from recent outbound messages.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `p_phone` | text | Phone number |

**Returns:** `{ organization_id, group_id }` or null

---

#### `find_student_groups`

Find all groups a student belongs to by phone.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `p_phone` | text | Phone number |

**Returns:** Array of groups.

---

#### `get_active_sms_session`

Get active SMS session for a phone number.

---

#### `find_org_by_code`

Find organization by short code.

---

#### `list_org_groups_for_sms`

List active groups for SMS menu.

---

## API Routes (Next.js)

### POST `/api/recommendations/generate`

Generate an AI recommendation for a student.

**Request Body:**
```json
{
  "studentId": "uuid",
  "pastoralData": { /* StudentPastoralData */ },
  "curriculum": { /* CurriculumWeek */ }
}
```

**Response:**
```json
{
  "id": "uuid",
  "student_id": "uuid",
  "key_insight": "...",
  "action_bullets": ["...", "...", "..."],
  "context_paragraph": "...",
  "engagement_status": "Connected",
  "generated_at": "2024-01-15T..."
}
```

**Error Responses:**
- `400` — Missing required fields
- `500` — API key not configured or AI generation failed

---

### POST `/api/sms/receive`

Twilio webhook for inbound SMS.

**Request:** Twilio webhook payload (form-encoded)

**Response:** TwiML response or 200 OK

**Behavior:** Routes message to appropriate Edge Function handler.

---

### POST `/api/sms/send`

Send an outbound SMS message.

**Request Body:**
```json
{
  "to": "+15551234567",
  "body": "Message content",
  "studentId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "messageSid": "SM..."
}
```

---

## Edge Functions (Supabase)

### `receive-sms`

Process inbound SMS with NPC routing.

**Trigger:** Twilio webhook via API route

**Flow:**
1. Normalize phone number
2. Check for active session
3. Route to conversation or start new session
4. Handle commands (ORG, GROUP selection)

**NPC Personas:**
- `ROUTER` — Message routing and menu navigation
- `UNKNOWN` — Handles unrecognized phone numbers

---

### `generate-recommendations` (Planned)

Batch generate AI recommendations.

**Trigger:** Scheduled cron job

**Flow:**
1. Get students needing recommendations
2. Get current curriculum
3. Generate recommendations in batches
4. Store in database

---

## Authentication

All API routes and RPC functions use Supabase Auth.

**Headers:**
```
Authorization: Bearer <supabase-access-token>
```

**Server-side:**
```typescript
const supabase = await createClient(); // Uses cookies
const { data: { user } } = await supabase.auth.getUser();
```

**Client-side:**
```typescript
const supabase = createClient();
// Session managed automatically via cookies
```

---

## Error Handling

### RPC Errors
```typescript
const { data, error } = await supabase.rpc('function', params);
if (error) {
  console.error(error.message); // e.g., "RLS policy violation"
}
```

### API Route Errors
```typescript
// Return structured errors
return NextResponse.json(
  { error: 'Description of error' },
  { status: 400 }
);
```

### Common Error Codes

| Code | Meaning |
|------|---------|
| `42501` | RLS policy violation |
| `23505` | Unique constraint violation |
| `23503` | Foreign key violation |
| `PGRST116` | No rows returned when single() expected |
