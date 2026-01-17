-- ============================================
-- LOAN DOCUMENTS TABLE
-- Dokumenty k úverom (zmluvy, splátkové kalendáre)
-- ============================================

-- ============================================
-- 1. CREATE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS loan_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  
  -- Document info
  document_type TEXT NOT NULL CHECK (document_type IN ('contract', 'payment_schedule', 'amendment', 'other')),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  
  -- Optional notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_loan_documents_household ON loan_documents(household_id);
CREATE INDEX IF NOT EXISTS idx_loan_documents_loan ON loan_documents(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_documents_type ON loan_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_loan_documents_created ON loan_documents(created_at DESC);

-- ============================================
-- 3. TRIGGER FOR updated_at
-- ============================================

CREATE TRIGGER update_loan_documents_updated_at 
  BEFORE UPDATE ON loan_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE loan_documents ENABLE ROW LEVEL SECURITY;

-- Users can view loan documents in their household
CREATE POLICY "Users can view loan_documents in their household" ON loan_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = auth.uid()
      AND household_members.household_id = loan_documents.household_id
    )
  );

-- Users can insert loan documents in their household
CREATE POLICY "Users can insert loan_documents in their household" ON loan_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = auth.uid()
      AND household_members.household_id = loan_documents.household_id
    )
  );

-- Users can update loan documents in their household
CREATE POLICY "Users can update loan_documents in their household" ON loan_documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = auth.uid()
      AND household_members.household_id = loan_documents.household_id
    )
  );

-- Users can delete loan documents in their household
CREATE POLICY "Users can delete loan_documents in their household" ON loan_documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = auth.uid()
      AND household_members.household_id = loan_documents.household_id
    )
  );

-- ============================================
-- 5. COMMENTS
-- ============================================

COMMENT ON TABLE loan_documents IS 'Dokumenty priradené k úverom (zmluvy, splátkové kalendáre, dodatky)';
COMMENT ON COLUMN loan_documents.document_type IS 'Typ dokumentu: contract (zmluva), payment_schedule (splátkový kalendár), amendment (dodatok), other (iný)';
COMMENT ON COLUMN loan_documents.file_path IS 'Cesta k súboru v Supabase Storage (documents bucket)';
