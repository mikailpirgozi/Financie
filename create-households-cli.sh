#!/bin/bash

# ============================================
# Rýchly skript na vytvorenie households
# ============================================

echo "🚀 Vytvorenie households pre existujúcich používateľov"
echo ""

# Skontroluj či existuje supabase CLI
if command -v supabase &> /dev/null; then
  echo "✅ Supabase CLI nájdené"
  echo "📝 Spúšťam SQL cez Supabase CLI..."
  echo ""
  
  supabase db execute --file CREATE_HOUSEHOLD_FOR_EXISTING_USERS.sql --project-ref agccohbrvpjknlhltqzc
  
  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Hotovo!"
    echo "🔄 Obnov aplikáciu v prehliadači (Cmd+R)"
  fi
else
  echo "⚠️  Supabase CLI nie je nainštalované"
  echo ""
  echo "Máš 2 možnosti:"
  echo ""
  echo "1️⃣  Nainštaluj Supabase CLI:"
  echo "   brew install supabase/tap/supabase"
  echo "   supabase login"
  echo "   Potom spusti tento skript znova"
  echo ""
  echo "2️⃣  Použi psql (potrebuješ database heslo):"
  echo "   ./setup-households.sh"
  echo ""
  echo "3️⃣  Alebo cez Supabase Dashboard:"
  echo "   - Otvor: https://supabase.com/dashboard/project/agccohbrvpjknlhltqzc/sql"
  echo "   - Skopíruj obsah: CREATE_HOUSEHOLD_FOR_EXISTING_USERS.sql"
  echo "   - Spusti query"
fi

