-- ============================================
-- Final RLS Fix - NO RECURSION AT ALL
-- ============================================

-- Drop ALL policies on household_members
DROP POLICY IF EXISTS "hm_select_own" ON household_members;
DROP POLICY IF EXISTS "hm_select_household" ON household_members;
DROP POLICY IF EXISTS "hm_insert_owner" ON household_members;
DROP POLICY IF EXISTS "hm_delete_owner" ON household_members;
DROP POLICY IF EXISTS "hm_delete_self" ON household_members;

-- Create a security definer function that bypasses RLS for checking membership
CREATE OR REPLACE FUNCTION public.get_user_households()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT household_id 
  FROM household_members 
  WHERE user_id = auth.uid();
$$;

-- Now create policies that DON'T cause recursion
-- Policy 1: Users can see their own memberships
CREATE POLICY "household_members_select_own"
  ON household_members FOR SELECT
  USING (user_id = auth.uid());

-- Policy 2: Users can see memberships in their households (using the function)
CREATE POLICY "household_members_select_same_household"
  ON household_members FOR SELECT
  USING (household_id IN (SELECT public.get_user_households()));

-- Policy 3: Owners can add members (using the function + role check)
CREATE POLICY "household_members_insert"
  ON household_members FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT hm.household_id 
      FROM household_members hm
      WHERE hm.user_id = auth.uid() 
      AND hm.role = 'owner'
    )
  );

-- Policy 4: Owners can remove members
CREATE POLICY "household_members_delete_as_owner"
  ON household_members FOR DELETE
  USING (
    household_id IN (
      SELECT hm.household_id 
      FROM household_members hm
      WHERE hm.user_id = auth.uid() 
      AND hm.role = 'owner'
    )
  );

-- Policy 5: Users can remove themselves
CREATE POLICY "household_members_delete_self"
  ON household_members FOR DELETE
  USING (user_id = auth.uid());

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_user_households() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_households() TO anon;

