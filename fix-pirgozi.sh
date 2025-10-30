#!/bin/bash

# ============================================
# Oprava household pre pirgozi1@gmail.com
# ============================================

echo "🔧 Oprava household pre pirgozi1@gmail.com"
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

echo "🔍 Testujem pripojenie..."
if ! psql "$CONNECTION_STRING" -c "SELECT 1" > /dev/null 2>&1; then
  echo "❌ Pripojenie zlyhalo! Skontroluj heslo."
  exit 1
fi

echo "✅ Pripojenie úspešné!"
echo ""

echo "📝 Vytváram household pre pirgozi1@gmail.com..."
echo ""
psql "$CONNECTION_STRING" -f FIX_PIRGOZI_HOUSEHOLD.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Hotovo! Household vytvorený."
  echo ""
  echo "🔄 TERAZ:"
  echo "   1. Odhlásiť sa z aplikácie"
  echo "   2. Prihlásiť sa znova"
  echo "   3. Tlačidlá by sa mali zobraziť! 🎉"
else
  echo ""
  echo "❌ Niečo sa pokazilo."
  exit 1
fi

