# Security Architecture

## Philosophy

We believe security should be invisible to legitimate users. Students checking in should never feel friction, while bad actors should silently fail.

**Core Principles:**
- No visible CAPTCHA - friction kills engagement
- Silent enforcement - never reveal detection to attackers
- Platform defaults with org flexibility - safe by default
- Ministry-appropriate modes - student groups need flexibility, adult groups can be rigid

---

## Public Check-In Protection

The public check-in page (`/{org-slug}/checkin`) is designed for iPads at events where students walk up and check in with just their name. This creates a unique security challenge: we need open access for legitimate users while preventing abuse.

### Bot Prevention (No CAPTCHA)

We use invisible techniques that don't add friction for real users:

#### Honeypot Fields
Invisible form fields that humans never see or fill, but bots auto-fill when programmatically submitting forms.

```tsx
// Hidden field - bots fill it, humans don't
<input
  type="text"
  name="website"
  value={honeypot}
  onChange={(e) => setHoneypot(e.target.value)}
  style={{ position: 'absolute', left: '-9999px' }}
  tabIndex={-1}
  autoComplete="off"
/>
```

If `honeypot` has any value on submit → reject silently.

#### Timing Analysis
Humans take time to read and fill forms. Bots submit instantly.

- Search form: Reject if submitted < 2 seconds after load
- Registration form: Reject if submitted < 5 seconds after load
- Silent enforcement: Show "Processing..." delay instead of error

#### Rate Limiting (Phase 2)
Per-IP request limits to prevent spam attacks:

| Endpoint | Limit |
|----------|-------|
| Check-in search | 20/minute/IP |
| Check-in submit | 10/minute/IP |
| New registration | 5/minute/IP |

### Duplicate Prevention

One check-in per student per day per organization, enforced at the database level:

```sql
CREATE UNIQUE INDEX check_ins_one_per_day
ON check_ins (student_id, organization_id, (checked_in_at::date));
```

When a duplicate is attempted:
- RPC returns success with `already_checked_in: true`
- UI shows friendly message: "You've already checked in today!"
- No error - feels like a feature, not a rejection

### Silent Enforcement

When suspicious activity is detected, we never reveal it:

| Detection | Response |
|-----------|----------|
| Honeypot filled | Show "Processing..." for 3 seconds, then silently fail |
| Too fast | Show "Processing..." for 3 seconds, then silently fail |
| Rate limited | Show "Please wait..." with artificial delay |
| Duplicate | Show friendly "Already checked in!" message |

Bad actors learn nothing about our detection methods.

---

## Check-In Modes

Different ministry types have different needs. Organizations choose their mode at setup:

### Mode A: Kiosk (Student Ministry)
**Use Case:** iPads at youth events, students walk up and check in

- Public check-in page, no auth required
- Self-registration allowed (new students can sign up on the spot)
- Gamification enabled (points, ranks, achievements)
- Security: Honeypot + timing + rate limiting + duplicate prevention

### Mode B: Leader-Marked Attendance
**Use Case:** Adult small groups, Bible studies

- No public check-in page
- Leader logs in and marks who attended
- Member list with toggle: Present / Absent
- More structured, zero bot exposure

### Mode C: Self-Report (Future)
**Use Case:** Adult groups wanting member engagement

- After meeting, members receive SMS/email: "Did you attend?"
- One-tap response: Yes / No / Couldn't make it
- Token-based links with time expiration
- Leader sees consolidated responses

### Mode D: App Check-In (Future)
**Use Case:** Tech-forward congregations

- Mobile app with location awareness
- "Check in" button appears when near venue during meeting time
- Push notifications for meeting reminders
- Full gamification experience on mobile

---

## Authentication & Authorization

### Authentication Method
- **Email OTP** (One-Time Password) via Supabase Auth
- No passwords to steal or remember
- User enters email → receives 6-digit code → verified

### Authorization Hierarchy

```
owner > admin > leader > viewer

owner:  Full access including team management and org deletion
admin:  Can manage team, students, settings (but not delete org)
leader: Can view students, take attendance, see pastoral data
viewer: Read-only access to dashboards
```

### Row-Level Security (RLS)
All database tables use Postgres RLS policies:

```sql
-- Students are visible only to their organization's members
CREATE POLICY "students_visible_to_org_members"
ON students FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);
```

### Organization Isolation
- Users only see data for organizations they belong to
- API calls are scoped by organization membership
- Super admins can access all organizations (for platform support)

---

## Data Protection

### Encryption
- **At rest:** All Supabase data encrypted (AES-256)
- **In transit:** HTTPS everywhere (TLS 1.3)
- **Backups:** Encrypted and stored redundantly

### Minimal Data Exposure
Public check-in search returns only:
- `student_id`, `first_name`, `last_name`, `user_type`, `grade`, `high_school`

**Not exposed publicly:**
- Phone numbers
- Email addresses
- Home addresses
- Parent contact info (only visible to authenticated leaders)

### Sensitive Data Handling
- Parent contact info protected by RLS
- Email/phone used for deduplication but not displayed publicly
- Profile PIN generated for mobile access (alternative to email login)

---

## Incident Response

### Suspicious Activity Alerting (Phase 2)
Automatic notifications when patterns detected:

| Pattern | Alert |
|---------|-------|
| 10+ failed searches from same IP | Notify org admin |
| 5+ registrations in 5 minutes | Notify org admin |
| Unusual name patterns (gibberish) | Flag for review |
| Same phone/email on multiple registrations | Flag as potential duplicate |

### Admin Controls
- View security events in dashboard
- Ability to block specific IPs (if needed)
- Audit log of all check-ins and registrations

---

## Security Checklist for Development

When adding new features:

- [ ] Does it expose any new public endpoints?
- [ ] Are all database queries scoped by organization?
- [ ] Is RLS applied to any new tables?
- [ ] Are inputs validated on both frontend and backend?
- [ ] Is sensitive data excluded from public responses?
- [ ] Could this be abused by bots/spam?

---

## Questions?

Security is everyone's responsibility. If you see something that doesn't look right, speak up. We'd rather fix a false positive than miss a real issue.
