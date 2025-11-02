-- Migration: Create default households for users who don't have one
-- Created: 2024-11-02

-- ============================================
-- Part 1: Create households for existing users without one
-- ============================================

DO $$
DECLARE
  user_record RECORD;
  new_household_id UUID;
BEGIN
  -- Loop through all users who don't have a household
  FOR user_record IN 
    SELECT u.id, u.email
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1 
      FROM household_members hm 
      WHERE hm.user_id = u.id
    )
  LOOP
    -- Create a household for this user
    INSERT INTO households (name, created_at)
    VALUES (
      'Moja domácnosť',
      NOW()
    )
    RETURNING id INTO new_household_id;

    -- Add user as admin to their new household
    INSERT INTO household_members (user_id, household_id, role, joined_at)
    VALUES (
      user_record.id,
      new_household_id,
      'admin',
      NOW()
    );

    RAISE NOTICE 'Created household for user: %', user_record.email;
  END LOOP;
END $$;

-- ============================================
-- Part 2: Create trigger function for auto-creating households
-- ============================================

-- Function that creates a household when a new user signs up
CREATE OR REPLACE FUNCTION create_household_for_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_household_id UUID;
BEGIN
  -- Create a new household
  INSERT INTO households (name, created_at)
  VALUES (
    'Moja domácnosť',
    NOW()
  )
  RETURNING id INTO new_household_id;

  -- Add the new user as admin to their household
  INSERT INTO household_members (user_id, household_id, role, joined_at)
  VALUES (
    NEW.id,
    new_household_id,
    'admin',
    NOW()
  );

  RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger that fires when a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_household_for_new_user();

-- ============================================
-- Part 3: Verification
-- ============================================

-- Show results
DO $$
DECLARE
  total_users INTEGER;
  users_with_households INTEGER;
  users_without_households INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM auth.users;
  
  SELECT COUNT(DISTINCT user_id) INTO users_with_households 
  FROM household_members;
  
  users_without_households := total_users - users_with_households;
  
  RAISE NOTICE '=== Household Migration Summary ===';
  RAISE NOTICE 'Total users: %', total_users;
  RAISE NOTICE 'Users with households: %', users_with_households;
  RAISE NOTICE 'Users without households: %', users_without_households;
  RAISE NOTICE 'Trigger created: on_auth_user_created';
  RAISE NOTICE '==================================';
END $$;

