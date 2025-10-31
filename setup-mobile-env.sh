#!/bin/bash

# 🚀 FinApp Mobile Environment Setup Script
# Usage: ./setup-mobile-env.sh [API_URL] [SUPABASE_URL] [SUPABASE_KEY]

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║        🚀 FinApp Mobile App – Environment Setup               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

MOBILE_DIR="apps/mobile"
ENV_FILE="$MOBILE_DIR/.env"

# Check if mobile app directory exists
if [ ! -d "$MOBILE_DIR" ]; then
    echo "❌ Nenašiel som adresár $MOBILE_DIR"
    exit 1
fi

echo "✅ Nájdený adresár mobilnej aplikácie: $MOBILE_DIR"
echo ""

# ============================================
# Step 1: Detect Web Backend
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Skúšam nájsť Web Backend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Use command line argument or auto-detect
if [ -n "$1" ]; then
    API_URL="$1"
    echo "✅ API URL z parametra: $API_URL"
else
    API_URL="http://localhost:3000"
    if curl -s --connect-timeout 2 "$API_URL" > /dev/null 2>&1; then
        echo "✅ Web Backend je SPUSTENÝ na: $API_URL"
    else
        echo "⚠️  Web Backend NEBEŽÍ na localhost:3000"
        echo ""
        echo "Máš tieto možnosti:"
        echo "  1. localhost:3000 (default, server musí behnúť lokálne)"
        echo "  2. IP adresa tvojho počítača (na fyzické zariadenie)"
        echo "  3. Vercel deployment URL (production)"
        echo ""
        read -p "Vyber možnosť (1/2/3) alebo zadaj URL [default=1]: " choice
        
        case $choice in
            1)
                API_URL="http://localhost:3000"
                ;;
            2)
                echo ""
                echo "Nájdi svoju IP adresu:"
                echo "  macOS/Linux: ifconfig | grep 'inet ' | grep -v 127.0.0.1"
                echo "  Windows: ipconfig"
                echo ""
                read -p "Zadaj tvoju IP adresu (bez http://): " IP_ADDR
                API_URL="http://$IP_ADDR:3000"
                ;;
            3)
                read -p "Zadaj svoju Vercel URL (napr. https://finapp.vercel.app): " API_URL
                ;;
            *)
                if [[ $choice == http* ]]; then
                    API_URL="$choice"
                else
                    API_URL="http://localhost:3000"
                fi
                ;;
        esac
    fi
fi

echo "✅ API URL nastavená na: $API_URL"
echo ""

# ============================================
# Step 2: Get Supabase Credentials
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Supabase Credentials"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Use command line arguments or prompt user
if [ -n "$2" ] && [ -n "$3" ]; then
    SUPABASE_URL="$2"
    SUPABASE_KEY="$3"
    echo "✅ Supabase credentials z parametrov"
else
    echo "Supabase credentials zistíš tu:"
    echo "👉 https://supabase.com/dashboard/project/agccohbrvpjknlhltqzc/settings/api"
    echo ""
    echo "Potrebujem tieto hodnoty:"
    echo "  • Project URL (vyzerá ako: https://agccohbrvpjknlhltqzc.supabase.co)"
    echo "  • Anon/Public Key (dlhý string začínajúci 'eyJ...')"
    echo ""

    read -p "📌 Supabase Project URL: " SUPABASE_URL
    SUPABASE_URL=$(echo "$SUPABASE_URL" | xargs)  # trim whitespace

    if [ -z "$SUPABASE_URL" ]; then
        echo "❌ Supabase URL je povinná!"
        exit 1
    fi

    echo ""
    read -p "📌 Supabase Anon Key: " SUPABASE_KEY
    SUPABASE_KEY=$(echo "$SUPABASE_KEY" | xargs)  # trim whitespace

    if [ -z "$SUPABASE_KEY" ]; then
        echo "❌ Supabase Key je povinná!"
        exit 1
    fi
fi

echo ""

# ============================================
# Step 3: Validate Credentials
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Validácia Credentials..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Validate URL format (allow without strict format check if auto mode)
if [[ ! $SUPABASE_URL =~ ^https://.*\.supabase\.co$ ]]; then
    if [ -z "$2" ]; then
        echo "⚠️  URL sa nezdá byť správna (má začínať 'https://' a končiť '.supabase.co')"
        read -p "Pokračovať aj tak? (y/n): " confirm
        if [[ $confirm != "y" ]]; then
            exit 1
        fi
    fi
fi

# Validate Key length (should be 200+ chars)
if [ ${#SUPABASE_KEY} -lt 50 ]; then
    if [ -z "$3" ]; then
        echo "⚠️  Key sa zdá byť príliš krátka (očakáva sa 200+ znakov)"
        read -p "Pokračovať aj tak? (y/n): " confirm
        if [[ $confirm != "y" ]]; then
            exit 1
        fi
    fi
fi

echo "✅ Credentials vyzerajú OK"
echo ""

# ============================================
# Step 4: Create .env File
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Vytváram .env súbor..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cat > "$ENV_FILE" << EOF
# 🚀 FinApp Mobile App Configuration
# Auto-generated $(date '+%Y-%m-%d %H:%M:%S')

# API Backend Configuration
EXPO_PUBLIC_API_URL=$API_URL

# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=$SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_KEY
EOF

if [ $? -eq 0 ]; then
    echo "✅ .env súbor vytvorený: $ENV_FILE"
else
    echo "❌ Chyba pri vytváraní .env súboru"
    exit 1
fi

echo ""

# ============================================
# Step 5: Display Summary
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Súhrnný Prehľad"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 .env Konfigurácia:"
echo ""
echo "  API URL:             $API_URL"
echo "  Supabase URL:        $SUPABASE_URL"
echo "  Anon Key (length):   ${#SUPABASE_KEY} znakov"
echo ""

# ============================================
# Step 6: Next Steps
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Ďalšie Kroky"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1️⃣  Spusti web backend (v inom termináli):"
echo "    cd apps/web && pnpm dev"
echo ""
echo "2️⃣  Spusti mobilnú aplikáciu:"
echo "    cd apps/mobile && pnpm install && pnpm dev"
echo ""
echo "3️⃣  Vyber platformu:"
echo "    • Stlač 'i' pre iOS Simulator"
echo "    • Stlač 'a' pre Android Emulator"
echo "    • Alebo skenhuj QR kód s Expo Go"
echo ""
echo "4️⃣  Prihlásiť sa s tvojim web account:"
echo "    Email: (tvoj email)"
echo "    Heslo: (tvoje heslo)"
echo ""
echo "🎉 Hotovo!"
echo ""
