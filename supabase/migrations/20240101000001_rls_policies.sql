-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_summaries ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is member of household
CREATE OR REPLACE FUNCTION is_household_member(household_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM household_members
    WHERE household_members.household_id = is_household_member.household_id
    AND household_members.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is owner of household
CREATE OR REPLACE FUNCTION is_household_owner(household_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM household_members
    WHERE household_members.household_id = is_household_owner.household_id
    AND household_members.user_id = auth.uid()
    AND household_members.role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Households policies
CREATE POLICY "Users can view households they are member of"
  ON households FOR SELECT
  USING (is_household_member(id));

CREATE POLICY "Users can create households"
  ON households FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Owners can update households"
  ON households FOR UPDATE
  USING (is_household_owner(id));

CREATE POLICY "Owners can delete households"
  ON households FOR DELETE
  USING (is_household_owner(id));

-- Household members policies
CREATE POLICY "Users can view household members of their households"
  ON household_members FOR SELECT
  USING (is_household_member(household_id));

CREATE POLICY "Owners can add household members"
  ON household_members FOR INSERT
  WITH CHECK (is_household_owner(household_id));

CREATE POLICY "Owners can remove household members"
  ON household_members FOR DELETE
  USING (is_household_owner(household_id));

CREATE POLICY "Users can remove themselves from household"
  ON household_members FOR DELETE
  USING (auth.uid() = user_id);

-- Categories policies
CREATE POLICY "Users can view categories of their households"
  ON categories FOR SELECT
  USING (is_household_member(household_id));

CREATE POLICY "Users can create categories in their households"
  ON categories FOR INSERT
  WITH CHECK (is_household_member(household_id));

CREATE POLICY "Users can update categories in their households"
  ON categories FOR UPDATE
  USING (is_household_member(household_id));

CREATE POLICY "Users can delete categories in their households"
  ON categories FOR DELETE
  USING (is_household_member(household_id));

-- Loans policies
CREATE POLICY "Users can view loans of their households"
  ON loans FOR SELECT
  USING (is_household_member(household_id));

CREATE POLICY "Users can create loans in their households"
  ON loans FOR INSERT
  WITH CHECK (is_household_member(household_id));

CREATE POLICY "Users can update loans in their households"
  ON loans FOR UPDATE
  USING (is_household_member(household_id));

CREATE POLICY "Users can delete loans in their households"
  ON loans FOR DELETE
  USING (is_household_member(household_id));

-- Loan schedules policies
CREATE POLICY "Users can view loan schedules of their household loans"
  ON loan_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM loans
      WHERE loans.id = loan_schedules.loan_id
      AND is_household_member(loans.household_id)
    )
  );

CREATE POLICY "Users can create loan schedules for their household loans"
  ON loan_schedules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loans
      WHERE loans.id = loan_schedules.loan_id
      AND is_household_member(loans.household_id)
    )
  );

CREATE POLICY "Users can update loan schedules of their household loans"
  ON loan_schedules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM loans
      WHERE loans.id = loan_schedules.loan_id
      AND is_household_member(loans.household_id)
    )
  );

-- Payments policies
CREATE POLICY "Users can view payments of their households"
  ON payments FOR SELECT
  USING (is_household_member(household_id));

CREATE POLICY "Users can create payments in their households"
  ON payments FOR INSERT
  WITH CHECK (is_household_member(household_id));

CREATE POLICY "Users can update payments in their households"
  ON payments FOR UPDATE
  USING (is_household_member(household_id));

CREATE POLICY "Users can delete payments in their households"
  ON payments FOR DELETE
  USING (is_household_member(household_id));

-- Expenses policies
CREATE POLICY "Users can view expenses of their households"
  ON expenses FOR SELECT
  USING (is_household_member(household_id));

CREATE POLICY "Users can create expenses in their households"
  ON expenses FOR INSERT
  WITH CHECK (is_household_member(household_id));

CREATE POLICY "Users can update expenses in their households"
  ON expenses FOR UPDATE
  USING (is_household_member(household_id));

CREATE POLICY "Users can delete expenses in their households"
  ON expenses FOR DELETE
  USING (is_household_member(household_id));

-- Incomes policies
CREATE POLICY "Users can view incomes of their households"
  ON incomes FOR SELECT
  USING (is_household_member(household_id));

CREATE POLICY "Users can create incomes in their households"
  ON incomes FOR INSERT
  WITH CHECK (is_household_member(household_id));

CREATE POLICY "Users can update incomes in their households"
  ON incomes FOR UPDATE
  USING (is_household_member(household_id));

CREATE POLICY "Users can delete incomes in their households"
  ON incomes FOR DELETE
  USING (is_household_member(household_id));

-- Assets policies
CREATE POLICY "Users can view assets of their households"
  ON assets FOR SELECT
  USING (is_household_member(household_id));

CREATE POLICY "Users can create assets in their households"
  ON assets FOR INSERT
  WITH CHECK (is_household_member(household_id));

CREATE POLICY "Users can update assets in their households"
  ON assets FOR UPDATE
  USING (is_household_member(household_id));

CREATE POLICY "Users can delete assets in their households"
  ON assets FOR DELETE
  USING (is_household_member(household_id));

-- Asset valuations policies
CREATE POLICY "Users can view asset valuations of their household assets"
  ON asset_valuations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assets
      WHERE assets.id = asset_valuations.asset_id
      AND is_household_member(assets.household_id)
    )
  );

CREATE POLICY "Users can create asset valuations for their household assets"
  ON asset_valuations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assets
      WHERE assets.id = asset_valuations.asset_id
      AND is_household_member(assets.household_id)
    )
  );

-- Rules policies
CREATE POLICY "Users can view rules of their households"
  ON rules FOR SELECT
  USING (is_household_member(household_id));

CREATE POLICY "Users can create rules in their households"
  ON rules FOR INSERT
  WITH CHECK (is_household_member(household_id));

CREATE POLICY "Users can update rules in their households"
  ON rules FOR UPDATE
  USING (is_household_member(household_id));

CREATE POLICY "Users can delete rules in their households"
  ON rules FOR DELETE
  USING (is_household_member(household_id));

-- Monthly summaries policies
CREATE POLICY "Users can view monthly summaries of their households"
  ON monthly_summaries FOR SELECT
  USING (is_household_member(household_id));

CREATE POLICY "System can create monthly summaries"
  ON monthly_summaries FOR INSERT
  WITH CHECK (is_household_member(household_id));

CREATE POLICY "System can update monthly summaries"
  ON monthly_summaries FOR UPDATE
  USING (is_household_member(household_id));

