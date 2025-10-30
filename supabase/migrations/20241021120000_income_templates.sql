-- Create income_templates table
-- Šablóny pre pravidelné príjmy, ktoré sa opakujú každý mesiac

CREATE TABLE income_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  default_amount DECIMAL(15, 2) CHECK (default_amount IS NULL OR default_amount > 0),
  note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(household_id, name)
);

-- Create index for better query performance
CREATE INDEX idx_income_templates_household ON income_templates(household_id);
CREATE INDEX idx_income_templates_active ON income_templates(household_id, is_active) WHERE is_active = true;

-- Add updated_at trigger
CREATE TRIGGER update_income_templates_updated_at BEFORE UPDATE ON income_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add income_template_id to incomes table (optional reference)
ALTER TABLE incomes
  ADD COLUMN income_template_id UUID REFERENCES income_templates(id) ON DELETE SET NULL;

CREATE INDEX idx_incomes_template ON incomes(income_template_id);

-- Add comment
COMMENT ON TABLE income_templates IS 'Šablóny pre pravidelné príjmy - umožňujú rýchle pridávanie opakujúcich sa príjmov';
COMMENT ON COLUMN income_templates.default_amount IS 'Predvolená suma (voliteľné) - ak nie je zadaná, užívateľ ju musí zadať pri vytváraní príjmu';
COMMENT ON COLUMN income_templates.is_active IS 'Či je šablóna aktívna - neaktívne šablóny sa nezobrazujú v UI';
COMMENT ON COLUMN income_templates.sort_order IS 'Poradie zobrazovania šablón v UI';

