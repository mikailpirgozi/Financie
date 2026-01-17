-- Fix push_tokens unique constraint for upsert operations

-- Drop the existing unique constraint if it exists
ALTER TABLE push_tokens DROP CONSTRAINT IF EXISTS push_tokens_user_id_token_key;

-- Add the correct unique constraint
ALTER TABLE push_tokens ADD CONSTRAINT push_tokens_user_id_token_key UNIQUE (user_id, token);

COMMENT ON CONSTRAINT push_tokens_user_id_token_key ON push_tokens IS 'Unique constraint for upsert operations';
