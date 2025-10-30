# 🚀 Spustenie migrácií - 3 spôsoby

## ⚡ SPÔSOB 1: Cez Supabase Dashboard (NAJRÝCHLEJŠÍ - 1 minúta)

### Krok 1: Choď sem
👉 https://supabase.com/dashboard/project/agccohbrvpjknlhltqzc/sql

### Krok 2: Klikni "New Query"

### Krok 3: Otvor súbor v editore
```
ALL_MIGRATIONS.sql
```

### Krok 4: Skopíruj CELÝ obsah
- Cmd+A (vybrať všetko)
- Cmd+C (skopírovať)

### Krok 5: Vlož do Supabase SQL Editora
- Cmd+V (vložiť)

### Krok 6: Spusti
- Klikni "Run" (alebo Cmd+Enter)
- Počkaj na "Success ✅"

### Krok 7: Overiť
👉 https://supabase.com/dashboard/project/agccohbrvpjknlhltqzc/editor

Mal by si vidieť 14 tabuliek!

---

## 🔧 SPÔSOB 2: Cez psql (ak máš connection string)

### Krok 1: Získaj Database URL
👉 https://supabase.com/dashboard/project/agccohbrvpjknlhltqzc/settings/database

Skopíruj "Connection string" (URI format)

### Krok 2: Spusti v terminály
```bash
cd "/Users/mikailpirgozi/Documents/Webove Aplikacie/financie"

# Nahraď [YOUR-PASSWORD] tvojím DB heslom
psql "postgresql://postgres:[YOUR-PASSWORD]@db.agccohbrvpjknlhltqzc.supabase.co:5432/postgres" -f ALL_MIGRATIONS.sql
```

---

## 🌐 SPÔSOB 3: Cez Supabase CLI (vyžaduje setup)

### Krok 1: Prihlás sa
```bash
supabase login
```

### Krok 2: Link projekt
```bash
cd "/Users/mikailpirgozi/Documents/Webove Aplikacie/financie"
supabase link --project-ref agccohbrvpjknlhltqzc
```

### Krok 3: Spusti migrácie
```bash
supabase db push
```

---

## ✅ PO DOKONČENÍ

### 1. Overiť tabuľky
👉 https://supabase.com/dashboard/project/agccohbrvpjknlhltqzc/editor

Mal by si vidieť:
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

### 2. Obnoviť stránku
- Choď na: http://localhost:3000/auth/register
- Stlač F5 alebo Cmd+R

### 3. Zaregistrovať sa
- Email: tvoj@email.sk
- Heslo: minimálne 6 znakov
- Display Name: Tvoje meno

### 4. Prihlásiť sa
👉 http://localhost:3000/auth/login

---

## 🎉 HOTOVO!

Aplikácia bude plne funkčná! 🚀✨

---

## 💡 ODPORÚČAM

**Spôsob 1 (Dashboard)** je najrýchlejší a najspoľahlivejší.
Trvá len 1 minútu a nevyžaduje žiadny setup.

