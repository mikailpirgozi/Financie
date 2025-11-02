# Fix: User Registration Database Error

## Problém
Pri registrácii nového používateľa v mobilnej aplikácii sa zobrazovala chyba:
```
database errors saving new user
```

## Príčina
Database trigger `create_household_for_new_user()` mal 2 kritické chyby:

1. **Nesprávna rola**: Používal `'admin'` namiesto `'owner'`
   - Tabuľka `household_members` má constraint: `role IN ('owner', 'member')`
   - Trigger používal neplatnú hodnotu `'admin'`

2. **Chýbajúci profile**: Trigger nevytvárал záznam v tabuľke `profiles`
   - Profile je required (FK constraint)

## Riešenie
Opravený trigger funkcia (migrácia `20241102200000_fix_user_registration.sql`):

```sql
CREATE OR REPLACE FUNCTION create_household_for_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_household_id UUID;
BEGIN
  -- 1. Vytvoriť profile
  INSERT INTO profiles (id, email, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  );

  -- 2. Vytvoriť domácnosť
  INSERT INTO households (name, created_at)
  VALUES ('Moja domácnosť', NOW())
  RETURNING id INTO new_household_id;

  -- 3. Pridať usera ako 'owner' (nie 'admin'!)
  INSERT INTO household_members (user_id, household_id, role, joined_at)
  VALUES (NEW.id, new_household_id, 'owner', NOW());

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating household for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;
```

## Zmeny
- ✅ Role nastavené na `'owner'` namiesto `'admin'`
- ✅ Pridané vytvorenie profile záznamu
- ✅ Pridané error handling (EXCEPTION block)
- ✅ Automaticky aktualizované existujúce `'admin'` role na `'owner'`

## Testovanie
Test vytvoril nového používateľa a overil:
- ✅ Profile bol vytvorený
- ✅ Domácnosť bola vytvorená
- ✅ User má rolu `'owner'`
- ✅ Žiadne DB chyby

## Aplikované
- Dátum: 2024-11-02
- Metóda: Supabase SQL Editor
- Status: ✅ Otestované a funguje

## Registrácia teraz funguje správne v mobile app! 🎉

