-- Setup automated AI recommendation generation
-- Runs every Thursday at 6:00 AM and Monday at 6:00 AM

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to call the edge function
CREATE OR REPLACE FUNCTION public.trigger_recommendation_generation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_function_url TEXT;
  v_cron_secret TEXT;
  v_response TEXT;
BEGIN
  -- Get the Supabase project URL and secret
  -- NOTE: These need to be set as Supabase secrets
  v_function_url := current_setting('app.settings.supabase_function_url', true);
  v_cron_secret := current_setting('app.settings.cron_secret', true);

  -- Call the edge function using http extension
  -- This requires the http extension to be enabled
  SELECT content::text INTO v_response
  FROM http((
    'POST',
    v_function_url || '/generate-weekly-recommendations',
    ARRAY[http_header('Authorization', 'Bearer ' || v_cron_secret)],
    'application/json',
    '{}'
  )::http_request);

  -- Log the response
  RAISE NOTICE 'Recommendation generation triggered: %', v_response;
END;
$$;

-- Schedule the job to run every Thursday at 6:00 AM Pacific Time
-- Cron format: minute hour day month weekday
-- 6 AM PT = 2 PM UTC (14:00) in summer (PDT), 1 PM UTC (13:00) in winter (PST)
-- Using 1 PM UTC (13:00) as a compromise to work year-round
SELECT cron.schedule(
  'thursday-morning-recommendations',
  '0 13 * * 4',  -- Every Thursday at 1:00 PM UTC = ~6:00 AM Pacific
  'SELECT public.trigger_recommendation_generation();'
);

-- Schedule the job to run every Monday at 6:00 AM Pacific Time
SELECT cron.schedule(
  'monday-morning-recommendations',
  '0 13 * * 1',  -- Every Monday at 1:00 PM UTC = ~6:00 AM Pacific
  'SELECT public.trigger_recommendation_generation();'
);

-- View scheduled jobs
SELECT * FROM cron.job WHERE jobname LIKE '%recommendations%';

-- To manually trigger (for testing):
-- SELECT public.trigger_recommendation_generation();

-- To remove a schedule:
-- SELECT cron.unschedule('thursday-morning-recommendations');
-- SELECT cron.unschedule('monday-morning-recommendations');

COMMENT ON FUNCTION public.trigger_recommendation_generation IS 'Triggers the Edge Function to generate AI recommendations for all students';
