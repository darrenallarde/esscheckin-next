# SQL Fixes for Production Deployment

Run these SQL files in production Supabase in this exact order:

1. **profile-functions.sql** - Profile page functions
2. **FINAL-fix-game-profile.sql** - Fix game profile function
3. **fix-get-or-create-stats.sql** - Fix student stats creation (critical!)
4. **fix-process-checkin-rewards.sql** - Fix achievement awards
5. **award-first-checkin-retroactively.sql** - Award "Welcome to the Family" to existing students

## Notes
- All files have been tested on staging
- Run them in order to avoid dependency issues
- File #3 fixes the root cause of achievement errors
- File #5 is a one-time retroactive fix
