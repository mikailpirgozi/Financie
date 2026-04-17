-- =====================================================
-- ADD linked_asset_id + asset metadata to get_loans_with_metrics
-- =====================================================
-- Problem: get_loans_with_metrics RPC did not return linked_asset_id,
-- so the mobile/web loan list could not show which vehicle a loan belongs to.
--
-- Solution: Recreate the function with linked_asset_id, linked_asset_name,
-- linked_asset_license_plate and linked_asset_kind columns.
-- =====================================================

DROP FUNCTION IF EXISTS get_loans_with_metrics(uuid);

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
  -- Linked asset (vehicle) fields
  linked_asset_id uuid,
  linked_asset_name text,
  linked_asset_license_plate text,
  linked_asset_kind text,
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
    -- Linked asset metadata
    l.linked_asset_id,
    a.name AS linked_asset_name,
    a.license_plate AS linked_asset_license_plate,
    a.kind AS linked_asset_kind,
    -- Metrics from materialized view (with fallbacks)
    COALESCE(m.current_balance, l.principal) AS current_balance,
    COALESCE(m.paid_count, 0) AS paid_count,
    COALESCE(m.overdue_count, 0) AS overdue_count,
    COALESCE(m.due_soon_count, 0) AS due_soon_count,
    COALESCE(m.total_installments, 0) AS total_installments,
    COALESCE(m.paid_amount, 0) AS paid_amount,
    COALESCE(m.paid_principal, 0) AS paid_principal,
    COALESCE(m.total_interest, 0) AS total_interest,
    COALESCE(m.total_fees, 0) AS total_fees,
    COALESCE(m.total_payment, 0) AS total_payment,
    COALESCE(m.remaining_amount, l.principal) AS remaining_amount,
    m.next_installment
  FROM loans l
  LEFT JOIN loan_metrics m ON m.loan_id = l.id
  LEFT JOIN assets a ON a.id = l.linked_asset_id
  WHERE l.household_id = p_household_id
  ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_loans_with_metrics(uuid) TO authenticated;

COMMENT ON FUNCTION get_loans_with_metrics(uuid) IS
  'Returns loans for household enriched with materialized loan_metrics and linked asset (vehicle) metadata.';
