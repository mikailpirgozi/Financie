# 🚀 Upgrade na PRO plán - Riešenie "Subscription limit reached"

## Problém
Dosiahol si limit **5 úverov** na FREE pláne.

## Riešenie: Upgrade na PRO plán

### Metóda 1: Cez Supabase SQL Editor (NAJRÝCHLEJŠIE) ⚡

1. Otvor Supabase SQL Editor:
   https://supabase.com/dashboard/project/agccohbrvpjknlhltqzc/sql/new

2. Skopíruj a spusti tento SQL príkaz:

```sql
-- Upgrade na PRO plán (unlimited loans)
UPDATE profiles
SET 
  subscription_plan = 'pro',
  updated_at = NOW()
WHERE email = 'pirgozi@gmail.com';

-- Overenie zmeny
SELECT 
  email,
  subscription_plan,
  updated_at
FROM profiles
WHERE email = 'pirgozi@gmail.com';
```

3. Klikni na **RUN** alebo stlač `Cmd + Enter`

4. Refresh stránku s úvermi a skús vytvoriť nový úver! 🎉

---

### Metóda 2: Cez psql (ak máš DB heslo)

```bash
# Získaj heslo z:
# https://supabase.com/dashboard/project/agccohbrvpjknlhltqzc/settings/database

psql "postgresql://postgres:YOUR_PASSWORD@db.agccohbrvpjknlhltqzc.supabase.co:5432/postgres" -c "UPDATE profiles SET subscription_plan = 'pro' WHERE email = 'pirgozi@gmail.com';"
```

---

## Výsledok

Po upgrade budeš mať:

| Feature | FREE | PRO ✅ |
|---------|------|--------|
| Úvery | 5 | **Unlimited** |
| Členovia | 3 | **Unlimited** |
| Domácnosti | 1 | 3 |
| Kategórie | 10 | **Unlimited** |

---

## Alternatíva: Vymazať existujúce úvery

Ak nechceš upgrade, môžeš vymazať niektoré úvery:

```sql
-- Zobraz všetky úvery
SELECT 
  l.id,
  l.lender,
  l.principal,
  l.status,
  l.created_at
FROM loans l
JOIN household_members hm ON l.household_id = hm.household_id
JOIN profiles p ON hm.user_id = p.id
WHERE p.email = 'pirgozi@gmail.com'
ORDER BY l.created_at DESC;

-- Vymaž konkrétny úver (nahraď LOAN_ID)
DELETE FROM loans WHERE id = 'LOAN_ID';
```

---

## Poznámka

Toto je len zmena v databáze pre vývoj. Nič sa neplatí, je to len nastavenie v tabuľke `profiles`.

