-- Create loan_notes table for notes on loans and payments
CREATE TABLE loan_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  schedule_id UUID REFERENCES loan_schedules(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'info')),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_loan_notes_loan ON loan_notes(loan_id);
CREATE INDEX idx_loan_notes_payment ON loan_notes(payment_id);
CREATE INDEX idx_loan_notes_schedule ON loan_notes(schedule_id);
CREATE INDEX idx_loan_notes_priority ON loan_notes(priority);
CREATE INDEX idx_loan_notes_status ON loan_notes(status);
CREATE INDEX idx_loan_notes_pinned ON loan_notes(is_pinned);

-- Create updated_at trigger
CREATE TRIGGER update_loan_notes_updated_at BEFORE UPDATE ON loan_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE loan_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for loan_notes
-- Users can view notes for loans in their household
CREATE POLICY "Users can view loan notes in their household"
  ON loan_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM loans l
      JOIN household_members hm ON l.household_id = hm.household_id
      WHERE l.id = loan_notes.loan_id
      AND hm.user_id = auth.uid()
    )
  );

-- Users can insert notes for loans in their household
CREATE POLICY "Users can insert loan notes in their household"
  ON loan_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loans l
      JOIN household_members hm ON l.household_id = hm.household_id
      WHERE l.id = loan_notes.loan_id
      AND hm.user_id = auth.uid()
    )
  );

-- Users can update notes for loans in their household
CREATE POLICY "Users can update loan notes in their household"
  ON loan_notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM loans l
      JOIN household_members hm ON l.household_id = hm.household_id
      WHERE l.id = loan_notes.loan_id
      AND hm.user_id = auth.uid()
    )
  );

-- Users can delete notes for loans in their household
CREATE POLICY "Users can delete loan notes in their household"
  ON loan_notes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM loans l
      JOIN household_members hm ON l.household_id = hm.household_id
      WHERE l.id = loan_notes.loan_id
      AND hm.user_id = auth.uid()
    )
  );
