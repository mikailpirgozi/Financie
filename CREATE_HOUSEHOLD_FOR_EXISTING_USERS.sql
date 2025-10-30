-- ============================================
-- Vytvorenie household pre existujúcich používateľov
-- ============================================

-- Tento skript vytvorí household pre všetkých používateľov,
-- ktorí ešte nemajú žiadnu domácnosť

DO $$
DECLARE
  user_record RECORD;
  new_household_id UUID;
  user_display_name TEXT;
BEGIN
  -- Prejdi všetkých používateľov, ktorí nemajú household
  FOR user_record IN 
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.user_id = u.id
    )
  LOOP
    -- Získaj display name
    user_display_name := COALESCE(
      user_record.raw_user_meta_data->>'display_name',
      user_record.email
    );
    
    RAISE NOTICE 'Creating household for user: % (%)', user_display_name, user_record.email;
    
    -- Vytvor profil ak neexistuje
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (user_record.id, user_record.email, user_display_name)
    ON CONFLICT (id) DO UPDATE
    SET 
      email = EXCLUDED.email,
      display_name = COALESCE(profiles.display_name, EXCLUDED.display_name);
    
    -- Vytvor household
    INSERT INTO public.households (name)
    VALUES (user_display_name || '''s Household')
    RETURNING id INTO new_household_id;
    
    RAISE NOTICE 'Created household: %', new_household_id;
    
    -- Pridaj usera do household ako owner
    INSERT INTO public.household_members (household_id, user_id, role)
    VALUES (new_household_id, user_record.id, 'owner');
    
    -- Vytvor default kategórie
    INSERT INTO public.categories (household_id, kind, name)
    VALUES
      (new_household_id, 'expense', 'Potraviny'),
      (new_household_id, 'expense', 'Bývanie'),
      (new_household_id, 'expense', 'Doprava'),
      (new_household_id, 'expense', 'Zdravie'),
      (new_household_id, 'expense', 'Zábava'),
      (new_household_id, 'income', 'Mzda'),
      (new_household_id, 'income', 'Podnikanie'),
      (new_household_id, 'income', 'Investície');
    
    RAISE NOTICE 'Created default categories for household: %', new_household_id;
  END LOOP;
  
  RAISE NOTICE 'Done! All users now have households.';
END $$;

-- Overiť výsledok
SELECT 
  u.email,
  p.display_name,
  h.name as household_name,
  hm.role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.household_members hm ON hm.user_id = u.id
LEFT JOIN public.households h ON h.id = hm.household_id
ORDER BY u.created_at;

