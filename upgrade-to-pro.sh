#!/bin/bash

echo "🚀 Upgrading pirgozi@gmail.com to PRO plan..."
echo ""

# Run SQL via Supabase CLI
supabase db execute --file upgrade-to-pro.sql --local

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Successfully upgraded to PRO plan!"
  echo "🎉 You now have unlimited loans!"
  echo ""
  echo "Plan limits:"
  echo "  • FREE: 5 loans"
  echo "  • PRO: unlimited loans"
  echo "  • PREMIUM: unlimited loans"
else
  echo ""
  echo "❌ Failed to upgrade. Trying alternative method..."
  echo ""
  
  # Alternative: direct psql command
  supabase db execute --local <<SQL
UPDATE profiles
SET subscription_plan = 'pro', updated_at = NOW()
WHERE email = 'pirgozi@gmail.com';

SELECT 
  email,
  subscription_plan,
  updated_at
FROM profiles
WHERE email = 'pirgozi@gmail.com';
SQL
  
  if [ $? -eq 0 ]; then
    echo "✅ Successfully upgraded to PRO plan!"
  else
    echo "❌ Failed. Please run manually in Supabase SQL Editor:"
    echo ""
    echo "UPDATE profiles SET subscription_plan = 'pro' WHERE email = 'pirgozi@gmail.com';"
  fi
fi

