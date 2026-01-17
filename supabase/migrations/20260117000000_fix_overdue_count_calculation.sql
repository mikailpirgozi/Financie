-- =====================================================
-- FIX: OVERDUE COUNT CALCULATION
-- =====================================================
-- Problem: overdue_count was only counting rows where status = 'overdue',
-- but nothing was actually setting the status to 'overdue' when due_date passed.
--
-- Solution: Count pending installments where due_date < CURRENT_DATE as overdue
-- =====================================================

-- Drop dependent views
DROP MATERIALIZED VIEW IF EXISTS mv_household_dashboard_summary CASCADE;

-- Drop and recreate loan_metrics with fixed overdue_count calculation
DROP MATERIALIZED VIEW IF EXISTS loan_metrics CASCADE;

CREATE MATERIALIZED VIEW loan_metrics AS
SELECT 
  l.id as loan_id,
  l.household_id,
  -- Počty splátok
  COUNT(s.id) as total_installments,
  COUNT(s.id) FILTER (WHERE s.status = 'paid') as paid_count,
  -- FIXED: Count pending installments where due_date has passed as overdue
  COUNT(s.id) FILTER (
    WHERE s.status IN ('pending', 'overdue')
    AND s.due_date < CURRENT_DATE
  ) as overdue_count,
  COUNT(s.id) FILTER (WHERE s.status = 'pending') as pending_count,
  COUNT(s.id) FILTER (
    WHERE s.status IN ('pending', 'overdue')
    AND s.due_date <= CURRENT_DATE + INTERVAL '7 days'
    AND s.due_date >= CURRENT_DATE
  ) as due_soon_count,
  
  -- Finančné metriky
  COALESCE(SUM(s.total_due) FILTER (WHERE s.status != 'paid'), 0) as remaining_amount,
  COALESCE(SUM(s.total_due) FILTER (WHERE s.status = 'paid'), 0) as paid_amount,
  COALESCE(SUM(s.principal_due) FILTER (WHERE s.status = 'paid'), 0) as paid_principal,
  COALESCE(SUM(s.interest_due), 0) as total_interest,
  COALESCE(SUM(s.fees_due), 0) as total_fees,
  COALESCE(SUM(s.total_due), 0) as total_payment,
  
  -- Aktuálny zostatok (z poslednej splatenej splátky)
  COALESCE(
    (SELECT principal_balance_after 
     FROM loan_schedules 
     WHERE loan_id = l.id 
     AND status = 'paid' 
     ORDER BY installment_no DESC 
     LIMIT 1),
    l.principal
  ) as current_balance,
  
  -- Next installment info - enhanced with principal_due and interest_due
  (SELECT json_build_object(
    'installment_no', installment_no,
    'due_date', due_date,
    'total_due', total_due,
    'principal_due', principal_due,
    'interest_due', interest_due,
    'days_until', due_date - CURRENT_DATE
   )
   FROM loan_schedules
   WHERE loan_id = l.id
   AND status IN ('pending', 'overdue')
   ORDER BY installment_no ASC
   LIMIT 1
  ) as next_installment,
  
  -- Timestamps
  NOW() as last_updated
  
FROM loans l
LEFT JOIN loan_schedules s ON s.loan_id = l.id
GROUP BY l.id, l.household_id, l.principal;

-- Unique index for concurrent refresh
CREATE UNIQUE INDEX idx_loan_metrics_loan_id ON loan_metrics(loan_id);

-- Index for household queries
CREATE INDEX idx_loan_metrics_household ON loan_metrics(household_id);

-- =====================================================
-- Recreate RPC function (no changes, just ensuring it exists)
-- =====================================================

CREATE OR REPLACE FUNCTION get_loans_with_metrics(p_household_id uuid)
RETURNS TABLE (
  -- Loan fields
  id uuid,
  household_id uuid,
  name text,
  lender text,
  loan_type text,
  principal numeric,
  annual_rate numeric,
  rate_type text,
  day_count_convention text,
  start_date date,
  term_months integer,
  balloon_amount numeric,
  fee_setup numeric,
  fee_monthly numeric,
  insurance_monthly numeric,
  early_repayment_penalty_pct numeric,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  -- Metrics fields
  current_balance numeric,
  paid_count bigint,
  overdue_count bigint,
  due_soon_count bigint,
  total_installments bigint,
  paid_amount numeric,
  paid_principal numeric,
  total_interest numeric,
  total_fees numeric,
  total_payment numeric,
  remaining_amount numeric,
  next_installment json
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.household_id,
    l.name,
    l.lender,
    l.loan_type,
    l.principal,
    l.annual_rate,
    l.rate_type,
    l.day_count_convention,
    l.start_date,
    l.term_months,
    l.balloon_amount,
    l.fee_setup,
    l.fee_monthly,
    l.insurance_monthly,
    l.early_repayment_penalty_pct,
    l.status,
    l.created_at,
    l.updated_at,
    -- Metrics from materialized view (with fallbacks)
    COALESCE(m.current_balance, l.principal) as current_balance,
    COALESCE(m.paid_count, 0) as paid_count,
    COALESCE(m.overdue_count, 0) as overdue_count,
    COALESCE(m.due_soon_count, 0) as due_soon_count,
    COALESCE(m.total_installments, 0) as total_installments,
    COALESCE(m.paid_amount, 0) as paid_amount,
    COALESCE(m.paid_principal, 0) as paid_principal,
    COALESCE(m.total_interest, 0) as total_interest,
    COALESCE(m.total_fees, 0) as total_fees,
    COALESCE(m.total_payment, 0) as total_payment,
    COALESCE(m.remaining_amount, l.principal) as remaining_amount,
    m.next_installment
  FROM loans l
  LEFT JOIN loan_metrics m ON m.loan_id = l.id
  WHERE l.household_id = p_household_id
  ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_loans_with_metrics(uuid) TO authenticated;

-- =====================================================
-- Recreate mv_household_dashboard_summary
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_household_dashboard_summary AS
WITH monthly_income AS (
  SELECT 
    household_id,
    TO_CHAR(date, 'YYYY-MM') as month,
    SUM(amount) as total_income,
    COUNT(*) as income_count
  FROM incomes
  WHERE date >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY household_id, TO_CHAR(date, 'YYYY-MM')
),
monthly_expenses AS (
  SELECT 
    household_id,
    TO_CHAR(date, 'YYYY-MM') as month,
    SUM(amount) as total_expenses,
    COUNT(*) as expense_count
  FROM expenses
  WHERE date >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY household_id, TO_CHAR(date, 'YYYY-MM')
),
loan_summary AS (
  SELECT 
    l.household_id,
    COUNT(l.id) as total_loans,
    SUM(CASE WHEN l.status = 'active' THEN 1 ELSE 0 END) as active_loans,
    SUM(COALESCE(lm.current_balance, l.principal)) as total_loan_balance,
    SUM(COALESCE(lm.paid_amount, 0)) as total_paid,
    SUM(COALESCE(lm.total_interest, 0)) as total_interest_paid
  FROM loans l
  LEFT JOIN loan_metrics lm ON lm.loan_id = l.id
  GROUP BY l.household_id
),
asset_summary AS (
  SELECT 
    household_id,
    COUNT(id) as total_assets,
    SUM(current_value) as total_asset_value
  FROM assets
  GROUP BY household_id
)
SELECT 
  h.id as household_id,
  h.name as household_name,
  COALESCE(mi.month, me.month, TO_CHAR(CURRENT_DATE, 'YYYY-MM')) as month,
  COALESCE(mi.total_income, 0) as total_income,
  COALESCE(mi.income_count, 0) as income_count,
  COALESCE(me.total_expenses, 0) as total_expenses,
  COALESCE(me.expense_count, 0) as expense_count,
  COALESCE(mi.total_income, 0) - COALESCE(me.total_expenses, 0) as net_cash_flow,
  COALESCE(ls.total_loans, 0) as total_loans,
  COALESCE(ls.active_loans, 0) as active_loans,
  COALESCE(ls.total_loan_balance, 0) as loan_balance_remaining,
  COALESCE(ls.total_paid, 0) as total_loan_paid,
  COALESCE(ls.total_interest_paid, 0) as total_interest_paid,
  COALESCE(as_sum.total_assets, 0) as total_assets,
  COALESCE(as_sum.total_asset_value, 0) as total_asset_value,
  COALESCE(as_sum.total_asset_value, 0) - COALESCE(ls.total_loan_balance, 0) as net_worth,
  NOW() as last_updated
FROM households h
LEFT JOIN monthly_income mi ON mi.household_id = h.id
LEFT JOIN monthly_expenses me ON me.household_id = h.id AND me.month = mi.month
LEFT JOIN loan_summary ls ON ls.household_id = h.id
LEFT JOIN asset_summary as_sum ON as_sum.household_id = h.id
WHERE mi.month IS NOT NULL OR me.month IS NOT NULL;

-- Recreate indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_household_month 
  ON mv_household_dashboard_summary(household_id, month DESC);

CREATE INDEX IF NOT EXISTS idx_mv_dashboard_last_updated 
  ON mv_household_dashboard_summary(last_updated DESC);

-- Permissions
ALTER MATERIALIZED VIEW mv_household_dashboard_summary OWNER TO postgres;
GRANT SELECT ON mv_household_dashboard_summary TO authenticated;

-- =====================================================
-- Initial refresh
-- =====================================================

SELECT refresh_loan_metrics_safe();
REFRESH MATERIALIZED VIEW mv_household_dashboard_summary;
