-- =====================================================
-- SECURITY HOTFIX: REVOKE direct access to MVs
-- =====================================================
-- Materialized views nepodliehaju RLS. Kto ma autenticated rolu
-- (t.j. kazdy prihlaseny user) by mohol cez supabase-js volat
--   supabase.from('loan_metrics').select('*')
-- a ziskat agregaty VSETKYCH domacnosti.
--
-- Riesenie:
--  1. Odobrat priamy SELECT na MV pre rolu authenticated
--  2. Aplikacia uz pouziva v_loan_metrics / v_household_dashboard_summary
--     (security_invoker views ktore filtruju cez household_members)
--  3. service_role si zachovava plny pristup (cron refresh, server-side jobs)
--
-- Vplyv:
--  - Ziadny pre normalnu prevadzku (vsetky API routes preslo na v_*)
--  - Ak by niektora cesta este pouzivala from('loan_metrics'), spadne
--    s permission denied -> okamzite viditelne v Sentry
-- =====================================================

REVOKE SELECT ON public.loan_metrics FROM authenticated;
REVOKE SELECT ON public.loan_metrics FROM anon;

REVOKE SELECT ON public.mv_household_dashboard_summary FROM authenticated;
REVOKE SELECT ON public.mv_household_dashboard_summary FROM anon;

-- service_role potrebuje pristup pre cron refresh a admin queries
GRANT SELECT ON public.loan_metrics TO service_role;
GRANT SELECT ON public.mv_household_dashboard_summary TO service_role;

-- Komentare aby buduci developeri vedeli
COMMENT ON MATERIALIZED VIEW public.loan_metrics IS
  'INTERNAL: pristup len cez v_loan_metrics view (security_invoker) alebo service_role. authenticated rola NEMA priamy SELECT.';

COMMENT ON MATERIALIZED VIEW public.mv_household_dashboard_summary IS
  'INTERNAL: pristup len cez v_household_dashboard_summary view (security_invoker) alebo service_role. authenticated rola NEMA priamy SELECT.';
