-- Fix RLS policies for push_tokens table
-- The issue is that profiles table uses 'id' while auth uses auth.uid()

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can insert own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can update own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can delete own push tokens" ON push_tokens;

-- Recreate policies with correct user_id reference
-- Note: profiles.id is the user_id, which should match auth.uid()

CREATE POLICY "Users can view own push tokens"
  ON push_tokens FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own push tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own push tokens"
  ON push_tokens FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own push tokens"
  ON push_tokens FOR DELETE
  USING (user_id = auth.uid());

COMMENT ON TABLE push_tokens IS 'RLS policies fixed to properly check auth.uid()';
