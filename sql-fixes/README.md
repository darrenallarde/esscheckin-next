# SQL Fixes for Production Deployment

Run these SQL files in production Supabase in this exact order:

1. **profile-functions.sql** - Profile page functions
2. **FINAL-fix-game-profile.sql** - Fix game profile function
3. **fix-get-or-create-stats.sql** - Fix student stats creation (critical!)
4. **fix-process-checkin-rewards.sql** - Fix achievement awards
5. **award-first-checkin-retroactively.sql** - Award "Welcome to the Family" to existing students
6. **lock-down-checkins.sql** - Remove public read access to check_ins table (security fix)
7. **add-profile-pin.sql** - Add PIN column and verification function
8. **~~update-checkin-functions-with-pin.sql~~** - SKIP THIS, use #9 instead
9. **make-checkins-idempotent.sql** - Make check-ins idempotent (only one per day) + PIN support

## Notes
- All files have been tested on staging
- Run them in order to avoid dependency issues
- File #3 fixes the root cause of achievement errors
- File #5 is a one-time retroactive fix
- Files #6-8 implement security improvements (PIN protection for profiles, locked check-ins table)

## Security Improvements
- Profile access now requires a 4-digit PIN
- PINs are generated on check-in and displayed to the student
- Check-ins table is no longer publicly readable
- Students can still see their own data via secure functions
