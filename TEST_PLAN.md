# Test Plan: Seedling Insights Multi-Org SaaS

## Overview

High-level test plan to verify the Multi-Org SaaS implementation before launching Customer #2.

**Note**: The full Product Vision document will be saved to `PRODUCT_VISION.md` in the project root after exiting plan mode.

---

## 1. Authentication & Access Control

### Login Flow
- [ ] `/auth` - Can enter email, receive OTP code
- [ ] After successful login, redirects to `/setup`
- [ ] `/setup` correctly routes to user's org dashboard (`/{org}/dashboard`)

### No-Access Scenarios
- [ ] New user with no org membership sees "No Organization Access" page
- [ ] Pending invitation is auto-accepted on login
- [ ] After accepting invite, user is redirected to org dashboard

### Role-Based Access
- [ ] Super admin can access `/admin` routes
- [ ] Non-super-admin redirected away from `/admin`
- [ ] Org admin can access Settings → Team, Import, Organization
- [ ] Viewer/Leader cannot access admin-only settings

---

## 2. Path-Based Org Routing

### URL Structure
- [ ] `/{org-slug}/dashboard` loads correctly
- [ ] `/{org-slug}/students` loads correctly
- [ ] `/{org-slug}/analytics` loads correctly
- [ ] `/{org-slug}/pastoral` loads correctly
- [ ] `/{org-slug}/settings` loads correctly
- [ ] Invalid org slug shows error or redirects appropriately

### Organization Context
- [ ] Sidebar shows correct org name (display_name)
- [ ] Switching orgs via sidebar updates URL path
- [ ] All sidebar nav links include org prefix
- [ ] "View All" buttons on dashboard use org-prefixed paths

### Cross-Org Isolation
- [ ] User A in Org-A cannot access `/org-b/dashboard`
- [ ] User A only sees Org-A's students
- [ ] User A only sees Org-A's analytics data
- [ ] Super admin can switch between all orgs

---

## 3. Public Check-in Page

### Basic Functionality
- [ ] `/{org-slug}` loads public check-in page (no auth required)
- [ ] Shows org's display name prominently
- [ ] Student search works correctly
- [ ] Check-in creates record in correct organization

### Theming
- [ ] Theme colors apply to page (primary/accent)
- [ ] "Powered by Seedling Insights" footer visible

### Check-in Styles
- [ ] Gamified style shows JRPG-themed flow
- [ ] Standard style shows simple check-in (if implemented)

---

## 4. CSV Import

### Upload Flow
- [ ] Drag-drop upload works
- [ ] File browse upload works
- [ ] Accepts valid CSV files
- [ ] Rejects non-CSV files gracefully

### Column Mapping
- [ ] Auto-detects common column names
- [ ] All required fields (first_name, last_name) can be mapped
- [ ] Optional fields map correctly
- [ ] Can change mappings via dropdown
- [ ] Duplicate mappings prevented

### Preview
- [ ] Shows first 10 rows of data
- [ ] Displays mapped field names correctly
- [ ] Shows total count of students to import

### Import Execution
- [ ] Import button triggers API call
- [ ] Success message shows count imported
- [ ] Partial success shows errors + count
- [ ] Students appear in Students list after import
- [ ] Game stats created for new students

### Permission Check
- [ ] Only admins/owners can access import
- [ ] API rejects requests from unauthorized users

---

## 5. Organization Settings

### Display Name
- [ ] Current display name shown in input
- [ ] Can update display name
- [ ] Changes reflected in sidebar immediately

### Theme Selection
- [ ] All 6 themes visible as swatches
- [ ] Current theme highlighted
- [ ] Selecting theme updates org
- [ ] Theme applies to public check-in page

### Check-in Style
- [ ] Current style selected
- [ ] Can switch between gamified/standard/minimal
- [ ] Changes apply to public check-in page

### Save Behavior
- [ ] Success toast after saving
- [ ] Changes persist after page refresh

---

## 6. Dashboard & Analytics

### Dashboard Stats
- [ ] Total Students shows correct count for org
- [ ] Check-ins Today shows org-specific data
- [ ] Daily Average calculated correctly
- [ ] Needs Attention count accurate

### Pastoral Queue
- [ ] Shows recommendations for org's students only
- [ ] "View All" links to `/{org}/pastoral`

### Leaderboard
- [ ] Shows org's students only
- [ ] "View All" links to `/{org}/analytics`

### Weekly Trend Chart
- [ ] Data reflects org's check-ins only

---

## 7. Team Management

- [ ] Can invite new member via email
- [ ] Invited user receives email
- [ ] Role assignment works (admin/leader/viewer)
- [ ] Can remove team members
- [ ] Cannot remove self as owner

---

## 8. Branding & Copy

### Platform Branding
- [ ] "Seedling Insights" appears in login page
- [ ] "Seedling Insights" in browser tab title
- [ ] "Seedling Insights" in setup page

### Org Branding
- [ ] Sidebar header shows org display_name
- [ ] Public check-in shows org display_name

### Encouraging Language
- [ ] Empty states use friendly copy (not clinical)
- [ ] Success messages are celebratory

---

## 9. Multi-Org Scenario (End-to-End)

### Setup New Org
1. [ ] Super admin creates org via `/admin/organizations/new`
2. [ ] Set slug, display name, theme
3. [ ] Navigate to `/{new-org}/settings/team`
4. [ ] Invite customer as owner
5. [ ] Navigate to `/{new-org}/settings/import`
6. [ ] Upload CSV roster
7. [ ] Verify import success

### Customer Experience
1. [ ] Customer receives invite email
2. [ ] Customer logs in at `/auth`
3. [ ] Auto-routed to their org dashboard
4. [ ] Sees their org name, theme, students
5. [ ] Cannot access other org's data

### Super Admin Experience
1. [ ] Can see org switcher
2. [ ] Can switch to Org A, see Org A data
3. [ ] Can switch to Org B, see Org B data
4. [ ] Can access `/admin` for all orgs

---

## 10. Edge Cases

- [ ] Org with no students - shows friendly empty state
- [ ] Org with no check-ins today - correct messaging
- [ ] User removed from org - cannot access anymore
- [ ] Invalid org in URL - appropriate error handling
- [ ] Session expired - redirects to login

---

## Quick Verification Commands

```bash
# Build check (no errors)
npm run build

# Dev server
npm run dev

# Test URLs:
# - http://localhost:3000/auth
# - http://localhost:3000/setup
# - http://localhost:3000/echo-students/dashboard
# - http://localhost:3000/echo-students (public check-in)
# - http://localhost:3000/admin
```

---

## Notes

- Focus on org isolation - this is critical for multi-tenant SaaS
- Test with at least 2 orgs to verify separation
- Check browser console for errors during all tests

---

## Next Step After Approval

Create `PRODUCT_VISION.md` in project root with the full product vision document (Soul of the App, Design Principles, AI Superpowers, Future Phases, etc.)
