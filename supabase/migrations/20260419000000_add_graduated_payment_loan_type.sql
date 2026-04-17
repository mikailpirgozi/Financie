-- Add 'graduated_payment' as a valid loan_type value.
--
-- The application (packages/core) supports 5 loan types:
--   'annuity' | 'fixed_principal' | 'interest_only' | 'auto_loan' | 'graduated_payment'
--
-- The previous CHECK constraint only allowed the first four, which meant that
-- inserting a graduated_payment loan would fail in production. This migration
-- widens the constraint to include the missing type.

ALTER TABLE loans
DROP CONSTRAINT IF EXISTS loans_loan_type_check;

ALTER TABLE loans
ADD CONSTRAINT loans_loan_type_check
CHECK (loan_type IN ('annuity', 'fixed_principal', 'interest_only', 'auto_loan', 'graduated_payment'));

COMMENT ON CONSTRAINT loans_loan_type_check ON loans IS
  'Allowed loan_type values. Must stay in sync with packages/core/src/loan-engine LoanType union.';
