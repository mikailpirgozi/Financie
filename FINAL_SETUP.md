# 🎯 FINÁLNY SETUP - Posledné 2 kroky!

## ✅ ČO JE UŽ HOTOVÉ:

- ✅ Project URL nastavená: `https://agccohbrvpjknlhltqzc.supabase.co`
- ✅ Project Reference: `agccohbrvpjknlhltqzc`
- ✅ `.env.local` vytvorený

---

## 🔴 ČO EŠTE TREBA (2 minúty):

### **KROK 1: Získaj Anon Key** 🔑

1. **Choď sem:**
   👉 https://supabase.com/dashboard/project/agccohbrvpjknlhltqzc/settings/api

2. **Skopíruj "anon" / "public" key:**
   - Nájdeš v sekcii "Project API keys"
   - Pod "anon" → "public"
   - Začína: `eyJhbGc...`
   - Je to DLHÝ string (200+ znakov)

3. **Vlož do .env.local:**
   ```bash
   nano apps/web/.env.local
   ```
   
   **Nahraď tento riadok:**
   ```env
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tvoj_skutocny_anon_key_tu
   ```

---

### **KROK 2: Spusti Migrácie** 📊

**Choď na SQL Editor:**
👉 https://supabase.com/dashboard/project/agccohbrvpjknlhltqzc/sql

**Spusti tieto 3 súbory (v tomto poradí):**

#### 1️⃣ Initial Schema
```
1. Klikni "New Query"
2. Otvor: supabase/migrations/20240101000000_initial_schema.sql
3. Skopíruj CELÝ obsah (Cmd+A, Cmd+C)
4. Vlož do SQL Editora (Cmd+V)
5. Klikni "Run" (alebo Cmd+Enter)
6. Počkaj na "Success ✅"
```

#### 2️⃣ RLS Policies
```
1. Klikni "New Query" znova
2. Otvor: supabase/migrations/20240101000001_rls_policies.sql
3. Skopíruj CELÝ obsah
4. Vlož do SQL Editora
5. Klikni "Run"
6. Počkaj na "Success ✅"
```

#### 3️⃣ Push Tokens
```
1. Klikni "New Query" znova
2. Otvor: supabase/migrations/20240102000000_push_tokens.sql
3. Skopíruj CELÝ obsah
4. Vlož do SQL Editora
5. Klikni "Run"
6. Počkaj na "Success ✅"
```

---

## 🔄 **KROK 3: Reštartuj Server**

```bash
# V terminály kde beží pnpm dev:
# Stlač Ctrl+C

# Potom:
cd "/Users/mikailpirgozi/Documents/Webove Aplikacie/financie"
pnpm dev
```

---

## 👤 **KROK 4: Vytvor Admin Účet**

### **Možnosť A - Cez aplikáciu (jednoduchšie):**

1. **Choď na:** http://localhost:3000/auth/register
2. **Vytvor účet:**
   - Email: `admin@finapp.sk`
   - Heslo: `Admin123!`
   - Display Name: `Admin`
3. **Prihlás sa:** http://localhost:3000/auth/login

### **Možnosť B - Priamo v Supabase:**

1. **Choď na:** https://supabase.com/dashboard/project/agccohbrvpjknlhltqzc/auth/users
2. **Klikni:** "Add user" → "Create new user"
3. **Vyplň:**
   - Email: `admin@finapp.sk`
   - Password: `Admin123!`
   - ✅ **Auto Confirm User** (zaškrtni!)
4. **Klikni:** "Create user"

**Potom vytvor household:**

Choď na: https://supabase.com/dashboard/project/agccohbrvpjknlhltqzc/sql

```sql
-- 1. Vytvor household
INSERT INTO households (name) 
VALUES ('Admin Household')
RETURNING id;

-- Poznač si ID (napr. 'abc-123-def')

-- 2. Pridaj usera do household (nahraď ID)
INSERT INTO household_members (household_id, user_id, role)
VALUES (
  'abc-123-def',  -- ID z kroku 1
  (SELECT id FROM auth.users WHERE email = 'admin@finapp.sk'),
  'owner'
);
```

---

## 🎯 **TEST:**

**Prihlás sa:**
```
URL: http://localhost:3000/auth/login
Email: admin@finapp.sk
Heslo: Admin123!
```

---

## 📊 **OVERENIE:**

### Skontroluj tabuľky:
👉 https://supabase.com/dashboard/project/agccohbrvpjknlhltqzc/editor

**Mal by si vidieť:**
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

## 🔧 **TROUBLESHOOTING:**

### Stále "Failed to fetch"?
```bash
# Skontroluj anon key
cat apps/web/.env.local

# Musí byť SKUTOČNÝ key (200+ znakov)
# Nie placeholder!

# Reštartuj server
Ctrl+C
pnpm dev
```

### "relation does not exist"?
- Migrácie neboli spustené
- Choď na KROK 2 a spusti všetky 3 migrácie

---

## 🎉 **PO DOKONČENÍ:**

Budeš mať prístup k:
- ✅ Dashboard s prehľadom financií
- ✅ Úvery (3 typy)
- ✅ Výdavky a príjmy
- ✅ Majetok
- ✅ Mesačné výkazy
- ✅ Grafy a vizualizácie
- ✅ Export CSV/PDF
- ✅ Simulácie
- ✅ Household management
- ✅ Dark mode
- ✅ Multi-language (SK/EN)
- ✅ 48 prémiových UI komponentov

**Užívaj si FinApp!** 🚀✨

