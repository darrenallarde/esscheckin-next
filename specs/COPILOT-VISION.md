# The AI Pastoral Co-Pilot: Architecture & Capabilities

> Companion to `specs/VISION.md` — the detailed "how" behind the "what."

This document describes SheepDoggo's multi-signal intelligence model, six core capabilities, use cases, and competitive positioning. It's written for product thinkers, engineers, and partners who want to understand what makes the co-pilot work.

---

## The Multi-Signal Data Architecture

SheepDoggo's power comes from synthesis. No single signal tells you who needs care. But when you connect 8+ signals, patterns emerge that no human could track across 100 students.

```
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │  Check-ins   │  │     SMS      │  │   Prayer     │
  │  (attendance │  │ (two-way     │  │  (requests,  │
  │   patterns)  │  │  messaging)  │  │   prayed-for)│
  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
         │                 │                 │
  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐
  │ Devotional   │  │   Groups     │  │  Engagement  │
  │ (opened,     │  │ (membership, │  │  (points,    │
  │  reflected,  │  │  roles,      │  │   streaks,   │
  │  prayed,     │  │  attendance) │  │   rank)      │
  │  journaled)  │  │              │  │              │
  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
         │                 │                 │
  ┌──────┴───────┐  ┌──────┴───────┐         │
  │   Surveys    │  │  Calendar    │         │
  │ (maturity,   │  │ (events,     │         │
  │  interests)  │  │  deadlines)  │         │
  └──────┬───────┘  └──────┬───────┘         │
         │                 │                 │
         └────────┬────────┴────────┬────────┘
                  │                 │
          ┌───────▼─────────────────▼───────┐
          │                                 │
          │    CO-PILOT INTELLIGENCE ENGINE  │
          │                                 │
          └──┬──────────┬──────────┬────────┘
             │          │          │
     ┌───────▼──┐ ┌─────▼────┐ ┌──▼────────┐
     │ Pastoral │ │Segmented │ │  Proactive │
     │  Recs    │ │ Outreach │ │   Alerts   │
     └──────────┘ └──────────┘ └────────────┘
```

### Signal Inventory

| #   | Signal                    | What It Captures                                              | What It Tells the Co-Pilot                                      | Status  | Database Anchor                                                                                            |
| --- | ------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | **Check-in Data**         | Attendance dates, frequency, recency                          | Belonging spectrum tier, streak patterns, absence alerts        | Built   | `check_ins`, `get_pastoral_analytics()`                                                                    |
| 2   | **SMS Conversations**     | Two-way text messages, response times                         | Communication patterns, responsiveness, conversation sentiment  | Built   | `sms_messages`, `sms_sessions`                                                                             |
| 3   | **Prayer Data**           | Prayer requests submitted, who prayed for whom                | Spiritual needs, community care networks, recurring themes      | Built   | `prayer_requests`, `prayer_responses`                                                                      |
| 4   | **Devotional Engagement** | Opened, reflected, prayed, journaled timestamps               | Spiritual engagement depth, consistency, growth trajectory      | Built   | `devotional_engagements` (no `created_at` — uses `opened_at`, `reflected_at`, `prayed_at`, `journaled_at`) |
| 5   | **Group Participation**   | Memberships, roles (leader/member), group check-ins           | Social connectedness, leadership readiness, isolation risk      | Built   | `group_memberships`, `groups`                                                                              |
| 6   | **Engagement Scoring**    | Points, streaks, achievements, rank tier                      | Gamified commitment level, milestone celebrations               | Built   | `student_game_stats`, `student_achievements`, `game_transactions`                                          |
| 7   | **Survey/Profile Data**   | Spiritual maturity, interests, family context, learning style | Personalization, phase-appropriate outreach, family awareness   | Partial | `student_profiles_extended`                                                                                |
| 8   | **Calendar/Events**       | Upcoming events, registration status, deadlines               | Timely invitations, event-specific outreach, seasonal awareness | Planned | —                                                                                                          |
| 9   | **Parent Interactions**   | Guardian communication, family link activity                  | Family engagement as leading indicator, parent-pastor bridge    | Planned | `parent_student_links` (structure exists, signal pipeline planned)                                         |

---

## How Signals Combine — The Synthesis Model

The co-pilot's value isn't in any single signal. It's in how signals combine to tell a story no one signal could tell alone. Here are four concrete examples:

### Example 1: Winter Camp Segmentation

**Signals:** Check-ins + SMS + Belonging Spectrum

A pastor needs to invite students to winter camp. Today they'd send one blast text. The co-pilot segments automatically:

| Segment                    | Students | Signal Logic                                                         | Suggested Action                                                                                                                                  |
| -------------------------- | -------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Broadcast**              | 30       | Ultra-Core + Core. Checked in 3+ times in last month. Active in SMS. | One broadcast: "Winter camp registration is open! Link below."                                                                                    |
| **Warm Invite**            | 30       | Connected. Checked in 1-2 times recently. Some SMS activity.         | Personalized template: "Hey {name}, we'd love to see you at camp — it's going to be awesome."                                                     |
| **Personal Re-engagement** | 40       | On the Fringe + Missing. 30+ days absent. No recent texts.           | Individual draft per student with context: "Hey Sarah, we haven't seen you in a while and we miss you. Camp would be a great way to reconnect..." |

**Time saved:** 3+ hours of manual segmentation. **Students reached:** All 100, each appropriately.

### Example 2: Prayer Request Escalation

**Signals:** Prayer + Check-ins + Devotional Engagement

A student submits a prayer request: "Please pray for my parents." On its own, this could be routine. But the co-pilot notices:

- This student hasn't checked in for 2 weeks (was previously weekly)
- Their devotional engagement dropped — opened but didn't reflect or pray
- This is the second heavy prayer request in a month

**Co-pilot action:** Elevates from "pray for them" to "call this student today." Drafts a message: _"Hey Marcus, I saw your prayer request and I've been thinking about you. Can we grab coffee this week?"_ Includes a prayer prompt for the pastor before reaching out.

### Example 3: Leadership Pipeline

**Signals:** Engagement Scoring + Groups + Devotional Depth

A student hits the "Champion" rank (1000+ points). The co-pilot also sees:

- They're a member in 2 groups but not a leader in any
- Their devotional engagement is deep — consistently journaling, not just opening
- They've been Ultra-Core for 3 consecutive months

**Co-pilot action:** Surfaces a leadership conversation card: _"Taylor might be ready for a leadership role. They've been deeply consistent for 3 months and they're engaging spiritually at a mature level. Consider inviting them to lead a small group."_

### Example 4: The Silent Student

**Signals:** SMS + Check-ins

A student who normally replies to texts within hours hasn't responded in 5 days. They also broke their 8-week check-in streak on Wednesday.

Either signal alone might not raise an alarm. Together, it's unusual.

**Co-pilot action:** Surfaces a care alert: _"Jordan hasn't replied to texts in 5 days and missed Wednesday for the first time in 2 months. This is unusual for them. Consider a personal call or ask their group leader to check in."_

---

## The Six Capabilities

### 1. Smart Segmented Outreach

**What it does:** Automatically segments your ministry into contextual groups for any outreach need — event invitations, follow-ups, seasonal messages.

**Today:** Leaders manually decide who gets what message, or blast the same text to everyone.

**With the co-pilot:** The AI pre-segments based on belonging status, recent engagement, communication history, and context. Each segment gets a tailored message template. The pastor reviews and sends.

**Key insight:** The same event invitation should sound different for an Ultra-Core student (brief, excited) vs. a Missing student (warm, personal, no pressure).

### 2. Proactive Care Alerts — "Who Needs Me Today"

**What it does:** Surfaces a curated list of students who need pastoral attention, ranked by urgency, with context and suggested actions.

**Today:** Leaders notice who's missing when they happen to think about it. People fall through the cracks.

**With the co-pilot:** Every morning (or when you open the app), you see 3-5 students who need you. Each card explains _why_ they were surfaced and includes a one-click action. The AI refreshes this list as signals change.

**Prioritization factors:**

- Attendance pattern breaks (streak interruption, sudden absence)
- Unanswered texts (unusual non-response)
- Heavy prayer requests (escalation keywords, frequency)
- Belonging spectrum transitions (Core → Fringe, Connected → Missing)
- Time since last pastoral contact

### 3. Prayer-Driven Insights

**What it does:** Connects the prayer wall to pastoral intelligence. Prayer requests become data the co-pilot uses to inform outreach, not just items on a list.

**Today:** Prayer requests live in a separate silo. A leader might pray for a request without connecting it to attendance patterns or outreach history.

**With the co-pilot:** When a student submits "Pray for my family," the co-pilot cross-references their attendance, devotional engagement, and text history. It surfaces a holistic picture: _"Marcus asked for prayer about his family. He's also been less consistent in check-ins and devotionals this month. This may be connected."_

### 4. Natural Language Analytics

**What it does:** Lets pastors ask questions in plain English and get answers with recommendations — no dashboards, no filters, no SQL.

**Today (Built — Insights V2):** Leaders type questions like "Show me all 8th graders who joined in the last 2 months" and get results with AI-generated recommendations.

**With the co-pilot:** The AI adds pastoral context to every answer. Not just "here are 7 students" but "these are your newest 8th graders — they're still figuring out if they belong. Consider having a leader personally check in with each one this week."

**Technical architecture:** User question → Claude API generates safe SQL → TypeScript validator → `run_insights_query` RPC (org-scoped, read-only, 5s timeout) → Dynamic column rendering. See `docs/architecture.md` for the 4-layer safety model.

### 5. Automated Follow-up Workflows

**What it does:** Handles the follow-up sequences that pastors mean to do but forget — new student welcome, absence follow-up, birthday outreach, post-event check-ins.

**Today:** Pastors try to remember to follow up. Some use sticky notes. Most things slip.

**With the co-pilot:** The system tracks what's been promised and what's pending. Three days after a leader said "I'll follow up with Marcus," a gentle reminder surfaces. A new student's 3rd visit triggers a celebration prompt. A birthday next week generates a suggested message.

**Key principle:** AI drafts, humans approve. The pastor is always in the loop. Nothing sends without their review.

### 6. Multi-Signal Student Context — "The Co-Pilot Knows"

**What it does:** When a pastor opens any student's profile, the co-pilot has already synthesized all available signals into a brief, readable summary.

**Today:** A leader clicks a student and sees fields — name, grade, phone, group. Static data.

**With the co-pilot:** The profile shows a narrative summary: _"Sarah is a Core student in HS Girls who's been consistent for 6 weeks. She journaled twice this month and prayed for 3 classmates. Her mom texted asking about winter camp. She's thriving — celebrate her."_

---

## Use Case Gallery

### Monday Morning Briefing

The pastor opens SheepDoggo on Monday morning with coffee. The home screen shows:

- **3 care alerts:** Two students who missed Wednesday + one with a new prayer request
- **1 celebration:** A student hit a 10-week streak
- **Upcoming:** Winter retreat registration closes Friday — 12 students haven't signed up yet

Total time: 5 minutes. The pastor's week is organized.

### Winter Camp Outreach

Registration opened today. The co-pilot pre-segments all students into three tiers (see Synthesis Example 1). For each tier, a message template is ready. The pastor reviews, tweaks a few names, and sends. 100 students reached in 15 minutes with appropriate personalization.

### New Student Welcome

A new student checks in for the first time. The co-pilot starts a 4-week welcome sequence:

- **Day 0:** Group leader gets a card: "New student! Here's what we know about them."
- **Day 3:** Reminder to the leader: "How's the new student settling in?"
- **Week 2:** Prompt: "Ask them how you can pray for them."
- **Week 4:** "They've been consistent! Time to celebrate them."

The leader approves each step. The co-pilot remembers what the leader forgets.

### Prayer Crisis Response

A student's prayer request includes the word "scared." The co-pilot flags it as elevated urgency, cross-references their recent engagement (declining), and surfaces it to the leader with: _"This seems urgent. Consider calling today rather than texting."_ Includes a prayer prompt first.

### End-of-Semester Report

A ministry leader asks: "How did our 8th graders do this semester?" The co-pilot generates a narrative summary — not a spreadsheet. _"Your 8th grade group grew from 12 to 18 students. 4 moved from Connected to Core. 2 haven't been seen since October — here are their names. Overall engagement is up 15% from last semester."_

### The Parent Touch

A guardian texts asking about an upcoming event. The co-pilot connects this to the student's profile and alerts the group leader: _"Jordan's mom asked about winter camp. Jordan hasn't signed up yet. This might be a good moment to reach out to Jordan directly."_

---

## Competitive Positioning

| Capability                  | Planning Center  | Rock RMS          | Pushpay/CCB | **SheepDoggo**                 |
| --------------------------- | ---------------- | ----------------- | ----------- | ------------------------------ |
| Check-in                    | Yes              | Yes               | Yes         | **Yes**                        |
| Attendance tracking         | Yes              | Yes               | Yes         | **Yes**                        |
| Two-way messaging           | No               | Plugin            | Basic       | **Built-in**                   |
| Devotional engagement       | No               | No                | No          | **Built-in**                   |
| Prayer request tracking     | No               | No                | No          | **Built-in**                   |
| AI pastoral recommendations | No               | No                | No          | **Core feature**               |
| Natural language queries    | No               | No                | No          | **Built-in**                   |
| Smart audience segmentation | Manual filters   | Workflow-based    | Manual      | **AI-powered**                 |
| Automated care workflows    | Manual workflows | Complex workflows | Basic       | **AI-drafted, human-approved** |
| Youth-specific design       | Partial          | No                | No          | **Purpose-built**              |
| Gamified check-in           | No               | No                | No          | **JRPG theme**                 |
| Engagement scoring          | No               | No                | No          | **Built-in**                   |

**The key differentiator:**

> Planning Center tells you who came. Rock RMS lets you build a workflow for what happens next (if you're technical enough). **SheepDoggo tells you who needs you, why, and what to say — and it already wrote the message.**

Planning Center and Rock are infrastructure. SheepDoggo is intelligence.

---

## The Belonging Spectrum as Foundation

Every co-pilot recommendation is viewed through the lens of the Belonging Spectrum — a 5-tier model that describes where each student sits in their connection to the ministry.

| Tier              | Criteria                          | What It Means                | Co-Pilot Response                                                 |
| ----------------- | --------------------------------- | ---------------------------- | ----------------------------------------------------------------- |
| **Ultra-Core**    | 5+ check-ins in 4 weeks           | The heartbeat. Always there. | Celebrate. Identify leadership potential. Don't take for granted. |
| **Core**          | ~1x/week over 8 weeks             | Consistent. Belongs.         | Affirm. Invite to serve. Connect with peers.                      |
| **Connected**     | 2-3x in 8 weeks                   | Coming but not committed.    | Warm follow-up. Invite to groups. Build social ties.              |
| **On the Fringe** | Inconsistent or 30-60 days absent | Drifting.                    | Personal outreach. Ask what's going on. No guilt.                 |
| **Missing**       | 60+ days absent or never attended | Gone or unknown.             | Gentle re-engagement. Parent outreach. Respect boundaries.        |

**Transitions are triggers.** When a student moves from Core to On the Fringe, the co-pilot surfaces an alert. When someone moves from Connected to Core, it surfaces a celebration. The spectrum isn't a label — it's a living indicator that drives action.

**Database anchor:** Calculated by `get_pastoral_analytics()` RPC using check-in frequency over rolling 4-week and 8-week windows.

---

## Architecture for Engineers

SheepDoggo's technical architecture has four layers:

| Layer                  | Technology                      | Purpose                                                                                                                     |
| ---------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Data Layer**         | Supabase PostgreSQL + RLS       | Multi-tenant storage. Every query scoped by `organization_id`. Row Level Security on every table.                           |
| **Intelligence Layer** | Anthropic Claude API            | Generates pastoral recommendations, interprets natural language queries, drafts messages, synthesizes multi-signal context. |
| **Query Layer**        | Insights V2 (SQL generation)    | Natural language → safe SQL → org-scoped execution. 4-layer safety model prevents injection/exfiltration.                   |
| **Integration Layer**  | Twilio + Resend + ChMS adapters | SMS (two-way), email (invitations), ChMS sync (Rock/PCO/CCB import + write-back).                                           |

**Key architectural decisions:**

- Auth is only on the devotional page (`/d/[id]`). Check-in is fully public (no login required).
- Phone OTP uses a custom flow, not Supabase Auth phone provider.
- All AI recommendations are generated server-side. The client never calls the Anthropic API directly.
- The `insights_people` view has no direct GRANT — only accessible via SECURITY DEFINER RPC.

For full technical details, see: `docs/architecture.md`, `docs/database.md`, `docs/security.md`, `docs/api-reference.md`.

---

## Phased Rollout

### Phase 1: Foundation (Complete)

Everything needed to run a ministry digitally:

- Public check-in kiosk with JRPG gamification
- Belonging spectrum (5-tier engagement model)
- AI pastoral recommendations with prayer prompts
- Two-way SMS messaging with NPC routing
- Public devotional pages with student auth
- Prayer requests and prayer wall
- Natural language analytics (Insights V2)
- Group management with per-group streaks
- CSV import and ChMS integration (Rock/PCO/CCB)
- Multi-org SaaS with RLS isolation

### Phase 2: Co-Pilot Core (Next)

The intelligence layer that transforms data into action:

- **Daily care alerts** — "Who needs me today" with prioritized urgency
- **Smart segmented outreach** — AI-powered audience segmentation for any message
- **Prayer → AI pipeline** — Prayer request themes inform recommendation context
- **SMS sentiment analysis** — Detect tone shifts in student text conversations
- **Auto-drafted follow-ups** — 4-week new student welcome, absence follow-up, birthday messages
- **Student profile narrative** — AI-generated summary of every student's current state

### Phase 3: Full Intelligence (Future)

The fully autonomous co-pilot:

- **Calendar integration** — Event-aware outreach (camp registration, semester transitions)
- **Parent tracking** — Guardian communication as a first-class pastoral signal
- **Surveys** — Spiritual maturity assessments that feed the intelligence model
- **Automated workflow execution** — Approved sequences that run without daily review
- **Cross-signal trend detection** — "Your 8th graders are showing a pattern of declining engagement"
- **Multi-channel outreach** — Email, Instagram DM suggestions, parent texts alongside student texts
- **Learning from outcomes** — Which outreach messages get responses? The AI adapts.

---

## Design Principles for Co-Pilot Features

Every co-pilot feature must follow these principles:

1. **Human-in-the-loop always.** AI drafts, humans approve. No message sends without a pastor reviewing it. Trust is earned one approved message at a time.

2. **Explain the "why" behind every recommendation.** Never just "reach out to Sarah." Always "reach out to Sarah — she hasn't been here in 3 weeks, her devotional engagement dropped, and she submitted a prayer request about her family."

3. **Prayer before action.** Every care alert includes a prayer prompt. The co-pilot invites reflection before outreach. We build pastors, not task managers.

4. **No jargon.** Pastoral language, not data language. "Students who could use some love" not "at-risk cohort with declining engagement metrics." See VISION.md for the full language guide.

5. **Graceful degradation.** The co-pilot works with whatever signals exist. A new org with only check-in data still gets useful recommendations. Each additional signal makes them richer, but none is required.

---

_Last updated: February 2026_
