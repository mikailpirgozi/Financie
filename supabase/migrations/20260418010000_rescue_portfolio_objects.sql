-- =====================================================
-- RESCUE: portfolio management objects + dashboard fix
-- =====================================================
-- Problem: migrácia 20250103120000_portfolio_management.sql je v
-- supabase_migrations.schema_migrations zaznamenaná ako applied,
-- ale objekty (asset_loan_metrics, asset_cash_flows, update_asset_loan_metrics,
-- calculate_asset_roi) v produkčnej DB nie sú. Live test cez PostgREST potvrdil.
--
-- Problem 2: get_household_dashboard_summary (z 20241102180000) má v deklarácii
-- INTEGER pre income_count/expense_count/total_loans/active_loans, ale
-- materialized view vracia BIGINT → každé volanie končí 42804 chybou.
--
-- Riešenie: idempotentne dorobiť chýbajúce objekty + opraviť funkciu.
-- =====================================================

-- =====================================================
-- 1) asset_cash_flows tabuľka
-- =====================================================
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

CREATE INDEX IF NOT EXISTS idx_asset_cash_flows_asset ON asset_cash_flows(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_cash_flows_date ON asset_cash_flows(date);
CREATE INDEX IF NOT EXISTS idx_asset_cash_flows_type ON asset_cash_flows(type);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_asset_cash_flows_updated_at'
  ) THEN
    EXECUTE 'CREATE TRIGGER update_asset_cash_flows_updated_at BEFORE UPDATE ON asset_cash_flows
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END $$;

COMMENT ON TABLE asset_cash_flows IS 'Záznamy príjmov a výdavkov z majetkov';

-- RLS
ALTER TABLE asset_cash_flows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view cash flows of their household assets" ON asset_cash_flows;
CREATE POLICY "Users can view cash flows of their household assets" ON asset_cash_flows
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assets
      JOIN household_members ON household_members.household_id = assets.household_id
      WHERE assets.id = asset_cash_flows.asset_id
      AND household_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can manage cash flows" ON asset_cash_flows;
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

-- =====================================================
-- 2) asset_loan_metrics tabuľka
-- =====================================================
CREATE TABLE IF NOT EXISTS asset_loan_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  loan_id UUID REFERENCES loans(id) ON DELETE SET NULL,
  calculation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  asset_value DECIMAL(15, 2) NOT NULL CHECK (asset_value >= 0),
  loan_balance DECIMAL(15, 2) DEFAULT 0 CHECK (loan_balance >= 0),
  equity DECIMAL(15, 2) GENERATED ALWAYS AS (asset_value - COALESCE(loan_balance, 0)) STORED,
  ltv_ratio DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE
      WHEN asset_value > 0 THEN (COALESCE(loan_balance, 0) / asset_value * 100)
      ELSE 0
    END
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (asset_id, calculation_date)
);

CREATE INDEX IF NOT EXISTS idx_asset_loan_metrics_asset ON asset_loan_metrics(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_loan_metrics_loan ON asset_loan_metrics(loan_id) WHERE loan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_asset_loan_metrics_date ON asset_loan_metrics(calculation_date DESC);

COMMENT ON TABLE asset_loan_metrics IS 'Historické metriky LTV a equity pre majetky s úvermi';

ALTER TABLE asset_loan_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view metrics of their household assets" ON asset_loan_metrics;
CREATE POLICY "Users can view metrics of their household assets" ON asset_loan_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assets
      JOIN household_members ON household_members.household_id = assets.household_id
      WHERE assets.id = asset_loan_metrics.asset_id
      AND household_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can manage asset loan metrics" ON asset_loan_metrics;
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

-- =====================================================
-- 3) calculate_asset_roi(p_asset_id, p_period_months)
-- =====================================================
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
  SELECT a.acquisition_value, a.current_value, a.acquisition_date
  INTO v_acquisition_value, v_current_value, v_acquisition_date
  FROM assets a
  WHERE a.id = p_asset_id;

  IF v_acquisition_value IS NULL THEN
    RAISE EXCEPTION 'Asset not found: %', p_asset_id;
  END IF;

  v_months_held := EXTRACT(YEAR FROM AGE(CURRENT_DATE, COALESCE(v_acquisition_date, CURRENT_DATE))) * 12
                  + EXTRACT(MONTH FROM AGE(CURRENT_DATE, COALESCE(v_acquisition_date, CURRENT_DATE)));

  IF v_months_held <= 0 THEN
    v_months_held := 1;
  END IF;

  IF p_period_months > v_months_held THEN
    p_period_months := v_months_held;
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN acf.type IN ('rental_income', 'dividend', 'interest', 'sale_income') THEN acf.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN acf.type IN ('expense', 'maintenance', 'tax', 'insurance') THEN acf.amount ELSE 0 END), 0)
  INTO v_total_income, v_total_expenses
  FROM asset_cash_flows acf
  WHERE acf.asset_id = p_asset_id
    AND acf.date >= CURRENT_DATE - (p_period_months || ' months')::INTERVAL;

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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION calculate_asset_roi(UUID, INTEGER) TO authenticated;

COMMENT ON FUNCTION calculate_asset_roi IS 'Vypočíta ROI pre majetok - cash flow ROI, appreciation ROI a celkový ROI (anualizované)';

-- =====================================================
-- 4) update_asset_loan_metrics(p_household_id)
-- =====================================================
CREATE OR REPLACE FUNCTION update_asset_loan_metrics(p_household_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_asset RECORD;
  v_loan_balance DECIMAL(15,2);
BEGIN
  FOR v_asset IN
    SELECT
      a.id AS asset_id,
      a.current_value,
      l.id AS loan_id
    FROM assets a
    INNER JOIN loans l ON l.linked_asset_id = a.id AND l.status = 'active'
    WHERE (p_household_id IS NULL OR a.household_id = p_household_id)
  LOOP
    SELECT COALESCE(
      (SELECT principal_balance_after
         FROM loan_schedules
         WHERE loan_id = v_asset.loan_id AND status = 'paid'
         ORDER BY installment_no DESC
         LIMIT 1),
      (SELECT principal FROM loans WHERE id = v_asset.loan_id)
    )
    INTO v_loan_balance;

    INSERT INTO asset_loan_metrics (asset_id, loan_id, calculation_date, asset_value, loan_balance)
    VALUES (v_asset.asset_id, v_asset.loan_id, CURRENT_DATE, COALESCE(v_asset.current_value, 0), COALESCE(v_loan_balance, 0))
    ON CONFLICT (asset_id, calculation_date)
    DO UPDATE SET
      loan_id = EXCLUDED.loan_id,
      asset_value = EXCLUDED.asset_value,
      loan_balance = EXCLUDED.loan_balance;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_asset_loan_metrics(UUID) TO authenticated;

COMMENT ON FUNCTION update_asset_loan_metrics IS 'Aktualizuje LTV a equity metriky pre všetky majetky s aktívnymi úvermi';

-- =====================================================
-- 5) Oprava get_household_dashboard_summary (BIGINT vs INTEGER)
-- =====================================================
-- mv_household_dashboard_summary používa COUNT(*) ktorý vracia BIGINT,
-- preto musí byť aj návratový typ funkcie BIGINT.
DROP FUNCTION IF EXISTS get_household_dashboard_summary(UUID, INTEGER);

CREATE OR REPLACE FUNCTION get_household_dashboard_summary(
  p_household_id UUID,
  p_months_count INTEGER DEFAULT 6
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
AS $$
BEGIN
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
  FROM mv_household_dashboard_summary mvd
  WHERE mvd.household_id = p_household_id
  ORDER BY mvd.month DESC
  LIMIT p_months_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_household_dashboard_summary(UUID, INTEGER) TO authenticated;

COMMENT ON FUNCTION get_household_dashboard_summary IS
  'Optimalizovaná dashboard summary z materialized view (BIGINT typy zhodné s mv_household_dashboard_summary).';

-- =====================================================
-- 6) Inicializačný refresh (best effort)
-- =====================================================
DO $$
BEGIN
  PERFORM update_asset_loan_metrics();
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'update_asset_loan_metrics initial seed skipped: %', SQLERRM;
END $$;
