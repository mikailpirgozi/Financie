-- ============================================
-- RLS POLICIES pre Asset Management tabulky
-- ============================================

-- Enable RLS na vsetkych novych tabulkach
ALTER TABLE insurers ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurances ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE fines ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INSURERS policies
-- ============================================

CREATE POLICY "Users can view insurers in their household" ON insurers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = insurers.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert insurers in their household" ON insurers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = insurers.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Users can update insurers in their household" ON insurers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = insurers.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Users can delete insurers in their household" ON insurers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = insurers.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- INSURANCES policies
-- ============================================

CREATE POLICY "Users can view insurances in their household" ON insurances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = insurances.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert insurances in their household" ON insurances
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = insurances.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Users can update insurances in their household" ON insurances
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = insurances.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Users can delete insurances in their household" ON insurances
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = insurances.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- VEHICLE_DOCUMENTS policies
-- ============================================

CREATE POLICY "Users can view vehicle_documents in their household" ON vehicle_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = vehicle_documents.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert vehicle_documents in their household" ON vehicle_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = vehicle_documents.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Users can update vehicle_documents in their household" ON vehicle_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = vehicle_documents.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Users can delete vehicle_documents in their household" ON vehicle_documents
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = vehicle_documents.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- SERVICE_RECORDS policies
-- ============================================

CREATE POLICY "Users can view service_records in their household" ON service_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = service_records.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert service_records in their household" ON service_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = service_records.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Users can update service_records in their household" ON service_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = service_records.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Users can delete service_records in their household" ON service_records
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = service_records.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- FINES policies
-- ============================================

CREATE POLICY "Users can view fines in their household" ON fines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = fines.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert fines in their household" ON fines
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = fines.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Users can update fines in their household" ON fines
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = fines.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Users can delete fines in their household" ON fines
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = fines.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- INSURANCE_CLAIMS policies
-- ============================================

CREATE POLICY "Users can view insurance_claims in their household" ON insurance_claims
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = insurance_claims.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert insurance_claims in their household" ON insurance_claims
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = insurance_claims.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Users can update insurance_claims in their household" ON insurance_claims
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = insurance_claims.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Users can delete insurance_claims in their household" ON insurance_claims
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = insurance_claims.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin')
    )
  );
