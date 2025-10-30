-- ============================================
-- Vytvorenie household pre pirgozi1@gmail.com
-- ============================================

DO $$
DECLARE
  target_user_id UUID;
  target_household_id UUID;
  existing_household_id UUID;
BEGIN
  -- Získaj user ID
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'pirgozi1@gmail.com';
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Používateľ pirgozi1@gmail.com neexistuje!';
  END IF;
  
  RAISE NOTICE 'User ID: %', target_user_id;
  
  -- Skontroluj, či už má household
  SELECT household_id INTO existing_household_id
  FROM household_members
  WHERE user_id = target_user_id
  LIMIT 1;
  
  IF existing_household_id IS NOT NULL THEN
    RAISE NOTICE 'Používateľ už má household: %', existing_household_id;
    RAISE NOTICE 'Preskakujem vytvorenie...';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Vytváram nový household...';
  
  -- Vytvor alebo aktualizuj profil
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (target_user_id, 'pirgozi1@gmail.com', 'Mikail')
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    display_name = COALESCE(profiles.display_name, EXCLUDED.display_name);
  
  RAISE NOTICE 'Profil vytvorený/aktualizovaný';
  
  -- Vytvor household
  INSERT INTO public.households (name)
  VALUES ('Mikail''s Household')
  RETURNING id INTO target_household_id;
  
  RAISE NOTICE 'Household vytvorený: %', target_household_id;
  
  -- Pridaj usera do household ako owner
  INSERT INTO public.household_members (household_id, user_id, role)
  VALUES (target_household_id, target_user_id, 'owner');
  
  RAISE NOTICE 'User pridaný do household ako owner';
  
  -- Vytvor default kategórie
  INSERT INTO public.categories (household_id, kind, name)
  VALUES
    (target_household_id, 'expense', 'Potraviny'),
    (target_household_id, 'expense', 'Bývanie'),
    (target_household_id, 'expense', 'Doprava'),
    (target_household_id, 'expense', 'Zdravie'),
    (target_household_id, 'expense', 'Zábava'),
    (target_household_id, 'income', 'Mzda'),
    (target_household_id, 'income', 'Podnikanie'),
    (target_household_id, 'income', 'Investície');
  
  RAISE NOTICE 'Vytvorených 8 kategórií';
  RAISE NOTICE '';
  RAISE NOTICE '✅ HOTOVO! Household vytvorený pre pirgozi1@gmail.com';
  RAISE NOTICE '   Household ID: %', target_household_id;
  RAISE NOTICE '';
  
END $$;

-- Overiť výsledok
SELECT 
  u.email,
  u.id as user_id,
  p.display_name,
  h.id as household_id,
  h.name as household_name,
  hm.role,
  (SELECT COUNT(*) FROM categories WHERE household_id = h.id) as pocet_kategorii
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.household_members hm ON hm.user_id = u.id
LEFT JOIN public.households h ON h.id = hm.household_id
WHERE u.email = 'pirgozi1@gmail.com';

