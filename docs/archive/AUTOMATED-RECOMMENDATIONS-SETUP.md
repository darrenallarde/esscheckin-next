# Automated AI Recommendations Setup

This system automatically generates AI-powered pastoral recommendations every **Thursday at 6:00 AM** and **Monday at 6:00 AM**.

## How It Works

1. **Thursday Morning (6 AM)**: Generate fresh recommendations before midweek youth group
2. **Monday Morning (6 AM)**: Generate recommendations after Sunday service

The system:
- Fetches the current curriculum
- Analyzes all students' attendance patterns
- Generates personalized recommendations using Claude AI
- Saves recommendations to the database
- Shows up automatically on the Pastoral Dashboard

## Setup Instructions

### Step 1: Deploy the Edge Function

Deploy the Supabase Edge Function:

```bash
# From project root
supabase functions deploy generate-weekly-recommendations
```

### Step 2: Set Environment Variables

In your Supabase dashboard, go to **Settings → Edge Functions** and add these secrets:

- `ANTHROPIC_API_KEY`: Your Claude API key from console.anthropic.com
- `CRON_SECRET`: A random secret string for securing the cron endpoint (generate with `openssl rand -hex 32`)

### Step 3: Enable Required Extensions

In Supabase SQL Editor, run:

```sql
-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable http extension for calling edge functions
CREATE EXTENSION IF NOT EXISTS http;
```

### Step 4: Configure Settings

Set the required configuration in Supabase:

```sql
-- Set your Supabase project URL
ALTER DATABASE postgres SET app.settings.supabase_function_url = 'https://[your-project-ref].supabase.co/functions/v1';

-- Set the same CRON_SECRET you created in Step 2
ALTER DATABASE postgres SET app.settings.cron_secret = 'your-secret-here';
```

### Step 5: Schedule the Jobs

Run the SQL in `sql-fixes/setup-automated-recommendations.sql`:

```bash
# This sets up the Thursday and Monday 6 AM schedules
```

## Verify It's Working

### Check Scheduled Jobs

```sql
SELECT * FROM cron.job WHERE jobname LIKE '%recommendations%';
```

You should see:
- `thursday-morning-recommendations` - Runs at 6 AM every Thursday
- `monday-morning-recommendations` - Runs at 6 AM every Monday

### Manual Test

To test the system without waiting for the schedule:

```bash
# Call the edge function directly
curl -X POST \
  'https://[your-project-ref].supabase.co/functions/v1/generate-weekly-recommendations' \
  -H 'Authorization: Bearer [your-cron-secret]' \
  -H 'Content-Type: application/json'
```

Or from SQL:

```sql
SELECT public.trigger_recommendation_generation();
```

### View Logs

In Supabase dashboard:
- Go to **Edge Functions → generate-weekly-recommendations → Logs**
- Check for successful generation messages

## Timezone Considerations

**IMPORTANT**: Supabase cron jobs run in **UTC time**.

- If you want 6 AM Eastern (EST/EDT):
  - EST (winter): Use `11 6` in cron (6 AM + 5 hours)
  - EDT (summer): Use `10 6` in cron (6 AM + 4 hours)

- If you want 6 AM Pacific (PST/PDT):
  - PST (winter): Use `14 6` in cron (6 AM + 8 hours)
  - PDT (summer): Use `13 6` in cron (6 AM + 7 hours)

To adjust the timezone, update the cron schedule:

```sql
-- For 6 AM Pacific Time (adjust hour for your timezone)
SELECT cron.schedule(
  'thursday-morning-recommendations',
  '0 14 * * 4',  -- 14:00 UTC = 6:00 AM PST
  'SELECT public.trigger_recommendation_generation();'
);
```

## Monitoring & Troubleshooting

### Check Recent Recommendations

```sql
SELECT
  COUNT(*) as total_recommendations,
  MAX(generated_at) as last_generated
FROM ai_recommendations
WHERE DATE(generated_at) = CURRENT_DATE;
```

### View Errors

```sql
-- Check Edge Function logs in Supabase dashboard
-- Edge Functions → Logs → Filter by error
```

### Common Issues

1. **No recommendations generated**
   - Check that curriculum is set as "current" in curriculum_weeks table
   - Verify ANTHROPIC_API_KEY is set correctly
   - Check Edge Function logs for errors

2. **Unauthorized errors**
   - Verify CRON_SECRET matches between SQL settings and Edge Function environment

3. **Rate limiting**
   - System waits 1 second between each student to avoid rate limits
   - For large groups (50+ students), generation may take ~1 minute

## Cost Estimates

With Claude 3.5 Sonnet:
- ~$0.002 per student per generation
- For 50 students, 2x per week = ~$0.20/week = ~$10/month

## Disabling Automatic Generation

To temporarily disable:

```sql
-- Pause the schedules
SELECT cron.unschedule('thursday-morning-recommendations');
SELECT cron.unschedule('monday-morning-recommendations');
```

To re-enable, just run the schedule commands again from Step 5.

## Manual Generation

You can always generate recommendations manually from the Pastoral Dashboard UI by clicking "Generate AI Recommendations" - this is independent of the scheduled jobs.
