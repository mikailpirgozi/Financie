-- ============================================
-- QUICK SETUP pre pirgozi1@gmail.com
-- Spusti v Supabase SQL Editor
-- ============================================

-- Krok 1: Skontroluj, či user existuje
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'pirgozi1@gmail.com';

-- Ak user NEEXISTUJE, musíš sa najprv zaregistrovať v aplikácii!
-- Ak user EXISTUJE, pokračuj ďalej:

-- Krok 2: Vytvor profil, household a demo dáta
DO $$
DECLARE
  target_user_id UUID;
  target_email TEXT := 'pirgozi1@gmail.com';
  new_household_id UUID;
  cat_food UUID;
  cat_housing UUID;
  cat_transport UUID;
  cat_salary UUID;
  cat_business UUID;
BEGIN
  -- Získaj user ID
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User % not found. Please register first!', target_email;
  END IF;
  
  RAISE NOTICE 'Found user: % (ID: %)', target_email, target_user_id;
  
  -- Vytvor/aktualizuj profil
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (target_user_id, target_email, 'Mikail')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(profiles.display_name, EXCLUDED.display_name);
  
  -- Skontroluj household
  SELECT hm.household_id INTO new_household_id
  FROM public.household_members hm
  WHERE hm.user_id = target_user_id
  LIMIT 1;
  
  IF new_household_id IS NULL THEN
    -- Vytvor household
    INSERT INTO public.households (name)
    VALUES ('Mikail''s Household')
    RETURNING id INTO new_household_id;
    
    -- Pridaj usera
    INSERT INTO public.household_members (household_id, user_id, role)
    VALUES (new_household_id, target_user_id, 'owner');
    
    RAISE NOTICE 'Created household: %', new_household_id;
  ELSE
    RAISE NOTICE 'Using existing household: %', new_household_id;
  END IF;
  
  -- Vytvor kategórie
  INSERT INTO public.categories (household_id, kind, name) VALUES
    (new_household_id, 'expense', 'Potraviny'),
    (new_household_id, 'expense', 'Bývanie'),
    (new_household_id, 'expense', 'Doprava'),
    (new_household_id, 'expense', 'Zdravie'),
    (new_household_id, 'expense', 'Zábava'),
    (new_household_id, 'income', 'Mzda'),
    (new_household_id, 'income', 'Podnikanie')
  ON CONFLICT (household_id, name) DO NOTHING;
  
  -- Získaj ID kategórií
  SELECT id INTO cat_food FROM public.categories WHERE household_id = new_household_id AND name = 'Potraviny';
  SELECT id INTO cat_housing FROM public.categories WHERE household_id = new_household_id AND name = 'Bývanie';
  SELECT id INTO cat_transport FROM public.categories WHERE household_id = new_household_id AND name = 'Doprava';
  SELECT id INTO cat_salary FROM public.categories WHERE household_id = new_household_id AND name = 'Mzda';
  SELECT id INTO cat_business FROM public.categories WHERE household_id = new_household_id AND name = 'Podnikanie';
  
  -- Príjmy
  INSERT INTO public.incomes (household_id, user_id, category_id, amount, currency, description, date) VALUES
    (new_household_id, target_user_id, cat_salary, 2500, 'EUR', 'Mzda - október', CURRENT_DATE - 5),
    (new_household_id, target_user_id, cat_salary, 2500, 'EUR', 'Mzda - september', CURRENT_DATE - 35),
    (new_household_id, target_user_id, cat_business, 450, 'EUR', 'Freelance projekt', CURRENT_DATE - 15)
  ON CONFLICT DO NOTHING;
  
  -- Výdavky
  INSERT INTO public.expenses (household_id, user_id, category_id, amount, currency, description, date) VALUES
    (new_household_id, target_user_id, cat_food, 85.50, 'EUR', 'Tesco - nákup', CURRENT_DATE - 2),
    (new_household_id, target_user_id, cat_food, 42.30, 'EUR', 'Kaufland', CURRENT_DATE - 5),
    (new_household_id, target_user_id, cat_food, 78.90, 'EUR', 'Billa', CURRENT_DATE - 9),
    (new_household_id, target_user_id, cat_housing, 650, 'EUR', 'Nájom', CURRENT_DATE - 3),
    (new_household_id, target_user_id, cat_housing, 120, 'EUR', 'Energie', CURRENT_DATE - 7),
    (new_household_id, target_user_id, cat_transport, 65, 'EUR', 'Tankovanie', CURRENT_DATE - 4)
  ON CONFLICT DO NOTHING;
  
  -- Úver
  INSERT INTO public.loans (household_id, user_id, name, principal, interest_rate, term_months, start_date, payment_frequency, day_count_convention, currency, status) VALUES
    (new_household_id, target_user_id, 'Hypotéka', 150000, 3.5, 360, '2023-01-01', 'monthly', 'actual_360', 'EUR', 'active')
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Setup complete!';
END $$;

-- Krok 3: Overiť výsledok
SELECT 
  u.email,
  h.name as household,
  (SELECT COUNT(*) FROM incomes WHERE household_id = h.id) as incomes,
  (SELECT COUNT(*) FROM expenses WHERE household_id = h.id) as expenses,
  (SELECT COUNT(*) FROM loans WHERE household_id = h.id) as loans
FROM auth.users u
JOIN profiles p ON p.id = u.id
JOIN household_members hm ON hm.user_id = u.id
JOIN households h ON h.id = hm.household_id
WHERE u.email = 'pirgozi1@gmail.com';

