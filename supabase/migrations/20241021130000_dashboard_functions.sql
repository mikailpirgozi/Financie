-- ============================================
-- Dashboard Functions & Views
-- ============================================

-- Add missing columns to monthly_summaries if needed
ALTER TABLE monthly_summaries 
  ADD COLUMN IF NOT EXISTS total_assets DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (total_assets >= 0),
  ADD COLUMN IF NOT EXISTS net_worth_change DECIMAL(15, 2) DEFAULT 0;

-- Create function to get latest asset values for a given month
CREATE OR REPLACE FUNCTION get_assets_total_for_month(
  p_household_id UUID,
  p_month TEXT
)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
  v_total DECIMAL(15, 2);
  v_month_end DATE;
BEGIN
  -- Calculate last day of the month
  v_month_end := (p_month || '-01')::DATE + INTERVAL '1 month' - INTERVAL '1 day';
  
  -- Sum current_value of all assets, or use latest valuation if exists
  SELECT COALESCE(SUM(
    COALESCE(
      (
        SELECT av.value 
        FROM asset_valuations av 
        WHERE av.asset_id = a.id 
          AND av.date <= v_month_end
        ORDER BY av.date DESC 
        LIMIT 1
      ),
      a.current_value
    )
  ), 0)
  INTO v_total
  FROM assets a
  WHERE a.household_id = p_household_id;
  
  RETURN v_total;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to calculate dashboard data for a specific month
CREATE OR REPLACE FUNCTION get_dashboard_month_data(
  p_household_id UUID,
  p_month TEXT
)
RETURNS TABLE (
  month TEXT,
  total_income DECIMAL(15, 2),
  total_expenses DECIMAL(15, 2),
  net_cash_flow DECIMAL(15, 2),
  loan_payments_total DECIMAL(15, 2),
  loan_principal_paid DECIMAL(15, 2),
  loan_interest_paid DECIMAL(15, 2),
  loan_fees_paid DECIMAL(15, 2),
  loan_balance_remaining DECIMAL(15, 2),
  total_assets DECIMAL(15, 2),
  net_worth DECIMAL(15, 2),
  net_worth_change DECIMAL(15, 2)
) AS $$
DECLARE
  v_month_start DATE;
  v_month_end DATE;
  v_prev_month TEXT;
  v_prev_net_worth DECIMAL(15, 2);
BEGIN
  -- Calculate month boundaries
  v_month_start := (p_month || '-01')::DATE;
  v_month_end := v_month_start + INTERVAL '1 month' - INTERVAL '1 day';
  
  -- Calculate previous month
  v_prev_month := TO_CHAR(v_month_start - INTERVAL '1 month', 'YYYY-MM');
  
  -- Get previous month's net worth
  SELECT COALESCE(ms.net_worth, 0)
  INTO v_prev_net_worth
  FROM monthly_summaries ms
  WHERE ms.household_id = p_household_id
    AND ms.month = v_prev_month;
  
  RETURN QUERY
  WITH month_data AS (
    -- Calculate incomes
    SELECT 
      COALESCE(SUM(i.amount), 0) as income_total
    FROM incomes i
    WHERE i.household_id = p_household_id
      AND i.date >= v_month_start
      AND i.date <= v_month_end
  ),
  expense_data AS (
    -- Calculate expenses
    SELECT 
      COALESCE(SUM(e.amount), 0) as expense_total
    FROM expenses e
    WHERE e.household_id = p_household_id
      AND e.date >= v_month_start
      AND e.date <= v_month_end
  ),
  loan_data AS (
    -- Calculate loan payments from paid schedules
    SELECT 
      COALESCE(SUM(ls.total_due), 0) as payments_total,
      COALESCE(SUM(ls.principal_due), 0) as principal_paid,
      COALESCE(SUM(ls.interest_due), 0) as interest_paid,
      COALESCE(SUM(ls.fees_due), 0) as fees_paid
    FROM loan_schedules ls
    JOIN loans l ON l.id = ls.loan_id
    WHERE l.household_id = p_household_id
      AND ls.status = 'paid'
      AND ls.due_date >= v_month_start
      AND ls.due_date <= v_month_end
  ),
  loan_balance AS (
    -- Calculate remaining loan balance at end of month
    SELECT 
      COALESCE(SUM(
        COALESCE(
          (
            SELECT ls_latest.principal_balance_after
            FROM loan_schedules ls_latest
            WHERE ls_latest.loan_id = l.id
              AND ls_latest.due_date <= v_month_end
            ORDER BY ls_latest.due_date DESC
            LIMIT 1
          ),
          l.principal
        )
      ), 0) as balance_remaining
    FROM loans l
    WHERE l.household_id = p_household_id
      AND l.status = 'active'
  ),
  asset_data AS (
    -- Get total assets value
    SELECT get_assets_total_for_month(p_household_id, p_month) as assets_total
  )
  SELECT
    p_month,
    md.income_total,
    ed.expense_total,
    md.income_total - ed.expense_total as net_cash_flow,
    ld.payments_total,
    ld.principal_paid,
    ld.interest_paid,
    ld.fees_paid,
    lb.balance_remaining,
    ad.assets_total,
    ad.assets_total - lb.balance_remaining as net_worth,
    (ad.assets_total - lb.balance_remaining) - v_prev_net_worth as net_worth_change
  FROM month_data md
  CROSS JOIN expense_data ed
  CROSS JOIN loan_data ld
  CROSS JOIN loan_balance lb
  CROSS JOIN asset_data ad;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to get dashboard data for multiple months
CREATE OR REPLACE FUNCTION get_dashboard_data(
  p_household_id UUID,
  p_months_count INTEGER DEFAULT 12
)
RETURNS TABLE (
  month TEXT,
  total_income DECIMAL(15, 2),
  total_expenses DECIMAL(15, 2),
  net_cash_flow DECIMAL(15, 2),
  loan_payments_total DECIMAL(15, 2),
  loan_principal_paid DECIMAL(15, 2),
  loan_interest_paid DECIMAL(15, 2),
  loan_fees_paid DECIMAL(15, 2),
  loan_balance_remaining DECIMAL(15, 2),
  total_assets DECIMAL(15, 2),
  net_worth DECIMAL(15, 2),
  net_worth_change DECIMAL(15, 2)
) AS $$
DECLARE
  v_current_month TEXT;
  v_month_iter TEXT;
  v_counter INTEGER := 0;
BEGIN
  -- Get current month
  v_current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  
  -- Loop through months
  WHILE v_counter < p_months_count LOOP
    v_month_iter := TO_CHAR(
      (v_current_month || '-01')::DATE - (v_counter || ' months')::INTERVAL,
      'YYYY-MM'
    );
    
    RETURN QUERY
    SELECT * FROM get_dashboard_month_data(p_household_id, v_month_iter);
    
    v_counter := v_counter + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create view for easy dashboard access
CREATE OR REPLACE VIEW dashboard_summary AS
SELECT 
  hm.household_id,
  hm.user_id,
  d.*
FROM household_members hm
CROSS JOIN LATERAL get_dashboard_data(hm.household_id, 12) d;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_assets_total_for_month TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_month_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_data TO authenticated;
GRANT SELECT ON dashboard_summary TO authenticated;

-- Create RLS policy for dashboard_summary view
CREATE POLICY "Users can view their household dashboard"
  ON monthly_summaries
  FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

-- Comment on functions
COMMENT ON FUNCTION get_assets_total_for_month IS 'Calculate total asset value for a household at the end of a specific month';
COMMENT ON FUNCTION get_dashboard_month_data IS 'Get complete dashboard data for a specific month';
COMMENT ON FUNCTION get_dashboard_data IS 'Get dashboard data for the last N months (default 12)';
COMMENT ON VIEW dashboard_summary IS 'Dashboard summary view with RLS applied';

