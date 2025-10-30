-- Add 'auto_loan' to loan_type enum
-- Drop existing constraint and create new one with auto_loan

ALTER TABLE loans 
DROP CONSTRAINT IF EXISTS loans_loan_type_check;

ALTER TABLE loans 
ADD CONSTRAINT loans_loan_type_check 
CHECK (loan_type IN ('annuity', 'fixed_principal', 'interest_only', 'auto_loan'));

