# 🗄️ SPUSTENIE MIGRÁCIÍ - Jednoduchý návod

## ✅ CREDENTIALS SÚ UŽ NASTAVENÉ!

- ✅ Project URL: `https://agccohbrvpjknlhltqzc.supabase.co`
- ✅ Anon Key: nastavený v `.env.local`
- ✅ Server už načítal nové env

---

## 📊 TERAZ SPUSTI MIGRÁCIE (2 minúty):

### **Choď na SQL Editor:**
👉 https://supabase.com/dashboard/project/agccohbrvpjknlhltqzc/sql

---

## 🚀 MOŽNOSŤ A: Spusti všetky naraz (ODPORÚČANÉ)

**Klikni "New Query" a vlož tento SQL:**

```sql
-- ============================================
-- FINAPP - KOMPLETNÉ MIGRÁCIE
-- ============================================

-- ============================================
-- 1️⃣ INITIAL SCHEMA
-- ============================================

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
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
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

-- Create push_tokens table
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  device_type TEXT NOT NULL CHECK (device_type IN ('ios', 'android')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_token ON push_tokens(token);

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

CREATE TRIGGER update_push_tokens_updated_at BEFORE UPDATE ON push_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2️⃣ RLS POLICIES
-- ============================================

-- Enable RLS on all tables
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
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Households policies
CREATE POLICY "Users can view households they belong to" ON households
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = households.id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create households" ON households
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners can update households" ON households
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = households.id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin')
    )
  );

-- Household members policies
CREATE POLICY "Users can view members of their households" ON household_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage household members" ON household_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = auth.uid()
      AND hm.role IN ('owner', 'admin')
    )
  );

-- Categories policies
CREATE POLICY "Users can view categories of their households" ON categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = categories.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can manage categories" ON categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = categories.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin', 'member')
    )
  );

-- Loans policies
CREATE POLICY "Users can view loans of their households" ON loans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = loans.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can manage loans" ON loans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = loans.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin', 'member')
    )
  );

-- Loan schedules policies
CREATE POLICY "Users can view loan schedules of their households" ON loan_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM loans
      JOIN household_members ON household_members.household_id = loans.household_id
      WHERE loans.id = loan_schedules.loan_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can manage loan schedules" ON loan_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM loans
      JOIN household_members ON household_members.household_id = loans.household_id
      WHERE loans.id = loan_schedules.loan_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin', 'member')
    )
  );

-- Payments policies
CREATE POLICY "Users can view payments of their households" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = payments.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can manage payments" ON payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = payments.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin', 'member')
    )
  );

-- Expenses policies
CREATE POLICY "Users can view expenses of their households" ON expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = expenses.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can manage expenses" ON expenses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = expenses.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin', 'member')
    )
  );

-- Incomes policies
CREATE POLICY "Users can view incomes of their households" ON incomes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = incomes.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can manage incomes" ON incomes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = incomes.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin', 'member')
    )
  );

-- Assets policies
CREATE POLICY "Users can view assets of their households" ON assets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = assets.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can manage assets" ON assets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = assets.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin', 'member')
    )
  );

-- Asset valuations policies
CREATE POLICY "Users can view asset valuations of their households" ON asset_valuations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assets
      JOIN household_members ON household_members.household_id = assets.household_id
      WHERE assets.id = asset_valuations.asset_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can manage asset valuations" ON asset_valuations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assets
      JOIN household_members ON household_members.household_id = assets.household_id
      WHERE assets.id = asset_valuations.asset_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin', 'member')
    )
  );

-- Rules policies
CREATE POLICY "Users can view rules of their households" ON rules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = rules.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can manage rules" ON rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = rules.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin', 'member')
    )
  );

-- Monthly summaries policies
CREATE POLICY "Users can view monthly summaries of their households" ON monthly_summaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = monthly_summaries.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage monthly summaries" ON monthly_summaries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = monthly_summaries.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin', 'member')
    )
  );

-- Push tokens policies
CREATE POLICY "Users can view own push tokens" ON push_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens" ON push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens" ON push_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens" ON push_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- ✅ HOTOVO!
-- ============================================
```

**Potom klikni "Run" (alebo Cmd+Enter)**

**Počkaj na "Success ✅"**

---

## 🎯 OVERENIE:

**Choď na Database Editor:**
👉 https://supabase.com/dashboard/project/agccohbrvpjknlhltqzc/editor

**Mal by si vidieť tieto tabuľky:**
- ✅ profiles
- ✅ households
- ✅ household_members
- ✅ categories
- ✅ loans
- ✅ loan_schedules
- ✅ payments
- ✅ expenses
- ✅ incomes
- ✅ assets
- ✅ asset_valuations
- ✅ rules
- ✅ monthly_summaries
- ✅ push_tokens

---

## 👤 VYTVOR ÚČET:

### **Choď na registráciu:**
👉 http://localhost:3000/auth/register

**Vytvor účet:**
- Email: `admin@finapp.sk`
- Heslo: `Admin123!`
- Display Name: `Admin`

### **Prihlás sa:**
👉 http://localhost:3000/auth/login

---

## 🎉 HOTOVO!

**Teraz máš:**
- ✅ Supabase credentials nastavené
- ✅ Databázu vytvorenú
- ✅ RLS policies aktívne
- ✅ Server bežiaci na http://localhost:3000

**Môžeš začať používať aplikáciu!** 🚀✨

