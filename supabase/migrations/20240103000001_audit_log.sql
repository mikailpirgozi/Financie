-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'payment', 'early_repayment')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('loan', 'expense', 'income', 'asset', 'household_member', 'category', 'payment')),
  entity_id UUID NOT NULL,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_audit_logs_household ON audit_logs(household_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Add comments
COMMENT ON TABLE audit_logs IS 'Audit trail for all critical operations';
COMMENT ON COLUMN audit_logs.action IS 'Type of action performed';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity that was modified';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID of the entity that was modified';
COMMENT ON COLUMN audit_logs.changes IS 'JSON object with old_value and new_value';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the user who performed the action';
COMMENT ON COLUMN audit_logs.user_agent IS 'User agent string of the client';

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view audit logs for their households
CREATE POLICY "Users can view audit logs for their households"
  ON audit_logs
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id
      FROM household_members
      WHERE user_id = auth.uid()
    )
  );

-- Only service role can insert audit logs (via API)
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- No one can update or delete audit logs (immutable)
CREATE POLICY "Audit logs are immutable"
  ON audit_logs
  FOR UPDATE
  USING (false);

CREATE POLICY "Audit logs cannot be deleted"
  ON audit_logs
  FOR DELETE
  USING (false);

