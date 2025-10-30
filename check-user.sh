#!/bin/bash

# ============================================
# Skript na kontrolu používateľa a household
# ============================================

echo "🔍 Kontrola používateľa a household"
echo "======================================================"
echo ""

# Supabase project info
PROJECT_REF="agccohbrvpjknlhltqzc"
DB_HOST="db.${PROJECT_REF}.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

echo "📋 Supabase projekt: ${PROJECT_REF}"
echo ""

# Opýtaj sa na heslo
read -sp "🔑 Zadaj Database Password: " DB_PASSWORD
echo ""
echo ""

if [ -z "$DB_PASSWORD" ]; then
  echo "❌ Heslo nemôže byť prázdne!"
  exit 1
fi

# Connection string
CONNECTION_STRING="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "🔍 Kontrolujem používateľov a households..."
echo ""

psql "$CONNECTION_STRING" << 'EOF'
-- Zobraz všetkých používateľov s ich households
SELECT 
  u.email,
  u.created_at as registracia,
  p.display_name,
  h.id as household_id,
  h.name as household_name,
  hm.role,
  (SELECT COUNT(*) FROM loans WHERE household_id = h.id) as pocet_uverov,
  (SELECT COUNT(*) FROM expenses WHERE household_id = h.id) as pocet_vydavkov
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.household_members hm ON hm.user_id = u.id
LEFT JOIN public.households h ON h.id = hm.household_id
ORDER BY u.created_at;

-- Špeciálne pre pirgozi1@gmail.com
\echo ''
\echo '=== Detail pre pirgozi1@gmail.com ==='
\echo ''

SELECT 
  u.id as user_id,
  u.email,
  u.created_at,
  u.raw_user_meta_data->>'display_name' as metadata_name
FROM auth.users u
WHERE u.email = 'pirgozi1@gmail.com';

\echo ''
\echo '=== Household membership ==='
\echo ''

SELECT 
  hm.household_id,
  hm.role,
  h.name as household_name,
  h.created_at
FROM household_members hm
JOIN households h ON h.id = hm.household_id
WHERE hm.user_id = (SELECT id FROM auth.users WHERE email = 'pirgozi1@gmail.com');

EOF

echo ""
echo "✅ Kontrola dokončená"

