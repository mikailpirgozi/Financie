-- =====================================================
-- vehicle_tco_summary: separate active vs all loans + latest STK/EK/vignette
-- =====================================================
-- Problem 1: View counted only status='active' loans, so paid_off loans linked
-- to a vehicle disappeared from card aggregates.
-- Problem 2: stk_expiry/ek_expiry only used valid_to >= CURRENT_DATE filter,
-- so expired documents were hidden in the list view.
--
-- Solution: keep `total_loan_balance` as active-only (financial semantics),
-- but expose `loan_count` (all linked loans) plus `active_loan_count`. Add
-- `latest_stk_expiry`, `latest_ek_expiry`, `latest_vignette_expiry` (max valid_to
-- across all rows) so UI can show "expired" state. Keep nearest_insurance_expiry
-- using the existing semantics but add `latest_insurance_expiry` for parity.
-- =====================================================

DROP VIEW IF EXISTS vehicle_tco_summary CASCADE;

CREATE OR REPLACE VIEW vehicle_tco_summary AS
WITH vehicle_loans AS (
  SELECT
    a.id AS asset_id,
    -- All linked loans (including paid_off)
    COUNT(l.id) AS loan_count,
    -- Active loans only
    COUNT(l.id) FILTER (WHERE l.status = 'active') AS active_loan_count,
    -- Historical (paid_off / cancelled) loans
    COUNT(l.id) FILTER (WHERE l.status <> 'active') AS historical_loan_count,
    -- Total paid across ALL loans (active + paid_off)
    COALESCE(SUM(
      (SELECT COALESCE(SUM(total_due), 0) FROM loan_schedules WHERE loan_id = l.id AND status = 'paid')
    ), 0) AS total_loan_paid,
    -- Outstanding balance: only ACTIVE loans (paid_off has 0 remaining)
    COALESCE(SUM(
      CASE WHEN l.status = 'active' THEN
        COALESCE(
          (SELECT principal_balance_after
             FROM loan_schedules
             WHERE loan_id = l.id AND status = 'paid'
             ORDER BY installment_no DESC
             LIMIT 1),
          l.principal
        )
      ELSE 0
      END
    ), 0) AS total_loan_balance
  FROM assets a
  LEFT JOIN loans l ON l.linked_asset_id = a.id
  WHERE a.kind = 'vehicle'
  GROUP BY a.id
),
vehicle_insurances AS (
  SELECT
    a.id AS asset_id,
    COUNT(i.id) AS insurance_count,
    COUNT(i.id) FILTER (WHERE i.valid_to >= CURRENT_DATE) AS active_insurance_count,
    COALESCE(SUM(i.price), 0) AS total_insurance_cost,
    -- Nearest still-valid expiry (what the alert system uses)
    MIN(i.valid_to) FILTER (WHERE i.valid_to >= CURRENT_DATE) AS nearest_insurance_expiry,
    -- Most recent expiry, regardless of validity (for "expired" display)
    MAX(i.valid_to) AS latest_insurance_expiry
  FROM assets a
  LEFT JOIN insurances i ON i.asset_id = a.id
  WHERE a.kind = 'vehicle'
  GROUP BY a.id
),
vehicle_documents_agg AS (
  SELECT
    a.id AS asset_id,
    COUNT(vd.id) AS document_count,
    COUNT(vd.id) FILTER (WHERE vd.valid_to >= CURRENT_DATE) AS valid_document_count,
    COALESCE(SUM(vd.price), 0) AS total_document_cost,
    -- Currently valid (legacy fields)
    MIN(vd.valid_to) FILTER (WHERE vd.valid_to >= CURRENT_DATE AND vd.document_type = 'stk') AS stk_expiry,
    MIN(vd.valid_to) FILTER (WHERE vd.valid_to >= CURRENT_DATE AND vd.document_type = 'ek') AS ek_expiry,
    MIN(vd.valid_to) FILTER (WHERE vd.valid_to >= CURRENT_DATE AND vd.document_type = 'vignette') AS vignette_expiry,
    -- Latest known (regardless of validity) - so UI can show "expired Xth"
    MAX(vd.valid_to) FILTER (WHERE vd.document_type = 'stk') AS latest_stk_expiry,
    MAX(vd.valid_to) FILTER (WHERE vd.document_type = 'ek') AS latest_ek_expiry,
    MAX(vd.valid_to) FILTER (WHERE vd.document_type = 'vignette') AS latest_vignette_expiry
  FROM assets a
  LEFT JOIN vehicle_documents vd ON vd.asset_id = a.id
  WHERE a.kind = 'vehicle'
  GROUP BY a.id
),
vehicle_service AS (
  SELECT
    a.id AS asset_id,
    COUNT(sr.id) AS service_count,
    COALESCE(SUM(sr.price), 0) AS total_service_cost,
    MAX(sr.service_date) AS last_service_date,
    MAX(sr.km_state) AS last_service_km
  FROM assets a
  LEFT JOIN service_records sr ON sr.asset_id = a.id
  WHERE a.kind = 'vehicle'
  GROUP BY a.id
),
vehicle_fines AS (
  SELECT
    a.id AS asset_id,
    COUNT(f.id) AS fine_count,
    COUNT(f.id) FILTER (WHERE f.is_paid = false) AS unpaid_fine_count,
    COALESCE(SUM(f.fine_amount), 0) AS total_fine_amount,
    COALESCE(SUM(f.fine_amount) FILTER (WHERE f.is_paid = false), 0) AS unpaid_fine_amount
  FROM assets a
  LEFT JOIN fines f ON f.asset_id = a.id
  WHERE a.kind = 'vehicle'
  GROUP BY a.id
)
SELECT
  a.id,
  a.household_id,
  a.name,
  a.make,
  a.model,
  a.year,
  a.license_plate,
  a.vin,
  a.registered_company,
  a.fuel_type,
  a.mileage,
  a.acquisition_value,
  a.current_value,
  a.acquisition_date,
  -- Loan summary
  COALESCE(vl.loan_count, 0) AS loan_count,
  COALESCE(vl.active_loan_count, 0) AS active_loan_count,
  COALESCE(vl.historical_loan_count, 0) AS historical_loan_count,
  COALESCE(vl.total_loan_paid, 0) AS total_loan_paid,
  COALESCE(vl.total_loan_balance, 0) AS total_loan_balance,
  -- Insurance summary
  COALESCE(vi.insurance_count, 0) AS insurance_count,
  COALESCE(vi.active_insurance_count, 0) AS active_insurance_count,
  COALESCE(vi.total_insurance_cost, 0) AS total_insurance_cost,
  vi.nearest_insurance_expiry,
  vi.latest_insurance_expiry,
  -- Document summary
  COALESCE(vd.document_count, 0) AS document_count,
  COALESCE(vd.valid_document_count, 0) AS valid_document_count,
  COALESCE(vd.total_document_cost, 0) AS total_document_cost,
  vd.stk_expiry,
  vd.ek_expiry,
  vd.vignette_expiry,
  vd.latest_stk_expiry,
  vd.latest_ek_expiry,
  vd.latest_vignette_expiry,
  -- Service summary
  COALESCE(vs.service_count, 0) AS service_count,
  COALESCE(vs.total_service_cost, 0) AS total_service_cost,
  vs.last_service_date,
  vs.last_service_km,
  -- Fines summary
  COALESCE(vf.fine_count, 0) AS fine_count,
  COALESCE(vf.unpaid_fine_count, 0) AS unpaid_fine_count,
  COALESCE(vf.total_fine_amount, 0) AS total_fine_amount,
  COALESCE(vf.unpaid_fine_amount, 0) AS unpaid_fine_amount,
  -- TCO calculation
  COALESCE(vl.total_loan_paid, 0) +
  COALESCE(vi.total_insurance_cost, 0) +
  COALESCE(vd.total_document_cost, 0) +
  COALESCE(vs.total_service_cost, 0) +
  COALESCE(vf.total_fine_amount, 0) AS total_cost_of_ownership,
  -- Alerts
  CASE
    WHEN vd.stk_expiry IS NOT NULL AND vd.stk_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN true
    ELSE false
  END AS stk_expiring_soon,
  CASE
    WHEN vd.ek_expiry IS NOT NULL AND vd.ek_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN true
    ELSE false
  END AS ek_expiring_soon,
  CASE
    WHEN vd.vignette_expiry IS NOT NULL AND vd.vignette_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN true
    ELSE false
  END AS vignette_expiring_soon,
  CASE
    WHEN vi.nearest_insurance_expiry IS NOT NULL AND vi.nearest_insurance_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN true
    ELSE false
  END AS insurance_expiring_soon,
  -- Expired flags (latest known is in the past)
  CASE
    WHEN vd.latest_stk_expiry IS NOT NULL AND vd.latest_stk_expiry < CURRENT_DATE THEN true
    ELSE false
  END AS stk_expired,
  CASE
    WHEN vd.latest_ek_expiry IS NOT NULL AND vd.latest_ek_expiry < CURRENT_DATE THEN true
    ELSE false
  END AS ek_expired,
  CASE
    WHEN vd.latest_vignette_expiry IS NOT NULL AND vd.latest_vignette_expiry < CURRENT_DATE THEN true
    ELSE false
  END AS vignette_expired,
  CASE
    WHEN vi.latest_insurance_expiry IS NOT NULL AND vi.latest_insurance_expiry < CURRENT_DATE
      AND (vi.nearest_insurance_expiry IS NULL OR vi.nearest_insurance_expiry < CURRENT_DATE)
      THEN true
    ELSE false
  END AS insurance_expired,
  a.created_at,
  a.updated_at
FROM assets a
LEFT JOIN vehicle_loans vl ON vl.asset_id = a.id
LEFT JOIN vehicle_insurances vi ON vi.asset_id = a.id
LEFT JOIN vehicle_documents_agg vd ON vd.asset_id = a.id
LEFT JOIN vehicle_service vs ON vs.asset_id = a.id
LEFT JOIN vehicle_fines vf ON vf.asset_id = a.id
WHERE a.kind = 'vehicle';

COMMENT ON VIEW vehicle_tco_summary IS
  'Vehicle TCO aggregate. loan_count includes all linked loans (active + historical); total_loan_balance is active-only. latest_*_expiry expose most recent known dates so UI can render "expired" state.';
