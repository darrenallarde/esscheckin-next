# Roadmap

What's been built, what's in progress, and what's planned.

---

## Completed Features

### Core Platform (Q4 2025)
- [x] **Multi-tenant architecture** — Organizations with RLS isolation
- [x] **Authentication** — Supabase Auth with OTP and magic links
- [x] **JRPG Check-in kiosk** — Public check-in with fuzzy search
- [x] **Gamification system** — Points, ranks, achievements, leaderboards
- [x] **Dashboard** — Stats, trend charts, pastoral queue
- [x] **Analytics** — Attendance trends, engagement funnel, day breakdown
- [x] **Student directory** — Search, filter, profile modals
- [x] **Groups management** — Create groups, assign members and leaders

### Reliability & Tools (January 2026)
- [x] **Public check-in architecture** — No auth required for students
- [x] **Device tracking** — Named check-in devices with localStorage
- [x] **Sentry error tracking** — Client, server, and edge error capture
- [x] **Custom SMTP via Resend** — No more email rate limits
- [x] **Attendance cleanup tool** — Retroactive check-in entry
- [x] **Student merge tool** — Combine duplicate records
- [x] **Org tools hub** — Organized admin tools in Settings

### Pastoral Care (January 2026)
- [x] **Belonging Spectrum** — 5-tier engagement classification
- [x] **Green gradient visualization** — Single-hue engagement bar
- [x] **AI Recommendations** — Claude-powered pastoral insights
- [x] **Auto-generate on view** — Recommendations created on demand
- [x] **Today's check-ins modal** — Click stat card for attendee list
- [x] **Student pastoral tab** — Attendance pattern, AI rec, interactions

### SMS System (January 2026)
- [x] **Twilio integration** — Dedicated phone number
- [x] **Outbound messaging** — Send texts from profile
- [x] **Conversation threads** — iMessage-style display
- [x] **Database schema** — Messages, sessions tables
- [x] **Edge function scaffold** — receive-sms deployed

---

## In Progress

### SMS NPC Router (Priority 0)
Multi-organization SMS routing with conversational NPCs.

**Remaining work:**
- [ ] Complete NPC persona logic
- [ ] Group selection menu
- [ ] Session management
- [ ] Unknown phone handling
- [ ] Waiting room UI for unmatched numbers

### Documentation (Priority 1)
Comprehensive product documentation for Notion.

**Status:** 19/20 files created
- [x] Core docs (README, architecture, database, API, integrations)
- [x] Feature docs (all 12)
- [x] Roadmap
- [ ] Migration/archive of old docs

---

## Planned

### Q1 2026

**Pastoral Workflow**
- [ ] Kanban board for pastoral tasks
- [ ] Accept/complete recommendation flow
- [ ] Follow-up reminders
- [ ] Team assignment

**Curriculum Enhancement**
- [ ] Bulk import from CSV
- [ ] Auto-advance current week
- [ ] Discussion question export

**Analytics Improvements**
- [ ] CSV export
- [ ] Custom date ranges
- [ ] Drill-down from charts
- [ ] Email/Slack weekly digest

### Q2 2026

**Group Features**
- [ ] Group-specific check-in kiosks
- [ ] Group attendance reports
- [ ] Broadcast messaging to groups
- [ ] Sub-groups (small groups)

**SMS Enhancements**
- [ ] Message templates
- [ ] Scheduled messages
- [ ] MMS support (images)
- [ ] Opt-out handling

**Platform Scale**
- [ ] Multi-campus support
- [ ] Materialized views for analytics
- [ ] Rate limiting middleware

### Future Considerations

**Integrations**
- [ ] Planning Center sync
- [ ] Seedling.so prayer integration
- [ ] School attendance integration

**Student Experience**
- [ ] Student mobile app
- [ ] Achievement sharing
- [ ] Redeemable rewards store

**Platform Growth**
- [ ] Billing/subscription system
- [ ] Usage analytics per org
- [ ] White-label options

---

## Parked Items

Items considered but not currently prioritized:

| Item | Reason Parked |
|------|---------------|
| Facial recognition check-in | Privacy concerns, complexity |
| Parent portal | Focus on student/leader experience first |
| Volunteer scheduling | Out of scope for pastoral focus |
| Event management | Separate product concern |

---

## Technical Debt

Items to address when time permits:

- [ ] Add comprehensive test coverage
- [ ] Implement rate limiting
- [ ] Add offline mode for check-in
- [ ] Optimize pastoral analytics query
- [ ] Add database indexes for large orgs

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 1.0 | Q4 2025 | Initial launch: check-in, gamification, dashboard |
| 1.1 | Jan 2026 | Public check-in, device tracking, Sentry |
| 1.2 | Jan 2026 | Belonging spectrum, AI recommendations |
| 1.3 | Feb 2026 | Documentation, SMS router completion |

---

*Last updated: February 1, 2026*
