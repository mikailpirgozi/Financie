-- Migration: Fix user registration trigger
-- Created: 2024-11-02
-- Issue: Registration was failing because trigger used 'admin' role instead of 'owner',
--        and didn't create profiles entry

-- ============================================
-- Part 1: Fix the trigger function
-- ============================================

CREATE OR REPLACE FUNCTION create_household_for_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_household_id UUID;
BEGIN
  -- First, create a profile for the new user
  INSERT INTO profiles (id, email, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  );

  -- Create a new household
  INSERT INTO households (name, created_at)
  VALUES (
    'Moja domácnosť',
    NOW()
  )
  RETURNING id INTO new_household_id;

  -- Add the new user as owner (not admin!) to their household
  INSERT INTO household_members (user_id, household_id, role, joined_at)
  VALUES (
    NEW.id,
    new_household_id,
    'owner',  -- Fixed: use 'owner' instead of 'admin'
    NOW()
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE WARNING 'Error creating household for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- ============================================
-- Part 2: Fix existing users with 'admin' role
-- ============================================

-- Update any existing household_members with 'admin' role to 'owner'
UPDATE household_members
SET role = 'owner'
WHERE role = 'admin';

-- ============================================
-- Part 3: Verification
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '=== User Registration Fix Applied ===';
  RAISE NOTICE 'Trigger function updated to:';
  RAISE NOTICE '  1. Create profile entry';
  RAISE NOTICE '  2. Use "owner" role instead of "admin"';
  RAISE NOTICE '  3. Include error handling';
  RAISE NOTICE '=====================================';
END $$;

