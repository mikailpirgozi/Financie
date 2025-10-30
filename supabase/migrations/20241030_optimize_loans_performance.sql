-- =====================================================
-- FÁZA 1: INDEXES PRE RÝCHLE QUERIES
-- =====================================================

-- Index pre loan_schedules (90% queries používajú tento pattern)
CREATE INDEX IF NOT EXISTS idx_loan_schedules_composite 
ON loan_schedules(loan_id, status, due_date) 
INCLUDE (principal_due, interest_due, fees_due, total_due, principal_balance_after);

-- Index pre loans filtering
CREATE INDEX IF NOT EXISTS idx_loans_household_status 
ON loans(household_id, status) 
INCLUDE (principal, annual_rate, term_months);

-- Index pre rýchle counting
CREATE INDEX IF NOT EXISTS idx_loan_schedules_status 
ON loan_schedules(loan_id, status);

-- =====================================================
-- FÁZA 2: MATERIALIZED VIEW PRE AGREGÁCIE
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS loan_metrics AS
SELECT 
  l.id as loan_id,
  l.household_id,
  -- Počty splátok
  COUNT(s.id) as total_installments,
  COUNT(s.id) FILTER (WHERE s.status = 'paid') as paid_count,
  COUNT(s.id) FILTER (WHERE s.status = 'overdue') as overdue_count,
  COUNT(s.id) FILTER (WHERE s.status = 'pending') as pending_count,
  COUNT(s.id) FILTER (
    WHERE s.status = 'pending' 
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
  
  -- Next installment info
  (SELECT json_build_object(
    'installment_no', installment_no,
    'due_date', due_date,
    'total_due', total_due,
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

-- Unique index pre refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_loan_metrics_loan_id 
ON loan_metrics(loan_id);

-- =====================================================
-- FÁZA 3: AUTO-REFRESH TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_loan_metrics()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY loan_metrics;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger na zmeny v loan_schedules
DROP TRIGGER IF EXISTS trigger_refresh_loan_metrics ON loan_schedules;
CREATE TRIGGER trigger_refresh_loan_metrics
AFTER INSERT OR UPDATE OR DELETE ON loan_schedules
FOR EACH STATEMENT 
EXECUTE FUNCTION refresh_loan_metrics();

-- Trigger na zmeny v loans
DROP TRIGGER IF EXISTS trigger_refresh_loan_metrics_loans ON loans;
CREATE TRIGGER trigger_refresh_loan_metrics_loans
AFTER INSERT OR UPDATE OR DELETE ON loans
FOR EACH STATEMENT 
EXECUTE FUNCTION refresh_loan_metrics();

-- Initial refresh
REFRESH MATERIALIZED VIEW loan_metrics;
