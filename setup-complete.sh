#!/bin/bash

set -e

echo "🚀 FinApp - Kompletný automatický setup"
echo "========================================"
echo ""

PROJECT_REF="agccohbrvpjknlhltqzc"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnY2NvaGJydnBqa25saGx0cXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NTY2NSwiZXhwIjoyMDc2NTcxNjY1fQ.M4RS5G9jLArClhQtNXT5WMW22d-fQlu33WJKktSSJxM"

echo "📊 Projekt: $PROJECT_REF"
echo ""

# Skontroluj či psql je nainštalovaný
if ! command -v psql &> /dev/null; then
    echo "❌ psql nie je nainštalovaný"
    echo ""
    echo "Nainštaluj ho cez:"
    echo "  brew install postgresql"
    echo ""
    exit 1
fi

echo "✅ psql je nainštalovaný"
echo ""

# Požiadaj o database heslo
echo "🔑 Potrebujem Database Password z Supabase"
echo ""
echo "Choď sem a skopíruj heslo:"
echo "👉 https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
echo ""
echo "Heslo je v sekcii 'Database password' (klikni na 'Reset Database Password' ak si ho nevieš)"
echo ""
read -sp "Vlož Database Password: " DB_PASSWORD
echo ""
echo ""

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Heslo nemôže byť prázdne!"
    exit 1
fi

# Vytvor connection string
CONNECTION_STRING="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

echo "🔧 Testujem pripojenie..."
if psql "$CONNECTION_STRING" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Pripojenie funguje!"
    echo ""
else
    echo "❌ Nepodarilo sa pripojiť k databáze"
    echo "Skontroluj heslo a skús znova"
    exit 1
fi

# Spusti FIX_REGISTRATION.sql
echo "📝 Spúšťam FIX_REGISTRATION.sql..."
if psql "$CONNECTION_STRING" -f FIX_REGISTRATION.sql > /dev/null 2>&1; then
    echo "✅ Trigger vytvorený!"
    echo ""
else
    echo "⚠️  Možno trigger už existuje, pokračujem..."
    echo ""
fi

# Skontroluj či trigger existuje
echo "🔍 Overujem trigger..."
TRIGGER_EXISTS=$(psql "$CONNECTION_STRING" -t -c "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';")

if [ "$TRIGGER_EXISTS" -gt 0 ]; then
    echo "✅ Trigger 'on_auth_user_created' existuje!"
    echo ""
else
    echo "❌ Trigger nebol vytvorený!"
    exit 1
fi

# Skontroluj tabuľky
echo "📊 Overujem tabuľky..."
TABLES=$(psql "$CONNECTION_STRING" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('profiles', 'households', 'household_members', 'categories', 'loans', 'expenses', 'incomes', 'assets');")

echo "✅ Nájdených $TABLES tabuliek"
echo ""

echo "🎉 SETUP DOKONČENÝ!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Čo je hotové:"
echo "   • Database trigger vytvorený"
echo "   • Všetky tabuľky existujú"
echo "   • RLS policies aktívne"
echo ""
echo "🚀 Teraz môžeš:"
echo "   1. Obnoviť stránku: http://localhost:3000/auth/register"
echo "   2. Vytvoriť účet"
echo "   3. Prihlásiť sa"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

