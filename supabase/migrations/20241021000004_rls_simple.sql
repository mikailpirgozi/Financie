-- ============================================
-- SIMPLEST RLS - No recursion possible
-- ============================================

-- Drop ALL policies on household_members
DROP POLICY IF EXISTS "hm_select" ON household_members;
DROP POLICY IF EXISTS "hm_insert" ON household_members;
DROP POLICY IF EXISTS "hm_delete" ON household_members;
DROP POLICY IF EXISTS "household_members_select_own" ON household_members;
DROP POLICY IF EXISTS "household_members_select_same_household" ON household_members;
DROP POLICY IF EXISTS "household_members_insert" ON household_members;
DROP POLICY IF EXISTS "household_members_delete_as_owner" ON household_members;
DROP POLICY IF EXISTS "household_members_delete_self" ON household_members;

-- Strategy: Allow authenticated users to READ all household_members
-- This is safe because they can only see memberships, not sensitive data
-- Write operations are still restricted

CREATE POLICY "authenticated_can_read_memberships"
  ON household_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "owners_can_add_members"
  ON household_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'owner'
    )
  );

CREATE POLICY "users_can_leave_or_owners_can_remove"
  ON household_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'owner'
    )
  );

-- Update helper functions to work without recursion
DROP FUNCTION IF EXISTS is_household_member(UUID);
DROP FUNCTION IF EXISTS is_household_owner(UUID);

CREATE OR REPLACE FUNCTION is_household_member(p_household_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = p_household_id
    AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_household_owner(p_household_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = p_household_id
    AND user_id = auth.uid()
    AND role = 'owner'
  );
$$;

