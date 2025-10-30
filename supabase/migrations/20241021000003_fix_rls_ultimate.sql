-- ============================================
-- ULTIMATE RLS FIX - Disable RLS in function
-- ============================================

-- Drop policies that depend on the function first
DROP POLICY IF EXISTS "household_members_select_same_household" ON household_members;

-- Drop the problematic function
DROP FUNCTION IF EXISTS public.get_user_households();

-- Create function that explicitly bypasses RLS
CREATE OR REPLACE FUNCTION public.get_user_households()
RETURNS TABLE(household_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Temporarily disable RLS for this query
  RETURN QUERY
  SELECT hm.household_id 
  FROM household_members hm
  WHERE hm.user_id = auth.uid();
END;
$$;

-- Alternative: Just use simpler policies without the function
-- Drop all existing policies
DROP POLICY IF EXISTS "household_members_select_own" ON household_members;
DROP POLICY IF EXISTS "household_members_select_same_household" ON household_members;
DROP POLICY IF EXISTS "household_members_insert" ON household_members;
DROP POLICY IF EXISTS "household_members_delete_as_owner" ON household_members;
DROP POLICY IF EXISTS "household_members_delete_self" ON household_members;

-- Simplest possible policies that work
CREATE POLICY "hm_select"
  ON household_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    household_id = ANY(
      ARRAY(SELECT household_id FROM public.get_user_households())
    )
  );

CREATE POLICY "hm_insert"
  ON household_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'owner'
    )
  );

CREATE POLICY "hm_delete"
  ON household_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 
      FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'owner'
    )
  );

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_households() TO authenticated;

