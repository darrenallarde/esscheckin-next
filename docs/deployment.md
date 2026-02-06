# ESS Check-in System - Deployment Guide

This guide walks through deploying the ESS Check-in System from scratch.

## Prerequisites

Before you begin, ensure you have:
- Node.js 18+ and npm installed
- A Supabase account ([supabase.com](https://supabase.com))
- (Optional) Anthropic API key for AI recommendations ([console.anthropic.com](https://console.anthropic.com))
- Git installed on your machine

## Step 1: Clone and Setup Repository

```bash
# Clone the repository
git clone <your-repo-url>
cd esscheckin

# Install dependencies
npm install
```

## Step 2: Create Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click "New project"
3. Choose your organization
4. Fill in project details:
   - **Name**: ESS Check-in (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users
5. Click "Create new project" and wait ~2 minutes for setup

## Step 3: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy these two values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

## Step 4: Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_ANTHROPIC_API_KEY=your_anthropic_key_here  # Optional for AI features
```

**Important:** Never commit `.env.local` to git (it's already in `.gitignore`)

## Step 5: Run Database Migrations

### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Option B: Manual SQL Execution

If you don't have the CLI, run migrations manually:

1. Go to **SQL Editor** in your Supabase dashboard
2. Run migrations from `/supabase/migrations/` in chronological order (sorted by filename)
3. Check for errors after each migration

## Step 6: Apply SQL Patches

After migrations, apply production patches from `/sql-fixes/` directory.

**IMPORTANT:** Follow the order specified in `/sql-fixes/README.md`

**Core patches (run once, in order):**
1. `profile-functions.sql`
2. `FINAL-fix-game-profile.sql`
3. `fix-get-or-create-stats.sql`
4. `fix-process-checkin-rewards.sql`
5. `award-first-checkin-retroactively.sql`
6. `lock-down-checkins.sql`
7. `add-profile-pin.sql`
8. `fix-idempotent-simple.sql`

**Recent feature additions (apply after core):**
- `create-pastoral-analytics-function.sql` - Pastoral dashboard
- `update-ultra-core-threshold.sql` - **LATEST** - Updated thresholds and attendance patterns
- `setup-automated-recommendations.sql` - AI recommendations system
- `add-checkin-import-function.sql` - Historical check-in import

**How to run:**
1. Go to **SQL Editor** in Supabase dashboard
2. Copy contents of each file
3. Paste and click "Run"
4. Verify no errors (some warnings are okay)

## Step 7: Create Your First Admin User

1. Run the development server: `npm run dev`
2. Visit `http://localhost:5173/auth`
3. Sign up with your email
4. Go to **Authentication** → **Users** in Supabase dashboard
5. Copy your user ID
6. Go to **SQL Editor** and run:

```sql
INSERT INTO user_roles (id, role)
VALUES ('your-user-id-here', 'admin');
```

7. Refresh the app - you should now have admin access!

## Step 8: Test Core Features

Before deploying, test these flows:

### Check-in Flow
1. Go to homepage (`/`)
2. Try checking in a new student
3. Fill out registration form
4. Verify success screen shows PIN
5. Try checking in same student again (should show same PIN, not create duplicate)

### Admin Dashboard
1. Log in and go to `/admin`
2. Verify dashboard loads
3. Check `/admin/analytics` - should show graphs
4. Check `/admin/pastoral` - should show belonging statuses

### Import Tools
1. Go to `/admin/import`
2. Test CSV import with sample data
3. Verify students appear in system

## Step 9: Deploy Frontend

### Option A: Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your repository
5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ANTHROPIC_API_KEY` (optional)
7. Click "Deploy"

### Option B: Netlify

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Select your repository
5. Configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Add environment variables in Site Settings → Environment Variables
7. Deploy

### Option C: Other Hosting

Build the project locally and upload `dist/` folder:

```bash
npm run build
# Upload contents of dist/ folder to your hosting provider
```

## Step 10: (Optional) Setup Automated AI Recommendations

If you want weekly automated recommendations:

### Deploy Edge Function

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy generate-weekly-recommendations

# Set environment variables
supabase secrets set ANTHROPIC_API_KEY=your_key_here
supabase secrets set CRON_SECRET=your_random_secret_here
```

### Schedule the Function

1. Go to **Database** → **Cron Jobs** in Supabase dashboard
2. Create new cron job:
   - **Name**: "Weekly Recommendations - Thursday"
   - **Schedule**: `0 6 * * 4` (6am every Thursday)
   - **Command**:
   ```sql
   SELECT
     net.http_post(
       url := 'https://your-project-ref.supabase.co/functions/v1/generate-weekly-recommendations',
       headers := jsonb_build_object('Authorization', 'Bearer ' || 'your-cron-secret-here'),
       body := '{}'::jsonb
     );
   ```
3. Repeat for Monday 6am (change schedule to `0 6 * * 1`)

## Step 11: Initial Data Setup

### Add Your First Curriculum Week

1. Go to `/admin/curriculum` in your deployed app
2. Click "Add Curriculum Week"
3. Fill in current teaching topic:
   - Series name
   - Topic title
   - Scripture reference
   - Big idea
   - Application challenge
   - Core truths
   - Faith skills
4. Mark as "Current Week"
5. Save

### Import Historical Data (Optional)

If you have historical data:

**Students:**
1. Go to `/admin/import`
2. Prepare CSV with columns: `phone_number`, `first_name`, `last_name`, `email`, `grade`, `high_school`, `parent_name`, `parent_phone`
3. Upload and import

**Historical Check-ins:**
1. Go to `/admin/import-checkins`
2. Prepare CSV with columns: `phone_number`, `timestamp`, `found_name` (optional)
3. Upload and import

## Troubleshooting

### Problem: "Failed to fetch" errors
**Solution:** Check your environment variables are correct and Supabase project is active

### Problem: Students not earning achievements
**Solution:** Ensure these patches have been applied:
- `fix-get-or-create-stats.sql`
- `fix-process-checkin-rewards.sql`

### Problem: Pastoral dashboard shows wrong data
**Solution:** Verify `update-ultra-core-threshold.sql` has been applied (supersedes older versions)

### Problem: AI recommendations not generating
**Solution:**
1. Check `VITE_ANTHROPIC_API_KEY` is set
2. Verify current curriculum week is set (marked as `is_current = true`)
3. Check browser console for API errors

### Problem: Can't log in as admin
**Solution:** Verify you've added your user to the `user_roles` table with `role = 'admin'`

## Post-Deployment Checklist

- [ ] Core check-in flow works (search, confirm, success with PIN)
- [ ] Gamification rewards display correctly
- [ ] Admin dashboard loads
- [ ] Analytics dashboard shows data
- [ ] Pastoral dashboard calculates belonging statuses
- [ ] Curriculum management works
- [ ] CSV import tools function
- [ ] (Optional) AI recommendations generate
- [ ] (Optional) Scheduled recommendations run

## Support & Maintenance

### Regular Tasks
- **Weekly:** Review pastoral dashboard, follow up with at-risk students
- **Weekly:** Update current curriculum week
- **Monthly:** Check analytics trends
- **As needed:** Import new students

### Backup Strategy
Your data is automatically backed up by Supabase. To export:
1. Go to **Database** → **Backups** in Supabase dashboard
2. Download backup or enable Point-in-Time Recovery

## Security Best Practices

- **Never** commit `.env.local` to git
- **Never** share your Supabase service role key (anon key is safe for frontend)
- **Always** use RLS policies (already configured in migrations)
- **Regularly** review user roles in admin dashboard
- **Keep** dependencies updated: `npm audit fix`

---

## Need Help?

- **Documentation:** See `CLAUDE.md` for architecture details
- **SQL Patches:** See `/sql-fixes/README.md` for database patch info
- **Database Schema:** Review `/supabase/migrations/` for table structures
- **Component Docs:** Check inline comments in key files

---

🎉 **Congratulations!** Your ESS Check-in System is deployed and ready to use!
