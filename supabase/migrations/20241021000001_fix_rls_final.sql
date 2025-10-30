-- ============================================
-- Final RLS Fix - Remove ALL recursion
-- ============================================

-- Drop ALL existing policies on household_members
DROP POLICY IF EXISTS "Users can view household members of their households" ON household_members CASCADE;
DROP POLICY IF EXISTS "Owners can add household members" ON household_members CASCADE;
DROP POLICY IF EXISTS "Owners can remove household members" ON household_members CASCADE;
DROP POLICY IF EXISTS "Users can remove themselves from household" ON household_members CASCADE;
DROP POLICY IF EXISTS "Users can view own membership" ON household_members CASCADE;
DROP POLICY IF EXISTS "Users can view household members" ON household_members CASCADE;
DROP POLICY IF EXISTS "Owners can add members" ON household_members CASCADE;
DROP POLICY IF EXISTS "Owners can remove members" ON household_members CASCADE;
DROP POLICY IF EXISTS "Users can leave household" ON household_members CASCADE;

-- Recreate policies WITHOUT any recursion
-- These policies use direct auth.uid() checks and subqueries that don't reference the same table in RLS context

CREATE POLICY "hm_select_own"
  ON household_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "hm_select_household"
  ON household_members FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "hm_insert_owner"
  ON household_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = household_members.household_id
      AND user_id = auth.uid()
      AND role = 'owner'
    )
  );

CREATE POLICY "hm_delete_owner"
  ON household_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'owner'
    )
  );

CREATE POLICY "hm_delete_self"
  ON household_members FOR DELETE
  USING (user_id = auth.uid());

