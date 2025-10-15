# SQL Fixes for Production

This directory contains SQL patches and utilities for the ESS Check-in System.

## 🚀 Core Production Deployment (Run Once, In Order)

If deploying to a fresh production environment, run these files in this exact order:

1. **profile-functions.sql** - Core profile page functions
2. **FINAL-fix-game-profile.sql** - Fix game profile function
3. **fix-get-or-create-stats.sql** - Fix student stats creation (critical!)
4. **fix-process-checkin-rewards.sql** - Fix achievement awards and gamification
5. **award-first-checkin-retroactively.sql** - Award "Welcome to the Family" achievement to existing students
6. **lock-down-checkins.sql** - Remove public read access to check_ins table (security)
7. **add-profile-pin.sql** - Add PIN column and verification function
8. **fix-idempotent-simple.sql** - Make check-ins idempotent (one per day) + PIN support

**Status:** These have been tested and are currently running in production.

---

## 📊 Recent Updates (Apply After Core Deployment)

### Pastoral Analytics System
- **create-pastoral-analytics-function.sql** - ~~Creates `get_pastoral_analytics()` function~~ (SUPERSEDED - in archive/)
- **update-ultra-core-threshold.sql** - ~~Updates Ultra-Core definition~~ (SUPERSEDED - in archive/)
- **fix-priority-score-logic.sql** - **⚠️ CRITICAL FIX - APPLY IMMEDIATELY** - Fixes priority score bug

**CRITICAL:** `fix-priority-score-logic.sql` fixes a bug where urgent students (Missing, On Fringe) were sorted LAST instead of FIRST due to inverted priority scores. This is a **data correctness issue** that affects pastoral care prioritization.

### Check-in System
- **fix-checkin-race-condition.sql** - **⚠️ IMPORTANT - APPLY AFTER CORE** - Handles concurrent check-in race conditions

**Important:** Adds exception handling for simultaneous check-ins from multiple devices. Prevents unhandled unique constraint violations.

### AI Recommendations System
- **setup-automated-recommendations.sql** - Creates tables and policies for AI-powered pastoral recommendations
- **add-recommendation-history-tracking.sql** - Adds history tracking and dismissal features

### Check-in Import Tool
- **add-checkin-import-function.sql** - Adds function for importing historical check-ins from CSV

### Student Email Management
- **add-get-student-email-function.sql** - Function to retrieve student email addresses
- **add-update-student-email-function.sql** - Function to update student email addresses

### Address Fields
- **add-address-fields.sql** - Adds address fields to students table

---

## 🛠️ Utilities (Run As Needed)

### Diagnostic & Cleanup
- **check-and-clean-duplicates.sql** - Identifies and optionally removes duplicate check-ins (multiple per day per student)
  - **When to use:** If you suspect duplicate check-ins in your database
  - **Safe to run:** Yes, it shows duplicates first before any deletion

---

## 🔍 RECENT AUDIT FINDINGS (2025-10-14)

A deep code audit was performed and found 3 critical issues with fixes:

1. **fix-priority-score-logic.sql** - CRITICAL: Priority scores were inverted
   - **Impact:** Urgent students (Missing, On Fringe) appeared last instead of first
   - **Status:** ✅ Fixed - Apply immediately to production

2. **fix-checkin-race-condition.sql** - HIGH: Race condition in concurrent check-ins
   - **Impact:** Simultaneous check-ins could cause unhandled exception
   - **Status:** ✅ Fixed - Apply after core deployment

3. **ErrorBoundary component** - React error handling
   - **Impact:** App crashed completely on any JS error
   - **Status:** ✅ Fixed - Already in codebase, deploy with next release

See `/AUDIT_REPORT.md` for complete details.

---

## 📁 Archive Folder

Old iterations, experimental fixes, and superseded files have been moved to `/archive/`. These are kept for reference but should not be used in production.

---

## 🔐 Security Notes

- Profile access requires a 4-digit PIN (generated on check-in)
- Check-ins table is not publicly readable (locked down by RLS policies)
- All functions use `SECURITY DEFINER` with proper validation
- Students can only view their own data via secure functions

---

## 📖 Key Database Functions

After running core deployment, your database will have these main functions:

- `get_pastoral_analytics()` - Returns comprehensive pastoral analytics for all students
- `search_student_for_checkin(search_term)` - Flexible search by phone/name/email
- `checkin_student(p_student_id)` - Idempotent check-in with PIN generation
- `verify_profile_pin(p_student_id, p_pin)` - PIN verification for profile access
- `process_checkin_rewards(p_student_id, p_checkin_id)` - Calculate and award gamification rewards
- `get_or_create_student_stats(p_student_id)` - Initialize stats record if not exists
- `import_historical_checkin(p_phone, p_checked_in_at, p_found_name)` - Import historical check-ins

---

## 🆘 Troubleshooting

**Problem:** Function signature change errors
**Solution:** Drop the function first (e.g., `DROP FUNCTION IF EXISTS public.get_pastoral_analytics();`)

**Problem:** Duplicate check-ins in database
**Solution:** Run `check-and-clean-duplicates.sql` to identify and clean them up

**Problem:** Students not earning achievements
**Solution:** Ensure `fix-get-or-create-stats.sql` and `fix-process-checkin-rewards.sql` have been applied

---

## 📝 Development Notes

- Files are organized by feature/purpose
- Each file is idempotent where possible (safe to re-run)
- Comments in each file explain what it does and why
- Test on staging before applying to production
