-- ============================================
-- FIX: Recreate v_portfolio_overview view
-- This migration ensures the view exists
-- ============================================

-- Drop existing view if corrupted
DROP VIEW IF EXISTS v_portfolio_overview;

-- Recreate the portfolio overview view
CREATE OR REPLACE VIEW v_portfolio_overview AS
WITH asset_summary AS (
  SELECT 
    a.household_id,
    SUM(a.current_value) as total_assets_value,
    SUM(CASE WHEN a.is_income_generating THEN a.current_value ELSE 0 END) as productive_assets_value,
    SUM(CASE WHEN NOT COALESCE(a.is_income_generating, false) THEN a.current_value ELSE 0 END) as non_productive_assets_value,
    SUM(COALESCE(a.monthly_income, 0)) as total_monthly_income,
    SUM(COALESCE(a.monthly_expenses, 0)) as total_monthly_expenses,
    COUNT(*) as total_assets_count,
    COUNT(*) FILTER (WHERE a.is_income_generating) as productive_assets_count
  FROM assets a
  WHERE COALESCE(a.asset_status, 'owned') != 'sold'
  GROUP BY a.household_id
),
loan_summary AS (
  SELECT 
    l.household_id,
    COUNT(*) as total_loans_count,
    SUM(l.principal) as total_original_principal,
    -- Aktuálny zostatok počítame z loan_schedules
    SUM(
      COALESCE(
        (SELECT SUM(ls.principal_due) 
         FROM loan_schedules ls 
         WHERE ls.loan_id = l.id AND ls.status != 'paid'),
        l.principal
      )
    ) as total_current_balance,
    -- Mesačné splátky (najbližšie splatné)
    SUM(
      COALESCE(
        (SELECT ls.total_due 
         FROM loan_schedules ls 
         WHERE ls.loan_id = l.id 
           AND ls.status = 'pending' 
           AND ls.due_date >= CURRENT_DATE
         ORDER BY ls.due_date ASC 
         LIMIT 1),
        0
      )
    ) as next_month_total_payment
  FROM loans l
  WHERE l.status = 'active'
  GROUP BY l.household_id
)
SELECT 
  COALESCE(a.household_id, l.household_id) as household_id,
  
  -- Assets
  COALESCE(a.total_assets_value, 0) as total_assets_value,
  COALESCE(a.productive_assets_value, 0) as productive_assets_value,
  COALESCE(a.non_productive_assets_value, 0) as non_productive_assets_value,
  COALESCE(a.total_assets_count, 0)::INTEGER as total_assets_count,
  COALESCE(a.productive_assets_count, 0)::INTEGER as productive_assets_count,
  
  -- Cash flow
  COALESCE(a.total_monthly_income, 0) as monthly_income_from_assets,
  COALESCE(a.total_monthly_expenses, 0) as monthly_expenses_from_assets,
  COALESCE(a.total_monthly_income, 0) - COALESCE(a.total_monthly_expenses, 0) as net_cash_flow_from_assets,
  
  -- Loans
  COALESCE(l.total_loans_count, 0)::INTEGER as total_loans_count,
  COALESCE(l.total_original_principal, 0) as total_original_principal,
  COALESCE(l.total_current_balance, 0) as total_debt,
  COALESCE(l.next_month_total_payment, 0) as next_month_loan_payment,
  
  -- Portfolio metrics
  COALESCE(a.total_assets_value, 0) - COALESCE(l.total_current_balance, 0) as net_worth,
  CASE 
    WHEN COALESCE(a.total_assets_value, 0) > 0 
    THEN (COALESCE(l.total_current_balance, 0) / a.total_assets_value * 100)
    ELSE 0 
  END as debt_to_asset_ratio,
  
  -- Total cash flow (assets - loan payments)
  COALESCE(a.total_monthly_income, 0) - COALESCE(a.total_monthly_expenses, 0) - COALESCE(l.next_month_total_payment, 0) as total_monthly_cash_flow

FROM asset_summary a
FULL OUTER JOIN loan_summary l ON a.household_id = l.household_id;

-- Add comment
COMMENT ON VIEW v_portfolio_overview IS 'Agregovaný prehľad portfólia - majetky, úvery, cash flow, net worth';
