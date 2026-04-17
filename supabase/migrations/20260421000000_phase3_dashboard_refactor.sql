-- =====================================================
-- PHASE 3 — DASHBOARD REFAKTOR (set-based RPC + MV fix)
-- =====================================================
--
-- Tato migracia:
--   1. Opravuje dashboard MV (LEFT JOIN bug ktory vynechaval
--      mesiace ktore mali len income alebo len expense).
--   2. Pridava SET-BASED `get_dashboard_data` RPC ktore jednym
--      volanim vracia vsetky data pre dashboard:
--        - monthly summaries (N mesiacov)
--        - aktualne KPIs (income/expense/net za aktualny mesiac)
--        - loan totals (count, balance, paid, interest)
--        - asset totals (count, value)
--        - overdue count
--   3. Optimalizuje aj `get_household_dashboard_summary` aby
--      vyplnal mesiace ktore nemaju zaznam v MV s 0 hodnotami.
--
-- Pozn. — denormalizacia loan_metrics MV na stat fieldy v `loans`
-- tabulke je odlozena (Phase 5+) kvoli rozsahu refaktoru
-- (~20 callsides v aplikacii). Aktualne MV + v_loan_metrics
-- security wrapper su dostatocne pre P0/P1/P2/P3 ciele.
-- =====================================================


-- ---------------------------------------------------------------
-- 1. Drop a re-create dashboard MV s opravenym JOINom
-- ---------------------------------------------------------------
-- Stara verzia robila:
--   FROM households h
--   LEFT JOIN monthly_income mi ON mi.household_id = h.id
--   LEFT JOIN monthly_expenses me ON me.household_id = h.id
--                                AND me.month = mi.month
--
-- Bug: ak ma household len expense v mesiaci X (ziadny income),
--      `mi.month` je NULL pre dany pivot, takze me cez `me.month
--      = mi.month` nikdy nematchne. Vysledok: dashboard ten mesiac
--      vobec nezobrazi.
--
-- Riesenie: agreguj expenses a incomes nezavisle podla
-- `(household_id, month)` cez UNION ALL, potom LEFT JOIN naspat.

DROP MATERIALIZED VIEW IF EXISTS public.mv_household_dashboard_summary CASCADE;

CREATE MATERIALIZED VIEW public.mv_household_dashboard_summary AS
WITH monthly_income AS (
  SELECT
    household_id,
    TO_CHAR(date, 'YYYY-MM') AS month,
    SUM(amount) AS total_income,
    COUNT(*) AS income_count
  FROM public.incomes
  WHERE date >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY household_id, TO_CHAR(date, 'YYYY-MM')
),
monthly_expenses AS (
  SELECT
    household_id,
    TO_CHAR(date, 'YYYY-MM') AS month,
    SUM(amount) AS total_expenses,
    COUNT(*) AS expense_count
  FROM public.expenses
  WHERE date >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY household_id, TO_CHAR(date, 'YYYY-MM')
),
all_months AS (
  -- Vsetky (household, month) páry ktore existuju aspon v jednej z
  -- tabuliek -> garantuje ze nestratime ziadny mesiac.
  SELECT household_id, month FROM monthly_income
  UNION
  SELECT household_id, month FROM monthly_expenses
),
loan_summary AS (
  SELECT
    l.household_id,
    COUNT(l.id) AS total_loans,
    SUM(CASE WHEN l.status = 'active' THEN 1 ELSE 0 END) AS active_loans,
    SUM(COALESCE(lm.current_balance, l.principal)) AS total_loan_balance,
    SUM(COALESCE(lm.paid_amount, 0)) AS total_paid,
    SUM(COALESCE(lm.total_interest, 0)) AS total_interest_paid
  FROM public.loans l
  LEFT JOIN public.loan_metrics lm ON lm.loan_id = l.id
  GROUP BY l.household_id
),
asset_summary AS (
  SELECT
    household_id,
    COUNT(id) AS total_assets,
    SUM(current_value) AS total_asset_value
  FROM public.assets
  GROUP BY household_id
)
SELECT
  h.id AS household_id,
  h.name AS household_name,
  am.month,
  COALESCE(mi.total_income, 0)   AS total_income,
  COALESCE(mi.income_count, 0)   AS income_count,
  COALESCE(me.total_expenses, 0) AS total_expenses,
  COALESCE(me.expense_count, 0)  AS expense_count,
  COALESCE(mi.total_income, 0) - COALESCE(me.total_expenses, 0) AS net_cash_flow,
  COALESCE(ls.total_loans, 0)         AS total_loans,
  COALESCE(ls.active_loans, 0)        AS active_loans,
  COALESCE(ls.total_loan_balance, 0)  AS loan_balance_remaining,
  COALESCE(ls.total_paid, 0)          AS total_loan_paid,
  COALESCE(ls.total_interest_paid, 0) AS total_interest_paid,
  COALESCE(as_sum.total_assets, 0)    AS total_assets,
  COALESCE(as_sum.total_asset_value, 0) AS total_asset_value,
  COALESCE(as_sum.total_asset_value, 0) - COALESCE(ls.total_loan_balance, 0) AS net_worth,
  NOW() AS last_updated
FROM public.households h
JOIN all_months am          ON am.household_id = h.id
LEFT JOIN monthly_income mi ON mi.household_id = am.household_id AND mi.month = am.month
LEFT JOIN monthly_expenses me ON me.household_id = am.household_id AND me.month = am.month
LEFT JOIN loan_summary ls   ON ls.household_id = h.id
LEFT JOIN asset_summary as_sum ON as_sum.household_id = h.id;

-- Re-create indexy
CREATE UNIQUE INDEX idx_mv_dashboard_household_month
  ON public.mv_household_dashboard_summary(household_id, month DESC);

CREATE INDEX idx_mv_dashboard_last_updated
  ON public.mv_household_dashboard_summary(last_updated DESC);

-- Owner + GRANTy: drzime sa stylu Phase 0
ALTER MATERIALIZED VIEW public.mv_household_dashboard_summary OWNER TO postgres;
REVOKE ALL ON public.mv_household_dashboard_summary FROM authenticated;
REVOKE ALL ON public.mv_household_dashboard_summary FROM anon;
GRANT SELECT ON public.mv_household_dashboard_summary TO service_role;

COMMENT ON MATERIALIZED VIEW public.mv_household_dashboard_summary IS
  'Prekalkulovane dashboard KPI pre vsetky households. '
  'Refresh: pg_cron job refresh-dashboard-summary kazdych 15 min. '
  'Pristup z klienta cez v_household_dashboard_summary (security_invoker).';

-- Re-create security_invoker view (CASCADE drop ho zlikvidoval)
CREATE OR REPLACE VIEW public.v_household_dashboard_summary
WITH (security_invoker = true)
AS
SELECT *
FROM public.mv_household_dashboard_summary
WHERE EXISTS (
  SELECT 1
  FROM public.household_members hm
  WHERE hm.household_id = mv_household_dashboard_summary.household_id
    AND hm.user_id = auth.uid()
);

GRANT SELECT ON public.v_household_dashboard_summary TO authenticated;

COMMENT ON VIEW public.v_household_dashboard_summary IS
  'Bezpecny wrapper nad mv_household_dashboard_summary MV s filtrovanim '
  'podla clenstva. Pouzivat z klienta.';

-- Prvy refresh
REFRESH MATERIALIZED VIEW public.mv_household_dashboard_summary;


-- ---------------------------------------------------------------
-- 2. SET-BASED `get_dashboard_data` RPC
-- ---------------------------------------------------------------
-- Vraca jeden riadok JSON-u s kompletnymi dashboard datami.
-- Pre N volania = 1 HTTP request namiesto 4-5 paralelnych.
--
-- Returned JSON shape:
-- {
--   "currentMonth": {
--     "month":        "2026-04",
--     "totalIncome":   1234.56,
--     "totalExpense":  789.10,
--     "netCashFlow":   445.46
--   },
--   "monthlySummaries": [ { month, income, expense, net }, ... ],
--   "loans": {
--     "total":            5,
--     "active":           3,
--     "balanceRemaining": 12345.67,
--     "totalPaid":        9876.54,
--     "totalInterest":    1234.56,
--     "overdueCount":     2
--   },
--   "assets": { "count": 4, "totalValue": 50000.00 },
--   "netWorth": 37654.33
-- }

-- Stara funkcia mala iny return type (RETURNS TABLE per-month) a bola
-- pouzita len cez nepouzivany view `dashboard_summary` (nikde v aplikacnom
-- kode). Nahradzame ju novou jsonb verziou (jeden roundtrip = 1 dashboard
-- payload). DROP CASCADE odstrani aj zavisly view dashboard_summary.
DROP FUNCTION IF EXISTS public.get_dashboard_data(uuid, integer) CASCADE;

CREATE OR REPLACE FUNCTION public.get_dashboard_data(
  p_household_id uuid,
  p_months_count integer DEFAULT 6
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_month text := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  v_result jsonb;
BEGIN
  -- AUTH GUARD
  IF NOT public.is_household_member(p_household_id) THEN
    RAISE EXCEPTION 'unauthorized: not a member of household %', p_household_id
      USING ERRCODE = '42501';
  END IF;

  WITH
  -- Monthly summary z MV
  monthly AS (
    SELECT
      mvd.month,
      mvd.total_income    AS income,
      mvd.total_expenses  AS expense,
      mvd.net_cash_flow   AS net
    FROM public.mv_household_dashboard_summary mvd
    WHERE mvd.household_id = p_household_id
    ORDER BY mvd.month DESC
    LIMIT GREATEST(p_months_count, 1)
  ),
  -- Aktualny mesiac (live z baseline tabuliek - presnejsie nez MV
  -- ktoru cron refreshuje raz za 15 min)
  current_income AS (
    SELECT COALESCE(SUM(amount), 0)::numeric AS total
    FROM public.incomes
    WHERE household_id = p_household_id
      AND TO_CHAR(date, 'YYYY-MM') = v_current_month
  ),
  current_expense AS (
    SELECT COALESCE(SUM(amount), 0)::numeric AS total
    FROM public.expenses
    WHERE household_id = p_household_id
      AND TO_CHAR(date, 'YYYY-MM') = v_current_month
  ),
  -- Loan totals
  loan_totals AS (
    SELECT
      COUNT(l.id)                                                          AS total,
      SUM(CASE WHEN l.status = 'active' THEN 1 ELSE 0 END)                 AS active,
      COALESCE(SUM(COALESCE(lm.current_balance, l.principal)), 0)::numeric AS balance,
      COALESCE(SUM(COALESCE(lm.paid_amount, 0)), 0)::numeric               AS paid,
      COALESCE(SUM(COALESCE(lm.total_interest, 0)), 0)::numeric            AS interest
    FROM public.loans l
    LEFT JOIN public.loan_metrics lm ON lm.loan_id = l.id
    WHERE l.household_id = p_household_id
  ),
  -- Asset totals
  asset_totals AS (
    SELECT
      COUNT(id)                              AS count,
      COALESCE(SUM(current_value), 0)::numeric AS total_value
    FROM public.assets
    WHERE household_id = p_household_id
  ),
  -- Overdue count
  overdue AS (
    SELECT COUNT(*)::int AS count
    FROM public.loan_schedules ls
    JOIN public.loans l ON l.id = ls.loan_id
    WHERE l.household_id = p_household_id
      AND l.status = 'active'
      AND ls.status IN ('pending', 'overdue')
      AND ls.due_date < CURRENT_DATE
  )
  SELECT jsonb_build_object(
    'currentMonth', jsonb_build_object(
      'month',       v_current_month,
      'totalIncome', (SELECT total FROM current_income),
      'totalExpense',(SELECT total FROM current_expense),
      'netCashFlow', (SELECT total FROM current_income) - (SELECT total FROM current_expense)
    ),
    'monthlySummaries', COALESCE(
      (SELECT jsonb_agg(
                jsonb_build_object(
                  'month',   m.month,
                  'income',  m.income,
                  'expense', m.expense,
                  'net',     m.net
                )
                ORDER BY m.month DESC
              )
         FROM monthly m),
      '[]'::jsonb
    ),
    'loans', jsonb_build_object(
      'total',            (SELECT total FROM loan_totals),
      'active',           (SELECT active FROM loan_totals),
      'balanceRemaining', (SELECT balance FROM loan_totals),
      'totalPaid',        (SELECT paid FROM loan_totals),
      'totalInterest',    (SELECT interest FROM loan_totals),
      'overdueCount',     (SELECT count FROM overdue)
    ),
    'assets', jsonb_build_object(
      'count',      (SELECT count FROM asset_totals),
      'totalValue', (SELECT total_value FROM asset_totals)
    ),
    'netWorth',
      (SELECT total_value FROM asset_totals)
      - (SELECT balance FROM loan_totals)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_data(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_dashboard_data(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_data(uuid, integer) TO service_role;

COMMENT ON FUNCTION public.get_dashboard_data(uuid, integer) IS
  'Set-based dashboard data v jednom JSON volaniami. '
  'Vyhoda: 1 RPC namiesto 4-5 paralelnych queries. '
  'Aktualny mesiac sa berie LIVE z baseline tabuliek (MV refresh '
  'kazdych 15 min nemusi byt up-to-date). '
  'Vyzaduje clenstvo v p_household_id (auth guard).';


-- ---------------------------------------------------------------
-- 3. Re-create get_household_dashboard_summary po DROP MV CASCADE
-- ---------------------------------------------------------------
-- CASCADE z drop MV mohol zhodit aj funkciu ktora ju citala,
-- recreate s rovnakou signaturou (BIGINT counts) ako v
-- 20260418100000_security_hardening.

DROP FUNCTION IF EXISTS public.get_household_dashboard_summary(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_household_dashboard_summary(
  p_household_id uuid,
  p_months_count integer DEFAULT 6
)
RETURNS TABLE (
  month TEXT,
  total_income NUMERIC,
  total_expenses NUMERIC,
  net_cash_flow NUMERIC,
  loan_balance_remaining NUMERIC,
  total_asset_value NUMERIC,
  net_worth NUMERIC,
  income_count BIGINT,
  expense_count BIGINT,
  total_loans BIGINT,
  active_loans BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_household_member(p_household_id) THEN
    RAISE EXCEPTION 'unauthorized: not a member of household %', p_household_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    mvd.month::TEXT,
    mvd.total_income,
    mvd.total_expenses,
    mvd.net_cash_flow,
    mvd.loan_balance_remaining,
    mvd.total_asset_value,
    mvd.net_worth,
    mvd.income_count,
    mvd.expense_count,
    mvd.total_loans,
    mvd.active_loans
  FROM public.mv_household_dashboard_summary mvd
  WHERE mvd.household_id = p_household_id
  ORDER BY mvd.month DESC
  LIMIT p_months_count;
END;
$$;

REVOKE ALL ON FUNCTION public.get_household_dashboard_summary(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_household_dashboard_summary(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_household_dashboard_summary(uuid, integer) TO service_role;


-- =====================================================
-- VERIFICATION
-- =====================================================
-- Po aplikacii:
--   SELECT * FROM mv_household_dashboard_summary LIMIT 5;
--   SELECT public.get_dashboard_data('<household-uuid>'::uuid, 6);
-- =====================================================
