#!/bin/bash

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║  📱 FinApp Mobile Setup – Development Environment      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}[1/5]${NC} Kontrolujeme predpoklady..."

if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js nie je nainštalovaný${NC}"
  exit 1
fi

if ! command -v pnpm &> /dev/null; then
  echo -e "${RED}✗ pnpm nie je nainštalovaný${NC}"
  exit 1
fi

NODE_VERSION=$(node -v)
PNPM_VERSION=$(pnpm -v)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION}${NC}"
echo -e "${GREEN}✓ pnpm ${PNPM_VERSION}${NC}"
echo ""

# Navigate to mobile app
cd "$(dirname "$0")/apps/mobile"
echo -e "${BLUE}[2/5]${NC} Vstupujeme do apps/mobile..."
pwd

# Check if .env exists
if [ -f .env ]; then
  echo -e "${YELLOW}⚠ .env súbor už existuje${NC}"
  read -p "Chcete ho prepísať? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Preskakujem vytvorenie .env${NC}"
    ENV_CREATED=false
  else
    ENV_CREATED=true
  fi
else
  ENV_CREATED=true
fi

# Create .env if needed
if [ "$ENV_CREATED" = true ]; then
  echo ""
  echo -e "${BLUE}[3/5]${NC} Vytvárame .env súbor..."
  echo ""
  echo "Potrebujeme Supabase kredenciály. Choďte na:"
  echo "  📌 https://supabase.com/dashboard/project/agccohbrvpjknlhltqzc/settings/api"
  echo ""
  
  read -p "Zadajte EXPO_PUBLIC_SUPABASE_URL: " SUPABASE_URL
  read -p "Zadajte EXPO_PUBLIC_SUPABASE_ANON_KEY: " ANON_KEY
  
  cat > .env << ENVFILE
# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:3000

# Supabase
EXPO_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
EXPO_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
ENVFILE

  echo -e "${GREEN}✓ .env vytvorený úspešne${NC}"
else
  echo -e "${GREEN}✓ .env zachovaný${NC}"
fi

echo ""

# Install dependencies
echo -e "${BLUE}[4/5]${NC} Inštalujeme závislosti..."
pnpm install

echo ""

# Verify setup
echo -e "${BLUE}[5/5]${NC} Overujeme nastavenie..."

echo -n "  → TypeScript type check... "
if pnpm typecheck > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗ (pozri detaily vyšie)${NC}"
  exit 1
fi

echo -n "  → ESLint... "
if pnpm lint > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${YELLOW}⚠ (pozor na warnings)${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Setup úspešný!                                     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Ďalší kroky:"
echo "  1️⃣  Ujistite sa, že web API beží na http://localhost:3000"
echo "  2️⃣  Spustite mobilnú aplikáciu:"
echo "      pnpm dev"
echo "  3️⃣  Stlačte 'i' (iOS), 'a' (Android) alebo skenhujte QR kód (Expo Go)"
echo ""
echo "Dokumentácia:"
echo "  📖 MOBILE_SETUP.md – Detailný návod"
echo "  ✅ TESTING_CHECKLIST.md – Test plán"
echo ""
