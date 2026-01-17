-- Refresh schema cache for push_tokens table
-- This ensures the 'platform' column is properly recognized

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'push_tokens' AND column_name = 'device_id') THEN
    ALTER TABLE push_tokens ADD COLUMN device_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'push_tokens' AND column_name = 'platform') THEN
    ALTER TABLE push_tokens ADD COLUMN platform TEXT CHECK (platform IN ('ios', 'android', 'web'));
  END IF;
END $$;

-- Ensure the constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'push_tokens_platform_check'
  ) THEN
    ALTER TABLE push_tokens 
    ADD CONSTRAINT push_tokens_platform_check 
    CHECK (platform IN ('ios', 'android', 'web'));
  END IF;
END $$;

-- Create indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_push_tokens_user') THEN
    CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_push_tokens_token') THEN
    CREATE INDEX idx_push_tokens_token ON push_tokens(token);
  END IF;
END $$;

COMMENT ON TABLE push_tokens IS 'Schema updated to ensure platform column is properly recognized';
