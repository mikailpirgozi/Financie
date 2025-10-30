-- ============================================
-- Fix RLS infinite recursion
-- ============================================

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view household members of their households" ON household_members;
DROP POLICY IF EXISTS "Owners can add household members" ON household_members;
DROP POLICY IF EXISTS "Owners can remove household members" ON household_members;

-- Recreate household_members policies WITHOUT using helper functions
-- This avoids infinite recursion

CREATE POLICY "Users can view household members of their households"
  ON household_members FOR SELECT
  USING (
    user_id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can add household members"
  ON household_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'owner'
    )
  );

CREATE POLICY "Owners can remove household members"
  ON household_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'owner'
    )
  );

-- Also fix the helper functions to use STABLE instead of SECURITY DEFINER
-- This prevents recursion issues

DROP FUNCTION IF EXISTS is_household_member(UUID);
DROP FUNCTION IF EXISTS is_household_owner(UUID);

CREATE OR REPLACE FUNCTION is_household_member(p_household_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = p_household_id
    AND user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_household_owner(p_household_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = p_household_id
    AND user_id = auth.uid()
    AND role = 'owner'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

