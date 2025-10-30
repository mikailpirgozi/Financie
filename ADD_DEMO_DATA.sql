-- ============================================
-- Pridanie demo dát pre používateľa pirgozi1@gmail.com
-- ============================================

DO $$
DECLARE
  target_user_id UUID;
  target_household_id UUID;
  category_potraviny UUID;
  category_byvanie UUID;
  category_doprava UUID;
  category_mzda UUID;
  loan_id UUID;
BEGIN
  -- Získaj user ID a household ID
  SELECT u.id INTO target_user_id
  FROM auth.users u
  WHERE u.email = 'pirgozi1@gmail.com';
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Používateľ pirgozi1@gmail.com neexistuje!';
  END IF;
  
  SELECT hm.household_id INTO target_household_id
  FROM household_members hm
  WHERE hm.user_id = target_user_id
  LIMIT 1;
  
  IF target_household_id IS NULL THEN
    RAISE EXCEPTION 'Household pre používateľa neexistuje!';
  END IF;
  
  RAISE NOTICE 'Používateľ ID: %', target_user_id;
  RAISE NOTICE 'Household ID: %', target_household_id;
  
  -- Získaj kategórie
  SELECT id INTO category_potraviny FROM categories WHERE household_id = target_household_id AND name = 'Potraviny' LIMIT 1;
  SELECT id INTO category_byvanie FROM categories WHERE household_id = target_household_id AND name = 'Bývanie' LIMIT 1;
  SELECT id INTO category_doprava FROM categories WHERE household_id = target_household_id AND name = 'Doprava' LIMIT 1;
  SELECT id INTO category_mzda FROM categories WHERE household_id = target_household_id AND name = 'Mzda' LIMIT 1;
  
  -- ============================================
  -- 1. ÚVERY (2 ukážkové)
  -- ============================================
  
  RAISE NOTICE 'Vytváram úvery...';
  
  -- Hypotéka
  INSERT INTO loans (
    household_id,
    lender,
    loan_type,
    principal,
    annual_rate,
    term_months,
    start_date,
    status,
    rate_type,
    day_count_convention
  ) VALUES (
    target_household_id,
    'VÚB Banka',
    'annuity',
    150000.00,
    3.5,
    360, -- 30 rokov
    '2024-01-01',
    'active',
    'fixed',
    '30E/360'
  ) RETURNING id INTO loan_id;
  
  RAISE NOTICE 'Vytvorený úver (hypotéka): %', loan_id;
  
  -- Spotrebný úver
  INSERT INTO loans (
    household_id,
    lender,
    loan_type,
    principal,
    annual_rate,
    term_months,
    start_date,
    status,
    rate_type,
    day_count_convention,
    fee_monthly
  ) VALUES (
    target_household_id,
    'Tatra Banka',
    'fixed_principal',
    15000.00,
    5.9,
    60, -- 5 rokov
    '2024-06-01',
    'active',
    'fixed',
    '30E/360',
    2.50
  ) RETURNING id INTO loan_id;
  
  RAISE NOTICE 'Vytvorený úver (spotrebný): %', loan_id;
  
  -- ============================================
  -- 2. PRÍJMY (posledné 3 mesiace)
  -- ============================================
  
  RAISE NOTICE 'Vytváram príjmy...';
  
  -- Október 2024
  INSERT INTO incomes (household_id, date, amount, category_id, source, note)
  VALUES 
    (target_household_id, '2024-10-01', 2500.00, category_mzda, 'Zamestnávateľ', 'Mesačná mzda'),
    (target_household_id, '2024-10-15', 150.00, category_mzda, 'Bonus', 'Výkonnostný bonus');
  
  -- September 2024
  INSERT INTO incomes (household_id, date, amount, category_id, source, note)
  VALUES 
    (target_household_id, '2024-09-01', 2500.00, category_mzda, 'Zamestnávateľ', 'Mesačná mzda');
  
  -- August 2024
  INSERT INTO incomes (household_id, date, amount, category_id, source, note)
  VALUES 
    (target_household_id, '2024-08-01', 2500.00, category_mzda, 'Zamestnávateľ', 'Mesačná mzda'),
    (target_household_id, '2024-08-20', 300.00, category_mzda, 'Dovolenka', 'Dovolenkové');
  
  RAISE NOTICE 'Vytvorených 5 príjmov';
  
  -- ============================================
  -- 3. VÝDAVKY (posledné 3 mesiace)
  -- ============================================
  
  RAISE NOTICE 'Vytváram výdavky...';
  
  -- Október 2024
  INSERT INTO expenses (household_id, date, amount, category_id, merchant, note)
  VALUES 
    (target_household_id, '2024-10-01', 85.50, category_potraviny, 'Tesco', 'Týždenný nákup'),
    (target_household_id, '2024-10-05', 650.00, category_byvanie, 'Bytový podnik', 'Nájomné'),
    (target_household_id, '2024-10-08', 45.00, category_doprava, 'OMV', 'Benzín'),
    (target_household_id, '2024-10-10', 92.30, category_potraviny, 'Kaufland', 'Týždenný nákup'),
    (target_household_id, '2024-10-15', 120.00, category_byvanie, 'SPP', 'Plyn'),
    (target_household_id, '2024-10-18', 78.20, category_potraviny, 'Billa', 'Týždenný nákup');
  
  -- September 2024
  INSERT INTO expenses (household_id, date, amount, category_id, merchant, note)
  VALUES 
    (target_household_id, '2024-09-02', 88.90, category_potraviny, 'Tesco', 'Týždenný nákup'),
    (target_household_id, '2024-09-05', 650.00, category_byvanie, 'Bytový podnik', 'Nájomné'),
    (target_household_id, '2024-09-12', 95.40, category_potraviny, 'Kaufland', 'Týždenný nákup'),
    (target_household_id, '2024-09-15', 110.00, category_byvanie, 'SPP', 'Plyn'),
    (target_household_id, '2024-09-20', 50.00, category_doprava, 'OMV', 'Benzín'),
    (target_household_id, '2024-09-25', 82.50, category_potraviny, 'Billa', 'Týždenný nákup');
  
  -- August 2024
  INSERT INTO expenses (household_id, date, amount, category_id, merchant, note)
  VALUES 
    (target_household_id, '2024-08-01', 91.20, category_potraviny, 'Tesco', 'Týždenný nákup'),
    (target_household_id, '2024-08-05', 650.00, category_byvanie, 'Bytový podnik', 'Nájomné'),
    (target_household_id, '2024-08-10', 87.60, category_potraviny, 'Kaufland', 'Týždenný nákup'),
    (target_household_id, '2024-08-15', 105.00, category_byvanie, 'SPP', 'Plyn'),
    (target_household_id, '2024-08-22', 55.00, category_doprava, 'Shell', 'Benzín'),
    (target_household_id, '2024-08-28', 79.80, category_potraviny, 'Billa', 'Týždenný nákup');
  
  RAISE NOTICE 'Vytvorených 18 výdavkov';
  
  -- ============================================
  -- 4. MAJETOK
  -- ============================================
  
  RAISE NOTICE 'Vytváram majetok...';
  
  -- Byt
  INSERT INTO assets (
    household_id,
    name,
    asset_type,
    purchase_price,
    purchase_date,
    current_value
  ) VALUES (
    target_household_id,
    'Byt 2+1 Bratislava',
    'real_estate',
    180000.00,
    '2024-01-01',
    185000.00
  );
  
  -- Auto
  INSERT INTO assets (
    household_id,
    name,
    asset_type,
    purchase_price,
    purchase_date,
    current_value
  ) VALUES (
    target_household_id,
    'Škoda Octavia 2020',
    'vehicle',
    18000.00,
    '2020-03-15',
    12000.00
  );
  
  -- Úspory
  INSERT INTO assets (
    household_id,
    name,
    asset_type,
    purchase_price,
    purchase_date,
    current_value
  ) VALUES (
    target_household_id,
    'Sporenie VÚB',
    'savings',
    5000.00,
    '2023-01-01',
    5250.00
  );
  
  RAISE NOTICE 'Vytvorených 3 majetky';
  
  -- ============================================
  -- HOTOVO!
  -- ============================================
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Demo dáta úspešne vytvorené!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Súhrn:';
  RAISE NOTICE '   - 2 úvery (hypotéka + spotrebný)';
  RAISE NOTICE '   - 5 príjmov (posledné 3 mesiace)';
  RAISE NOTICE '   - 18 výdavkov (posledné 3 mesiace)';
  RAISE NOTICE '   - 3 majetky (byt, auto, úspory)';
  RAISE NOTICE '';
  
END $$;

-- Overiť výsledok
SELECT 
  'Úvery' as typ,
  COUNT(*) as pocet,
  SUM(principal)::numeric(10,2) as celkova_suma
FROM loans 
WHERE household_id = (
  SELECT household_id FROM household_members 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'pirgozi1@gmail.com')
  LIMIT 1
)
UNION ALL
SELECT 
  'Príjmy' as typ,
  COUNT(*) as pocet,
  SUM(amount)::numeric(10,2) as celkova_suma
FROM incomes 
WHERE household_id = (
  SELECT household_id FROM household_members 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'pirgozi1@gmail.com')
  LIMIT 1
)
UNION ALL
SELECT 
  'Výdavky' as typ,
  COUNT(*) as pocet,
  SUM(amount)::numeric(10,2) as celkova_suma
FROM expenses 
WHERE household_id = (
  SELECT household_id FROM household_members 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'pirgozi1@gmail.com')
  LIMIT 1
)
UNION ALL
SELECT 
  'Majetok' as typ,
  COUNT(*) as pocet,
  SUM(current_value)::numeric(10,2) as celkova_hodnota
FROM assets 
WHERE household_id = (
  SELECT household_id FROM household_members 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'pirgozi1@gmail.com')
  LIMIT 1
);

