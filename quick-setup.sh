#!/bin/bash

clear

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}${BLUE}"
echo "╔════════════════════════════════════════════════════╗"
echo "║                                                    ║"
echo "║          🚀 FinApp - Quick Setup 🚀               ║"
echo "║                                                    ║"
echo "╚════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

echo -e "${YELLOW}Tento skript ti pomôže nastaviť FinApp za 2 minúty!${NC}"
echo ""

# Check current .env.local
if grep -q "your-project.supabase.co" apps/web/.env.local 2>/dev/null; then
    echo -e "${RED}❌ Supabase credentials nie sú nastavené!${NC}"
    echo ""
else
    echo -e "${GREEN}✅ .env.local súbor existuje${NC}"
    echo ""
fi

echo -e "${BOLD}Potrebujem 2 veci z tvojho Supabase projektu:${NC}"
echo ""
echo "👉 Choď na: ${BLUE}https://supabase.com/dashboard/project/financie-web/settings/api${NC}"
echo ""

# Get credentials
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
read -p "1️⃣  Project URL (https://xxx.supabase.co): " SUPABASE_URL
echo ""
read -p "2️⃣  Anon/Public Key (eyJh...): " SUPABASE_ANON_KEY
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Validate inputs
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ Chyba: Musíš zadať obe hodnoty!${NC}"
    exit 1
fi

# Create .env.local
echo -e "${BLUE}📝 Vytváram .env.local...${NC}"

cat > apps/web/.env.local << EOF
# Supabase
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe (voliteľné)
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
# STRIPE_SECRET_KEY=sk_test_...
# NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_...
# NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_...
EOF

echo -e "${GREEN}✅ .env.local vytvorený!${NC}"
echo ""

# Instructions for migrations
echo -e "${BOLD}${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${GREEN}Ďalšie kroky:${NC}"
echo ""
echo -e "${BOLD}KROK 1: Spusti migrácie${NC}"
echo "👉 https://supabase.com/dashboard/project/financie-web/sql"
echo ""
echo "Spusti tieto súbory (New Query → Paste → Run):"
echo "  1. supabase/migrations/20240101000000_initial_schema.sql"
echo "  2. supabase/migrations/20240101000001_rls_policies.sql"
echo "  3. supabase/migrations/20240102000000_push_tokens.sql"
echo ""
echo -e "${BOLD}KROK 2: Reštartuj server${NC}"
echo "  Ctrl+C (zastaviť)"
echo "  pnpm dev (spustiť znova)"
echo ""
echo -e "${BOLD}KROK 3: Vytvor účet${NC}"
echo "  👉 http://localhost:3000/auth/register"
echo ""
echo -e "${BOLD}KROK 4: Prihlás sa${NC}"
echo "  👉 http://localhost:3000/auth/login"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}✅ Setup dokončený!${NC}"
echo ""
echo -e "${BLUE}📚 Detailný návod: CREATE_ADMIN.md${NC}"
echo ""

