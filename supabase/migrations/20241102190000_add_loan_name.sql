-- Add 'name' column to loans table for custom loan descriptions
ALTER TABLE loans 
ADD COLUMN name TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN loans.name IS 'Optional custom name/description for the loan (e.g., "Auto loan BMW X5", "Mortgage for apartment")';

-- Create index for searching by name
CREATE INDEX idx_loans_name ON loans(name) WHERE name IS NOT NULL;

