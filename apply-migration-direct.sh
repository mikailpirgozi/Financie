#!/bin/bash

# Load env vars
source <(grep -E "SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_URL" apps/web/.env.local | sed 's/^/export /')

PROJECT_REF="agccohbrvpjknlhltqzc"
SQL_FILE="supabase/migrations/20241021100000_fix_rls_recursion_final.sql"

echo "🔧 Aplikujem RLS fix cez Supabase Management API..."
echo ""

# Read SQL file
SQL_CONTENT=$(cat "$SQL_FILE")

# Try using supabase CLI
if command -v supabase &> /dev/null; then
    echo "✅ Supabase CLI nájdené"
    echo "📤 Spúšťam migráciu..."
    
    # Link to project
    supabase link --project-ref "$PROJECT_REF" 2>/dev/null || true
    
    # Push migration
    supabase db push --include-all
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Migrácia úspešná!"
        echo ""
        echo "🧪 Testujem..."
        node test-membership.js
        exit 0
    fi
fi

echo ""
echo "⚠️  Supabase CLI nefunguje"
echo ""
echo "📋 MANUÁLNY POSTUP:"
echo ""
echo "1. Otvor: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
echo "2. Skopíruj súbor: $SQL_FILE"
echo "3. Vlož do SQL Editor"
echo "4. Klikni 'Run'"
echo ""
echo "Alebo spusti:"
echo "  cat $SQL_FILE | pbcopy"
echo "  (SQL je teraz v clipboard)"
echo ""

