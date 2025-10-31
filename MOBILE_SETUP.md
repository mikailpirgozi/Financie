# 📱 Nastavenie mobilnej aplikácie – FinApp

> Podrobný návod na nastavenie a spustenie mobilnej aplikácie pre testovacie účely.

---

## 🎯 Čo je potrebné

- **Node.js** 18+
- **pnpm** 8+
- **Expo CLI** (inštaluje sa automaticky)
- **Supabase kredenciály** (z vášho projektu)
- **Web API** spustená na `localhost:3000`

---

## 📋 Krok 1: Zozbierať Supabase kredenciály

1. Otvor: **https://supabase.com/dashboard/project/agccohbrvpjknlhltqzc/settings/api**
2. Skopíruj tieto hodnoty:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public** key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

**Príklad:**
```
EXPO_PUBLIC_SUPABASE_URL=https://agccohbrvpjknlhltqzc.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🔧 Krok 2: Vytvoriť `.env` súbor v mobilnej aplikácii

```bash
cd apps/mobile
cat > .env << 'ENVFILE'
# API Configuration
# Pre lokálny vývoj: http://localhost:3000
# Pre fyzické zariadenie: http://YOUR_MACHINE_IP:3000
# Ak testujete na simulátore/emulátore, ponechajte localhost:3000
EXPO_PUBLIC_API_URL=http://localhost:3000

# Supabase – SKOPÍRUJTE Z: https://supabase.com/dashboard/project/agccohbrvpjknlhltqzc/settings/api
EXPO_PUBLIC_SUPABASE_URL=https://agccohbrvpjknlhltqzc.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
ENVFILE
```

**Wichtig:** Nahraďte `YOUR_ANON_KEY_HERE` vašou skutočnou anon key!

---

## 📦 Krok 3: Nainštalovať závislosti

```bash
# Ste stále v apps/mobile? Výborně!
pnpm install
```

---

## ✅ Krok 4: Verifikácia nastavenia

```bash
# TypeScript type check
pnpm typecheck

# ESLint linting
pnpm lint
```

Oba príkazy musia prejsť bez chýb. ✅

---

## 🚀 Krok 5: Spustenie aplikácie

```bash
# Spusti Expo dev server
pnpm dev
```

Vidíte QR kód v termináli. Podľa vášej platformy:

### 📱 iOS Simulator
```bash
# V termináli, kde beží pnpm dev, stlačte: i
```

### 🤖 Android Emulator
```bash
# V termináli, kde beží pnpm dev, stlačte: a
```

### 📲 Fyzické zariadenie
1. Stiahnite si **Expo Go** z App Store / Google Play
2. Skenhujte QR kód z terminálu kamerou
3. Otvorí sa v Expo Go

---

## 🌐 Pre fyzické zariadenie (iOS/Android)

Ak chcete testovať na skutočnom telefóne:

1. **Nájdite svoju IP adresu:**
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. **Upravte `.env`:**
   ```bash
   EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
   # ☝️ Nahraďte 192.168.1.100 vašou IP adresou
   ```

3. **Ujistite sa, že web API beží na tej IP:**
   - Otvorte v prehliadači: `http://YOUR_IP:3000`
   - Mal by sa zobraziť web aplikácia

---

## 🔥 Čo testovať?

Po spustení aplikácie:

1. **Login** – Prihlás sa svojim testovacím účtom
2. **Dashboard** – Mal by sa načítať s údajmi
3. **Expenses** – Vytvoriť, upraviť, zmazať výdavok
4. **Loans** – Vytvoriť úver s plánom splátok
5. **Incomes** – Pridať príjem
6. **Assets** – Pridať majetok

Podrobný test seznam je v: **`TESTING_CHECKLIST.md`**

---

## ⚠️ Časté problémy

### ❌ "Cannot connect to API"
- **Riešenie:** Skontrolujte, že web API beží na `http://localhost:3000`
- V ďalšej sekcii sa dozviete, ako spustiť web API

### ❌ "Missing environment variables"
- **Riešenie:** Ujistite sa, že `.env` je v `apps/mobile/` a má všetky tri premenné
- Reštartujte Expo: stlačte `r` v termináli

### ❌ "Supabase connection error"
- **Riešenie:** Skontrolujte URL a ANON_KEY – skopírujte ich znova z dashboardu

---

## 📝 Ďalší krok

Keď sú env premenné nastavené a aplikácia beží:

👉 **Pokračujte na:** `WEB_SETUP.md` (nastavenie web API)

---

**Potrebujete pomoc?**
- Súbor: `ENV_SETUP.md` (detailný popis)
- Problém? Skontrolujte `TROUBLESHOOTING.md`

---

**Pripravené?** ✨ Spusti `pnpm dev` a vychutnaj si aplikáciu!
