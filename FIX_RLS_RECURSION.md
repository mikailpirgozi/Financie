# 🚨 KRITICKÁ OPRAVA - Infinite Recursion v RLS

## Problém:
Dashboard zobrazuje "Zatiaľ nemáte vytvorenú domácnosť" kvôli **infinite recursion** v RLS policies.

```
Error: infinite recursion detected in policy for relation "household_members"
```

## Príčina:
RLS funkcia `is_household_member()` volá SELECT na `household_members`, čo spúšťa RLS policy, ktorá zase volá `is_household_member()` → nekonečná slučka.

## Riešenie:

### 1. Spusti túto migráciu v Supabase SQL Editor:

**Súbor:** `supabase/migrations/20241021100000_fix_rls_recursion_final.sql`

**Alebo skopíruj z clipboardu** (už je tam skopírované)

### 2. Postup:

1. Otvor: https://supabase.com/dashboard/project/agccohbrvpjknlhltqzc/sql/new
2. Vlož SQL (Cmd+V)
3. Klikni "Run" (alebo Cmd+Enter)

### 3. Čo migrácia robí:

✅ Odstráni rekurzívne funkcie `is_household_member()` a `is_household_owner()`  
✅ Nahradí všetky RLS policies **priamymi EXISTS checks**  
✅ Opraví `household_members` policies aby nerobili rekurziu  
✅ Zachová bezpečnosť - users vidia len svoje households  

### 4. Po spustení migrácie:

```bash
# Otestuj či funguje
node test-membership.js
```

Malo by vrátiť:
```
✅ Prihlásený ako: pirgozi1@gmail.com
✅ Membership nájdený!
   Incomes: 4 ✅
   Expenses: 11 ✅
   Loans: 1 ✅
```

### 5. Refresh stránku:

Dashboard by mal teraz zobraziť:
- ✅ Prehľad financií
- ✅ 4 karty so štatistikami
- ✅ Rýchle akcie
- ✅ Nadchádzajúce splátky

---

## Prihlasovacie údaje:

```
URL: http://localhost:3001/auth/login
Email: pirgozi1@gmail.com
Heslo: Pirgozi123!
```

---

## Technické detaily:

**Pred:**
```sql
CREATE FUNCTION is_household_member(household_id UUID) ...
  SELECT 1 FROM household_members WHERE ... -- ❌ REKURZIA!

CREATE POLICY ... USING (is_household_member(household_id));
```

**Po:**
```sql
-- Žiadne funkcie!

CREATE POLICY ... USING (
  EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = table.household_id 
    AND household_members.user_id = auth.uid()
  )
); -- ✅ Priamy check, bez rekurzie
```

---

**Vytvorené:** 21.10.2025  
**Priorita:** 🚨 KRITICKÁ - spusti ASAP

