#!/bin/bash

echo "🚀 Upgrading pirgozi@gmail.com to PRO plan..."
echo ""
echo "📋 Instructions:"
echo "1. Go to: https://supabase.com/dashboard/project/agccohbrvpjknlhltqzc/settings/database"
echo "2. Copy your Database Password"
echo "3. Run this command:"
echo ""
echo "psql \"postgresql://postgres:YOUR_PASSWORD@db.agccohbrvpjknlhltqzc.supabase.co:5432/postgres\" -f upgrade-to-pro.sql"
echo ""
echo "Or run this single command:"
echo ""
echo "psql \"postgresql://postgres:YOUR_PASSWORD@db.agccohbrvpjknlhltqzc.supabase.co:5432/postgres\" -c \"UPDATE profiles SET subscription_plan = 'pro', updated_at = NOW() WHERE email = 'pirgozi@gmail.com'; SELECT email, subscription_plan FROM profiles WHERE email = 'pirgozi@gmail.com';\""
echo ""

