-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create households table
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create household_members table (many-to-many)
CREATE TABLE household_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(household_id, user_id)
);

-- Create categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense', 'loan', 'asset')),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(household_id, kind, name)
);

-- Create loans table
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  lender TEXT NOT NULL,
  loan_type TEXT NOT NULL CHECK (loan_type IN ('annuity', 'fixed_principal', 'interest_only')),
  principal DECIMAL(15, 2) NOT NULL CHECK (principal > 0),
  annual_rate DECIMAL(5, 2) NOT NULL CHECK (annual_rate >= 0 AND annual_rate <= 100),
  rate_type TEXT NOT NULL DEFAULT 'fixed' CHECK (rate_type IN ('fixed', 'variable')),
  day_count_convention TEXT NOT NULL DEFAULT '30E/360' CHECK (day_count_convention IN ('30E/360', 'ACT/360', 'ACT/365')),
  start_date DATE NOT NULL,
  term_months INTEGER NOT NULL CHECK (term_months > 0),
  balloon_amount DECIMAL(15, 2) CHECK (balloon_amount >= 0),
  fee_setup DECIMAL(15, 2) DEFAULT 0 CHECK (fee_setup >= 0),
  fee_monthly DECIMAL(15, 2) DEFAULT 0 CHECK (fee_monthly >= 0),
  insurance_monthly DECIMAL(15, 2) DEFAULT 0 CHECK (insurance_monthly >= 0),
  early_repayment_penalty_pct DECIMAL(5, 2) DEFAULT 0 CHECK (early_repayment_penalty_pct >= 0 AND early_repayment_penalty_pct <= 100),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid_off', 'defaulted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create loan_schedules table
CREATE TABLE loan_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  installment_no INTEGER NOT NULL CHECK (installment_no > 0),
  due_date DATE NOT NULL,
  principal_due DECIMAL(15, 2) NOT NULL CHECK (principal_due >= 0),
  interest_due DECIMAL(15, 2) NOT NULL CHECK (interest_due >= 0),
  fees_due DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (fees_due >= 0),
  total_due DECIMAL(15, 2) NOT NULL CHECK (total_due >= 0),
  principal_balance_after DECIMAL(15, 2) NOT NULL CHECK (principal_balance_after >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(loan_id, installment_no)
);

-- Create payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  loan_id UUID REFERENCES loans(id) ON DELETE SET NULL,
  expense_id UUID,
  income_id UUID,
  date DATE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  note TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  category_id UUID NOT NULL REFERENCES categories(id),
  merchant TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create incomes table
CREATE TABLE incomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  source TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create assets table
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('real_estate', 'vehicle', 'business', 'loan_receivable', 'other')),
  name TEXT NOT NULL,
  acquisition_value DECIMAL(15, 2) NOT NULL CHECK (acquisition_value > 0),
  current_value DECIMAL(15, 2) NOT NULL CHECK (current_value > 0),
  acquisition_date DATE NOT NULL,
  index_rule JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create asset_valuations table
CREATE TABLE asset_valuations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  value DECIMAL(15, 2) NOT NULL CHECK (value > 0),
  source TEXT NOT NULL CHECK (source IN ('manual', 'automatic')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create rules table (for automatic categorization)
CREATE TABLE rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  match_type TEXT NOT NULL CHECK (match_type IN ('contains', 'exact', 'starts_with', 'ends_with')),
  match_value TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id),
  apply_to TEXT NOT NULL CHECK (apply_to IN ('expense', 'income')),
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create monthly_summaries table
CREATE TABLE monthly_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  month TEXT NOT NULL CHECK (month ~ '^\d{4}-\d{2}$'),
  incomes_total DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (incomes_total >= 0),
  expenses_total DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (expenses_total >= 0),
  loan_principal_paid DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (loan_principal_paid >= 0),
  loan_interest_paid DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (loan_interest_paid >= 0),
  loan_fees_paid DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (loan_fees_paid >= 0),
  loans_balance DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (loans_balance >= 0),
  net_worth DECIMAL(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(household_id, month)
);

-- Create indexes for better query performance
CREATE INDEX idx_household_members_user ON household_members(user_id);
CREATE INDEX idx_household_members_household ON household_members(household_id);
CREATE INDEX idx_categories_household ON categories(household_id);
CREATE INDEX idx_loans_household ON loans(household_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loan_schedules_loan ON loan_schedules(loan_id);
CREATE INDEX idx_loan_schedules_status ON loan_schedules(status);
CREATE INDEX idx_loan_schedules_due_date ON loan_schedules(due_date);
CREATE INDEX idx_payments_household ON payments(household_id);
CREATE INDEX idx_payments_loan ON payments(loan_id);
CREATE INDEX idx_payments_date ON payments(date);
CREATE INDEX idx_expenses_household ON expenses(household_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_incomes_household ON incomes(household_id);
CREATE INDEX idx_incomes_date ON incomes(date);
CREATE INDEX idx_incomes_category ON incomes(category_id);
CREATE INDEX idx_assets_household ON assets(household_id);
CREATE INDEX idx_asset_valuations_asset ON asset_valuations(asset_id);
CREATE INDEX idx_asset_valuations_date ON asset_valuations(date);
CREATE INDEX idx_rules_household ON rules(household_id);
CREATE INDEX idx_monthly_summaries_household ON monthly_summaries(household_id);
CREATE INDEX idx_monthly_summaries_month ON monthly_summaries(month);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON loans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incomes_updated_at BEFORE UPDATE ON incomes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

