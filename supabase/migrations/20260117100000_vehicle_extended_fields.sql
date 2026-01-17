-- ============================================
-- VEHICLE EXTENDED FIELDS
-- Rozšírené polia pre vozidlá
-- ============================================

-- 1. Pridanie nových stĺpcov pre vozidlá
ALTER TABLE assets ADD COLUMN IF NOT EXISTS registered_company TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS make TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS body_type TEXT CHECK (body_type IS NULL OR body_type IN ('sedan', 'suv', 'hatchback', 'wagon', 'coupe', 'van', 'pickup', 'other'));
ALTER TABLE assets ADD COLUMN IF NOT EXISTS engine_capacity INTEGER CHECK (engine_capacity IS NULL OR engine_capacity > 0);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS engine_power INTEGER CHECK (engine_power IS NULL OR engine_power > 0);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS transmission TEXT CHECK (transmission IS NULL OR transmission IN ('manual', 'automatic'));
ALTER TABLE assets ADD COLUMN IF NOT EXISTS drive_type TEXT CHECK (drive_type IS NULL OR drive_type IN ('fwd', 'rwd', 'awd'));
ALTER TABLE assets ADD COLUMN IF NOT EXISTS seats INTEGER CHECK (seats IS NULL OR (seats > 0 AND seats <= 50));
ALTER TABLE assets ADD COLUMN IF NOT EXISTS doors INTEGER CHECK (doors IS NULL OR (doors > 0 AND doors <= 10));

-- 2. Indexy pre vyhľadávanie
CREATE INDEX IF NOT EXISTS idx_assets_registered_company ON assets(registered_company) WHERE registered_company IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_make ON assets(make) WHERE make IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_model ON assets(model) WHERE model IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_kind_vehicle ON assets(household_id, kind) WHERE kind = 'vehicle';

-- 3. Komentáre
COMMENT ON COLUMN assets.registered_company IS 'Firma/spoločnosť na ktorú je vozidlo registrované';
COMMENT ON COLUMN assets.make IS 'Značka vozidla (VW, BMW, Škoda, atď.)';
COMMENT ON COLUMN assets.model IS 'Model vozidla (Golf, X5, Octavia, atď.)';
COMMENT ON COLUMN assets.color IS 'Farba vozidla';
COMMENT ON COLUMN assets.body_type IS 'Typ karosérie: sedan, suv, hatchback, wagon, coupe, van, pickup, other';
COMMENT ON COLUMN assets.engine_capacity IS 'Objem motora v cm³';
COMMENT ON COLUMN assets.engine_power IS 'Výkon motora v kW';
COMMENT ON COLUMN assets.transmission IS 'Prevodovka: manual, automatic';
COMMENT ON COLUMN assets.drive_type IS 'Pohon: fwd (predný), rwd (zadný), awd (4x4)';
COMMENT ON COLUMN assets.seats IS 'Počet miest';
COMMENT ON COLUMN assets.doors IS 'Počet dverí';

-- 4. View pre vozidlá s agregovanými nákladmi (TCO - Total Cost of Ownership)
CREATE OR REPLACE VIEW vehicle_tco_summary AS
WITH vehicle_loans AS (
  SELECT 
    a.id as asset_id,
    COUNT(l.id) as loan_count,
    COALESCE(SUM(ls.total_paid), 0) as total_loan_paid,
    COALESCE(SUM(ls.current_balance), 0) as total_loan_balance
  FROM assets a
  LEFT JOIN loans l ON l.linked_asset_id = a.id
  LEFT JOIN LATERAL (
    SELECT 
      COALESCE(SUM(CASE WHEN status = 'paid' THEN total_due ELSE 0 END), 0) as total_paid,
      COALESCE(SUM(CASE WHEN status != 'paid' THEN principal_balance_after ELSE 0 END), 0) as current_balance
    FROM loan_schedules 
    WHERE loan_id = l.id
    LIMIT 1
  ) ls ON true
  WHERE a.kind = 'vehicle'
  GROUP BY a.id
),
vehicle_insurances AS (
  SELECT 
    a.id as asset_id,
    COUNT(i.id) as insurance_count,
    COUNT(i.id) FILTER (WHERE i.valid_to >= CURRENT_DATE) as active_insurance_count,
    COALESCE(SUM(i.price), 0) as total_insurance_cost,
    MIN(i.valid_to) FILTER (WHERE i.valid_to >= CURRENT_DATE) as nearest_insurance_expiry
  FROM assets a
  LEFT JOIN insurances i ON i.asset_id = a.id
  WHERE a.kind = 'vehicle'
  GROUP BY a.id
),
vehicle_documents AS (
  SELECT 
    a.id as asset_id,
    COUNT(vd.id) as document_count,
    COUNT(vd.id) FILTER (WHERE vd.valid_to >= CURRENT_DATE) as valid_document_count,
    COALESCE(SUM(vd.price), 0) as total_document_cost,
    MIN(vd.valid_to) FILTER (WHERE vd.valid_to >= CURRENT_DATE AND vd.document_type = 'stk') as stk_expiry,
    MIN(vd.valid_to) FILTER (WHERE vd.valid_to >= CURRENT_DATE AND vd.document_type = 'ek') as ek_expiry
  FROM assets a
  LEFT JOIN vehicle_documents vd ON vd.asset_id = a.id
  WHERE a.kind = 'vehicle'
  GROUP BY a.id
),
vehicle_service AS (
  SELECT 
    a.id as asset_id,
    COUNT(sr.id) as service_count,
    COALESCE(SUM(sr.price), 0) as total_service_cost,
    MAX(sr.service_date) as last_service_date,
    MAX(sr.km_state) as last_service_km
  FROM assets a
  LEFT JOIN service_records sr ON sr.asset_id = a.id
  WHERE a.kind = 'vehicle'
  GROUP BY a.id
),
vehicle_fines AS (
  SELECT 
    a.id as asset_id,
    COUNT(f.id) as fine_count,
    COUNT(f.id) FILTER (WHERE f.is_paid = false) as unpaid_fine_count,
    COALESCE(SUM(f.fine_amount), 0) as total_fine_amount,
    COALESCE(SUM(f.fine_amount) FILTER (WHERE f.is_paid = false), 0) as unpaid_fine_amount
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
  COALESCE(vl.loan_count, 0) as loan_count,
  COALESCE(vl.total_loan_paid, 0) as total_loan_paid,
  COALESCE(vl.total_loan_balance, 0) as total_loan_balance,
  -- Insurance summary
  COALESCE(vi.insurance_count, 0) as insurance_count,
  COALESCE(vi.active_insurance_count, 0) as active_insurance_count,
  COALESCE(vi.total_insurance_cost, 0) as total_insurance_cost,
  vi.nearest_insurance_expiry,
  -- Document summary
  COALESCE(vd.document_count, 0) as document_count,
  COALESCE(vd.valid_document_count, 0) as valid_document_count,
  COALESCE(vd.total_document_cost, 0) as total_document_cost,
  vd.stk_expiry,
  vd.ek_expiry,
  -- Service summary
  COALESCE(vs.service_count, 0) as service_count,
  COALESCE(vs.total_service_cost, 0) as total_service_cost,
  vs.last_service_date,
  vs.last_service_km,
  -- Fines summary
  COALESCE(vf.fine_count, 0) as fine_count,
  COALESCE(vf.unpaid_fine_count, 0) as unpaid_fine_count,
  COALESCE(vf.total_fine_amount, 0) as total_fine_amount,
  COALESCE(vf.unpaid_fine_amount, 0) as unpaid_fine_amount,
  -- TCO calculation
  COALESCE(vl.total_loan_paid, 0) + 
  COALESCE(vi.total_insurance_cost, 0) + 
  COALESCE(vd.total_document_cost, 0) + 
  COALESCE(vs.total_service_cost, 0) + 
  COALESCE(vf.total_fine_amount, 0) as total_cost_of_ownership,
  -- Alerts
  CASE 
    WHEN vd.stk_expiry IS NOT NULL AND vd.stk_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN true
    ELSE false
  END as stk_expiring_soon,
  CASE 
    WHEN vd.ek_expiry IS NOT NULL AND vd.ek_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN true
    ELSE false
  END as ek_expiring_soon,
  CASE 
    WHEN vi.nearest_insurance_expiry IS NOT NULL AND vi.nearest_insurance_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN true
    ELSE false
  END as insurance_expiring_soon,
  a.created_at,
  a.updated_at
FROM assets a
LEFT JOIN vehicle_loans vl ON vl.asset_id = a.id
LEFT JOIN vehicle_insurances vi ON vi.asset_id = a.id
LEFT JOIN vehicle_documents vd ON vd.asset_id = a.id
LEFT JOIN vehicle_service vs ON vs.asset_id = a.id
LEFT JOIN vehicle_fines vf ON vf.asset_id = a.id
WHERE a.kind = 'vehicle';

COMMENT ON VIEW vehicle_tco_summary IS 'Prehľad vozidiel s agregovanými nákladmi (TCO) a stavmi dokumentov';
