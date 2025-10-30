# ✅ Účet pirgozi1@gmail.com - OPRAVENÝ A FUNKČNÝ

## 📊 Aktuálny stav

**Email:** pirgozi1@gmail.com  
**Status:** ✅ Plne funkčný

### Čo bolo opravené:

1. ✅ **Profile** - existuje s display name "Mikail"
2. ✅ **Household** - "Mikail's Household" (owner)
3. ✅ **Kategórie** - 8 kategórií (Potraviny, Bývanie, Doprava, Zdravie, Zábava, Mzda, Podnikanie, Investície)
4. ✅ **Príjmy** - 4 demo príjmy (3× mzda + 1× freelance)
5. ✅ **Výdavky** - 11 demo výdavkov (potraviny, bývanie, doprava)
6. ✅ **Úvery** - 1 demo hypotéka (150 000 €)

## 🔧 Čo bolo urobené:

### 1. Oprava setup-user-with-demo-data.sql
- Odstránené neexistujúce stĺpce: `user_id`, `currency`, `description`
- Upravené INSERT príkazy podľa skutočnej schémy DB
- Pridané správne stĺpce: `source` (incomes), `merchant` (expenses)

### 2. Vytvorený diagnostický skript
- **Súbor:** `diagnose-and-fix-pirgozi.js`
- Automaticky kontroluje a opravuje:
  - Profile
  - Household membership
  - Kategórie
  - Demo dáta (príjmy, výdavky, úvery)

### 3. Overenie triggeru
- **Súbor:** `check-trigger.js`
- Trigger `handle_new_user_complete` je nastavený
- Pri registrácii automaticky vytvára:
  - Profile
  - Household
  - Household membership (owner)
  - 8 default kategórií

## 🎯 Ako používať účet:

### Prihlásenie:
```
URL: http://localhost:3000/auth/login
Email: pirgozi1@gmail.com
Password: [tvoje heslo]
```

### Dostupné funkcie:
- ✅ Dashboard - prehľad financií
- ✅ Príjmy - zobrazenie a pridávanie príjmov
- ✅ Výdavky - zobrazenie a pridávanie výdavkov
- ✅ Úvery - správa úverov
- ✅ Kategórie - správa kategórií

## 📝 Schéma databázy (overená):

### Incomes
```sql
- id (UUID)
- household_id (UUID)
- date (DATE)
- amount (DECIMAL)
- source (TEXT) -- ✅ správne
- category_id (UUID)
- note (TEXT)
```

### Expenses
```sql
- id (UUID)
- household_id (UUID)
- date (DATE)
- amount (DECIMAL)
- merchant (TEXT) -- ✅ správne
- category_id (UUID)
- note (TEXT)
```

## 🚀 Spustenie aplikácie:

```bash
cd apps/web
pnpm dev
```

Aplikácia beží na: http://localhost:3000

## 🔄 Ak potrebuješ resetovať dáta:

```bash
# Spusti diagnostický skript (automaticky opraví všetko)
node diagnose-and-fix-pirgozi.js
```

Alebo manuálne v Supabase SQL Editor:
```bash
# Otvor súbor a spusti v SQL Editore
setup-user-with-demo-data.sql
```

## ✅ Overené:
- [x] User existuje v auth.users
- [x] Profile existuje v profiles
- [x] Household existuje a user je owner
- [x] Kategórie sú vytvorené (8)
- [x] Demo príjmy sú vytvorené (4)
- [x] Demo výdavky sú vytvorené (11)
- [x] Demo úver je vytvorený (1)
- [x] RLS policies fungujú správne
- [x] Trigger pre nových userov je nastavený

## 📌 Poznámky:

1. **Trigger FIX_REGISTRATION.sql** - uisti sa, že je spustený v Supabase
2. **RLS policies** - sú správne nastavené, používajú `is_household_member()`
3. **Demo dáta** - sú vytvorené s relatívnymi dátumami (posledné 2 mesiace)

---

**Vytvorené:** 21.10.2025  
**Status:** ✅ HOTOVO - účet je plne funkčný

