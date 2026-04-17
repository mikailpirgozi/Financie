# Supabase Migrations

## Overview

This directory contains all database migrations for the FinApp project.

## Important Notes

### RLS (Row Level Security) Migrations

The RLS policies went through several iterations to resolve infinite recursion issues. The final working solution is:

1. `20241021110000_drop_all_policies.sql` - Drops all existing RLS policies
2. `20241021110001_create_simple_policies.sql` - Creates the final, working RLS policies

**Historical migrations (superseded but kept for migration history):**

- `20241021000000_fix_rls_recursion.sql`
- `20241021000001_fix_rls_final.sql`
- `20241021000002_fix_rls_no_recursion.sql`
- `20241021000003_fix_rls_ultimate.sql`
- `20241021000004_rls_simple.sql`
- `20241021000005_rls_final_no_subquery.sql`
- `20241021100000_fix_rls_recursion_final.sql`

**DO NOT** delete these migrations as they are part of the migration history and have been applied to production.

### RLS Pattern Used

The final RLS implementation uses simple `EXISTS` subqueries without recursive function calls:

```sql
CREATE POLICY "table_select" ON table_name FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members
    WHERE household_members.household_id = table_name.household_id
    AND household_members.user_id = auth.uid()
  ));
```

### Migration Order

Migrations are applied in alphabetical order by filename. The timestamp prefix ensures correct ordering.

### Commands

```bash
# Apply all pending migrations
supabase db push

# Create a new migration
supabase migration new migration_name

# Reset database (CAUTION: destroys all data)
supabase db reset
```

## Migration Categories

| Category       | Migrations                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------ |
| Initial Schema | `20240101000000_initial_schema.sql`                                                        |
| RLS Policies   | `20240101000001_rls_policies.sql`, `20241021*`                                             |
| Features       | `20240102*` (push_tokens), `20240103*` (subscriptions, audit)                              |
| Dashboard      | `20241021130000_dashboard_functions.sql`, `20241102180000_dashboard_materialized_view.sql` |
| Loans          | `20241030_optimize_loans_performance.sql`, `20241102*_loan_metrics_rls.sql`                |
| Portfolio      | `20250103120000_portfolio_management.sql`, `20251103015957_add_portfolio_columns.sql`      |
| Cron jobs      | `20260418200000_enable_pg_cron_jobs.sql`                                                   |

## Scheduled jobs (pg_cron)

`20260418200000_enable_pg_cron_jobs.sql` enables `pg_cron` + `pg_net` and
schedules:

| Job                         | Cron               | What it runs                                |
| --------------------------- | ------------------ | ------------------------------------------- |
| `refresh-loan-metrics`      | every 5 min        | `SELECT public.refresh_loan_metrics_safe()` |
| `refresh-dashboard-summary` | every 15 min       | `SELECT public.refresh_dashboard_summary()` |
| `monthly-close`             | 02:00 UTC on day 1 | `POST /functions/v1/monthly-close`          |
| `loan-due-reminder`         | 06:00 UTC daily    | `POST /functions/v1/loan-due-reminder`      |

**One-time setup** — set the two custom GUCs in the Supabase dashboard
(Database → Settings → Custom Postgres Config) BEFORE applying the migration:

```text
app.settings.supabase_url     = https://<project-ref>.supabase.co
app.settings.service_role_key = <service-role-key-from-Settings/API>
```

Without them the HTTP-based jobs will fail. Logs:

```sql
SELECT jobname, status, return_message, start_time
  FROM cron.job_run_details
  ORDER BY start_time DESC
  LIMIT 20;
```
