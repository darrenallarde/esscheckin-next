# AI Recommendations - TODO When You Return

## Current Status

✅ **COMPLETED:**
1. Fixed the `super_admin` vs `super-admin` typo issue (underscore not hyphen)
2. Updated AuthContext to handle multiple roles and prioritize highest permission level
3. Fixed `.single()` to `.maybeSingle()` for graceful handling of missing student profiles
4. Updated GenerateRecommendationsButton to call Edge Function instead of direct API
5. Pastoral Dashboard now works with `super_admin` role

🔄 **IN PROGRESS:**
Setting up proper Edge Function for AI recommendations (no more pasting API keys)

## What Needs to Be Done Next

### Step 1: Create the Edge Function (Copy/Paste Method)

Since you don't have Supabase CLI, you'll need to create the Edge Function via the Supabase dashboard:

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Edge Functions** in the left sidebar
4. Click **"Create a new function"**
5. Name it: `generate-recommendations`
6. Copy the entire contents of this file into the function editor:
   - File: `/home/darrenallarde/echo/esscheckin/supabase/functions/generate-weekly-recommendations/index.ts`
7. Click **"Deploy"**

### Step 2: Set Environment Secrets

In Supabase dashboard → **Edge Functions** → **Settings**:

1. Add secret `ANTHROPIC_API_KEY`:
   - Get your API key from: https://console.anthropic.com/
   - Format: `sk-ant-...`

2. Add secret `CRON_SECRET` (optional, only needed for automated scheduling):
   - Generate a random string: Run `openssl rand -hex 32` in terminal
   - Or use any long random string

### Step 3: Deploy Frontend Changes

Commit and push these files (already updated):
- `src/contexts/AuthContext.tsx` - Now handles multiple roles
- `src/pages/PastoralDashboard.tsx` - Fixed `super_admin` checks
- `src/components/pastoral/GenerateRecommendationsButton.tsx` - Now calls Edge Function

### Step 4: Test

1. Log out and log back in to refresh auth
2. Go to `/admin/pastoral`
3. Click "Add Teaching" to set current curriculum
4. Click "Generate AI Recommendations"
5. **DO NOT** check "Use fallback" - it should call the Edge Function

## File Locations

**Edge Function Code:**
- `/home/darrenallarde/echo/esscheckin/supabase/functions/generate-weekly-recommendations/index.ts`

**SQL Files (if needed):**
- `/home/darrenallarde/echo/esscheckin/sql-fixes/add-super-admin-role-PART1.sql` (already ran)
- `/home/darrenallarde/echo/esscheckin/sql-fixes/add-super-admin-role-PART2.sql` (already ran)
- `/home/darrenallarde/echo/esscheckin/sql-fixes/fix-dallarde-role.sql` (already ran)

**Frontend Changes:**
- All changes are committed to git

## Common Issues & Solutions

### Issue: "Failed to fetch" error
**Solution:** Edge Function not deployed yet. Follow Step 1 above.

### Issue: "Unauthorized" error
**Solution:** ANTHROPIC_API_KEY not set. Follow Step 2 above.

### Issue: Still showing "student" role
**Solution:** Log out and log back in to refresh auth state.

### Issue: Getting blocked from Pastoral Dashboard
**Solution:** Make sure you ran `fix-dallarde-role.sql` to add `super_admin` role to your account.

## Automated Scheduling (Optional - For Later)

If you want recommendations to generate automatically on Thursday/Monday mornings:

1. Run SQL: `/home/darrenallarde/echo/esscheckin/sql-fixes/setup-automated-recommendations.sql`
2. This sets up cron jobs for 6 AM Pacific Time (Thursday & Monday)
3. Requires the Edge Function to be deployed first

## Questions to Address When You Return

1. What's Jeremy Lee's email? (You mentioned he should have student_leader role)
2. Do you want automated recommendations or manual-only?
3. Any other users who need role changes?

## Summary of What We Built Today

1. **Pastoral Insights Dashboard** - Shows all students with belonging spectrum (Ultra-Core to Missing)
2. **AI Recommendations** - Personalized pastoral actions using Claude AI
3. **Interactive Spectrum** - Click to filter, hover for details
4. **Context Always Visible** - No more hidden recommendations
5. **Automated Scheduling** - (Optional) Thursday/Monday 6 AM generation
6. **Better Prompts** - Specific, actionable recommendations with real data

Everything is ready - just need to deploy the Edge Function and set the API key!

---
**Last Updated:** Session ended 2025-10-14
**Status:** Ready to deploy Edge Function
