-- ============================================
-- Setup pre pirgozi1@gmail.com s demo dátami
-- ============================================

DO $$
DECLARE
  target_user_id UUID;
  target_email TEXT := 'pirgozi1@gmail.com';
  new_household_id UUID;
  category_food_id UUID;
  category_housing_id UUID;
  category_transport_id UUID;
  category_salary_id UUID;
  category_business_id UUID;
BEGIN
  -- Získaj user ID
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User % not found', target_email;
  END IF;
  
  RAISE NOTICE 'Found user: % (ID: %)', target_email, target_user_id;
  
  -- Skontroluj, či už má household
  SELECT hm.household_id INTO new_household_id
  FROM public.household_members hm
  WHERE hm.user_id = target_user_id
  LIMIT 1;
  
  IF new_household_id IS NOT NULL THEN
    RAISE NOTICE 'User already has household: %', new_household_id;
  ELSE
    -- Vytvor profil ak neexistuje
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (target_user_id, target_email, 'Mikail')
    ON CONFLICT (id) DO UPDATE
    SET 
      email = EXCLUDED.email,
      display_name = COALESCE(profiles.display_name, EXCLUDED.display_name);
    
    -- Vytvor household
    INSERT INTO public.households (name)
    VALUES ('Mikail''s Household')
    RETURNING id INTO new_household_id;
    
    RAISE NOTICE 'Created household: %', new_household_id;
    
    -- Pridaj usera do household ako owner
    INSERT INTO public.household_members (household_id, user_id, role)
    VALUES (new_household_id, target_user_id, 'owner');
    
    RAISE NOTICE 'Added user as owner';
  END IF;
  
  -- Vytvor kategórie (ak neexistujú)
  INSERT INTO public.categories (household_id, kind, name)
  VALUES
    (new_household_id, 'expense', 'Potraviny'),
    (new_household_id, 'expense', 'Bývanie'),
    (new_household_id, 'expense', 'Doprava'),
    (new_household_id, 'expense', 'Zdravie'),
    (new_household_id, 'expense', 'Zábava'),
    (new_household_id, 'expense', 'Oblečenie'),
    (new_household_id, 'income', 'Mzda'),
    (new_household_id, 'income', 'Podnikanie'),
    (new_household_id, 'income', 'Investície')
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Created categories';
  
  -- Získaj ID kategórií
  SELECT id INTO category_food_id FROM public.categories 
  WHERE household_id = new_household_id AND name = 'Potraviny' LIMIT 1;
  
  SELECT id INTO category_housing_id FROM public.categories 
  WHERE household_id = new_household_id AND name = 'Bývanie' LIMIT 1;
  
  SELECT id INTO category_transport_id FROM public.categories 
  WHERE household_id = new_household_id AND name = 'Doprava' LIMIT 1;
  
  SELECT id INTO category_salary_id FROM public.categories 
  WHERE household_id = new_household_id AND name = 'Mzda' LIMIT 1;
  
  SELECT id INTO category_business_id FROM public.categories 
  WHERE household_id = new_household_id AND name = 'Podnikanie' LIMIT 1;
  
  -- Pridaj demo príjmy (posledné 3 mesiace)
  INSERT INTO public.incomes (household_id, category_id, amount, source, note, date)
  VALUES
    (new_household_id, category_salary_id, 2500.00, 'Mzda', 'Mesačná mzda - október', CURRENT_DATE - INTERVAL '5 days'),
    (new_household_id, category_salary_id, 2500.00, 'Mzda', 'Mesačná mzda - september', CURRENT_DATE - INTERVAL '35 days'),
    (new_household_id, category_salary_id, 2500.00, 'Mzda', 'Mesačná mzda - august', CURRENT_DATE - INTERVAL '65 days'),
    (new_household_id, category_business_id, 450.00, 'Freelance', 'Freelance projekt', CURRENT_DATE - INTERVAL '15 days')
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Created demo incomes';
  
  -- Pridaj demo výdavky (posledný mesiac)
  INSERT INTO public.expenses (household_id, category_id, amount, merchant, note, date)
  VALUES
    -- Potraviny
    (new_household_id, category_food_id, 85.50, 'Tesco', 'Týždenný nákup', CURRENT_DATE - INTERVAL '2 days'),
    (new_household_id, category_food_id, 42.30, 'Kaufland', 'Doplnenie', CURRENT_DATE - INTERVAL '5 days'),
    (new_household_id, category_food_id, 78.90, 'Billa', 'Nákup', CURRENT_DATE - INTERVAL '9 days'),
    (new_household_id, category_food_id, 95.20, 'Tesco', 'Týždenný nákup', CURRENT_DATE - INTERVAL '16 days'),
    (new_household_id, category_food_id, 38.50, 'Lidl', 'Ovocie a zelenina', CURRENT_DATE - INTERVAL '20 days'),
    
    -- Bývanie
    (new_household_id, category_housing_id, 650.00, 'Prenajímateľ', 'Nájom za október', CURRENT_DATE - INTERVAL '3 days'),
    (new_household_id, category_housing_id, 120.00, 'ZSE', 'Elektrina a plyn', CURRENT_DATE - INTERVAL '7 days'),
    (new_household_id, category_housing_id, 45.00, 'Orange', 'Internet a TV', CURRENT_DATE - INTERVAL '10 days'),
    
    -- Doprava
    (new_household_id, category_transport_id, 65.00, 'Shell', 'Tankovanie', CURRENT_DATE - INTERVAL '4 days'),
    (new_household_id, category_transport_id, 58.00, 'OMV', 'Tankovanie', CURRENT_DATE - INTERVAL '18 days'),
    (new_household_id, category_transport_id, 25.00, 'Parkovisko', 'Parkovné - centrum', CURRENT_DATE - INTERVAL '12 days')
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Created demo expenses';
  
  -- Pridaj demo úver (hypotéka)
  INSERT INTO public.loans (
    household_id,
    lender,
    loan_type,
    principal,
    annual_rate,
    rate_type,
    day_count_convention,
    start_date,
    term_months,
    status
  )
  VALUES (
    new_household_id,
    'Slovenská sporiteľňa',
    'annuity',
    150000.00,
    3.5,
    'fixed',
    '30E/360',
    '2023-01-01',
    360, -- 30 rokov
    'active'
  )
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Created demo loan';
  
  RAISE NOTICE 'Setup complete for user: %', target_email;
END $$;

-- Overiť výsledok
SELECT 
  u.email,
  p.display_name,
  h.name as household_name,
  hm.role,
  (SELECT COUNT(*) FROM public.incomes WHERE household_id = h.id) as income_count,
  (SELECT COUNT(*) FROM public.expenses WHERE household_id = h.id) as expense_count,
  (SELECT COUNT(*) FROM public.loans WHERE household_id = h.id) as loan_count,
  (SELECT COUNT(*) FROM public.categories WHERE household_id = h.id) as category_count
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.household_members hm ON hm.user_id = u.id
LEFT JOIN public.households h ON h.id = hm.household_id
WHERE u.email = 'pirgozi1@gmail.com';
