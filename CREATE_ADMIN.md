# 👤 Vytvorenie Admin Účtu - Krok za krokom

## 🔴 PROBLÉM: "TypeError: Failed to fetch"

**Príčina:** Supabase credentials nie sú nastavené v `.env.local`

---

## ✅ RIEŠENIE (5 minút):

### KROK 1: Získaj Supabase credentials

1. **Choď na Supabase Dashboard:**
   👉 https://supabase.com/dashboard/project/financie-web/settings/api

2. **Skopíruj tieto hodnoty:**
   
   **A) Project URL:**
   - Nájdeš v sekcii "Configuration" → "Project URL"
   - Vyzerá ako: `https://abcdefghij.supabase.co`
   - **Skopíruj CELÚ URL vrátane https://**

   **B) Anon/Public Key:**
   - Nájdeš v sekcii "Project API keys" → "anon" → "public"
   - Začína: `eyJhbGc...`
   - Je to DLHÝ string (200+ znakov)
   - **Skopíruj CELÝ kľúč**

---

### KROK 2: Nastav credentials

**Otvor súbor:**
```bash
apps/web/.env.local
```

**Nahraď tieto riadky s TVOJIMI hodnotami:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://tvoja-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tvoj_dlhy_anon_key_tu
```

**DÔLEŽITÉ:**
- ✅ Skopíruj CELÚ URL (vrátane https://)
- ✅ Skopíruj CELÝ anon key (všetky znaky)
- ✅ Žiadne medzery pred/za hodnotami
- ✅ Žiadne úvodzovky

---

### KROK 3: Spusti databázové migrácie

**Choď na SQL Editor:**
👉 https://supabase.com/dashboard/project/financie-web/sql

**Spusti tieto 3 migrácie (v tomto poradí):**

#### 1️⃣ Initial Schema
```sql
-- 1. Klikni "New Query"
-- 2. Otvor súbor: supabase/migrations/20240101000000_initial_schema.sql
-- 3. Skopíruj CELÝ obsah (Cmd+A, Cmd+C)
-- 4. Vlož do SQL Editora (Cmd+V)
-- 5. Klikni "Run" (alebo Cmd+Enter)
-- 6. Počkaj na "Success ✅"
```

#### 2️⃣ RLS Policies
```sql
-- 1. Klikni "New Query" znova
-- 2. Otvor súbor: supabase/migrations/20240101000001_rls_policies.sql
-- 3. Skopíruj CELÝ obsah
-- 4. Vlož do SQL Editora
-- 5. Klikni "Run"
-- 6. Počkaj na "Success ✅"
```

#### 3️⃣ Push Tokens
```sql
-- 1. Klikni "New Query" znova
-- 2. Otvor súbor: supabase/migrations/20240102000000_push_tokens.sql
-- 3. Skopíruj CELÝ obsah
-- 4. Vlož do SQL Editora
-- 5. Klikni "Run"
-- 6. Počkaj na "Success ✅"
```

---

### KROK 4: Reštartuj dev server

```bash
# V terminály kde beží pnpm dev:
# Stlač Ctrl+C (zastaviť server)

# Potom spusti znova:
cd "/Users/mikailpirgozi/Documents/Webove Aplikacie/financie"
pnpm dev
```

---

### KROK 5: Vytvor admin účet

#### Možnosť A - Cez aplikáciu (odporúčané):

1. **Choď na registráciu:**
   👉 http://localhost:3000/auth/register

2. **Vytvor účet:**
   - Email: `admin@finapp.sk`
   - Heslo: `Admin123!` (alebo tvoje vlastné)
   - Display Name: `Admin`

3. **Prihlás sa:**
   👉 http://localhost:3000/auth/login

#### Možnosť B - Priamo v Supabase:

1. **Choď na Authentication:**
   👉 https://supabase.com/dashboard/project/financie-web/auth/users

2. **Klikni "Add user" → "Create new user"**

3. **Vyplň:**
   - Email: `admin@finapp.sk`
   - Password: `Admin123!`
   - Auto Confirm User: ✅ (zaškrtni!)

4. **Klikni "Create user"**

5. **Vytvor household pre admin:**
   - Choď na SQL Editor
   - Spusti tento SQL:

```sql
-- Vytvor household
INSERT INTO households (name) 
VALUES ('Admin Household')
RETURNING id;

-- Poznač si ID z výsledku (napr. 'abc-123-def')

-- Pridaj admin usera do household (nahraď ID)
INSERT INTO household_members (household_id, user_id, role)
VALUES (
  'abc-123-def',  -- ID z predošlého kroku
  (SELECT id FROM auth.users WHERE email = 'admin@finapp.sk'),
  'owner'
);
```

---

## 🎯 OVERENIE ŽE VŠETKO FUNGUJE

### 1. Skontroluj tabuľky v Supabase:
👉 https://supabase.com/dashboard/project/financie-web/editor

**Mal by si vidieť:**
- ✅ profiles
- ✅ households
- ✅ household_members
- ✅ categories
- ✅ loans
- ✅ expenses
- ✅ incomes
- ✅ assets
- ✅ ... a ďalšie

### 2. Skontroluj usera:
👉 https://supabase.com/dashboard/project/financie-web/auth/users

**Mal by si vidieť:**
- ✅ admin@finapp.sk (alebo tvoj email)
- ✅ Status: Confirmed

### 3. Prihlás sa do aplikácie:
👉 http://localhost:3000/auth/login

**Credentials:**
- Email: `admin@finapp.sk`
- Heslo: `Admin123!` (alebo tvoje)

---

## 🔧 TROUBLESHOOTING

### ❌ Stále "Failed to fetch"?
```bash
# 1. Skontroluj .env.local
cat apps/web/.env.local

# 2. Overte že URL začína https://
# 3. Overte že anon key je CELÝ (200+ znakov)
# 4. Reštartuj server (Ctrl+C a pnpm dev)
```

### ❌ "relation does not exist"?
```
Migrácie neboli spustené.
Choď na KROK 3 a spusti všetky 3 migrácie.
```

### ❌ "Invalid login credentials"?
```
1. Skontroluj heslo
2. Skontroluj že user je "Confirmed" v Supabase Auth
3. Skontroluj že household_members záznam existuje
```

### ❌ "No household found"?
```sql
-- Spusti v SQL Editore:

-- 1. Nájdi user ID
SELECT id, email FROM auth.users WHERE email = 'admin@finapp.sk';

-- 2. Vytvor household
INSERT INTO households (name) VALUES ('Admin Household') RETURNING id;

-- 3. Pridaj usera do household (nahraď IDs)
INSERT INTO household_members (household_id, user_id, role)
VALUES ('household-id-tu', 'user-id-tu', 'owner');
```

---

## 📊 TEST CREDENTIALS

**Po úspešnom nastavení:**

```
Email: admin@finapp.sk
Heslo: Admin123!
URL: http://localhost:3000/auth/login
```

---

## 🎉 HOTOVO!

Po dokončení týchto krokov budeš môcť:
- ✅ Prihlásiť sa do aplikácie
- ✅ Vytvárať úvery
- ✅ Pridávať výdavky a príjmy
- ✅ Spravovať majetok
- ✅ Vidieť grafy a reporty
- ✅ Pozvať ďalších členov
- ✅ Testovať všetky funkcie

**Užívaj si FinApp!** 🚀

