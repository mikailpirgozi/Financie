-- Mark all loan installments as paid until today
UPDATE loan_schedules
SET 
  status = 'paid',
  paid_at = due_date
WHERE 
  status = 'pending'
  AND due_date <= CURRENT_DATE;

-- Show results
SELECT 
  l.lender,
  ls.installment_no,
  ls.due_date,
  ls.status,
  ls.paid_at
FROM loan_schedules ls
JOIN loans l ON l.id = ls.loan_id
WHERE ls.status = 'paid'
ORDER BY l.lender, ls.installment_no;
