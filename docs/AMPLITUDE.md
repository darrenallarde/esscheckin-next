# Amplitude Analytics Data Taxonomy

> This document defines our event naming conventions, taxonomy design, and implementation strategy for Amplitude Analytics in Seedling.
>
> **Audience**: Engineers, Product Managers, anyone implementing or analyzing Amplitude data
> **Status**: Living document - update as new features are added

---

## 1. Philosophy & Guiding Principles

### 1.1 Core Beliefs

1. **Less is More**: 20-30 well-designed events answer 90% of questions. Track intentionally, not exhaustively.
2. **Consistency is King**: One naming convention, enforced everywhere, forever.
3. **Properties Add Context**: Events tell us "what happened." Properties tell us "why," "where," and "how."
4. **Think User-First**: All events from the user's perspective. "Student Checked In" not "Check-in Received."
5. **No PII in Amplitude**: Student names, phone numbers, emails NEVER go to Amplitude. Use IDs.
6. **Future-Proof Design**: The taxonomy must accommodate features we haven't built yet.

### 1.2 What Questions Are We Trying to Answer?

Before adding ANY event, it must answer a real business question:

| Business Question | Event(s) Needed |
|-------------------|-----------------|
| How many students check in per week? | `Check In Completed` |
| Which devices are most active? | `Check In Completed` + `device_id` property |
| Where do students drop off in registration? | `Registration Started`, `Registration Completed` |
| How are admins using org tools? | Tool-specific events |
| Which orgs are most engaged? | All events + `org_slug` property |
| What pastoral actions are happening? | `SMS Sent`, `Note Created`, `Recommendation Actioned` |
| Are admins using AI features? | `AI Query Submitted`, `Draft Message Sent` (future) |
| How long does onboarding take? | `First Device Created`, `First Import Completed`, `First Check In Completed` |

### 1.3 Anti-Patterns to Avoid

❌ **Don't track implementation details**
- Bad: `Button Clicked`, `Modal Opened`, `Form Field Focused`
- Good: `Device Created`, `Student Profile Viewed`

❌ **Don't create duplicate events with different names**
- Bad: `checkin_complete`, `check_in_completed`, `CheckInDone`
- Good: One canonical name: `Check In Completed`

❌ **Don't track high-volume low-value events**
- Bad: Every form keystroke, every scroll
- Good: Meaningful milestones (start, complete, abandon)

❌ **Don't put PII in events**
- Bad: `{ search_term: "John Smith", phone: "555-1234" }`
- Good: `{ search_term_length: 10, result_count: 3 }`

---

## 2. Naming Convention (THE LAW)

### 2.1 Event Names: `[Object] [Past-Tense Verb]`

**Format**: Title Case, spaces between words, past tense verb

| ✅ Correct | ❌ Wrong | Why Wrong |
|------------|----------|-----------|
| `Check In Completed` | `checkin_complete` | Wrong casing, snake_case |
| `Student Registered` | `new_student` | Missing verb |
| `Student Searched` | `Search` | Missing object, wrong tense |
| `Device Created` | `device_setup_modal_submit` | Implementation detail |
| `SMS Sent` | `send_sms` | Wrong tense, snake_case |
| `Group Viewed` | `GroupViewed` | Missing space |

### 2.2 Property Names: `snake_case`

**Format**: lowercase with underscores

| Property | Type | Example Value |
|----------|------|---------------|
| `org_id` | UUID | `"550e8400-e29b-41d4-a716-446655440000"` |
| `org_slug` | String | `"ess-ministry"` |
| `student_id` | UUID | `"550e8400-e29b-41d4-a716-446655440001"` |
| `device_id` | UUID | `"550e8400-e29b-41d4-a716-446655440002"` |
| `device_name` | String | `"Front Door iPad"` |
| `group_id` | UUID | `"550e8400-e29b-41d4-a716-446655440003"` |
| `result_count` | Number | `5` |
| `is_duplicate` | Boolean | `true` |
| `checkin_style` | String | `"gamified"` |

### 2.3 Property Value Conventions

| Value Type | Convention | Examples |
|------------|------------|----------|
| Booleans | `true`/`false` | `is_duplicate: true` |
| Enums | lowercase snake_case | `"gamified"`, `"from_list"`, `"high"` |
| IDs | UUIDs as strings | `"550e8400-e29b-41d4-a716-..."` |
| Counts | Numbers | `5`, `0`, `100` |
| Dates | ISO 8601 | `"2026-01-29"` |

### 2.4 Why This Convention?

1. **Amplitude treats casing as distinct**: `Song Played` ≠ `song played` ≠ `Song_Played`
2. **Object-first makes it scannable**: All check-in events start with "Check In..."
3. **Past tense clarifies timing**: The event represents something that already happened
4. **Snake_case properties match DB columns**: Easy mental mapping

---

## 3. User Properties vs Event Properties

### 3.1 User Properties (Persistent Attributes)

User properties describe WHO the user is. They persist across sessions and update on change.

| Property | Type | Description | When Set | Example |
|----------|------|-------------|----------|---------|
| `organization_id` | UUID | Current org | On auth, on org switch | `"uuid..."` |
| `organization_slug` | String | Human-readable org ID | On auth, on org switch | `"ess-ministry"` |
| `role` | String | User's role in org | On auth | `"admin"`, `"leader"`, `"viewer"` |
| `is_public_session` | Boolean | Unauthenticated check-in | On page load | `true` |
| `device_id` | UUID | Check-in device ID | On device setup | `"uuid..."` |
| `device_name` | String | Human-readable device | On device setup | `"Front Door iPad"` |
| `first_seen_at` | ISO Date | When user first appeared | On first event (auto) | `"2026-01-15"` |
| `org_created_at` | ISO Date | When org was created | On org creation | `"2026-01-01"` |

**Future User Properties (when features ship):**
| Property | Description |
|----------|-------------|
| `campus_id` | For multi-campus orgs |
| `automation_enabled` | Whether auto-send is on |
| `plan_tier` | Subscription tier |

### 3.2 Event Properties (Action-Specific Context)

Event properties describe THIS SPECIFIC ACTION.

| Property | Used On | Description |
|----------|---------|-------------|
| `student_id` | Check-in, profile events | Which student |
| `student_grade` | Registration | Grade at registration time |
| `group_id` | Group events | Which group |
| `search_term_length` | Search events | Chars entered (NOT the term itself) |
| `result_count` | Search events | How many results |
| `selection_method` | Selection events | How selected (`"single"`, `"from_list"`) |
| `is_duplicate` | Check-in | Already checked in today |
| `points_earned` | Check-in, achievements | Points from this action |
| `checkin_style` | Check-in page | `"gamified"` or `"standard"` |
| `match_confidence` | Merge events | `"high"`, `"medium"`, `"low"` |
| `source` | Profile views | Where clicked from (`"search"`, `"leaderboard"`, `"group"`, `"recommendation"`) |
| `template_used` | SMS events | Which template, if any |
| `automated` | Future: auto-send | `true` if system-initiated |

### 3.3 When to Use Which?

**Use USER PROPERTY when:**
- The value persists across multiple events
- It describes the user/device/org identity
- You want to segment ALL events by this attribute

**Use EVENT PROPERTY when:**
- The value is specific to this one action
- It could be different next time (result_count)
- It provides context for why/how the action happened

---

## 4. Complete Event Taxonomy

### 4.1 Check-In Flow (Public, Unauthenticated)

The core student check-in journey. Most events here.

| Event | Description | Required Properties | Optional Properties |
|-------|-------------|---------------------|---------------------|
| `Check In Page Viewed` | User landed on check-in page | `org_slug`, `checkin_style` | `device_id`, `device_name` |
| `Student Searched` | User submitted a search | `search_term_length` | `result_count` |
| `Student Selected` | User selected from results | `student_id`, `selection_method` | |
| `Check In Confirmed` | User confirmed identity | `student_id` | |
| `Check In Completed` | Check-in successful | `student_id`, `is_duplicate` | `points_earned` |
| `Registration Started` | Clicked "New Student" | `org_slug` | |
| `Registration Completed` | New student created + checked in | `student_id`, `student_grade` | `has_email`, `has_parent_info` |
| `Registration Abandoned` | Went back without completing | | `last_section_completed` |

**Future check-in events:**
| Event | When to Add |
|-------|-------------|
| `QR Code Scanned` | QR check-in feature |
| `Check In Proxy Completed` | Admin checks in for student |

### 4.2 Admin Dashboard

Admin interactions with the main dashboard.

| Event | Description | Required Properties | Optional Properties |
|-------|-------------|---------------------|---------------------|
| `Dashboard Viewed` | Admin opened dashboard | `org_slug` | |
| `Leaderboard Viewed` | Viewed leaderboard section | `period` | |
| `Belonging Spectrum Viewed` | Viewed belonging chart | | |
| `Belonging Level Drilled` | Clicked into a belonging level | `level` | `student_count` |
| `Stat Card Clicked` | Clicked a stat for detail | `stat_type` | |

**`period` values**: `"weekly"`, `"monthly"`, `"all_time"`
**`level` values**: `"ultra_core"`, `"core"`, `"connected"`, `"fringe"`, `"missing"`
**`stat_type` values**: `"total_checkins"`, `"unique_students"`, `"new_students"`, `"avg_attendance"`

### 4.3 People & Profiles

Viewing and managing student records.

| Event | Description | Required Properties | Optional Properties |
|-------|-------------|---------------------|---------------------|
| `People Page Viewed` | Admin opened People tab | `org_slug` | |
| `People Searched` | Admin searched people | `search_term_length` | `result_count`, `filters_applied` |
| `People Filtered` | Admin applied filters | `filter_type` | `filter_value` |
| `Student Profile Viewed` | Admin opened student modal | `student_id`, `source` | |
| `Profile Tab Changed` | Admin switched tab in profile | `student_id`, `tab_name` | |
| `Student Edited` | Admin edited student info | `student_id` | `fields_changed` |

**`source` values**: `"search"`, `"leaderboard"`, `"group"`, `"recommendation"`, `"belonging_drilldown"`
**`tab_name` values**: `"overview"`, `"engagement"`, `"pastoral"`, `"messages"`, `"groups"`

### 4.4 Groups

Group management and viewing.

| Event | Description | Required Properties | Optional Properties |
|-------|-------------|---------------------|---------------------|
| `Groups Page Viewed` | Admin opened Groups tab | `org_slug` | |
| `Group Viewed` | Admin viewed group detail | `group_id` | `member_count` |
| `Group Created` | Admin created new group | `group_id` | `group_type` |
| `Group Edited` | Admin edited group settings | `group_id` | `fields_changed` |
| `Group Deleted` | Admin deleted a group | `group_id` | `member_count` |
| `Member Added` | Admin added student to group | `group_id`, `student_id` | `method` |
| `Member Removed` | Admin removed from group | `group_id`, `student_id` | |
| `Meeting Time Changed` | Admin changed meeting schedule | `group_id` | |

**`method` values**: `"manual"`, `"bulk"`, `"import"`

### 4.5 Pastoral Care & Outreach

SMS, notes, recommendations - the core pastoral workflow.

| Event | Description | Required Properties | Optional Properties |
|-------|-------------|---------------------|---------------------|
| `SMS Sent` | Admin sent text message | `student_id` | `template_used`, `automated` |
| `Note Created` | Admin added student note | `student_id` | `note_type` |
| `Recommendation Viewed` | Admin viewed AI suggestion | `student_id`, `recommendation_type` | |
| `Recommendation Actioned` | Admin took action on recommendation | `student_id`, `action_type` | |
| `Recommendation Dismissed` | Admin dismissed recommendation | `student_id` | `reason` |
| `Prayer Prompt Viewed` | Admin saw prayer prompt | `student_id` | |

**`note_type` values**: `"general"`, `"prayer_request"`, `"follow_up"`, `"milestone"`
**`recommendation_type` values**: `"missing"`, `"fringe"`, `"new_student"`, `"celebration"`
**`action_type` values**: `"sent_sms"`, `"marked_contacted"`, `"scheduled_followup"`

**Future pastoral events:**
| Event | When to Add |
|-------|-------------|
| `Draft Message Approved` | AI draft messages feature |
| `Auto Message Sent` | Automated outreach feature |
| `Call Logged` | Phone call tracking |

### 4.6 Admin Tools (Org Tools)

Import, merge, attendance cleanup, devices.

| Event | Description | Required Properties | Optional Properties |
|-------|-------------|---------------------|---------------------|
| `Import Started` | Admin started CSV import | `row_count` | |
| `Import Completed` | Import finished | `students_imported` | `students_updated`, `errors` |
| `Import Failed` | Import errored | | `error_type` |
| `Duplicate Detection Run` | Scanned for duplicates | | `duplicates_found` |
| `Duplicate Previewed` | Admin previewed merge | `student_a_id`, `student_b_id` | `confidence` |
| `Duplicate Merged` | Admin merged students | `kept_student_id` | `records_merged`, `confidence` |
| `Attendance Cleanup Started` | Opened cleanup tool | | `selected_date` |
| `Attendance Cleanup Completed` | Bulk check-ins added | `students_added` | `duplicates_skipped` |
| `Device Created` | Named a new device | `device_name` | |
| `Device Renamed` | Changed device name | `device_id`, `device_name` | |

### 4.7 Organization & Settings

Org configuration, team management.

| Event | Description | Required Properties | Optional Properties |
|-------|-------------|---------------------|---------------------|
| `Settings Viewed` | Admin opened settings | `section` | |
| `Theme Changed` | Admin changed org theme | `theme_id` | `previous_theme_id` |
| `Checkin Style Changed` | Changed gamified/standard | `checkin_style` | |
| `Display Name Changed` | Changed org display name | | |
| `Team Member Invited` | Admin invited team member | `invited_role` | |
| `Team Member Removed` | Admin removed team member | | |

**`section` values**: `"account"`, `"team"`, `"organization"`, `"org_tools"`

### 4.8 Organization Lifecycle (First-Time Events)

Special events for tracking org onboarding. These fire ONCE per org.

| Event | Description | Required Properties |
|-------|-------------|---------------------|
| `First Device Created` | Org's first check-in device | `org_slug`, `device_name` |
| `First Import Completed` | Org's first student import | `org_slug`, `students_imported` |
| `First Check In Completed` | Org's first student check-in | `org_slug` |
| `First SMS Sent` | Org's first outreach | `org_slug` |
| `First Group Created` | Org's first group | `org_slug` |

### 4.9 Analytics Interactions

How admins interact with analytics features.

| Event | Description | Required Properties | Optional Properties |
|-------|-------------|---------------------|---------------------|
| `Analytics Page Viewed` | Admin opened analytics | `org_slug` | |
| `Chart Viewed` | Admin viewed specific chart | `chart_type` | `date_range` |
| `Chart Drilled` | Admin drilled into chart | `chart_type` | `drill_dimension` |
| `Report Exported` | Admin exported data | `report_type` | `format` |

**`chart_type` values**: `"attendance_trend"`, `"engagement_funnel"`, `"belonging_spectrum"`, `"check_in_by_day"`

### 4.10 Future: AI & Natural Language

Events for "Ask Seedling" feature when it ships.

| Event | When to Add | Properties |
|-------|-------------|------------|
| `AI Query Submitted` | Ask Seedling feature | `query_length`, `query_category` |
| `AI Results Viewed` | Ask Seedling feature | `result_count`, `had_recommendation` |
| `AI Recommendation Followed` | User acted on AI suggestion | `action_type` |

---

## 5. Event Property Reference

Complete list of all properties with allowed values.

### 5.1 Standard Properties (REQUIRED on EVERY Event)

These properties MUST be included on every single event we fire. No exceptions.

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `org_slug` | String | Human-readable org identifier | `"ess-ministry"` |
| `org_id` | UUID | Database organization ID | `"550e8400-..."` |
| `app_version` | String | Current app version | `"1.2.3"` |
| `page_path` | String | Current URL path (no domain) | `"/ess-ministry/checkin"` |
| `admin_user_id` | UUID | Auth'd admin's user ID (null for public) | `"550e8400-..."` or `null` |

**Why These Are Required:**
- `org_slug` + `org_id`: Multi-org SaaS - MUST know which org. Event property (not just user property) because user properties can change.
- `app_version`: Debug issues tied to specific releases. "Did this bug start in v1.2.3?"
- `page_path`: Context for where the event fired. Autocapture doesn't add this to custom events.
- `admin_user_id`: Hybrid identity - Org ID is Amplitude user, but preserve ability to analyze individual admin behavior.

**Implementation:**
```typescript
// Every track() call should use this helper
function getStandardProperties(): StandardProps {
  return {
    org_slug: getCurrentOrgSlug(),
    org_id: getCurrentOrgId(),
    app_version: process.env.NEXT_PUBLIC_APP_VERSION || 'dev',
    page_path: typeof window !== 'undefined' ? window.location.pathname : '',
    admin_user_id: getAuthenticatedUserId() || null,
  };
}

// Usage
amplitude.track('Check In Completed', {
  ...getStandardProperties(),
  student_id: '...',
  is_duplicate: false,
});
```

### 5.2 What Amplitude Captures Automatically

Don't manually track these - Amplitude handles them:
- `$device_type` - desktop, tablet, mobile
- `$device_id` - unique device identifier
- `$os_name` - iOS, Android, Windows, macOS
- `$browser` - Chrome, Safari, Firefox
- `$platform` - web, iOS, Android
- `$country`, `$city`, `$region` - from IP
- `$time` - timestamp
- `$session_id` - session identifier

### 5.3 All Event-Specific Properties A-Z

(In addition to the 5 standard properties above)

| Property | Type | Allowed Values | Used On |
|----------|------|----------------|---------|
| `action_type` | String | `"sent_sms"`, `"marked_contacted"`, `"scheduled_followup"` | Recommendation events |
| `automated` | Boolean | `true`, `false` | SMS, future auto-send |
| `chart_type` | String | `"attendance_trend"`, `"engagement_funnel"`, etc. | Analytics events |
| `checkin_style` | String | `"gamified"`, `"standard"` | Check-in page events |
| `confidence` | String | `"high"`, `"medium"`, `"low"` | Merge events |
| `device_id` | UUID | - | Check-in, device events |
| `device_name` | String | - | Device events |
| `duplicates_found` | Number | - | Detection events |
| `duplicates_skipped` | Number | - | Cleanup events |
| `errors` | Number | - | Import events |
| `fields_changed` | Array | `["name", "email", ...]` | Edit events |
| `filter_type` | String | `"grade"`, `"group"`, `"belonging"` | Filter events |
| `format` | String | `"csv"`, `"pdf"` | Export events |
| `group_id` | UUID | - | Group events |
| `group_type` | String | `"small_group"`, `"ministry"`, `"class"` | Group events |
| `has_email` | Boolean | - | Registration |
| `has_parent_info` | Boolean | - | Registration |
| `invited_role` | String | `"admin"`, `"leader"`, `"viewer"` | Team events |
| `is_duplicate` | Boolean | - | Check-in events |
| `kept_student_id` | UUID | - | Merge events |
| `last_section_completed` | String | `"name"`, `"contact"`, `"optional"` | Registration abandon |
| `level` | String | `"ultra_core"`, `"core"`, `"connected"`, `"fringe"`, `"missing"` | Belonging events |
| `member_count` | Number | - | Group events |
| `method` | String | `"manual"`, `"bulk"`, `"import"` | Member add events |
| `note_type` | String | `"general"`, `"prayer_request"`, `"follow_up"`, `"milestone"` | Note events |
| `period` | String | `"weekly"`, `"monthly"`, `"all_time"` | Leaderboard events |
| `points_earned` | Number | - | Check-in, achievement events |
| `previous_theme_id` | String | - | Theme change events |
| `recommendation_type` | String | `"missing"`, `"fringe"`, `"new_student"`, `"celebration"` | Recommendation events |
| `records_merged` | Number | - | Merge events |
| `result_count` | Number | - | Search events |
| `row_count` | Number | - | Import events |
| `search_term_length` | Number | - | Search events (NEVER the actual term) |
| `section` | String | `"account"`, `"team"`, `"organization"`, `"org_tools"` | Settings events |
| `selected_date` | ISO Date | - | Cleanup events |
| `selection_method` | String | `"single"`, `"from_list"` | Selection events |
| `source` | String | `"search"`, `"leaderboard"`, `"group"`, `"recommendation"`, `"belonging_drilldown"` | Profile view events |
| `stat_type` | String | `"total_checkins"`, `"unique_students"`, `"new_students"` | Stat events |
| `student_a_id` | UUID | - | Merge preview events |
| `student_b_id` | UUID | - | Merge preview events |
| `student_grade` | String | `"6"` - `"12"` | Registration events |
| `student_id` | UUID | - | Student-related events |
| `students_added` | Number | - | Cleanup events |
| `students_imported` | Number | - | Import events |
| `students_updated` | Number | - | Import events |
| `tab_name` | String | `"overview"`, `"engagement"`, `"pastoral"`, `"messages"`, `"groups"` | Profile tab events |
| `template_used` | String | Template name or null | SMS events |
| `theme_id` | String | Theme slug | Theme events |

---

## 6. What NOT to Track

### 6.1 PII (Never Track)

| ❌ Never Track | ✅ Track Instead |
|----------------|------------------|
| `student_name` | `student_id` |
| `search_term` | `search_term_length` |
| `phone_number` | (nothing) |
| `email` | `has_email: true` |
| `parent_name` | `has_parent_info: true` |
| `address` | (nothing) |
| `notes_content` | `note_type` |
| `sms_content` | `template_used` |

### 6.2 Low-Value Events (Don't Track)

| ❌ Don't Track | Why |
|----------------|-----|
| `Button Clicked` | Too generic, use semantic events |
| `Modal Opened` | Implementation detail |
| `Form Field Focused` | Too granular |
| `Page Scrolled` | Low signal |
| `Tooltip Shown` | Noise |
| `Dropdown Opened` | Noise |

### 6.3 Errors (Use Sentry Instead)

| ❌ Don't Track in Amplitude | ✅ Track in Sentry |
|-----------------------------|---------------------|
| `Check In Failed` | Sentry error capture |
| `Import Error` | Sentry with context |
| `API Error` | Sentry breadcrumbs |
| `Network Timeout` | Sentry |

**Exception**: Track `Import Failed` event (without error details) if you need to measure import success rate in Amplitude. But full error context goes to Sentry.

---

## 7. Autocapture Configuration

### 7.1 What Autocapture Handles

Let Amplitude's autocapture track:
- ✅ Page views (Next.js route changes)
- ✅ Session start/end
- ✅ Element clicks (for discovery, not analysis)

### 7.2 What We Instrument Manually

All events in Section 4 are manually instrumented with proper properties.

### 7.3 Recommended Autocapture Settings

```typescript
{
  analytics: {
    autocapture: {
      pageViews: true,        // Track page views
      sessions: true,         // Track session start/end
      elementInteractions: false,  // Too noisy, use custom events
      fileDownloads: false,   // Not applicable
      formInteractions: false // Too noisy
    }
  }
}
```

---

## 8. Session Replay Configuration

### 8.1 Privacy Level: **Medium** (Default)

- ✅ Masks all form inputs (names, phones)
- ✅ Captures UI interactions for debugging
- ✅ Appropriate for student ministry data

### 8.2 Additional CSS Masking

```css
/* Add to elements showing student names */
.student-name { }
[data-amp-mask] { }

/* Block sensitive areas entirely */
.amp-block { }
```

### 8.3 Sample Rate Strategy

| Phase | Sample Rate | Rationale |
|-------|-------------|-----------|
| Launch | 100% | Max visibility for debugging |
| Month 2+ | 50% | Reduce volume, still good coverage |
| High volume | 10-25% | Statistical sampling sufficient |

---

## 9. Implementation

### 9.0 Critical: Initialization & Reliability

**Known Issues to Avoid:**
1. Events fire before SDK initialized → events lost
2. Events fire before org context is set → missing `org_slug`
3. Race conditions between auth and tracking

**Solution: Initialization Guard Pattern**

```typescript
// src/lib/amplitude/index.ts
import * as amplitude from '@amplitude/unified';

let isInitialized = false;
let initPromise: Promise<void> | null = null;
const eventQueue: Array<{ event: string; props: Record<string, unknown> }> = [];

export async function initAmplitude(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = amplitude.initAll(
    process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY!,
    {
      analytics: {
        autocapture: {
          pageViews: true,
          sessions: true,
          elementInteractions: false,
          formInteractions: false,
        },
      },
      sessionReplay: {
        sampleRate: 1, // 100% initially
      },
    }
  ).then(() => {
    isInitialized = true;
    // Flush queued events
    eventQueue.forEach(({ event, props }) => {
      amplitude.track(event, props);
    });
    eventQueue.length = 0;
  });

  return initPromise;
}

export function isAmplitudeReady(): boolean {
  return isInitialized;
}

// Safe track function that queues if not ready
export function safeTrack(event: string, props: Record<string, unknown>): void {
  if (isInitialized) {
    amplitude.track(event, props);
  } else {
    eventQueue.push({ event, props });
    // Also try to init if not already
    initAmplitude();
  }
}
```

**Solution: Context Provider Pattern**

```typescript
// src/lib/amplitude/context.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initAmplitude, isAmplitudeReady } from './index';

interface AmplitudeContextType {
  isReady: boolean;
  orgSlug: string | null;
  orgId: string | null;
}

const AmplitudeContext = createContext<AmplitudeContextType>({
  isReady: false,
  orgSlug: null,
  orgId: null,
});

export function AmplitudeProvider({
  children,
  orgSlug,
  orgId,
}: {
  children: ReactNode;
  orgSlug: string | null;
  orgId: string | null;
}) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initAmplitude().then(() => {
      setIsReady(true);
    });
  }, []);

  return (
    <AmplitudeContext.Provider value={{ isReady, orgSlug, orgId }}>
      {children}
    </AmplitudeContext.Provider>
  );
}

export function useAmplitude() {
  return useContext(AmplitudeContext);
}
```

**Solution: Standard Properties Hook**

```typescript
// src/lib/amplitude/hooks.ts
'use client';

import { useAmplitude } from './context';
import { safeTrack } from './index';
import { usePathname } from 'next/navigation';

export function useTrack() {
  const { orgSlug, orgId } = useAmplitude();
  const pathname = usePathname();
  const adminUserId = useAuthUserId(); // Your auth hook

  return (event: string, eventProps: Record<string, unknown> = {}) => {
    // ALWAYS include standard properties
    const standardProps = {
      org_slug: orgSlug,
      org_id: orgId,
      app_version: process.env.NEXT_PUBLIC_APP_VERSION || 'dev',
      page_path: pathname,
      admin_user_id: adminUserId || null,
    };

    safeTrack(event, {
      ...standardProps,
      ...eventProps,
    });
  };
}

// Usage in components:
// const track = useTrack();
// track('Check In Completed', { student_id: '...', is_duplicate: false });
```

**Key Principles:**
1. **Never call `amplitude.track()` directly** - Always use `safeTrack()` or `useTrack()`
2. **Standard properties are merged automatically** - Can't forget them
3. **Events queue if SDK not ready** - No lost events
4. **Context provides org info** - No missing org_slug

**Verification:**
```typescript
// In development, add this to catch issues:
if (process.env.NODE_ENV === 'development') {
  if (!props.org_slug) {
    console.warn(`[Amplitude] Event "${event}" missing org_slug!`);
  }
}
```

### 9.1 File Structure

```
docs/
└── AMPLITUDE.md            # This document (taxonomy reference)

src/lib/amplitude/
├── index.ts                # SDK init, safeTrack, queue management
├── context.tsx             # AmplitudeProvider, useAmplitude hook
├── hooks.ts                # useTrack hook (standard props auto-merged)
├── events.ts               # Event name constants (EVENTS object)
├── properties.ts           # TypeScript types for properties
├── user.ts                 # User property setters (setOrgContext, setDeviceContext)
└── track-functions.ts      # Type-safe wrappers (trackCheckInCompleted, etc.)
```

**File Responsibilities:**

| File | Purpose | When to Modify |
|------|---------|----------------|
| `index.ts` | Core SDK setup | Rarely - only for SDK config changes |
| `context.tsx` | React context for org info | When adding new context values |
| `hooks.ts` | `useTrack()` hook | When adding new standard properties |
| `events.ts` | Event name constants | When adding new events |
| `properties.ts` | TypeScript types | When adding new properties |
| `track-functions.ts` | Type-safe wrappers | When adding new events (optional) |

### 9.2 Event Constants (Prevents Typos)

```typescript
// src/lib/amplitude/events.ts
export const EVENTS = {
  // Check-in
  CHECK_IN_PAGE_VIEWED: 'Check In Page Viewed',
  STUDENT_SEARCHED: 'Student Searched',
  STUDENT_SELECTED: 'Student Selected',
  CHECK_IN_CONFIRMED: 'Check In Confirmed',
  CHECK_IN_COMPLETED: 'Check In Completed',
  REGISTRATION_STARTED: 'Registration Started',
  REGISTRATION_COMPLETED: 'Registration Completed',
  REGISTRATION_ABANDONED: 'Registration Abandoned',

  // Dashboard
  DASHBOARD_VIEWED: 'Dashboard Viewed',
  LEADERBOARD_VIEWED: 'Leaderboard Viewed',
  BELONGING_SPECTRUM_VIEWED: 'Belonging Spectrum Viewed',
  BELONGING_LEVEL_DRILLED: 'Belonging Level Drilled',

  // People
  PEOPLE_PAGE_VIEWED: 'People Page Viewed',
  STUDENT_PROFILE_VIEWED: 'Student Profile Viewed',
  PROFILE_TAB_CHANGED: 'Profile Tab Changed',

  // Groups
  GROUPS_PAGE_VIEWED: 'Groups Page Viewed',
  GROUP_VIEWED: 'Group Viewed',
  GROUP_CREATED: 'Group Created',
  MEMBER_ADDED: 'Member Added',
  MEMBER_REMOVED: 'Member Removed',

  // Pastoral
  SMS_SENT: 'SMS Sent',
  NOTE_CREATED: 'Note Created',
  RECOMMENDATION_VIEWED: 'Recommendation Viewed',
  RECOMMENDATION_ACTIONED: 'Recommendation Actioned',
  RECOMMENDATION_DISMISSED: 'Recommendation Dismissed',

  // Tools
  IMPORT_STARTED: 'Import Started',
  IMPORT_COMPLETED: 'Import Completed',
  DUPLICATE_DETECTION_RUN: 'Duplicate Detection Run',
  DUPLICATE_MERGED: 'Duplicate Merged',
  ATTENDANCE_CLEANUP_STARTED: 'Attendance Cleanup Started',
  ATTENDANCE_CLEANUP_COMPLETED: 'Attendance Cleanup Completed',
  DEVICE_CREATED: 'Device Created',

  // Settings
  SETTINGS_VIEWED: 'Settings Viewed',
  THEME_CHANGED: 'Theme Changed',
  TEAM_MEMBER_INVITED: 'Team Member Invited',

  // Org Lifecycle
  FIRST_DEVICE_CREATED: 'First Device Created',
  FIRST_IMPORT_COMPLETED: 'First Import Completed',
  FIRST_CHECK_IN_COMPLETED: 'First Check In Completed',
} as const;

export type EventName = typeof EVENTS[keyof typeof EVENTS];
```

### 9.3 Type-Safe Tracking Functions

```typescript
// src/lib/amplitude/track.ts
import * as amplitude from '@amplitude/unified';
import { EVENTS } from './events';

// Check-in events
export function trackCheckInCompleted(props: {
  student_id: string;
  is_duplicate: boolean;
  points_earned?: number;
}) {
  amplitude.track(EVENTS.CHECK_IN_COMPLETED, props);
}

export function trackStudentSearched(props: {
  search_term_length: number;
  result_count?: number;
}) {
  amplitude.track(EVENTS.STUDENT_SEARCHED, props);
}

// Profile events
export function trackStudentProfileViewed(props: {
  student_id: string;
  source: 'search' | 'leaderboard' | 'group' | 'recommendation' | 'belonging_drilldown';
}) {
  amplitude.track(EVENTS.STUDENT_PROFILE_VIEWED, props);
}

// ... etc for all events
```

### 9.4 User Property Helpers

```typescript
// src/lib/amplitude/user.ts
import * as amplitude from '@amplitude/unified';

export function setOrgContext(orgId: string, orgSlug: string, role: string) {
  amplitude.setUserId(orgId); // For authenticated users
  amplitude.identify({
    organization_id: orgId,
    organization_slug: orgSlug,
    role,
    is_public_session: false,
  });
}

export function setDeviceContext(deviceId: string, deviceName: string) {
  amplitude.setUserId(deviceId); // Device as user for public check-in
  amplitude.identify({
    device_id: deviceId,
    device_name: deviceName,
    is_public_session: true,
  });
}
```

---

## 10. Design Decisions (Finalized)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Public check-in identity** | Device as Amplitude user | `device_id` becomes the user ID. All check-ins from "Front Door iPad" grouped. `student_id` is event property. |
| **Authenticated identity** | Org ID as Amplitude user | Org-level analytics by default. |
| **Individual admin analysis** | Hybrid approach | `admin_user_id` as event property allows drilling into individual admin behavior when needed. |
| **Standard properties** | 5 required on every event | `org_slug`, `org_id`, `app_version`, `page_path`, `admin_user_id` |
| **Staging vs Production** | Separate Amplitude projects | Different API keys for complete data isolation. No filtering needed. |
| **Registration tracking** | Start + Complete only | Clean funnel. No per-field tracking. |
| **Error tracking** | Sentry only | Amplitude stays clean. Errors to Sentry. |
| **Gamification events** | Milestones only | `Achievement Unlocked`, `Rank Changed`. Skip individual points. |
| **Group events** | Yes, track them | Understand admin workflows. |
| **Org lifecycle events** | "First X" pattern | Track org onboarding journey. |
| **Initialization** | Queue + Guard pattern | Events queue if SDK not ready. No lost events. |
| **Property enforcement** | useTrack() hook | Standard properties merged automatically. Can't forget them. |
| **Documentation location** | `docs/AMPLITUDE.md` | Easy reference for all team members. |

### Environment Configuration

```bash
# .env.local (staging/development)
NEXT_PUBLIC_AMPLITUDE_API_KEY=staging_api_key_here
NEXT_PUBLIC_APP_VERSION=dev

# .env.production (production)
NEXT_PUBLIC_AMPLITUDE_API_KEY=production_api_key_here
NEXT_PUBLIC_APP_VERSION=1.0.0

# Vercel environment variables
# Set different AMPLITUDE_API_KEY for each environment
```

**Amplitude Project Setup:**
1. Create "Seedling - Production" project in Amplitude
2. Create "Seedling - Staging" project in Amplitude
3. Use different API keys in each environment
4. Production data stays clean, staging can be messy

---

## 11. Implementation Phases

### Phase 1: Foundation
1. Install `@amplitude/unified`
2. Create `src/lib/amplitude/` directory structure
3. Initialize SDK in root layout
4. Set up environment variables

### Phase 2: Check-in Flow (Highest Priority)
1. `Check In Page Viewed`
2. `Student Searched`
3. `Student Selected`
4. `Check In Completed`
5. `Registration Started/Completed`
6. Device context setup

### Phase 3: Admin Dashboard
1. `Dashboard Viewed`
2. `Leaderboard Viewed`
3. `Belonging Spectrum Viewed`
4. `Student Profile Viewed`

### Phase 4: Org Tools
1. Import events
2. Merge events
3. Attendance cleanup events
4. Device events

### Phase 5: Groups & Pastoral
1. Group view/create/edit events
2. SMS/Note events
3. Recommendation events

### Phase 6: Settings & Lifecycle
1. Settings events
2. "First X" org lifecycle events
3. Team member events

---

## 12. Verification Checklist

### Pre-Implementation
- [ ] Create "Seedling - Production" project in Amplitude
- [ ] Create "Seedling - Staging" project in Amplitude
- [ ] Get API keys for both projects
- [ ] Add `NEXT_PUBLIC_AMPLITUDE_API_KEY` to Vercel env vars (both envs)
- [ ] Add `NEXT_PUBLIC_APP_VERSION` to Vercel env vars

### Foundation (Test Immediately After Setup)
- [ ] SDK initializes without console errors
- [ ] First event appears in Amplitude Debugger (staging)
- [ ] User properties set correctly
- [ ] No events in production project from staging

### Initialization Reliability
- [ ] Events fired during page load are captured (not lost)
- [ ] Events fired before auth completes still have `org_slug`
- [ ] Queue mechanism works (test by delaying init)
- [ ] Console warning appears if `org_slug` is missing in dev mode

### Standard Properties (CRITICAL)
- [ ] Every event has `org_slug`
- [ ] Every event has `org_id`
- [ ] Every event has `app_version`
- [ ] Every event has `page_path`
- [ ] Authenticated events have `admin_user_id`
- [ ] Public events have `admin_user_id: null`

### Data Quality
- [ ] No PII in any event properties (spot check 10 events)
- [ ] All events follow `[Object] [Past-Tense Verb]` naming
- [ ] All properties follow `snake_case`
- [ ] Enum values are lowercase (e.g., `"gamified"` not `"Gamified"`)

### Coverage (Test Each Flow)
- [ ] Check-in funnel: Page Viewed → Searched → Selected → Confirmed → Completed
- [ ] Registration funnel: Started → Completed
- [ ] Admin dashboard: Viewed, Leaderboard Viewed
- [ ] Profile: Viewed, Tab Changed
- [ ] Tools: Import Started/Completed, Merge events

### Funnel Analysis (Validate in Amplitude)
- [ ] Can build check-in funnel chart
- [ ] Can segment by `org_slug`
- [ ] Can filter by `device_name`
- [ ] Can see individual admin activity via `admin_user_id`

### Session Replay
- [ ] Replays capture on check-in page
- [ ] Form inputs are masked (test with name/phone)
- [ ] Student names in lists are masked
- [ ] No PII visible in replay

### Production Verification
- [ ] Staging events stay in staging project
- [ ] Production events appear in production project
- [ ] No cross-contamination

---

## 13. Maintenance & Evolution

### Adding New Events

1. Add event name to `events.ts`
2. Create typed tracking function in `track.ts`
3. Document in this file (Section 4)
4. Add to verification checklist

### Adding New Properties

1. Add to property reference (Section 5.2)
2. Update TypeScript types
3. Document allowed values

### Deprecating Events

1. Mark as deprecated in `events.ts` with comment
2. Remove from docs after 90 days
3. Never reuse event names

---

*Last Updated: January 29, 2026*
*Maintainer: Engineering Team*
