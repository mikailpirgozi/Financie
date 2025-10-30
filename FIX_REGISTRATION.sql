-- ============================================
-- FIX: Automatické vytvorenie profilu pri registrácii
-- ============================================

-- Vytvor funkciu ktorá automaticky vytvorí profil pri registrácii
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vytvor trigger ktorý spustí funkciu pri vytvorení nového usera
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Vytvor aj automatické vytvorenie household
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
RETURNS TRIGGER AS $$
DECLARE
  new_household_id UUID;
  user_display_name TEXT;
BEGIN
  -- Získaj display name
  user_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email);
  
  -- Vytvor profil
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, user_display_name);
  
  -- Vytvor household
  INSERT INTO public.households (name)
  VALUES (user_display_name || '''s Household')
  RETURNING id INTO new_household_id;
  
  -- Pridaj usera do household ako owner
  INSERT INTO public.household_members (household_id, user_id, role)
  VALUES (new_household_id, NEW.id, 'owner');
  
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nahraď trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_complete();

-- ============================================
-- ✅ HOTOVO!
-- Teraz sa pri registrácii automaticky vytvoria:
-- - profil
-- - household
-- - household_member záznam
-- - default kategórie
-- ============================================






