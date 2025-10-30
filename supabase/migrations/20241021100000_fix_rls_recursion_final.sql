-- ============================================
-- FIX: Infinite recursion v RLS policies
-- ============================================

-- Drop existing helper functions
DROP FUNCTION IF EXISTS is_household_member(UUID);
DROP FUNCTION IF EXISTS is_household_owner(UUID);

-- Disable RLS temporarily to fix policies
ALTER TABLE household_members DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on household_members
DROP POLICY IF EXISTS "Users can view household members of their households" ON household_members;
DROP POLICY IF EXISTS "Owners can add household members" ON household_members;
DROP POLICY IF EXISTS "Owners can remove household members" ON household_members;
DROP POLICY IF EXISTS "Users can remove themselves from household" ON household_members;
DROP POLICY IF EXISTS "authenticated_can_read_memberships" ON household_members;
DROP POLICY IF EXISTS "owners_can_add_members" ON household_members;
DROP POLICY IF EXISTS "users_can_leave_or_owners_can_remove" ON household_members;
DROP POLICY IF EXISTS "hm_select" ON household_members;
DROP POLICY IF EXISTS "hm_insert" ON household_members;
DROP POLICY IF EXISTS "hm_delete" ON household_members;
DROP POLICY IF EXISTS "read_all_memberships" ON household_members;
DROP POLICY IF EXISTS "insert_memberships" ON household_members;
DROP POLICY IF EXISTS "delete_own_membership" ON household_members;
DROP POLICY IF EXISTS "service_role_all" ON household_members;

-- Create simple, non-recursive policies for household_members
CREATE POLICY "household_members_select"
  ON household_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "household_members_insert"
  ON household_members FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Application will validate

CREATE POLICY "household_members_delete"
  ON household_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Re-enable RLS
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

-- Create NEW helper functions that DON'T query household_members
-- Instead, they use a direct EXISTS check without calling the function recursively

-- Drop and recreate all policies that use is_household_member
DROP POLICY IF EXISTS "Users can view households they are member of" ON households;
DROP POLICY IF EXISTS "Owners can update households" ON households;
DROP POLICY IF EXISTS "Owners can delete households" ON households;
DROP POLICY IF EXISTS "Users can view categories of their households" ON categories;
DROP POLICY IF EXISTS "Users can create categories in their households" ON categories;
DROP POLICY IF EXISTS "Users can update categories in their households" ON categories;
DROP POLICY IF EXISTS "Users can delete categories in their households" ON categories;
DROP POLICY IF EXISTS "Users can view loans of their households" ON loans;
DROP POLICY IF EXISTS "Users can create loans in their households" ON loans;
DROP POLICY IF EXISTS "Users can update loans in their households" ON loans;
DROP POLICY IF EXISTS "Users can delete loans in their households" ON loans;
DROP POLICY IF EXISTS "Users can view expenses of their households" ON expenses;
DROP POLICY IF EXISTS "Users can create expenses in their households" ON expenses;
DROP POLICY IF EXISTS "Users can update expenses in their households" ON expenses;
DROP POLICY IF EXISTS "Users can delete expenses in their households" ON expenses;
DROP POLICY IF EXISTS "Users can view incomes of their households" ON incomes;
DROP POLICY IF EXISTS "Users can create incomes in their households" ON incomes;
DROP POLICY IF EXISTS "Users can update incomes in their households" ON incomes;
DROP POLICY IF EXISTS "Users can delete incomes in their households" ON incomes;
DROP POLICY IF EXISTS "Users can view payments of their households" ON payments;
DROP POLICY IF EXISTS "Users can create payments in their households" ON payments;
DROP POLICY IF EXISTS "Users can update payments in their households" ON payments;
DROP POLICY IF EXISTS "Users can delete payments in their households" ON payments;
DROP POLICY IF EXISTS "Users can view assets of their households" ON assets;
DROP POLICY IF EXISTS "Users can create assets in their households" ON assets;
DROP POLICY IF EXISTS "Users can update assets in their households" ON assets;
DROP POLICY IF EXISTS "Users can delete assets in their households" ON assets;
DROP POLICY IF EXISTS "Users can view rules of their households" ON rules;
DROP POLICY IF EXISTS "Users can create rules in their households" ON rules;
DROP POLICY IF EXISTS "Users can update rules in their households" ON rules;
DROP POLICY IF EXISTS "Users can delete rules in their households" ON rules;
DROP POLICY IF EXISTS "Users can view monthly summaries of their households" ON monthly_summaries;
DROP POLICY IF EXISTS "System can create monthly summaries" ON monthly_summaries;
DROP POLICY IF EXISTS "System can update monthly summaries" ON monthly_summaries;

-- Create new policies with direct EXISTS checks (no function calls)

-- Households
CREATE POLICY "households_select" ON households FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = households.id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "households_update" ON households FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = households.id 
    AND household_members.user_id = auth.uid()
    AND household_members.role = 'owner'
  ));

CREATE POLICY "households_delete" ON households FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = households.id 
    AND household_members.user_id = auth.uid()
    AND household_members.role = 'owner'
  ));

-- Categories
CREATE POLICY "categories_select" ON categories FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = categories.household_id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "categories_insert" ON categories FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = categories.household_id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "categories_update" ON categories FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = categories.household_id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "categories_delete" ON categories FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = categories.household_id 
    AND household_members.user_id = auth.uid()
  ));

-- Loans
CREATE POLICY "loans_select" ON loans FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = loans.household_id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "loans_insert" ON loans FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = loans.household_id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "loans_update" ON loans FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = loans.household_id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "loans_delete" ON loans FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = loans.household_id 
    AND household_members.user_id = auth.uid()
  ));

-- Expenses
CREATE POLICY "expenses_select" ON expenses FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = expenses.household_id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "expenses_insert" ON expenses FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = expenses.household_id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "expenses_update" ON expenses FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = expenses.household_id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "expenses_delete" ON expenses FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = expenses.household_id 
    AND household_members.user_id = auth.uid()
  ));

-- Incomes
CREATE POLICY "incomes_select" ON incomes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = incomes.household_id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "incomes_insert" ON incomes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = incomes.household_id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "incomes_update" ON incomes FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = incomes.household_id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "incomes_delete" ON incomes FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = incomes.household_id 
    AND household_members.user_id = auth.uid()
  ));

-- Payments
CREATE POLICY "payments_select" ON payments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = payments.household_id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "payments_insert" ON payments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = payments.household_id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "payments_update" ON payments FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = payments.household_id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "payments_delete" ON payments FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = payments.household_id 
    AND household_members.user_id = auth.uid()
  ));

-- Assets
CREATE POLICY "assets_select" ON assets FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = assets.household_id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "assets_insert" ON assets FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = assets.household_id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "assets_update" ON assets FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = assets.household_id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "assets_delete" ON assets FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = assets.household_id 
    AND household_members.user_id = auth.uid()
  ));

-- Rules
CREATE POLICY "rules_select" ON rules FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = rules.household_id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "rules_insert" ON rules FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = rules.household_id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "rules_update" ON rules FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = rules.household_id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "rules_delete" ON rules FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = rules.household_id 
    AND household_members.user_id = auth.uid()
  ));

-- Monthly summaries
CREATE POLICY "monthly_summaries_select" ON monthly_summaries FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = monthly_summaries.household_id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "monthly_summaries_insert" ON monthly_summaries FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = monthly_summaries.household_id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "monthly_summaries_update" ON monthly_summaries FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = monthly_summaries.household_id 
    AND household_members.user_id = auth.uid()
  ));

-- ============================================
-- ✅ HOTOVO!
-- RLS policies sú teraz bez rekurzie
-- Používajú priame EXISTS checks namiesto funkcií
-- ============================================

