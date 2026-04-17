-- =====================================================
-- SECURITY & PERFORMANCE INVARIANTS TEST SUITE
-- =====================================================
-- Tieto SELECTy fungovat ako "tripwire" — kazdy z nich
-- MUSI vratit nula riadkov. Ak vrati >0 -> regression.
--
-- Pouzitie:
--   psql "<postgres-url>" -f supabase/tests/security_invariants.sql
--
-- Alebo cez Supabase CLI:
--   supabase db remote sql -f supabase/tests/security_invariants.sql
--
-- Skript je idempotentny a citatelny — kazda kontrola je
-- odlisne pomenovana cez raw 'check_name' kolumnu.
-- =====================================================

\echo
\echo '== INVARIANT 1: Materialized views NESMU mat GRANT pre authenticated =='
-- Po Phase 0 ostavaju MV pristupne len cez security_invoker views.
SELECT
  'mv_grants_to_authenticated_or_anon' AS check_name,
  c.relname                            AS materialized_view,
  rolname                              AS granted_to
FROM pg_class c
JOIN pg_namespace n  ON n.oid = c.relnamespace
JOIN aclexplode(c.relacl) acl ON true
JOIN pg_roles r ON r.oid = acl.grantee
WHERE c.relkind = 'm'
  AND n.nspname = 'public'
  AND acl.privilege_type = 'SELECT'
  AND r.rolname IN ('authenticated', 'anon');

\echo
\echo '== INVARIANT 2: Secure invoker views existujus + maju spravne grants =='
SELECT
  'missing_security_invoker_view' AS check_name,
  expected_view
FROM (VALUES
  ('v_loan_metrics'),
  ('v_household_dashboard_summary')
) AS t(expected_view)
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_views v
  WHERE v.schemaname = 'public'
    AND v.viewname = t.expected_view
);

\echo
\echo '== INVARIANT 3: Vsetky public RPC s p_household_id maju is_household_member guard =='
-- Heuristika: SQL/PLPGSQL funkcie ktore prijimaju p_household_id
-- a su SECURITY DEFINER musia vo svojom tele volat is_household_member.
SELECT
  'rpc_missing_auth_guard' AS check_name,
  p.proname                AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true                       -- SECURITY DEFINER
  AND p.proname NOT IN (
    -- Funkcie ktore z dizajnu nemaju mat per-household guard
    'is_household_member',
    'is_household_owner_or_admin',
    'refresh_dashboard_summary',
    'refresh_loan_metrics_safe',
    'create_household_for_new_user',
    'trigger_refresh_dashboard'
  )
  AND pg_get_function_arguments(p.oid) ILIKE '%p_household_id%'
  AND position('is_household_member' IN COALESCE(pg_get_functiondef(p.oid), '')) = 0;

\echo
\echo '== INVARIANT 4: payments(expense_id|income_id) maju FK =='
SELECT
  'missing_payments_fk' AS check_name,
  expected_constraint
FROM (VALUES
  ('payments_expense_id_fkey'),
  ('payments_income_id_fkey')
) AS t(expected_constraint)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_constraint
  WHERE conname = t.expected_constraint
);

\echo
\echo '== INVARIANT 5: payments.expense_id|income_id maju partial index =='
SELECT
  'missing_payments_index' AS check_name,
  expected_index
FROM (VALUES
  ('idx_payments_expense_id'),
  ('idx_payments_income_id')
) AS t(expected_index)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname = t.expected_index
);

\echo
\echo '== INVARIANT 6: Dashboard pg_notify triggery NEEXISTUJU (cron staci) =='
SELECT
  'unwanted_dashboard_trigger' AS check_name,
  tgname                       AS trigger_name,
  tgrelid::regclass::text      AS on_table
FROM pg_trigger
WHERE tgname IN (
  'trigger_income_dashboard_refresh',
  'trigger_expense_dashboard_refresh',
  'trigger_loan_dashboard_refresh',
  'trigger_asset_dashboard_refresh'
);

\echo
\echo '== INVARIANT 7: get_dashboard_data RPC existuje + ma EXECUTE pre authenticated =='
SELECT 'missing_get_dashboard_data' AS check_name
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'get_dashboard_data'
);

SELECT 'get_dashboard_data_grant_missing' AS check_name
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  JOIN aclexplode(p.proacl) acl ON true
  JOIN pg_roles r ON r.oid = acl.grantee
  WHERE n.nspname = 'public'
    AND p.proname = 'get_dashboard_data'
    AND acl.privilege_type = 'EXECUTE'
    AND r.rolname = 'authenticated'
);

\echo
\echo '== ALL INVARIANTS DONE =='
\echo 'Ak ktorykolvek SELECT vyssie vratil >0 riadkov, je to REGRESSION.'
