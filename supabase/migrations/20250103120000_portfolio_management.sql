-- ============================================
-- PORTFOLIO MANAGEMENT FEATURES
-- Asset-Loan relationship, Cash flow tracking, Productive assets
-- ============================================

-- ============================================
-- 1. ASSET-LOAN RELATIONSHIP
-- ============================================

-- Rozšírenie loans tabuľky o prepojenie na majetok
ALTER TABLE loans
  ADD COLUMN IF NOT EXISTS linked_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS loan_purpose TEXT CHECK (loan_purpose IN ('property_purchase', 'vehicle_purchase', 'business_loan', 'consumer_loan', 'refinancing', 'other'));

-- Index pre rýchle vyhľadávanie úverov podľa majetku
CREATE INDEX IF NOT EXISTS idx_loans_linked_asset ON loans(linked_asset_id) WHERE linked_asset_id IS NOT NULL;

COMMENT ON COLUMN loans.linked_asset_id IS 'Prepojenie úveru s konkrétnym majetkom (napr. hypotéka na byt)';
COMMENT ON COLUMN loans.loan_purpose IS 'Účel úveru - na čo bol použitý';

-- ============================================
-- 2. PRODUKTÍVNE MAJETKY & CASH FLOW
-- ============================================

-- Rozšírenie assets tabuľky
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS is_income_generating BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS monthly_income DECIMAL(15, 2) DEFAULT 0 CHECK (monthly_income >= 0),
  ADD COLUMN IF NOT EXISTS monthly_expenses DECIMAL(15, 2) DEFAULT 0 CHECK (monthly_expenses >= 0),
  ADD COLUMN IF NOT EXISTS asset_status TEXT DEFAULT 'owned' CHECK (asset_status IN ('owned', 'rented_out', 'for_sale', 'sold'));

-- Index pre produktívne majetky
CREATE INDEX IF NOT EXISTS idx_assets_income_generating ON assets(household_id, is_income_generating) WHERE is_income_generating = true;

COMMENT ON COLUMN assets.is_income_generating IS 'Či majetok generuje príjem (prenájom, dividendy, úroky)';
COMMENT ON COLUMN assets.monthly_income IS 'Priemerný mesačný príjem z majetku';
COMMENT ON COLUMN assets.monthly_expenses IS 'Priemerné mesačné náklady na majetok (dane, údržba, poistenie)';
COMMENT ON COLUMN assets.asset_status IS 'Stav majetku - vlastnený, prenajatý, na predaj, predaný';

-- ============================================
-- 3. CASH FLOW TRACKING
-- ============================================

-- Tabuľka pre záznamy cash flow z majetkov
CREATE TABLE IF NOT EXISTS asset_cash_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rental_income', 'dividend', 'interest', 'sale_income', 'expense', 'maintenance', 'tax', 'insurance', 'other')),
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexy pre výkon
CREATE INDEX IF NOT EXISTS idx_asset_cash_flows_asset ON asset_cash_flows(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_cash_flows_date ON asset_cash_flows(date);
CREATE INDEX IF NOT EXISTS idx_asset_cash_flows_type ON asset_cash_flows(type);

-- Trigger pre updated_at
CREATE TRIGGER update_asset_cash_flows_updated_at BEFORE UPDATE ON asset_cash_flows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE asset_cash_flows IS 'Záznamy príjmov a výdavkov z majetkov';
COMMENT ON COLUMN asset_cash_flows.type IS 'Typ cash flow - príjem (rental_income, dividend) alebo výdavok (expense, maintenance, tax)';

-- ============================================
-- 4. ASSET-LOAN METRICS (LTV, EQUITY)
-- ============================================

-- Tabuľka pre metriky majetok-úver
CREATE TABLE IF NOT EXISTS asset_loan_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  loan_id UUID REFERENCES loans(id) ON DELETE SET NULL,
  
  -- Hodnoty k dátumu
  calculation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  asset_value DECIMAL(15, 2) NOT NULL CHECK (asset_value >= 0),
  loan_balance DECIMAL(15, 2) DEFAULT 0 CHECK (loan_balance >= 0),
  
  -- Vypočítané metriky
  equity DECIMAL(15, 2) GENERATED ALWAYS AS (asset_value - COALESCE(loan_balance, 0)) STORED,
  ltv_ratio DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN asset_value > 0 THEN (COALESCE(loan_balance, 0) / asset_value * 100) 
      ELSE 0 
    END
  ) STORED,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(asset_id, calculation_date)
);

-- Indexy
CREATE INDEX IF NOT EXISTS idx_asset_loan_metrics_asset ON asset_loan_metrics(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_loan_metrics_loan ON asset_loan_metrics(loan_id) WHERE loan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_asset_loan_metrics_date ON asset_loan_metrics(calculation_date DESC);

COMMENT ON TABLE asset_loan_metrics IS 'Historické metriky LTV a equity pre majetky s úvermi';
COMMENT ON COLUMN asset_loan_metrics.ltv_ratio IS 'Loan-to-Value ratio v percentách (koľko % hodnoty majetku je financované úverom)';
COMMENT ON COLUMN asset_loan_metrics.equity IS 'Vlastný podiel (equity) = hodnota majetku - zostatok úveru';

-- ============================================
-- 5. VIEW: PORTFOLIO OVERVIEW
-- ============================================

CREATE OR REPLACE VIEW v_portfolio_overview AS
WITH asset_summary AS (
  SELECT 
    a.household_id,
    SUM(a.current_value) as total_assets_value,
    SUM(CASE WHEN a.is_income_generating THEN a.current_value ELSE 0 END) as productive_assets_value,
    SUM(CASE WHEN NOT a.is_income_generating THEN a.current_value ELSE 0 END) as non_productive_assets_value,
    SUM(COALESCE(a.monthly_income, 0)) as total_monthly_income,
    SUM(COALESCE(a.monthly_expenses, 0)) as total_monthly_expenses,
    COUNT(*) as total_assets_count,
    COUNT(*) FILTER (WHERE a.is_income_generating) as productive_assets_count
  FROM assets a
  WHERE a.asset_status != 'sold'
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
  COALESCE(a.total_assets_count, 0) as total_assets_count,
  COALESCE(a.productive_assets_count, 0) as productive_assets_count,
  
  -- Cash flow
  COALESCE(a.total_monthly_income, 0) as monthly_income_from_assets,
  COALESCE(a.total_monthly_expenses, 0) as monthly_expenses_from_assets,
  COALESCE(a.total_monthly_income, 0) - COALESCE(a.total_monthly_expenses, 0) as net_cash_flow_from_assets,
  
  -- Loans
  COALESCE(l.total_loans_count, 0) as total_loans_count,
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

COMMENT ON VIEW v_portfolio_overview IS 'Agregovaný prehľad portfólia - majetky, úvery, cash flow, net worth';

-- ============================================
-- 6. FUNCTION: Výpočet ROI pre majetok
-- ============================================

CREATE OR REPLACE FUNCTION calculate_asset_roi(
  p_asset_id UUID,
  p_period_months INTEGER DEFAULT 12
) RETURNS TABLE (
  cash_flow_roi DECIMAL(10,4),
  appreciation_roi DECIMAL(10,4),
  total_roi DECIMAL(10,4),
  total_income DECIMAL(15,2),
  total_expenses DECIMAL(15,2),
  net_cash_flow DECIMAL(15,2),
  current_value DECIMAL(15,2),
  acquisition_value DECIMAL(15,2),
  value_change DECIMAL(15,2)
) AS $$
DECLARE
  v_acquisition_value DECIMAL(15,2);
  v_current_value DECIMAL(15,2);
  v_total_income DECIMAL(15,2);
  v_total_expenses DECIMAL(15,2);
  v_acquisition_date DATE;
  v_months_held INTEGER;
BEGIN
  -- Získaj základné dáta
  SELECT 
    a.acquisition_value, 
    a.current_value,
    a.acquisition_date
  INTO 
    v_acquisition_value, 
    v_current_value,
    v_acquisition_date
  FROM assets a
  WHERE a.id = p_asset_id;
  
  IF v_acquisition_value IS NULL THEN
    RAISE EXCEPTION 'Asset not found: %', p_asset_id;
  END IF;
  
  -- Vypočítaj koľko mesiacov je majetok vlastnený
  v_months_held := EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_acquisition_date)) * 12 
                  + EXTRACT(MONTH FROM AGE(CURRENT_DATE, v_acquisition_date));
  
  -- Ak je požadované obdobie dlhšie ako vlastníme majetok, použi skutočné obdobie
  IF p_period_months > v_months_held THEN
    p_period_months := v_months_held;
  END IF;
  
  -- Vypočítaj cash flow za obdobie
  SELECT 
    COALESCE(SUM(CASE WHEN acf.type IN ('rental_income', 'dividend', 'interest', 'sale_income') THEN acf.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN acf.type IN ('expense', 'maintenance', 'tax', 'insurance') THEN acf.amount ELSE 0 END), 0)
  INTO v_total_income, v_total_expenses
  FROM asset_cash_flows acf
  WHERE acf.asset_id = p_asset_id
    AND acf.date >= CURRENT_DATE - (p_period_months || ' months')::INTERVAL;
  
  -- Vypočítaj ROI
  -- Cash flow ROI = (príjmy - výdavky) / nákupná cena * 100
  -- Appreciation ROI = (aktuálna hodnota - nákupná cena) / nákupná cena * 100
  -- Total ROI = Cash flow ROI + Appreciation ROI
  
  -- Anualizuj ROI ak je obdobie iné ako 12 mesiacov
  RETURN QUERY SELECT 
    CASE 
      WHEN v_acquisition_value > 0 AND p_period_months > 0
      THEN ((v_total_income - v_total_expenses) / v_acquisition_value * 100 * 12.0 / p_period_months)
      ELSE 0 
    END,
    CASE 
      WHEN v_acquisition_value > 0 
      THEN ((v_current_value - v_acquisition_value) / v_acquisition_value * 100)
      ELSE 0 
    END,
    CASE 
      WHEN v_acquisition_value > 0 AND p_period_months > 0
      THEN (
        ((v_total_income - v_total_expenses) / v_acquisition_value * 100 * 12.0 / p_period_months) +
        ((v_current_value - v_acquisition_value) / v_acquisition_value * 100)
      )
      ELSE 0 
    END,
    v_total_income,
    v_total_expenses,
    v_total_income - v_total_expenses,
    v_current_value,
    v_acquisition_value,
    v_current_value - v_acquisition_value;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_asset_roi IS 'Vypočíta ROI pre majetok - cash flow ROI, appreciation ROI a celkový ROI (anualizované)';

-- ============================================
-- 7. FUNCTION: Aktualizácia asset-loan metrik
-- ============================================

CREATE OR REPLACE FUNCTION update_asset_loan_metrics(p_household_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_asset RECORD;
  v_loan_balance DECIMAL(15,2);
BEGIN
  -- Pre každý majetok, ktorý má prepojený úver
  FOR v_asset IN 
    SELECT 
      a.id as asset_id,
      a.current_value,
      l.id as loan_id
    FROM assets a
    INNER JOIN loans l ON l.linked_asset_id = a.id AND l.status = 'active'
    WHERE (p_household_id IS NULL OR a.household_id = p_household_id)
  LOOP
    -- Vypočítaj aktuálny zostatok úveru
    SELECT COALESCE(SUM(ls.principal_due), 0)
    INTO v_loan_balance
    FROM loan_schedules ls
    WHERE ls.loan_id = v_asset.loan_id
      AND ls.status != 'paid';
    
    -- Ulož metriku (INSERT ... ON CONFLICT UPDATE)
    INSERT INTO asset_loan_metrics (asset_id, loan_id, calculation_date, asset_value, loan_balance)
    VALUES (v_asset.asset_id, v_asset.loan_id, CURRENT_DATE, v_asset.current_value, v_loan_balance)
    ON CONFLICT (asset_id, calculation_date) 
    DO UPDATE SET 
      loan_id = EXCLUDED.loan_id,
      asset_value = EXCLUDED.asset_value,
      loan_balance = EXCLUDED.loan_balance;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_asset_loan_metrics IS 'Aktualizuje LTV a equity metriky pre všetky majetky s úvermi';

-- ============================================
-- 8. RLS POLICIES
-- ============================================

-- asset_cash_flows policies
ALTER TABLE asset_cash_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cash flows of their household assets" ON asset_cash_flows
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assets
      JOIN household_members ON household_members.household_id = assets.household_id
      WHERE assets.id = asset_cash_flows.asset_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can manage cash flows" ON asset_cash_flows
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assets
      JOIN household_members ON household_members.household_id = assets.household_id
      WHERE assets.id = asset_cash_flows.asset_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin', 'member')
    )
  );

-- asset_loan_metrics policies
ALTER TABLE asset_loan_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view metrics of their household assets" ON asset_loan_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assets
      JOIN household_members ON household_members.household_id = assets.household_id
      WHERE assets.id = asset_loan_metrics.asset_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage asset loan metrics" ON asset_loan_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assets
      JOIN household_members ON household_members.household_id = assets.household_id
      WHERE assets.id = asset_loan_metrics.asset_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin', 'member')
    )
  );

-- ============================================
-- ✅ MIGRÁCIA DOKONČENÁ
-- ============================================

-- Vytvor metriky pre existujúce záznamy
SELECT update_asset_loan_metrics();

