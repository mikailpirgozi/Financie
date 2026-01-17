-- ============================================
-- ASSET MANAGEMENT TABLES
-- Poistky, STK, EK, Servis, Pokuty
-- ============================================

-- ============================================
-- 1. Rozsirenie ASSETS tabulky
-- ============================================

-- Pridanie novych stlpcov pre vozidla
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS license_plate TEXT,
ADD COLUMN IF NOT EXISTS vin TEXT,
ADD COLUMN IF NOT EXISTS mileage INTEGER,
ADD COLUMN IF NOT EXISTS fuel_type TEXT CHECK (fuel_type IN ('petrol', 'diesel', 'electric', 'hybrid', 'lpg', 'cng')),
ADD COLUMN IF NOT EXISTS year INTEGER;

-- Pridanie novych stlpcov pre nehnutelnosti
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS cadastral_number TEXT,
ADD COLUMN IF NOT EXISTS lv_number TEXT;

-- Pridanie novych stlpcov pre bankove ucty
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS iban TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS account_balance DECIMAL(15, 2);

-- Update CHECK constraint pre kind - pridat bank_account
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_kind_check;
ALTER TABLE assets ADD CONSTRAINT assets_kind_check 
CHECK (kind IN ('real_estate', 'vehicle', 'business', 'loan_receivable', 'bank_account', 'other'));

-- Index pre ŠPZ
CREATE INDEX IF NOT EXISTS idx_assets_license_plate ON assets(license_plate) WHERE license_plate IS NOT NULL;

-- ============================================
-- 2. INSURERS tabulka (zoznam poistovni)
-- ============================================

CREATE TABLE IF NOT EXISTS insurers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(household_id, name)
);

-- Indexy
CREATE INDEX IF NOT EXISTS idx_insurers_household ON insurers(household_id);

-- Default poistovne (globalne)
INSERT INTO insurers (id, household_id, name, is_default) 
SELECT gen_random_uuid(), h.id, insurer_name, true
FROM households h
CROSS JOIN (
  VALUES 
    ('Allianz - Slovenská poisťovňa'),
    ('Generali Poisťovňa'),
    ('Kooperativa poisťovňa'),
    ('ČSOB Poisťovňa'),
    ('Union poisťovňa'),
    ('Wüstenrot poisťovňa'),
    ('AXA pojišťovna'),
    ('MetLife'),
    ('NN Životná poisťovňa'),
    ('Uniqa poisťovňa')
) AS default_insurers(insurer_name)
WHERE NOT EXISTS (
  SELECT 1 FROM insurers i WHERE i.household_id = h.id AND i.name = insurer_name
);

-- ============================================
-- 3. INSURANCES tabulka (poistky)
-- ============================================

CREATE TABLE IF NOT EXISTS insurances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  insurer_id UUID REFERENCES insurers(id) ON DELETE SET NULL,
  
  -- Typ poistky
  type TEXT NOT NULL CHECK (type IN ('pzp', 'kasko', 'pzp_kasko', 'leasing', 'property', 'life', 'other')),
  
  -- Zakladne udaje
  policy_number TEXT NOT NULL,
  company TEXT, -- nazov poistovne (pre spatnu kompatibilitu)
  broker_company TEXT,
  
  -- Platnost
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  
  -- Cena a platba
  price DECIMAL(15, 2) NOT NULL CHECK (price >= 0),
  payment_frequency TEXT NOT NULL DEFAULT 'yearly' CHECK (payment_frequency IN ('monthly', 'quarterly', 'biannual', 'yearly')),
  paid_date DATE,
  
  -- Zelena/Biela karta (pre PZP)
  green_card_valid_from DATE,
  green_card_valid_to DATE,
  
  -- Kasko specifické
  km_state INTEGER,
  coverage_amount DECIMAL(15, 2),
  deductible_amount DECIMAL(15, 2),
  deductible_percentage DECIMAL(5, 2),
  
  -- Sledovanie predlzeni
  last_extended_date DATE,
  extension_count INTEGER DEFAULT 0,
  
  -- Dokumenty a poznamky
  file_paths JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexy
CREATE INDEX IF NOT EXISTS idx_insurances_household ON insurances(household_id);
CREATE INDEX IF NOT EXISTS idx_insurances_asset ON insurances(asset_id);
CREATE INDEX IF NOT EXISTS idx_insurances_type ON insurances(type);
CREATE INDEX IF NOT EXISTS idx_insurances_valid_to ON insurances(valid_to);
CREATE INDEX IF NOT EXISTS idx_insurances_policy_number ON insurances(policy_number);

-- Trigger pre updated_at
CREATE TRIGGER update_insurances_updated_at BEFORE UPDATE ON insurances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. VEHICLE_DOCUMENTS tabulka (STK, EK, dialnicne znamky)
-- ============================================

CREATE TABLE IF NOT EXISTS vehicle_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  
  -- Typ dokumentu
  document_type TEXT NOT NULL CHECK (document_type IN ('stk', 'ek', 'vignette', 'technical_certificate')),
  
  -- Platnost
  valid_from DATE,
  valid_to DATE NOT NULL,
  
  -- Zakladne udaje
  document_number TEXT,
  price DECIMAL(15, 2),
  broker_company TEXT,
  
  -- Pre dialnicne znamky
  country TEXT CHECK (country IN ('SK', 'CZ', 'AT', 'HU', 'SI', 'PL', 'DE', 'CH')),
  is_required BOOLEAN DEFAULT true,
  
  -- Pre STK/EK
  km_state INTEGER,
  
  -- Sledovanie predlzeni
  paid_date DATE,
  last_extended_date DATE,
  extension_count INTEGER DEFAULT 0,
  
  -- Dokumenty a poznamky
  file_paths JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexy
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_household ON vehicle_documents(household_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_asset ON vehicle_documents(asset_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_type ON vehicle_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_valid_to ON vehicle_documents(valid_to);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_country ON vehicle_documents(country) WHERE country IS NOT NULL;

-- Trigger pre updated_at
CREATE TRIGGER update_vehicle_documents_updated_at BEFORE UPDATE ON vehicle_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. SERVICE_RECORDS tabulka (servisna knizka)
-- ============================================

CREATE TABLE IF NOT EXISTS service_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  
  -- Servisne udaje
  service_date DATE NOT NULL,
  service_provider TEXT,
  service_type TEXT CHECK (service_type IN ('regular', 'repair', 'tire_change', 'inspection', 'other')),
  
  -- Stav a cena
  km_state INTEGER,
  price DECIMAL(15, 2),
  
  -- Popis
  description TEXT,
  notes TEXT,
  
  -- Dokumenty
  file_paths JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexy
CREATE INDEX IF NOT EXISTS idx_service_records_household ON service_records(household_id);
CREATE INDEX IF NOT EXISTS idx_service_records_asset ON service_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_service_records_date ON service_records(service_date);

-- Trigger pre updated_at
CREATE TRIGGER update_service_records_updated_at BEFORE UPDATE ON service_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. FINES tabulka (pokuty)
-- ============================================

CREATE TABLE IF NOT EXISTS fines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  
  -- Zakladne udaje
  fine_date DATE NOT NULL,
  fine_amount DECIMAL(15, 2) NOT NULL CHECK (fine_amount >= 0),
  fine_amount_late DECIMAL(15, 2),
  
  -- Kde a kto
  country TEXT,
  enforcement_company TEXT,
  
  -- Stav platby
  is_paid BOOLEAN NOT NULL DEFAULT false,
  owner_paid_date DATE,
  
  -- Popis
  description TEXT,
  notes TEXT,
  
  -- Dokumenty
  file_paths JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexy
CREATE INDEX IF NOT EXISTS idx_fines_household ON fines(household_id);
CREATE INDEX IF NOT EXISTS idx_fines_asset ON fines(asset_id);
CREATE INDEX IF NOT EXISTS idx_fines_date ON fines(fine_date);
CREATE INDEX IF NOT EXISTS idx_fines_is_paid ON fines(is_paid);

-- Trigger pre updated_at
CREATE TRIGGER update_fines_updated_at BEFORE UPDATE ON fines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. INSURANCE_CLAIMS tabulka (poistne udalosti)
-- ============================================

CREATE TABLE IF NOT EXISTS insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  insurance_id UUID REFERENCES insurances(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  
  -- Udalost
  incident_date DATE NOT NULL,
  reported_date DATE NOT NULL,
  claim_number TEXT,
  
  -- Typ a popis
  incident_type TEXT NOT NULL CHECK (incident_type IN ('accident', 'theft', 'vandalism', 'weather', 'other')),
  description TEXT NOT NULL,
  location TEXT,
  
  -- Financie
  estimated_damage DECIMAL(15, 2),
  deductible DECIMAL(15, 2),
  payout_amount DECIMAL(15, 2),
  
  -- Stav
  status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'investigating', 'approved', 'rejected', 'closed')),
  
  -- Doplnkove info
  police_report_number TEXT,
  other_party_info TEXT,
  notes TEXT,
  
  -- Dokumenty
  file_paths JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexy
CREATE INDEX IF NOT EXISTS idx_insurance_claims_household ON insurance_claims(household_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_insurance ON insurance_claims(insurance_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_asset ON insurance_claims(asset_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON insurance_claims(status);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_incident_date ON insurance_claims(incident_date);

-- Trigger pre updated_at
CREATE TRIGGER update_insurance_claims_updated_at BEFORE UPDATE ON insurance_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
