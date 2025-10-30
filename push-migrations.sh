#!/bin/bash

echo "🗄️  FinApp - Database Migrations"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Tento skript ti ukáže ako spustiť migrácie${NC}"
echo ""

# Check if project is linked
if [ -f ".git/config" ]; then
    PROJECT_REF=$(grep -o 'project-ref = .*' supabase/.temp/project-ref 2>/dev/null | cut -d' ' -f3)
fi

if [ -z "$PROJECT_REF" ]; then
    echo -e "${YELLOW}⚠️  Supabase projekt nie je prepojený${NC}"
    echo ""
    read -p "Zadaj Project Reference ID (z URL): " PROJECT_REF
fi

echo ""
echo -e "${GREEN}📋 Migrácie na spustenie:${NC}"
echo ""
echo "1️⃣  Initial Schema (tabuľky, indexy, triggery)"
echo "   📁 supabase/migrations/20240101000000_initial_schema.sql"
echo ""
echo "2️⃣  RLS Policies (bezpečnostné pravidlá)"
echo "   📁 supabase/migrations/20240101000001_rls_policies.sql"
echo ""
echo "3️⃣  Push Tokens (notifikácie)"
echo "   📁 supabase/migrations/20240102000000_push_tokens.sql"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Možnosti:${NC}"
echo ""
echo "A) Automaticky (cez Supabase CLI):"
echo "   supabase db push"
echo ""
echo "B) Manuálne (odporúčané):"
echo "   1. Choď na: https://supabase.com/dashboard/project/${PROJECT_REF}/sql"
echo "   2. Otvor každý súbor a spusti ho (New Query → Paste → Run)"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

read -p "Chceš skúsiť automatický push? (y/n): " AUTO_PUSH

if [ "$AUTO_PUSH" = "y" ] || [ "$AUTO_PUSH" = "Y" ]; then
    echo ""
    echo -e "${BLUE}Spúšťam migrácie...${NC}"
    echo ""
    
    # Try to push
    if supabase db push; then
        echo ""
        echo -e "${GREEN}✅ Migrácie úspešne spustené!${NC}"
    else
        echo ""
        echo -e "${RED}❌ Automatický push zlyhal${NC}"
        echo ""
        echo -e "${YELLOW}Spusti migrácie manuálne:${NC}"
        echo "https://supabase.com/dashboard/project/${PROJECT_REF}/sql"
    fi
else
    echo ""
    echo -e "${BLUE}OK, spusti migrácie manuálne:${NC}"
    echo "https://supabase.com/dashboard/project/${PROJECT_REF}/sql"
fi

echo ""
echo -e "${GREEN}Hotovo!${NC}"
echo ""

