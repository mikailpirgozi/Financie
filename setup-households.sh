#!/bin/bash

# ============================================
# Skript na vytvorenie households pre existujúcich používateľov
# ============================================

echo "🚀 Vytvorenie households pre existujúcich používateľov"
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
echo "   Nájdeš ho tu: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database"
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

echo "📝 Spúšťam SQL skript..."
psql "$CONNECTION_STRING" -f CREATE_HOUSEHOLD_FOR_EXISTING_USERS.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Hotovo! Households vytvorené."
  echo ""
  echo "🔄 Teraz obnov aplikáciu v prehliadači (Cmd+R)"
  echo "   Tlačidlá by sa mali zobraziť! 🎉"
else
  echo ""
  echo "❌ Niečo sa pokazilo. Skontroluj chybové hlášky vyššie."
  exit 1
fi

