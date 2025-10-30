#!/bin/bash

# ============================================
# Skript na pridanie demo dát pre pirgozi1@gmail.com
# ============================================

echo "🎨 Pridávam demo dáta pre pirgozi1@gmail.com"
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

echo "📝 Vytváram demo dáta..."
echo ""
psql "$CONNECTION_STRING" -f ADD_DEMO_DATA.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Hotovo! Demo dáta vytvorené."
  echo ""
  echo "🎉 Vytvorené:"
  echo "   - 2 úvery (hypotéka 150 000€ + spotrebný 15 000€)"
  echo "   - 5 príjmov (posledné 3 mesiace, ~7 650€)"
  echo "   - 18 výdavkov (posledné 3 mesiace, ~3 500€)"
  echo "   - 3 majetky (byt, auto, úspory, ~202 250€)"
  echo ""
  echo "🔄 Obnov aplikáciu v prehliadači (Cmd+R)"
  echo "   Teraz by si mal vidieť všetky dáta! 🚀"
else
  echo ""
  echo "❌ Niečo sa pokazilo. Skontroluj chybové hlášky vyššie."
  exit 1
fi

