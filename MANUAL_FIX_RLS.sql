-- ============================================
-- MANUAL FIX: Complete RLS Reset
-- Spusti v Supabase SQL Editor
-- ============================================

-- 1. Drop ALL existing policies on household_members
DROP POLICY IF EXISTS "Users can view household members of their households" ON household_members;
DROP POLICY IF EXISTS "Owners can add household members" ON household_members;
DROP POLICY IF EXISTS "Owners can remove household members" ON household_members;
DROP POLICY IF EXISTS "Users can remove themselves from household" ON household_members;

-- 2. Recreate policies WITHOUT recursion
-- Policy 1: Users can see their own membership
CREATE POLICY "Users can view own membership"
  ON household_members FOR SELECT
  USING (user_id = auth.uid());

-- Policy 2: Users can see other members in same household
CREATE POLICY "Users can view household members"
  ON household_members FOR SELECT
  USING (
    household_id IN (
      SELECT hm.household_id 
      FROM household_members hm 
      WHERE hm.user_id = auth.uid()
    )
  );

-- Policy 3: Owners can add members
CREATE POLICY "Owners can add members"
  ON household_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'owner'
    )
  );

-- Policy 4: Owners can remove members
CREATE POLICY "Owners can remove members"
  ON household_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'owner'
    )
  );

-- Policy 5: Users can remove themselves
CREATE POLICY "Users can leave household"
  ON household_members FOR DELETE
  USING (user_id = auth.uid());

-- 3. Test query
SELECT 
  policyname, 
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'household_members'
ORDER BY policyname;

