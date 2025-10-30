# ⚡ Rýchla oprava: Vytvorenie households

## Problém
Na stránkach `/dashboard/loans`, `/dashboard/expenses` atď. **nie sú viditeľné tlačidlá** na pridávanie záznamov.

## Príčina
Používateľ nemá vytvorenú **domácnosť (household)** v databáze.

## ✅ Riešenie (2 minúty)

### Spôsob 1: Cez Supabase Dashboard (Odporúčané)

1. **Otvor Supabase Dashboard**
   - Choď na: https://supabase.com/dashboard
   - Vyber svoj projekt

2. **Otvor SQL Editor**
   - V ľavom menu klikni na **SQL Editor**
   - Klikni na **New query**

3. **Skopíruj a spusti tento SQL:**

```sql
DO $$
DECLARE
  user_record RECORD;
  new_household_id UUID;
  user_display_name TEXT;
BEGIN
  FOR user_record IN 
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.user_id = u.id
    )
  LOOP
    user_display_name := COALESCE(
      user_record.raw_user_meta_data->>'display_name',
      user_record.email
    );
    
    RAISE NOTICE 'Creating household for: %', user_display_name;
    
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (user_record.id, user_record.email, user_display_name)
    ON CONFLICT (id) DO UPDATE
    SET 
      email = EXCLUDED.email,
      display_name = COALESCE(profiles.display_name, EXCLUDED.display_name);
    
    INSERT INTO public.households (name)
    VALUES (user_display_name || '''s Household')
    RETURNING id INTO new_household_id;
    
    INSERT INTO public.household_members (household_id, user_id, role)
    VALUES (new_household_id, user_record.id, 'owner');
    
    INSERT INTO public.categories (household_id, kind, name)
    VALUES
      (new_household_id, 'expense', 'Potraviny'),
      (new_household_id, 'expense', 'Bývanie'),
      (new_household_id, 'expense', 'Doprava'),
      (new_household_id, 'expense', 'Zdravie'),
      (new_household_id, 'expense', 'Zábava'),
      (new_household_id, 'income', 'Mzda'),
      (new_household_id, 'income', 'Podnikanie'),
      (new_household_id, 'income', 'Investície');
    
    RAISE NOTICE 'Household created: %', new_household_id;
  END LOOP;
  
  RAISE NOTICE 'Done!';
END $$;
```

4. **Klikni na "Run"** (alebo stlač Cmd+Enter / Ctrl+Enter)

5. **Obnov aplikáciu**
   - Vráť sa do aplikácie
   - Obnov stránku (Cmd+R / Ctrl+R)
   - Teraz by sa mali zobraziť všetky tlačidlá! 🎉

### Spôsob 2: Cez súbor

Alternatívne môžeš spustiť pripravený SQL súbor:

```bash
psql -h <DB_HOST> -U postgres -d postgres -f CREATE_HOUSEHOLD_FOR_EXISTING_USERS.sql
```

## 🔍 Overenie

Po spustení SQL by si mal vidieť:
- ✅ **Tlačidlo "➕ Nový úver"** na `/dashboard/loans`
- ✅ **Tlačidlo "➕ Nový výdavok"** na `/dashboard/expenses`
- ✅ **Tlačidlo "➕ Nový príjem"** na `/dashboard/incomes`
- ✅ **Tlačidlo "➕ Nový majetok"** na `/dashboard/assets`

## 📊 Čo sa vytvorilo?

Pre každého používateľa:
1. **Profil** v tabuľke `profiles`
2. **Household** s názvom "{Meno}'s Household"
3. **Membership** s rolou `owner`
4. **8 default kategórií**:
   - 5 výdavkových (Potraviny, Bývanie, Doprava, Zdravie, Zábava)
   - 3 príjmové (Mzda, Podnikanie, Investície)

## 🔮 Pre budúcnosť

Aby sa toto už neopakovalo, spusti aj trigger pre nových používateľov:

```bash
psql -h <DB_HOST> -U postgres -d postgres -f FIX_REGISTRATION.sql
```

Alebo v Supabase Dashboard > SQL Editor skopíruj obsah súboru `FIX_REGISTRATION.sql`.

---

**Potrebuješ pomoc?** Skontroluj logy v Supabase Dashboard > Logs

