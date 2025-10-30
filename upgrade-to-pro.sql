-- Upgrade pirgozi@gmail.com to PRO plan for unlimited loans

-- Check current status
SELECT 
  id,
  email,
  subscription_plan,
  created_at
FROM profiles
WHERE email = 'pirgozi@gmail.com';

-- Count current loans
SELECT COUNT(*) as current_loans
FROM loans l
JOIN household_members hm ON l.household_id = hm.household_id
JOIN profiles p ON hm.user_id = p.id
WHERE p.email = 'pirgozi@gmail.com';

-- Upgrade to PRO plan (unlimited loans)
UPDATE profiles
SET 
  subscription_plan = 'pro',
  updated_at = NOW()
WHERE email = 'pirgozi@gmail.com';

-- Verify the change
SELECT 
  id,
  email,
  subscription_plan,
  updated_at
FROM profiles
WHERE email = 'pirgozi@gmail.com';

-- Show plan limits
SELECT 
  'free' as plan,
  '5 loans' as limit
UNION ALL
SELECT 
  'pro' as plan,
  'unlimited loans (-1)' as limit
UNION ALL
SELECT 
  'premium' as plan,
  'unlimited loans (-1)' as limit;

