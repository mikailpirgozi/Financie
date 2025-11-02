-- ============================================
-- Overdue Notifications Support
-- ============================================

-- Function to count overdue installments for a household
CREATE OR REPLACE FUNCTION count_overdue_installments(p_household_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM loan_schedules ls
    JOIN loans l ON l.id = ls.loan_id
    WHERE l.household_id = p_household_id
      AND l.status = 'active'
      AND ls.status IN ('pending', 'overdue')
      AND ls.due_date < CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION count_overdue_installments TO authenticated;

-- Function to get overdue loans with details
CREATE OR REPLACE FUNCTION get_overdue_loans(p_household_id UUID)
RETURNS TABLE (
  loan_id UUID,
  lender TEXT,
  overdue_count BIGINT,
  total_overdue_amount NUMERIC,
  oldest_overdue_date DATE,
  days_overdue INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id as loan_id,
    l.lender,
    COUNT(ls.id) as overdue_count,
    COALESCE(SUM(ls.total_due), 0) as total_overdue_amount,
    MIN(ls.due_date) as oldest_overdue_date,
    (CURRENT_DATE - MIN(ls.due_date))::INTEGER as days_overdue
  FROM loans l
  JOIN loan_schedules ls ON ls.loan_id = l.id
  WHERE l.household_id = p_household_id
    AND l.status = 'active'
    AND ls.status IN ('pending', 'overdue')
    AND ls.due_date < CURRENT_DATE
  GROUP BY l.id, l.lender
  ORDER BY days_overdue DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_overdue_loans TO authenticated;

-- Add RLS policies for the functions
COMMENT ON FUNCTION count_overdue_installments IS 'Count total overdue installments for a household';
COMMENT ON FUNCTION get_overdue_loans IS 'Get detailed list of loans with overdue installments';

