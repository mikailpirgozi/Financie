# 🗄️ Supabase Setup - Krok za krokom

## 📍 Tvoj projekt: `financie-web`

---

## ✅ KROK 1: Získaj credentials

### Choď na Supabase Dashboard:
👉 https://supabase.com/dashboard/project/financie-web/settings/api

### Skopíruj tieto hodnoty:

1. **Project URL**
   - Nájdeš v sekcii "Project URL"
   - Vyzerá ako: `https://abcdefghij.supabase.co`

2. **Anon/Public Key**  
   - Nájdeš v sekcii "Project API keys" → "anon public"
   - Začína: `eyJhbGc...`
   - Je to dlhý string (cca 200+ znakov)

---

## ✅ KROK 2: Nastav .env.local

### Otvor súbor:
```bash
apps/web/.env.local
```

### Nahraď placeholder hodnoty:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tvoj-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...tvoj_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Alebo spusti:**
```bash
./setup-supabase.sh
```

---

## ✅ KROK 3: Spusti migrácie

### Choď na SQL Editor:
👉 https://supabase.com/dashboard/project/financie-web/sql

### Spusti tieto 3 migrácie (v tomto poradí):

#### 1️⃣ Initial Schema (hlavné tabuľky)
```
1. Klikni "New Query"
2. Otvor súbor: supabase/migrations/20240101000000_initial_schema.sql
3. Skopíruj CELÝ obsah
4. Vlož do SQL Editora
5. Klikni "Run" (alebo Cmd+Enter)
6. Počkaj na "Success" ✅
```

#### 2️⃣ RLS Policies (bezpečnosť)
```
1. Klikni "New Query" znova
2. Otvor súbor: supabase/migrations/20240101000001_rls_policies.sql
3. Skopíruj CELÝ obsah
4. Vlož do SQL Editora
5. Klikni "Run"
6. Počkaj na "Success" ✅
```

#### 3️⃣ Push Tokens (notifikácie)
```
1. Klikni "New Query" znova
2. Otvor súbor: supabase/migrations/20240102000000_push_tokens.sql
3. Skopíruj CELÝ obsah
4. Vlož do SQL Editora
5. Klikni "Run"
6. Počkaj na "Success" ✅
```

---

## ✅ KROK 4: Reštartuj server

```bash
# V terminály kde beží server:
# Stlač Ctrl+C (zastaviť)

# Potom spusti znova:
cd "/Users/mikailpirgozi/Documents/Webove Aplikacie/financie"
pnpm dev
```

---

## ✅ KROK 5: Testuj aplikáciu

### 1. Choď na registráciu:
👉 http://localhost:3000/auth/register

### 2. Vytvor účet:
- Email: tvoj@email.com
- Heslo: minimálne 6 znakov
- Display name: Tvoje meno

### 3. Prihlás sa:
👉 http://localhost:3000/auth/login

### 4. Užívaj si aplikáciu! 🎉

---

## 🎯 Čo máš teraz k dispozícii

✅ **Dashboard** - prehľad financií
✅ **Úvery** - vytváranie a správa úverov
✅ **Výdavky** - sledovanie výdavkov
✅ **Príjmy** - sledovanie príjmov
✅ **Majetok** - evidencia majetku
✅ **Mesačné výkazy** - automatické sumáre
✅ **Kategórie** - vlastné kategórie
✅ **Household** - multi-user podpora
✅ **Subscriptions** - cenové plány

---

## 🔧 Riešenie problémov

### ❌ "Supabase client error"
```bash
# Skontroluj .env.local súbor
cat apps/web/.env.local

# Overte že URL a anon key sú správne
# Reštartuj server (Ctrl+C a pnpm dev)
```

### ❌ "relation does not exist"
```
Migrácie neboli spustené alebo zlyhali.
Choď na SQL Editor a spusti ich znova (Krok 3).
```

### ❌ "Invalid login credentials"
```
1. Skontroluj že si zadal správne heslo
2. Skontroluj Supabase Auth logs:
   https://supabase.com/dashboard/project/financie-web/auth/users
```

### ❌ Server sa nespustí
```bash
# Zastaviť všetky procesy na porte 3000
lsof -ti:3000 | xargs kill -9

# Spustiť znova
pnpm dev
```

---

## 📊 Overenie že všetko funguje

### Skontroluj tabuľky v Supabase:
👉 https://supabase.com/dashboard/project/financie-web/editor

**Mal by si vidieť tieto tabuľky:**
- ✅ profiles
- ✅ households
- ✅ household_members
- ✅ categories
- ✅ loans
- ✅ loan_schedules
- ✅ payments
- ✅ expenses
- ✅ incomes
- ✅ assets
- ✅ asset_valuations
- ✅ rules
- ✅ monthly_summaries
- ✅ push_tokens

---

## 🎉 Hotovo!

Teraz máš **plne funkčnú aplikáciu**!

**Ďalšie kroky:**
- Vytvor prvý úver
- Pridaj výdavky
- Pozvi členov do domácnosti
- Skúmaj grafy a reporty

**Užívaj si FinApp!** 🚀
