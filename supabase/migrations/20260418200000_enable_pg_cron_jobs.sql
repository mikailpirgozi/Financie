-- =====================================================
-- Enable pg_cron + pg_net and schedule recurring jobs:
--   1. monthly-close            – 1st day of month, 02:00 UTC (03:00/04:00 SK)
--   2. loan-due-reminder        – every day at 06:00 UTC (07:00/08:00 SK)
--   3. refresh_loan_metrics     – every 5 minutes
--   4. refresh_dashboard_summary – every 15 minutes
--
-- Idempotent: each cron.schedule call is wrapped so re-applying the migration
-- replaces the job instead of failing on the unique-name constraint.
--
-- Configuration: the edge function callouts read the project URL + service
-- role key from custom GUCs `app.settings.supabase_url` and
-- `app.settings.service_role_key`. Set them in the Supabase dashboard
-- (Database → Settings → Custom Postgres Config) BEFORE running this migration
-- — without them the HTTP requests will fail loudly inside cron and the job
-- output will be visible in cron.job_run_details.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Helper: idempotent schedule. Drops existing job with the same name and
-- recreates it under the supplied cron expression + SQL command.
CREATE OR REPLACE FUNCTION public.schedule_or_replace_cron_job(
  p_job_name text,
  p_schedule text,
  p_command text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_existing_jobid bigint;
BEGIN
  SELECT jobid INTO v_existing_jobid
    FROM cron.job
   WHERE jobname = p_job_name;

  IF v_existing_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_existing_jobid);
  END IF;

  PERFORM cron.schedule(p_job_name, p_schedule, p_command);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.schedule_or_replace_cron_job(text, text, text)
  FROM PUBLIC, authenticated, anon;

-- ---------------------------------------------------------------------------
-- 1. Materialised-view refreshers (run inside Postgres — no HTTP needed).
-- ---------------------------------------------------------------------------
SELECT public.schedule_or_replace_cron_job(
  'refresh-loan-metrics',
  '*/5 * * * *',
  $cmd$SELECT public.refresh_loan_metrics_safe();$cmd$
);

SELECT public.schedule_or_replace_cron_job(
  'refresh-dashboard-summary',
  '*/15 * * * *',
  $cmd$SELECT public.refresh_dashboard_summary();$cmd$
);

-- ---------------------------------------------------------------------------
-- 2. Edge-function triggers via pg_net.
--    Each request authenticates with the service role key (read from a custom
--    GUC) so the edge function can use the elevated client to write across all
--    households.
-- ---------------------------------------------------------------------------
SELECT public.schedule_or_replace_cron_job(
  'monthly-close',
  '0 2 1 * *',  -- 02:00 UTC on day 1
  $cmd$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true)
           || '/functions/v1/monthly-close',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer '
        || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cmd$
);

SELECT public.schedule_or_replace_cron_job(
  'loan-due-reminder',
  '0 6 * * *',  -- 06:00 UTC every day
  $cmd$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true)
           || '/functions/v1/loan-due-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer '
        || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cmd$
);

-- ---------------------------------------------------------------------------
-- Visibility helper: anyone with the service role can list scheduled jobs +
-- their last few runs to debug failures.
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA cron TO service_role;
GRANT SELECT ON cron.job TO service_role;
GRANT SELECT ON cron.job_run_details TO service_role;

COMMENT ON FUNCTION public.schedule_or_replace_cron_job(text, text, text) IS
  'Idempotent wrapper around cron.schedule — drops the existing job with the '
  'same name (if any) and recreates it. Keeps migrations replay-safe.';
