#!/bin/bash

echo "🚀 FinApp - Supabase Setup Script"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Tento skript ti pomôže nastaviť Supabase pre FinApp${NC}"
echo ""

# Get Supabase credentials
echo -e "${YELLOW}Choď na: https://supabase.com/dashboard/project/financie-web/settings/api${NC}"
echo ""
echo "Potrebujem tieto údaje z tvojho Supabase projektu:"
echo ""

read -p "1. Project URL (https://xxx.supabase.co): " SUPABASE_URL
read -p "2. Anon/Public Key (eyJh...): " SUPABASE_ANON_KEY

# Optional: Project Reference ID for CLI
echo ""
echo -e "${BLUE}Voliteľné (pre Supabase CLI):${NC}"
read -p "3. Project Reference ID (z URL, napr. 'abcdefghij'): " PROJECT_REF

# Create .env.local
echo ""
echo -e "${GREEN}Vytváram .env.local súbor...${NC}"

cat > apps/web/.env.local << EOF
# Supabase
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe (voliteľné - pre subscriptions)
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
# STRIPE_SECRET_KEY=sk_test_...
# NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_...
# NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_...
EOF

echo -e "${GREEN}✅ .env.local vytvorený!${NC}"
echo ""

# Link project if reference provided
if [ ! -z "$PROJECT_REF" ]; then
    echo -e "${BLUE}Prepájam Supabase projekt...${NC}"
    supabase link --project-ref $PROJECT_REF 2>/dev/null || echo "Note: Supabase link vyžaduje prihlásenie"
    echo ""
fi

# Show migration instructions
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Ďalšie kroky:${NC}"
echo ""
echo "1. Spusti migrácie v Supabase SQL Editore:"
echo "   https://supabase.com/dashboard/project/${PROJECT_REF}/sql"
echo ""
echo "   Spusti tieto súbory v tomto poradí:"
echo "   a) supabase/migrations/20240101000000_initial_schema.sql"
echo "   b) supabase/migrations/20240101000001_rls_policies.sql"
echo "   c) supabase/migrations/20240102000000_push_tokens.sql"
echo ""
echo "2. Reštartuj dev server:"
echo "   Ctrl+C (zastaviť)"
echo "   pnpm dev (spustiť znova)"
echo ""
echo "3. Choď na http://localhost:3000/auth/register"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}✅ Setup dokončený!${NC}"
echo ""
echo "Tvoje credentials sú uložené v: apps/web/.env.local"
echo ""

