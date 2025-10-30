#!/bin/bash

# ============================================
# Skript na vytvorenie triggera pre automatickú registráciu
# ============================================

echo "🚀 Vytvorenie triggera pre automatickú registráciu"
echo "======================================================"
echo ""

# Supabase project info
PROJECT_REF="agccohbrvpjknlhltqzc"
DB_HOST="db.${PROJECT_REF}.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

echo "📋 Supabase projekt: ${PROJECT_REF}"
echo "🔗 Database: ${DB_HOST}"
echo ""

# Opýtaj sa na heslo
echo "🔑 Potrebujem database heslo."
echo "   (To isté heslo ako predtým)"
echo ""
read -sp "   Zadaj Database Password: " DB_PASSWORD
echo ""
echo ""

if [ -z "$DB_PASSWORD" ]; then
  echo "❌ Heslo nemôže byť prázdne!"
  exit 1
fi

# Connection string
CONNECTION_STRING="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "🔍 Testujem pripojenie..."
if ! psql "$CONNECTION_STRING" -c "SELECT 1" > /dev/null 2>&1; then
  echo "❌ Pripojenie zlyhalo! Skontroluj heslo a skús znova."
  exit 1
fi

echo "✅ Pripojenie úspešné!"
echo ""

echo "📝 Vytváram trigger pre automatickú registráciu..."
psql "$CONNECTION_STRING" -f FIX_REGISTRATION.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Hotovo! Trigger vytvorený."
  echo ""
  echo "🎉 Od teraz sa pri každej novej registrácii automaticky vytvorí:"
  echo "   - Profil"
  echo "   - Household"
  echo "   - Membership s rolou owner"
  echo "   - 8 default kategórií"
else
  echo ""
  echo "❌ Niečo sa pokazilo. Skontroluj chybové hlášky vyššie."
  exit 1
fi

