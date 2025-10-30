-- ============================================
-- CREATE simple, non-recursive policies
-- ============================================

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Household members - SIMPLE policies without recursion
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hm_select" ON household_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "hm_insert" ON household_members FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "hm_delete" ON household_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Households
ALTER TABLE households ENABLE ROW LEVEL SECURITY;

CREATE POLICY "households_select" ON households FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = households.id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "households_insert" ON households FOR INSERT TO authenticated
  WITH CHECK (true);

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
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

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
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

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

-- Loan schedules
ALTER TABLE loan_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loan_schedules_select" ON loan_schedules FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM loans
    JOIN household_members ON household_members.household_id = loans.household_id
    WHERE loans.id = loan_schedules.loan_id
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "loan_schedules_insert" ON loan_schedules FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM loans
    JOIN household_members ON household_members.household_id = loans.household_id
    WHERE loans.id = loan_schedules.loan_id
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "loan_schedules_update" ON loan_schedules FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM loans
    JOIN household_members ON household_members.household_id = loans.household_id
    WHERE loans.id = loan_schedules.loan_id
    AND household_members.user_id = auth.uid()
  ));

-- Expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

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
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;

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
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

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
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

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

-- Asset valuations
ALTER TABLE asset_valuations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asset_valuations_select" ON asset_valuations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM assets
    JOIN household_members ON household_members.household_id = assets.household_id
    WHERE assets.id = asset_valuations.asset_id
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "asset_valuations_insert" ON asset_valuations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM assets
    JOIN household_members ON household_members.household_id = assets.household_id
    WHERE assets.id = asset_valuations.asset_id
    AND household_members.user_id = auth.uid()
  ));

-- Rules
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;

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
ALTER TABLE monthly_summaries ENABLE ROW LEVEL SECURITY;

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

