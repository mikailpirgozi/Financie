-- Fix push_tokens table - ensure platform column is correct

-- Drop device_type column if it exists (old schema)
ALTER TABLE push_tokens DROP COLUMN IF EXISTS device_type;

-- Ensure platform column exists and is nullable
DO $$ 
BEGIN
  -- Add platform if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'push_tokens' AND column_name = 'platform'
  ) THEN
    ALTER TABLE push_tokens ADD COLUMN platform TEXT;
  END IF;
  
  -- Remove NOT NULL constraint if it exists
  ALTER TABLE push_tokens ALTER COLUMN platform DROP NOT NULL;
  
  -- Add check constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'push_tokens_platform_check'
  ) THEN
    ALTER TABLE push_tokens 
    ADD CONSTRAINT push_tokens_platform_check 
    CHECK (platform IN ('ios', 'android', 'web'));
  END IF;
END $$;

COMMENT ON COLUMN push_tokens.platform IS 'Device platform: ios, android, or web (nullable)';
